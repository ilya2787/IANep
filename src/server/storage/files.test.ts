import assert from "node:assert/strict";
import test from "node:test";

async function fileChecks() {
  process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/ianep_unit_test";
  return import("./files");
}

test("upload names cannot hide an extension or contain a path or control character", async () => {
  const { uploadName } = await fileChecks();
  assert.equal(uploadName("результат.png"), "результат.png");
  assert.equal(uploadName("е\u0308ж.png"), "ёж.png");
  for (const name of ["", ".png", "report.final.pdf", "script.js.png", "../image.png", "C:\\image.png", "image\u0000.png", "image\u202egnp.png", "image.png "]) {
    assert.throws(() => uploadName(name), name);
  }
});

test("file signature must match its single allowed extension", async () => {
  const { inspectFile } = await fileChecks();
  const png = Buffer.from("89504e470d0a1a0a", "hex");
  assert.equal(inspectFile("image.png", png).mimeType, "image/png");
  assert.throws(() => inspectFile("image.jpg", png));
  assert.throws(() => inspectFile("script.js.png", png));
  assert.throws(() => inspectFile("script.svg", Buffer.from("<svg/>")));
  assert.throws(() => inspectFile("payload.html", Buffer.from("<script/>")));
  assert.throws(() => inspectFile("payload.txt", Buffer.from("<script>alert(1)</script>")));
  assert.throws(() => inspectFile("payload.txt", Buffer.from("#!/bin/sh\ntrue")));
  assert.throws(() => inspectFile("payload.txt", Buffer.from("MZbinary")));
});
