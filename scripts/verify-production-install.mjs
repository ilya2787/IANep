import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8"));
const lockfile = JSON.parse(readFileSync(path.join(projectRoot, "package-lock.json"), "utf8"));

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production", npm_config_omit: "dev" },
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`${command} ${args.join(" ")} завершилась с кодом ${result.status}`);
  }
  return result.stdout.trim();
}

assert.equal(manifest.dependencies?.tsx, "4.23.13");
assert.equal(manifest.devDependencies?.tsx, undefined);
assert.equal(lockfile.packages?.[""]?.dependencies?.tsx, "4.23.13");
assert.notEqual(lockfile.packages?.["node_modules/tsx"]?.dev, true);
assert.notEqual(lockfile.packages?.["node_modules/esbuild"]?.dev, true);
assert.match(run("npm", ["ls", "--omit=dev", "--all", "tsx"]), /tsx@4\.23\.13/);
assert.equal(
  run(process.execPath, ["--import", "tsx", "--eval", "console.log('tsx production loader: OK')"]),
  "tsx production loader: OK",
);

console.log("Production dependency graph сохраняет рабочий tsx loader при NODE_ENV=production и omit=dev.");
