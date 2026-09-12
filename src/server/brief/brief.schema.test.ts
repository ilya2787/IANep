import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { submitBriefSchema } from './brief.schema';
import { validBriefPayload } from './brief.test-fixture';
import { briefProjectTypes, getGoalOptions } from '@/components/sections/brief.data';

test('миграция не приписывает старым Brief доказательство согласия', async () => {
  const sql = await readFile('prisma/migrations/20260911230000_brief_consent_evidence/migration.sql', 'utf8');
  assert.match(sql, /ADD COLUMN "consent_accepted_at" TIMESTAMP\(3\)/);
  assert.match(sql, /ADD COLUMN "consent_version" VARCHAR\(50\)/);
  assert.doesNotMatch(sql, /UPDATE\s+"brief_requests"/i);
});

test('схема принимает все типы проекта и нормализует текст', () => {
  for (const project of briefProjectTypes) {
    const input = validBriefPayload();
    input.projectType = project.id;
    input.answers.goals = getGoalOptions(project.id).slice(0, 1);
    input.answers.features = [];
    input.answers.description = '  Описание задачи для проверки  ';
    const result = submitBriefSchema.parse(input);
    assert.equal(result.name, 'Тест API');
    assert.equal(result.contact, 'api@example.com');
    assert.equal(result.answers.description, 'Описание задачи для проверки');
  }
});

test('схема проверяет все способы связи', () => {
  for (const [method, valid, invalid] of [
    ['Email', 'user@example.com', 'not-email'],
    ['Телефон', '+7 (900) 123-45-67', 'abc1234567890'],
    ['Telegram', '@test_user', '@x'],
  ]) {
    const input = validBriefPayload();
    input.answers.contactMethod = method;
    input.contact = valid;
    const result = submitBriefSchema.safeParse(input);
    assert.ok(result.success);
    if (result.success && method === 'Телефон') assert.equal(result.data.contact, '+79001234567');
    input.contact = invalid;
    assert.equal(submitBriefSchema.safeParse(input).success, false);
  }
});

test('email нормализуется, а телефон проверяется сервером независимо от маски', () => {
  const email = validBriefPayload();
  email.contact = '  USER@Example.RU ';
  assert.equal(submitBriefSchema.parse(email).contact, 'user@example.ru');

  const phone = validBriefPayload();
  phone.answers.contactMethod = 'Телефон';
  phone.contact = '8 999 123 45 67';
  assert.equal(submitBriefSchema.parse(phone).contact, '+79991234567');
  phone.contact = '9991234567';
  assert.equal(submitBriefSchema.safeParse(phone).success, false);
  phone.contact = '+1 (415) 555-0100';
  assert.equal(submitBriefSchema.safeParse(phone).success, false);
});

test('схема отклоняет несовместимые и неполные ответы', () => {
  const mutations = [
    (p: ReturnType<typeof validBriefPayload>) => { p.answers.goals = []; },
    (p: ReturnType<typeof validBriefPayload>) => { p.answers.features = ['Онлайн-оплата']; },
    (p: ReturnType<typeof validBriefPayload>) => { p.answers.materials.push('Фотографии'); },
    (p: ReturnType<typeof validBriefPayload>) => { p.answers.readiness = 'Всё готово'; },
    (p: ReturnType<typeof validBriefPayload>) => { p.answers.timeframe = 'Есть конкретная дата'; },
    (p: ReturnType<typeof validBriefPayload>) => { p.answers.timeframe = 'Есть конкретная дата'; p.answers.launchDate = '2026-02-30'; },
    (p: ReturnType<typeof validBriefPayload>) => { p.answers.launchDate = '2027-01-01'; },
    (p: ReturnType<typeof validBriefPayload>) => { p.answers.consent = false; },
    (p: ReturnType<typeof validBriefPayload>) => { p.answers.features = ['Другое']; },
    (p: ReturnType<typeof validBriefPayload>) => { p.answers.goals.push(p.answers.goals[0]); },
    (p: ReturnType<typeof validBriefPayload>) => { p.answers.designReference = 'javascript:alert(1)'; },
    (p: ReturnType<typeof validBriefPayload>) => { p.projectType = 'UNKNOWN'; },
    (p: ReturnType<typeof validBriefPayload>) => { p.answers.description = 'x'.repeat(3001); },
  ];
  for (const mutate of mutations) {
    const input = validBriefPayload();
    mutate(input);
    assert.equal(submitBriefSchema.safeParse(input).success, false);
  }
});

test('конкретная календарная дата принимается', () => {
  const input = validBriefPayload();
  input.answers.timeframe = 'Есть конкретная дата';
  input.answers.launchDate = '2027-01-15';
  assert.ok(submitBriefSchema.safeParse(input).success);
});
