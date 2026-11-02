// Shared helpers for act.mjs: read the page once as a small list of elements, and find the real Playwright locator of
// an element with Playwright's own generator (locator.normalize(), the same call browser_generate_locator makes), so a
// locator printed here is exactly what the Playwright MCP would print.
import { appendFileSync } from 'node:fs';

export const quote = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const CONTAINERS = ['generic', 'none', 'presentation', 'main', 'banner', 'navigation', 'contentinfo', 'region', 'list',
  'listitem', 'group', 'form', 'article', 'section', 'complementary', 'table', 'rowgroup', 'row', 'document', 'iframe'];
export const ROLES = {
  click: ['button', 'link', 'checkbox', 'radio', 'switch', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'tab',
    'option', 'combobox', 'textbox', 'searchbox', 'treeitem', 'cell', 'gridcell', 'row'],
  fill: ['textbox', 'searchbox', 'combobox', 'spinbutton'],
  select: ['combobox', 'listbox'],
  check: ['checkbox', 'radio', 'switch', 'menuitemcheckbox', 'menuitemradio'],
};

const flatten = (nodes, parent) => nodes.flatMap((n) => typeof n === 'string'
  ? [{ role: 'text', text: n, parent }]
  : [{ ...n, parent }, ...flatten(n.children || [], n)]);

/**
 * The page's elements, flattened: { role, name, text, ref, checked, disabled, placeholder, options, selected }.
 * Taking it gives every element a fresh ref, used once to build its locator.
 */
export async function snapshot(page) {
  const tree = await page.ariaSnapshotJSON({ mode: 'ai' });
  return flatten(tree).map((n) => {
    const options = (n.children || []).filter((c) => c.role === 'option');
    return { ...n, options: options.map((o) => o.name), selected: options.find((o) => o.selected)?.name };
  });
}

/** One line per element worth acting on or checking: no layout boxes, no texts that only repeat a field's label. */
export function describe(nodes) {
  const names = new Set(nodes.filter((n) => n.name).map((n) => n.name));
  return nodes.filter((n) => {
    if (n.role === 'option' && n.parent?.role !== 'listbox') return false;
    if (n.name) return true;
    if (!n.text || names.has(n.text)) return false;
    return n.role === 'text' || CONTAINERS.includes(n.role) || n.role === 'paragraph' || !!n.ref;
  }).map((n) => {
    const role = n.name ? n.role : 'text';
    const parts = [n.name ? `${role} "${n.name}"` : `text "${n.text}"`];
    if (n.name && n.text && n.text !== n.name) parts.push(ROLES.fill.includes(n.role) ? `value="${n.text}"` : `text="${n.text}"`);
    if (n.placeholder) parts.push(`placeholder="${n.placeholder}"`);
    if (n.checked) parts.push('checked');
    if (n.disabled) parts.push('disabled');
    if (n.options.length) parts.push(`selected="${n.selected ?? ''}" options: ${n.options.join(' | ')}`);
    return { node: n, line: parts.join(' ') };
  });
}

/** Elements whose accessible name, text or placeholder is exactly `target` (`--role=<role>` narrows it down). */
export function findNodes(nodes, target, role) {
  return nodes.filter((n) => (n.name === target || n.text === target || n.placeholder === target) &&
    (!role || n.role === role.toLowerCase()));
}

/** The real locator of an element from the snapshot: { code: "page.getBy...", locator }. */
export async function locatorFor(page, node) {
  const locator = await page.locator(`aria-ref=${node.ref}`).normalize();
  return { code: `page.${locator.toString()}`, locator };
}

/** The real locator of a visible text, as browser_verify_text_visible makes it. */
export async function textLocator(page, text) {
  const all = page.getByText(text).filter({ visible: true });
  if (await all.count() === 0) return null;
  const locator = await all.normalize();
  return { code: `page.${locator.toString()}`, locator };
}

/** Keeps every real locator in locators.log, which the reviewer checks tests against. */
export function logLocators(codes) {
  if (codes.length) appendFileSync(new URL('../locators.log', import.meta.url), codes.join('\n') + '\n');
}

/** Splits `a "b" + c "d"` style argument lists into steps at each standalone `+`. */
export function splitSteps(args) {
  const steps = [[]];
  for (const a of args) a === '+' ? steps.push([]) : steps.at(-1).push(a);
  return steps.filter((s) => s.length);
}
