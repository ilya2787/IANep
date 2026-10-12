import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { authenticateAdmin } from "@/server/auth/admin-auth";
import { adminRepository } from "@/server/auth/admin.repository";
import { hashAdminPassword, verifyAdminPassword } from "@/server/auth/admin-password";
import { prisma } from "@/server/db/prisma";

test("пароль администратора хранится как scrypt-хэш", () => {
  const password = "Надёжный тестовый пароль 2026";
  const hash = hashAdminPassword(password);
  assert.equal(hash.includes(password), false);
  assert.equal(verifyAdminPassword(password, hash), true);
  assert.equal(verifyAdminPassword("Неверный пароль", hash), false);
});

test("авторизация использует активного администратора из БД", async () => {
  const username = `admin-test-${randomUUID()}`;
  const password = "Надёжный тестовый пароль 2026";
  const admin = await prisma.adminUser.create({
    data: { username, passwordHash: hashAdminPassword(password), role: "operator" },
  });

  try {
    assert.deepEqual(await authenticateAdmin(username, password), { id: admin.id, username });
    assert.equal(await authenticateAdmin(username, "Неверный пароль"), null);
    assert.equal(await authenticateAdmin(`missing-${randomUUID()}`, password), null);
    const before = await adminRepository.findActiveById(admin.id);
    assert.equal(before?.role, "operator");
    await adminRepository.revokeSessions(admin.id);
    const revoked = await adminRepository.findActiveById(admin.id);
    assert.equal(revoked?.sessionVersion, (before?.sessionVersion ?? 0) + 1);

    await prisma.adminUser.update({ where: { id: admin.id }, data: { active: false } });
    assert.equal(await authenticateAdmin(username, password), null);
    assert.equal(await adminRepository.findActiveById(admin.id), null);
  } finally {
    await prisma.adminUser.delete({ where: { id: admin.id } });
    await prisma.$disconnect();
  }
});
