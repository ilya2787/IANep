import { cleanupExports, ROOT } from "../src/server/backup/core";
cleanupExports(ROOT).catch(() => { process.exitCode = 1; });
