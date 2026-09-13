import assert from "node:assert/strict";
import test from "node:test";
import { getActiveNavigationItem, type WorkspaceNavigationItem } from "./responsive-navigation";

const items: WorkspaceNavigationItem[] = [
  { href: "/admin", label: "Заявки", matchPrefixes: ["/admin", "/admin/briefs"] },
  { href: "/admin/projects", label: "Проекты" },
  { href: "/admin/notifications", label: "Уведомления" },
];

test("selects the most specific workspace route", () => {
  assert.equal(getActiveNavigationItem("/admin/projects/project-1", items)?.label, "Проекты");
});

test("supports related detail routes without changing their URLs", () => {
  assert.equal(getActiveNavigationItem("/admin/briefs/brief-1", items)?.label, "Заявки");
});

test("does not mark an unrelated route as active", () => {
  assert.equal(getActiveNavigationItem("/client", items), undefined);
});
