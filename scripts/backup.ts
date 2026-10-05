import { claim, execute, readStatus, ROOT } from "../src/server/backup/core";
import { securityAudit } from "../src/server/security/audit";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { tmpdir } from "node:os";

async function main() {
  const [command, mode, id] = process.argv.slice(2);
  if (command === "scheduled") {
    try { await access(tmpdir(), constants.R_OK | constants.W_OK | constants.X_OK); }
    catch { throw new Error("BACKUP_TEMP_UNWRITABLE"); }
    const status = await claim(ROOT, "server");
    await securityAudit("BACKUP_STARTED", "BACKUP", status.id, { mode: "server", source: "timer" });
    await execute(ROOT, status, process.env.DATABASE_URL || "", process.env.IANEP_STORAGE_DIR || "");
    const result = await readStatus();
    await securityAudit(result?.state === "success" ? "BACKUP_SUCCEEDED" : "BACKUP_FAILED", "BACKUP", status.id, { mode: "server" });
    if (result?.state !== "success") process.exitCode = 1;
  } else if (command === "worker" && (mode === "server" || mode === "download") && id) {
    const status = await readStatus();
    if (!status || status.id !== id || status.mode !== mode || status.state !== "running") throw new Error("Invalid backup job");
    await execute(ROOT, status, process.env.DATABASE_URL || "", process.env.IANEP_STORAGE_DIR || "");
    const result = await readStatus();
    await securityAudit(result?.state === "success" ? "BACKUP_SUCCEEDED" : "BACKUP_FAILED", "BACKUP", id, { mode });
  } else throw new Error("Invalid backup command");
}
main().catch(error => {
  const code = error instanceof Error && /^BACKUP_(?:SOURCE_UNREADABLE|DESTINATION_UNWRITABLE|TEMP_UNWRITABLE|BUSY)$/.test(error.message)
    ? error.message : "BACKUP_FAILED";
  console.error(code);
  process.exitCode = 1;
});
