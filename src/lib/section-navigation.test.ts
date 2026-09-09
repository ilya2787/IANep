import assert from "node:assert/strict";
import test from "node:test";
import { cleanHomeUrl, isHomeSectionHref, sectionIdFromHref } from "./section-navigation";

test("recognises links to sections on the home page", () => {
  assert.equal(isHomeSectionHref("#brief"), true);
  assert.equal(isHomeSectionHref("/#projects"), true);
  assert.equal(isHomeSectionHref("/projects/onyx-cleaning#result"), false);
});

test("extracts a decoded section id", () => {
  assert.equal(sectionIdFromHref("/#brief"), "brief");
  assert.equal(sectionIdFromHref("#all%2Dprojects"), "all-projects");
});

test("builds the clean home URL without a fragment", () => {
  assert.equal(cleanHomeUrl({ pathname: "/", search: "" }), "/");
  assert.equal(cleanHomeUrl({ pathname: "/", search: "?source=case" }), "/?source=case");
});
