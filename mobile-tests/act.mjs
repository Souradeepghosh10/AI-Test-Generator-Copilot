// Drives the app on the device with Mobilewright and prints the exact Mobilewright code line for each action: the mobile
// twin of the Playwright MCP's "Ran Playwright code". The agents explore with it and copy the printed lines into tests,
// so a mobile test never holds a guessed locator or an invented API. Run it from the project root:
//
//   node mobile-tests/act.mjs launch                     start the app fresh (bundleId from mobilewright.config.ts)
//   node mobile-tests/act.mjs screen                     list the app's elements on screen, each with its real locator
//   node mobile-tests/act.mjs tap "Sign in"              tap an element
//   node mobile-tests/act.mjs fill "Email" "a@b.c"       type into a field (and check its value)
//   node mobile-tests/act.mjs see "Welcome, Demo User"   check that a text or element is visible
//   node mobile-tests/act.mjs value "Email" "a@b.c"      check a field's value
//   node mobile-tests/act.mjs checked "Playwright"       check that a checkbox / radio is checked
//   node mobile-tests/act.mjs back | scroll              press Back / scroll down
//
// An element is named by its text, label or resource id, as `screen` shows it. One that is not on the screen is
// scrolled to; one in the lower half of the screen (where the on-screen keyboard can cover it) gets a
// scrollIntoViewIfNeeded() line first, so the test works with and without the keyboard.
// When several elements share it
// (e.g. the heading "Sign in" and the button "Sign in"), tap/fill pick the tappable one and see/checked the first one;
// add --type=Button (any type `screen` shows) to choose. Options: --device=<id>, --ios, --app=<bundle id>.
// Each command prints only code lines, ready to copy; on a problem it prints "ERROR: ..." and exits with 1.
import { config, connect, findNodes, isInput, isTappable, locatorFor, logLocators, quote, snapshot, typeName } from './lib/screen-tools.mjs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const options = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const [command, target, text] = args.filter((a) => !a.startsWith('--'));
const WAIT_MS = 5000;

const fail = (message) => {
  console.log(`ERROR: ${message}`);
  process.exitCode = 1;
};

const MAX_SWIPES = 4;

/**
 * Finds the element and its real locator: waits up to 2 s for it to appear, then scrolls down to look for it (it may
 * be below the screen or under the on-screen keyboard), then waits for the rest of the 5 s.
 * `scroll` is true when the test should bring it into view first: it was found by scrolling, or it sits in the
 * lower half of the screen, where the on-screen keyboard covers it on some runs and not on others.
 */
async function resolveTarget(screen, prefer, needsPreferred = true) {
  const found = await findTarget(screen, prefer, needsPreferred);
  const { tree, node } = found;
  const bottom = Math.max(...flattenBounds(tree));
  const middle = node.bounds.y + node.bounds.height / 2;
  return { ...found, scroll: found.scrolled || middle > bottom / 2 };
}

function flattenBounds(nodes) {
  return nodes.flatMap((n) => [n.bounds ? n.bounds.y + n.bounds.height : 0, ...flattenBounds(n.children || [])]);
}

