import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";

export type ReadinessChecks = { app: "ok"; database: "ok" | "failed"; storage: "ok" | "failed" };

export async function checkReadiness(
  databaseCheck: () => Promise<unknown>,
  storageCheck: () => Promise<unknown> = () => {
    const root = path.resolve(/* turbopackIgnore: true */ process.env.IANEP_STORAGE_DIR || path.join(process.cwd(), ".ianep-storage"));
    return access(root, constants.R_OK | constants.W_OK);
  },
) {
  const checks: ReadinessChecks = { app: "ok", database: "ok", storage: "ok" };
  const failures: unknown[] = [];
  try { await databaseCheck(); } catch (error) { checks.database = "failed"; failures.push(error); }
  try { await storageCheck(); } catch (error) { checks.storage = "failed"; failures.push(error); }
  return { ready: failures.length === 0, checks, firstFailure: failures[0] };
}
