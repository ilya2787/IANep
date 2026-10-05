import assert from "node:assert/strict";
import { test } from "node:test";
import { chmod, mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { assertReadableBackupStorage, backupAvailable, claim, execute, readStatus, cleanupExports, getDownload, pruneSuccessful, successfulSets, DOWNLOAD_HEADERS, PACKAGE_FILES, parseMode, authorizedDownload, packageExport } from "./core";
async function fixture() { return mkdtemp(join(tmpdir(), "ianep-backup-test-")); }
async function set(root: string, date: string, state="success") { const name = `${date.replace(/[-:]/g, "").replace(/\.000Z$/, "Z")}-aaaaaaaa`; const dir = join(root,name); await mkdir(dir); await writeFile(join(dir,"manifest.json"),JSON.stringify({name,state,createdAt:date,verified:state==="success"})); return name; }
test("retention preserves zero, one and two successful sets", async () => { for (const count of [0,1,2]) { const root=await fixture(); for(let i=0;i<count;i++) await set(root,`2026-10-0${i+1}T02:30:00.000Z`); await pruneSuccessful(root); assert.equal((await successfulSets(root)).length,count); } });
test("third verified success prunes oldest and keeps newest two", async () => { const root=await fixture(); const a=await set(root,"2026-10-01T02:30:00.000Z"), b=await set(root,"2026-10-02T02:30:00.000Z"), c=await set(root,"2026-10-03T02:30:00.000Z"); assert.deepEqual(await pruneSuccessful(root),[c,b]); assert.deepEqual((await successfulSets(root)).map(x=>x.name),[c,b]); assert.ok(!(await readdir(root)).includes(a)); });
test("failed and running sets never displace two successful sets", async () => { const root=await fixture(); const a=await set(root,"2026-10-01T02:30:00.000Z"),b=await set(root,"2026-10-02T02:30:00.000Z"); await set(root,"2026-10-03T02:30:00.000Z","failed"); await set(root,"2026-10-04T02:30:00.000Z","running"); await pruneSuccessful(root); assert.deepEqual((await successfulSets(root)).map(x=>x.name),[b,a]); });
test("metadata timestamp and symlink escape cannot trigger deletion", async () => { const root=await fixture(); const outside=await fixture(); await writeFile(join(outside,"keep"),"yes"); await symlink(outside,join(root,"20261001T023000Z-aaaaaaaa")); await set(root,"2026-10-02T02:30:00.000Z"); const forged="20261003T023000Z-aaaaaaaa"; await mkdir(join(root,forged)); await writeFile(join(root,forged,"manifest.json"),JSON.stringify({name:forged,state:"success",verified:true,createdAt:"2026-01-01T02:30:00.000Z"})); await pruneSuccessful(root); assert.equal(await readFile(join(outside,"keep"),"utf8"),"yes"); assert.equal((await successfulSets(root)).length,1); });
test("download ownership, session, TTL and cleanup", async () => { const root=await fixture(); const id="11111111-1111-4111-8111-111111111111"; const dir=join(root,"exports",id); await mkdir(dir,{recursive:true}); await writeFile(join(dir,"ianep-backup.tar.gz"),"archive"); await writeFile(join(dir,"job.json"),JSON.stringify({ownerId:"admin",sessionVersion:2,state:"ready",expiresAt:new Date(Date.now()+60000).toISOString()})); assert.equal(await authorizedDownload(root,id,null),null); assert.equal(await getDownload(root,id,"other",2),null); assert.equal(await getDownload(root,id,"admin",1),null); assert.equal(await getDownload(root,"../../etc/passwd","admin",2),null); assert.ok(await getDownload(root,id,"admin",2)); await cleanupExports(root,Date.now()+120000); assert.equal(await getDownload(root,id,"admin",2),null); });

test("request mode rejects paths and command text; package excludes secrets", () => { assert.equal(parseMode("../../etc"),null); assert.equal(parseMode("server; rm -rf /"),null); assert.deepEqual(PACKAGE_FILES,["database.dump","storage.tar.gz","SHA256SUMS","manifest.json"]); assert.ok(!PACKAGE_FILES.some(x=>x.includes("env") || x.includes("secret"))); assert.match(DOWNLOAD_HEADERS["Content-Disposition"],/^attachment;/); assert.match(DOWNLOAD_HEADERS["Cache-Control"],/no-store/); });

test("export archive contains exactly four expected files", async () => { const dir=await fixture(); for(const file of PACKAGE_FILES) await writeFile(join(dir,file),file); await writeFile(join(dir,".env.local"),"SECRET=must-not-export"); await packageExport(dir); const names=execFileSync("tar",["-tzf",join(dir,"ianep-backup.tar.gz")],{encoding:"utf8"}).trim().split("\n").map(x=>x.replace(/^\.\//,"")); assert.deepEqual(names,[...PACKAGE_FILES]); });

test("export directory symlink is rejected before cleanup", async () => { const root=await fixture(), outside=await fixture(); await symlink(outside,join(root,"exports")); await assert.rejects(cleanupExports(root)); assert.deepEqual(await readdir(outside),[]); });
test("backup availability distinguishes configured directory from missing or invalid paths", async () => { const root=await fixture(); assert.equal(await backupAvailable(root),true); assert.equal(await backupAvailable(join(root,"missing")),false); const file=join(root,"file"); await writeFile(file,""); assert.equal(await backupAvailable(file),false); });
test("backup source requires read and traversal but never write", async () => {
  const storage = await fixture();
  try {
    await chmod(storage, 0o500);
    await assert.doesNotReject(assertReadableBackupStorage(storage));
    await chmod(storage, 0o000);
    await assert.rejects(assertReadableBackupStorage(storage), /BACKUP_SOURCE_UNREADABLE/);
    await assert.rejects(assertReadableBackupStorage(join(storage, "missing")), /BACKUP_SOURCE_UNREADABLE/);
  } finally { await chmod(storage, 0o700); await rm(storage, { recursive: true }); }
});
test("runner packages read-only source into writable backup directory and reports unreadable source safely", async () => {
  const root = await fixture(), storage = await fixture(), bin = await fixture();
  const oldPath = process.env.PATH;
  try {
    await writeFile(join(storage, "file.txt"), "backup content");
    await writeFile(join(bin, "pg_dump"), "#!/bin/sh\n[ \"$1\" = '-Fc' ] && [ \"$2\" = '-f' ] || exit 2\nprintf 'mock database dump' > \"$3\"\n", { mode: 0o700 });
    await writeFile(join(bin, "pg_restore"), "#!/bin/sh\n[ \"$1\" = '--list' ] && test -s \"$2\"\n", { mode: 0o700 });
    process.env.PATH = `${bin}:${oldPath}`;
    await chmod(storage, 0o500);
    const first = await claim(root, "server");
    await execute(root, first, "postgresql://backup:placeholder@localhost/disposable", storage);
    assert.equal((await readStatus(root))?.state, "success");
    const [set] = await successfulSets(root);
    assert.ok(set);
    assert.match(execFileSync("tar", ["-tzf", join(root, set.name, "storage.tar.gz")], { encoding: "utf8" }), /file\.txt/);
    await chmod(storage, 0o000);
    const second = await claim(root, "server");
    await execute(root, second, "postgresql://backup:placeholder@localhost/disposable", storage);
    assert.deepEqual({ state: (await readStatus(root))?.state, message: (await readStatus(root))?.message }, { state: "failed", message: "Хранилище файлов недоступно для чтения." });
    assert.equal((await successfulSets(root)).length, 1);
  } finally { process.env.PATH = oldPath; await chmod(storage, 0o700); await Promise.all([root, storage, bin].map(path => rm(path, { recursive: true, force: true }))); }
});
