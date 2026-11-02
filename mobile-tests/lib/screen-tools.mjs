// Shared helpers for act.mjs and locator.mjs: connect to the device, read the screen once, and find the real
// Mobilewright locator of an element with Mobilewright's own matching engine (queryAll), so a locator printed here
// matches exactly the same elements in a test.
import { appendFileSync } from 'node:fs';
import { android, ios } from 'mobilewright';
import { queryAll } from '@mobilewright/core';
import qa from '../../scripts/qa-config.cjs';

const ROLES = {
  button: ['button', 'imagebutton', 'materialbutton', 'appcompatbutton', 'floatingactionbutton'],
  checkbox: ['checkbox', 'appcompatcheckbox', 'materialcheckbox'],
  radio: ['radio', 'radiobutton', 'appcompatradiobutton', 'materialradiobutton'],
  switch: ['switch', 'toggle', 'togglebutton', 'switchcompat', 'switchmaterial'],
};
const INPUT_TYPES = ['edittext', 'appcompatedittext', 'textinputedittext', 'textfield', 'securetextfield', 'searchfield'];
const TAPPABLE_TYPES = [...Object.values(ROLES).flat(), 'spinner', 'appcompatspinner', 'checkedtextview', ...INPUT_TYPES];

// The app under test, from qa.config.json (the same values mobilewright.config.ts uses)
export const config = {
  platform: qa.mobile.platform,
  bundleId: qa.mobile.appId,
  installApps: qa.mobile.appFile,
};

export const quote = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
export const typeName = (node) => node.type.split('.').pop();
const typeOf = (node) => typeName(node).toLowerCase();
const shortId = (node) => (node.resourceId || node.identifier || '').split(':id/').pop();
const roleOf = (node) => Object.keys(ROLES).find((role) => ROLES[role].includes(typeOf(node)));
const flatten = (nodes) => nodes.flatMap((n) => [n, ...flatten(n.children || [])]);
export const isInput = (node) => INPUT_TYPES.includes(typeOf(node));
export const isTappable = (node) => TAPPABLE_TYPES.includes(typeOf(node));
const isSystem = (node) => /^android:id\//.test(node.resourceId || node.identifier || '') &&
  !node.text && !node.label;

/**
 * Connects to the device (the first running one, or --device=<id>) of the configured platform (--ios / --android to
 * choose another). The app is not restarted.
 */
export async function connect(args) {
  const deviceId = args.find((a) => a.startsWith('--device='))?.slice('--device='.length);
  const name = args.includes('--ios') ? 'ios' : args.includes('--android') ? 'android' : config.platform;
  const platform = name === 'ios' ? ios : android;
  return platform.launch({ autoAppLaunch: false, ...(deviceId && { deviceId }) });
}

const idOf = (node) => node.resourceId || node.identifier || '';

/** The app's elements on the current screen (the status bar, system bars and empty layout boxes left out). */
export async function snapshot(screen) {
  const tree = await screen.viewTree();
  const appRoots = tree.filter((root) => !flatten([root]).some((n) => idOf(n).startsWith('com.android.systemui:')));
  const nodes = flatten(appRoots).filter(
    (n) => n.isVisible !== false && !isSystem(n) && (n.text || n.label || (shortId(n) && shortId(n) !== 'content'))
  );
  return { tree, nodes };
}

/** Elements whose text, label or resource id is exactly `target`. */
export function findNodes(nodes, target) {
  return nodes.filter((n) => n.text === target || n.label === target || shortId(n) === target || n.identifier === target);
}

function candidates(screen, node) {
  const list = [];
  const role = roleOf(node);
  const name = node.label || node.text;
  if (role && name) list.push([`screen.getByRole('${role}', { name: ${quote(name)} })`, screen.getByRole(role, { name })]);
  if (node.label) list.push([`screen.getByLabel(${quote(node.label)})`, screen.getByLabel(node.label)]);
  if (node.text) list.push([`screen.getByText(${quote(node.text)})`, screen.getByText(node.text)]);
  if (shortId(node)) list.push([`screen.getByTestId(${quote(shortId(node))})`, screen.getByTestId(shortId(node))]);
  return list;
}

/**
 * The real locator of `node`: the first candidate that matches only this element, else the first candidate that
 * reaches it with .first() / .nth(i). Returns { code, locator } or null.
 */
export function locatorFor(screen, tree, node) {
  const list = candidates(screen, node);
  for (const [code, locator] of list) {
    const hits = queryAll(tree, locator.strategy);
    if (hits.length === 1 && hits[0] === node) return { code, locator };
  }
  for (const [code, locator] of list) {
    const i = queryAll(tree, locator.strategy).indexOf(node);
    if (i === 0) return { code: `${code}.first()`, locator: locator.first() };
    if (i > 0) return { code: `${code}.nth(${i})`, locator: locator.nth(i) };
  }
  return null;
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
