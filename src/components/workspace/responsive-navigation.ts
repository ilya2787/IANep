export type WorkspaceNavigationItem = {
  href: string;
  label: string;
  matchPrefixes?: string[];
};

function matchesPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getActiveNavigationItem(
  pathname: string,
  items: WorkspaceNavigationItem[],
) {
  return items
    .flatMap((item) => (item.matchPrefixes ?? [item.href]).map((prefix) => ({ item, prefix })))
    .filter(({ prefix }) => matchesPath(pathname, prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]?.item;
}
