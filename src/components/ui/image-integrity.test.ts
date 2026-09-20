import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(dirname(new URL(import.meta.url).pathname), "../../..");
const sourceRoot = join(projectRoot, "src");
const publicRoot = join(projectRoot, "public");
const imageReference = /["'`](\/[^"'`\s]+?\.(?:avif|gif|ico|jpe?g|png|svg|webp))["'`]/gi;

function filesBelow(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

function resolvesWithExactCase(pathname: string): boolean {
  let directory = publicRoot;
  for (const segment of pathname.slice(1).split("/")) {
    const entry = readdirSync(directory).find((name) => name === segment);
    if (!entry) return false;
    directory = join(directory, entry);
  }
  return statSync(directory).isFile();
}

test("every source-referenced public image exists with exact filename casing", () => {
  const missing: string[] = [];
  const references = new Set<string>();

  for (const file of filesBelow(sourceRoot).filter((path) => /\.(?:css|ts|tsx)$/.test(path))) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(imageReference)) {
      references.add(match[1]);
      if (!resolvesWithExactCase(match[1])) missing.push(`${match[1]} (${relative(projectRoot, file)})`);
    }
  }

  assert.ok(references.size > 0, "No public image references were discovered");
  assert.deepEqual(missing, []);
});
