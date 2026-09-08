import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";

const cookie = "ianep_client_session";
function secret() { const value = process.env.ADMIN_SESSION_SECRET; if (!value || value.length < 32) throw new Error("Авторизация не настроена"); return value; }
function sign(payload: string) { return createHmac("sha256", secret()).update(`CLIENT:${payload}`).digest("base64url"); }
export async function createClientSession(id: string, sessionVersion: number) {
  const payload = Buffer.from(JSON.stringify({ id, role: "CLIENT", sessionVersion, expiresAt: Date.now() + 43200000 })).toString("base64url");
  (await cookies()).set(cookie, `${payload}.${sign(payload)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 43200 });
}
export async function deleteClientSession() {
  const session = await getClientSession();
  if (session) await prisma.clientUser.updateMany({ where: { id: session.id }, data: { sessionVersion: { increment: 1 } } });
  (await cookies()).delete(cookie);
}
export async function getClientSession() {
  const token = (await cookies()).get(cookie)?.value;
  if (!token) return null;
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    const expected = Buffer.from(sign(payload)); const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (session.role !== "CLIENT" || typeof session.id !== "string" || !Number.isInteger(session.sessionVersion) || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) return null;
    return await prisma.clientUser.findFirst({ where: { id: session.id, active: true, sessionVersion: session.sessionVersion }, select: { id: true, name: true, username: true } });
  } catch { return null; }
}
export async function requireClient() { const client = await getClientSession(); if (!client) redirect("/client/login"); return client; }
