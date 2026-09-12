import Link from "next/link";
import type { LegalContentSection, LegalInline } from "@/config/brief-consent";
import type { LegalSection } from "./LegalDocument";

function renderInline(item: LegalInline, index: number) {
  return item.type === "link" && item.href ? <Link href={item.href} key={index}>{item.value}</Link> : item.value;
}

export function structuredLegalSections(sections: readonly LegalContentSection[]): LegalSection[] {
  return sections.map((section) => ({ id: section.id, title: section.title, content: section.blocks.map((block, blockIndex) => <p key={blockIndex}>{block.content.map(renderInline)}</p>) }));
}
