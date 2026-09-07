import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminRepository } from "@/server/auth/admin.repository";
import { verifyAdminPassword } from "@/server/auth/admin-password";

const SESSION_COOKIE = "ianep_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPTS = 5;

type AdminSession = { role: "ADMIN"; adminId: string; username: string; expiresAt: number };
type LoginAttempt = { count: number; resetAt: number };

const globalForLoginAttempts = globalThis as unknown as { adminLoginAttempts?: Map<string, LoginAttempt> };
const loginAttempts = globalForLoginAttempts.adminLoginAttempts ?? new Map<string, LoginAttempt>();
if (process.env.NODE_ENV !== "production") globalForLoginAttempts.adminLoginAttempts = loginAttempts;

function getSessionSecret() {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  return sessionSecret && sessionSecret.length >= 32 ? sessionSecret : null;
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

const DUMMY_PASSWORD_HASH = "scrypt$16384$8$1$aWFuZXAtZHVtbXktYWRtaW4tc2FsdA$x7HXWkByn5k-1A_MyGL_XfFNhOHNCMaIzE5GCfoqyV7vfH1ZrlvVsKwYE6FPOCC5HTgRs1A0zpARw4LBMr-zlA";

export async function authenticateAdmin(username: string, password: string) {
  const admin = await adminRepository.findActiveByUsername(username);
  const passwordMatches = verifyAdminPassword(password, admin?.passwordHash ?? DUMMY_PASSWORD_HASH);
  return admin && passwordMatches ? { id: admin.id, username: admin.username } : null;
}

function loginAttemptKey(identifier: string) {
  return createHash("sha256").update(identifier).digest("base64url");
}

export function canAttemptAdminLogin(identifier: string) {
  const key = loginAttemptKey(identifier);
  const attempt = loginAttempts.get(key);
  if (!attempt || attempt.resetAt <= Date.now()) {
    loginAttempts.delete(key);
    return true;
  }
  return attempt.count < LOGIN_ATTEMPTS;
}

export function recordAdminLoginFailure(identifier: string) {
  const key = loginAttemptKey(identifier);
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= Date.now()) {
    loginAttempts.set(key, { count: 1, resetAt: Date.now() + LOGIN_WINDOW_MS });
    return;
  }
  current.count += 1;
}

export function clearAdminLoginFailures(identifier: string) {
  loginAttempts.delete(loginAttemptKey(identifier));
}

export async function createAdminSession(admin: { id: string; username: string }) {
  const sessionSecret = getSessionSecret();
  if (!sessionSecret) throw new Error("Авторизация администратора не настроена");
  const session: AdminSession = { role: "ADMIN", adminId: admin.id, username: admin.username, expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  (await cookies()).set(SESSION_COOKIE, `${payload}.${sign(payload, sessionSecret)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function deleteAdminSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const sessionSecret = getSessionSecret();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionSecret || !token) return null;
  const [payload, signature, ...rest] = token.split(".");
  if (!payload || !signature || rest.length || !safeEqual(signature, sign(payload, sessionSecret))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
    if (session.role !== "ADMIN" || typeof session.adminId !== "string" || typeof session.username !== "string" || !Number.isFinite(session.expiresAt) || session.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    const admin = await adminRepository.findActiveById(session.adminId);
    if (!admin || admin.username !== session.username) return null;
    return session;
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
