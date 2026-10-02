import { claim, execute, readStatus, ROOT } from "../src/server/backup/core";
import { securityAudit } from "../src/server/security/audit";

async function main() {
  const [command, mode, id] = process.argv.slice(2);
  if (command === "scheduled") {
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
main().catch(() => { process.exitCode = 1; });