async function findTarget(screen, prefer, needsPreferred) {
  const start = Date.now();
  let swipes = 0;
  for (;;) {
    const { tree, nodes } = await snapshot(screen);
    let matches = findNodes(nodes, target);
    if (options.type) matches = matches.filter((n) => typeName(n).toLowerCase() === options.type.toLowerCase());
    const preferred = matches.filter(prefer);
    // tap / fill want a tappable element: while only a heading or label with that name is visible (e.g. the heading
    // "Create account" while the button is under the keyboard), keep scrolling to look for the real one
    const settle = !needsPreferred || preferred.length > 0 || (swipes >= MAX_SWIPES && Date.now() - start > WAIT_MS);
    if (matches.length && settle) {
      // Several tappable elements with the same name (e.g. six "Add to cart" buttons): never guess which one
      if (preferred.length > 1) {
        const names = preferred.map((n) => `${typeName(n)} label="${n.label || ''}" text="${n.text || ''}"`).join('; ');
        throw new Error(`${preferred.length} elements are called "${target}" (${names}). ` +
          'Name the one you mean by its label or resource id, as the screen command shows.');
      }
      const node = preferred[0] ?? matches[0];
      const found = locatorFor(screen, tree, node);
      if (!found) throw new Error(`no unique locator for "${target}": name it by its resource id (see the screen command)`);
      return { ...found, tree, node, scrolled: swipes > 0 };
    }
    const waited = Date.now() - start;
    if (waited > 2000 && swipes < MAX_SWIPES) {
      await screen.swipe('up');
      swipes++;
    } else if (waited > WAIT_MS && swipes >= MAX_SWIPES) {
      throw new Error(`"${target}" is not on the screen, even after scrolling down. Run the screen command and use ` +
        'an exact text, label or id.');
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

/** Brings the element into view in the test too (a no-op when it already is), and prints that line. */
async function scrollLine({ code, locator, scroll }) {
  if (!scroll) return;
  await locator.scrollIntoViewIfNeeded();
  console.log(`await ${code}.scrollIntoViewIfNeeded();`);
}

async function waitFor(check) {
  const deadline = Date.now() + WAIT_MS;
  while (!(await check())) {
    if (Date.now() > deadline) return false;
    await new Promise((r) => setTimeout(r, 300));
  }
  return true;
}

const commands = {
  async launch(device) {
    const app = options.app || config.bundleId;
    await device.terminateApp(app).catch(() => {});
    try {
      await device.launchApp(app);
    } catch {
      // Not installed yet: install the build named in mobilewright.config.ts, then launch
      const apk = resolve(fileURLToPath(new URL('.', import.meta.url)), config.installApps);
      await device.installApp(apk);
      await device.launchApp(app);
    }
    console.log(`// ${app} started fresh (a test needs no line for this: the config starts the app)`);
  },

  async screen(device) {
    const { tree, nodes } = await snapshot(device.screen);
    for (const node of nodes) {
      const found = locatorFor(device.screen, tree, node);
      const name = [node.text && `text="${node.text}"`, node.label && node.label !== node.text && `label="${node.label}"`,
        node.isChecked && 'checked'].filter(Boolean).join(' ');
      console.log(`${typeName(node)} ${name}`.trim() + ` -> ${found ? found.code : 'no locator'}`);
    }
  },

  async locate(device) {
    const { tree, nodes } = await snapshot(device.screen);
    for (const query of args.filter((a) => !a.startsWith('--')).slice(1)) {
      const matches = findNodes(nodes, query);
      if (!matches.length) fail(`"${query}" is not on the screen`);
      for (const node of matches) {
        const found = locatorFor(device.screen, tree, node);
        console.log(`${query} (${typeName(node)}): ${found ? found.code : 'NO LOCATOR FOUND'}`);
        if (found) logLocators([found.code]);
      }
    }
  },

  async tap(device) {
    const target_ = await resolveTarget(device.screen, isTappable);
    const { code, locator } = target_;
    await scrollLine(target_);
    await locator.tap();
    logLocators([code]);
    console.log(`await ${code}.tap();`);
  },

  async fill(device) {
    if (text === undefined) throw new Error('fill needs a text: fill "<field>" "<text>"');
    const target_ = await resolveTarget(device.screen, isInput);
    const { code, locator } = target_;
    await scrollLine(target_);
    await locator.fill(text);
    const ok = await waitFor(async () => (await locator.getValue().catch(() => null)) === text);
    logLocators([code]);
    console.log(`await ${code}.fill(${quote(text)});`);
    if (ok) console.log(`await expect(${code}).toHaveValue(${quote(text)});`);
    else fail(`the field does not show "${text}" after typing`);
  },

  async see(device) {
    const target_ = await resolveTarget(device.screen, () => false, false);
    const { code, locator } = target_;
    await scrollLine(target_);
    if (!(await waitFor(() => locator.isVisible().catch(() => false)))) throw new Error(`"${target}" is not visible`);
    logLocators([code]);
    console.log(`await expect(${code}).toBeVisible();`);
  },

  async value(device) {
    const target_ = await resolveTarget(device.screen, isInput);
    const { code, locator } = target_;
    await scrollLine(target_);
    const actual = await locator.getValue().catch(() => null);
    if (actual !== text) throw new Error(`the field shows "${actual}", not "${text}"`);
    logLocators([code]);
    console.log(`await expect(${code}).toHaveValue(${quote(text)});`);
  },

  async checked(device) {
    const target_ = await resolveTarget(device.screen, isTappable);
    const { code, locator } = target_;
    await scrollLine(target_);
    if (!(await waitFor(() => locator.isChecked().catch(() => false)))) throw new Error(`"${target}" is not checked`);
    logLocators([code]);
    console.log(`await expect(${code}).toBeChecked();`);
  },

  async back(device) {
    await device.screen.goBack();
    console.log('await screen.goBack();');
  },

  async scroll(device) {
    await device.screen.swipe('up');
    console.log("await screen.swipe('up');");
  },
};

if (!commands[command]) {
  console.log(`Usage: node mobile-tests/act.mjs <${Object.keys(commands).join(' | ')}> ["<text, label or id>"] ["<text>"]`);
  process.exit(2);
}
if (!['launch', 'screen', 'back', 'scroll'].includes(command) && !target) {
  console.log(`Usage: node mobile-tests/act.mjs ${command} "<text, label or id>"${command === 'fill' || command === 'value' ? ' "<text>"' : ''}`);
  process.exit(2);
}

const device = await connect(args);
try {
  await commands[command](device);
} catch (error) {
  fail(error.message.split('\n')[0]);
} finally {
  await device.close();
}
