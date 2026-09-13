import assert from "node:assert/strict";
import test from "node:test";
import { notificationEmail, notificationLink } from "@/server/notifications/email-template";
import { notificationRetryDelayMs } from "@/server/notifications/retry";
import { NOTIFICATIONS_PAGE_SIZE, notificationPage } from "@/server/notifications/pagination";

test("notification pagination keeps ten items per page at list boundaries", () => {
  assert.equal(NOTIFICATIONS_PAGE_SIZE, 10);
  assert.deepEqual(notificationPage(0, 1), { page: 1, pages: 1, pageSize: 10, skip: 0 });
  assert.deepEqual(notificationPage(10, 1), { page: 1, pages: 1, pageSize: 10, skip: 0 });
  assert.deepEqual(notificationPage(11, 2), { page: 2, pages: 2, pageSize: 10, skip: 10 });
  assert.deepEqual(notificationPage(20, 2), { page: 2, pages: 2, pageSize: 10, skip: 10 });
  assert.deepEqual(notificationPage(21, 3), { page: 3, pages: 3, pageSize: 10, skip: 20 });
});

test("notification pagination normalizes invalid and excessive pages", () => {
  for (const page of [0, -2, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) assert.equal(notificationPage(21, page).page, 1);
  assert.deepEqual(notificationPage(21, 999), { page: 3, pages: 3, pageSize: 10, skip: 20 });
});

test("notification retry uses bounded exponential backoff", () => {
  assert.equal(notificationRetryDelayMs(1), 120_000);
  assert.equal(notificationRetryDelayMs(5), 1_920_000);
  assert.equal(notificationRetryDelayMs(20), 3_600_000);
});

test("notification email escapes dynamic values and keeps a useful text fallback", () => {
  const email = notificationEmail({
    title: `<script>alert("title")</script>`,
    message: `Проект <strong>важный</strong> & готов\nОткройте "сейчас"`,
    href: "/client/projects/project-1?tab=materials&view=<all>",
  });

  assert.doesNotMatch(email.html, /<script>|<strong>/);
  assert.match(email.html, /&lt;script&gt;alert\(&quot;title&quot;\)&lt;\/script&gt;/);
  assert.match(email.html, /Проект &lt;strong&gt;важный&lt;\/strong&gt; &amp; готов<br>Откройте &quot;сейчас&quot;/);
  assert.match(email.html, /tab=materials&amp;view=%3Call%3E/);
  assert.match(email.html, /Это автоматическое уведомление\. Отвечать на это письмо не нужно\./);
  assert.match(email.text, /<script>alert\("title"\)<\/script>/);
  assert.match(email.text, /Это автоматическое уведомление\. Отвечать на это письмо не нужно\./);
  assert.doesNotMatch(email.html, /background:#05050c/);
  assert.match(email.html, /src="cid:ianep-notification-mascot"/);
  assert.equal(email.attachments[0].cid, "ianep-notification-mascot");
  assert.match(email.attachments[0].path, /public\/images\/email\/mascot-notification-v1\.png$/);
});

test("notification email builds an absolute IANep action link", () => {
  const email = notificationEmail({ title: "Готово", message: "Откройте проект.", href: "/client/projects/project-1?tab=materials" });

  assert.match(email.html, /href="https:\/\/ianep\.ru\/client\/projects\/project-1\?tab=materials"/);
  assert.match(email.html, />Открыть в IANep<\/a>/);
  assert.match(email.text, /Открыть в IANep: https:\/\/ianep\.ru\/client\/projects\/project-1\?tab=materials/);
  assert.match(email.html, /Уведомление по проекту/);
  assert.match(email.html, /Конфиденциальные материалы и файлы не прикладываются/);
});

test("notification links reject external and unsafe URLs", () => {
  assert.equal(notificationLink("https://evil.example/client/projects/1"), null);
  assert.equal(notificationLink("//evil.example/client/projects/1"), null);
  assert.equal(notificationLink("javascript:alert(1)"), null);
  assert.equal(notificationLink("https://user:secret@ianep.ru/client/projects/1"), null);
  assert.equal(notificationLink("https://ianep.ru/client/projects/1"), "https://ianep.ru/client/projects/1");
});
