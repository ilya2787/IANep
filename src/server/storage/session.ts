import { getAdminSession } from "@/server/auth/admin-auth";
import { getClientSession } from "@/server/client/auth";
import type { Actor } from "@/server/client/service";
export async function fileActor(side?: string | null): Promise<Actor | null> {
  if (side !== "CLIENT") { const admin = await getAdminSession(); if (admin) return { id: admin.adminId, side: "ADMIN" }; }
  if (side !== "ADMIN") { const client = await getClientSession(); if (client) return { id: client.id, side: "CLIENT" }; }
  return null;
}
