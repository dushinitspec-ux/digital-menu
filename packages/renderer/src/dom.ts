export type Child = Node | string | null | undefined | false;

export function h(tag: string, className?: string, children: Child[] = []): HTMLElement {
  const el = document.createElement(tag);
  if (className) el.className = className;
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}
