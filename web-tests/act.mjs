// Drives a real browser with Playwright and prints the exact Playwright code line for each action: the same lines the
// Playwright MCP prints as "Ran Playwright code", for far fewer tokens (a short element list instead of the whole
// page snapshot, and several steps in one call). The web twin of mobile-tests/act.mjs. Run it from the project root:
//
//   node web-tests/act.mjs open "https://example.com/login"  start a fresh browser on that page (no URL: web.url
//                                                     in qa.config.json)
//   node web-tests/act.mjs screen                     the page's elements, one line each (--locators adds locators)
//   node web-tests/act.mjs find "cart"                only the elements whose name or text contains "cart", with locators
//   node web-tests/act.mjs locator "Email" "Log in"   print real locators without acting (like browser_generate_locator)
//   node web-tests/act.mjs click "Log in"             click an element (also: hover)
//   node web-tests/act.mjs fill "Email" "a@b.c"       type into a field (and check its value)
//   node web-tests/act.mjs select "Country" "India"   pick an option in a dropdown (and check its value)
//   node web-tests/act.mjs check "Remember me"        tick a checkbox / radio (also: uncheck)
//   node web-tests/act.mjs press "Enter"              press a key (press "Search" "Enter" for a field)
//   node web-tests/act.mjs see "Welcome"              check that a text or element is visible
//   node web-tests/act.mjs value "Email" "a@b.c"      check a field's value
//   node web-tests/act.mjs checked "Remember me"      check that a checkbox / radio is checked
//   node web-tests/act.mjs url                        check the page URL
//   node web-tests/act.mjs goto "<url>" | back        open another URL / go back
//   node web-tests/act.mjs close                      close the browser
//
// Several steps in one call, separated by a standalone +, run in order and stop at the first error:
//   node web-tests/act.mjs fill "Email" "a@b.c" + fill "Password" "x" + click "Log in" + see "Dashboard" + url
//
// An element is named by its accessible name, text or placeholder, exactly as `screen` shows it. When several
// elements share it, click/fill/select/check pick the one of the right kind; add --role=button (any role `screen`
// shows) or --nth=<i> to choose. Options: --headed (with open) to watch the browser.
// Each command prints only code lines, ready to copy; on a problem it prints "ERROR: ..." and exits with 1.
// The browser keeps running between calls (a small server in the background, closed after 30 idle minutes).
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { ROLES, describe, findNodes, locatorFor, logLocators, quote, snapshot, splitSteps, textLocator } from './lib/page-tools.mjs';
import qa from '../scripts/qa-config.cjs';

const STATE = new URL('./.browser.json', import.meta.url);
const WAIT_MS = 5000;
const IDLE_MS = 30 * 60_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parse(argv) {
  const options = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => {
    const [key, value = true] = a.slice(2).split('=');
    return [key, value];
  }));
  const [command, target, text] = argv.filter((a) => !a.startsWith('--'));
  return { command, target, text, options };
}

// ---- the browser side: runs in the background server -------------------------------------------------------------

/** Finds the element named `target` and its real locator, waiting up to 5 s for it to appear. */
async function resolveTarget(page, { target, options }, prefer) {
  const deadline = Date.now() + WAIT_MS;
  for (;;) {
    const matches = findNodes(await snapshot(page), target, options.role).filter((n) => n.ref);
    if (matches.length) {
      const preferred = prefer ? matches.filter((n) => prefer.includes(n.role)) : [];
      const pool = preferred.length ? preferred : matches;
      if (options.nth !== undefined) {
        const node = pool[Number(options.nth)];
        if (!node) throw new Error(`there are only ${pool.length} elements called "${target}"`);
        return locatorFor(page, node);
      }
      // Several elements of the right kind with the same name: never guess which one
      if (preferred.length > 1) {
        const names = preferred.map((n) => `${n.role} "${n.name || n.text}"`).join('; ');
        throw new Error(`${preferred.length} elements are called "${target}" (${names}). ` +
          'Add --role=<role> or --nth=<i>, or name it by another name the screen command shows.');
      }
      return locatorFor(page, pool[0]);
    }
    if (Date.now() > deadline) {
      throw new Error(`"${target}" is not on the page. Run the screen command (or find "<part of it>") and use an ` +
        'exact name.');
    }
    await sleep(300);
  }
}

/** Lets the page react to an action (navigation, scripts) before the next step looks at it. */
async function settle(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await sleep(300);
}

async function waitFor(check) {
  const deadline = Date.now() + WAIT_MS;
  while (!(await check().catch(() => false))) {
    if (Date.now() > deadline) return false;
    await sleep(200);
  }
  return true;
}

const commands = {
  async open(page, step, out) {
    return commands.goto(page, step, out);
  },

  async goto(page, { target }, out) {
    if (!target) throw new Error('no URL: give one, or set web.url in qa.config.json');
    await page.goto(target);
    out.push(`await page.goto(${quote(target)});`);
  },

  async screen(page, { options }, out) {
    out.push(`// ${page.url()}`);
    for (const { node, line } of describe(await snapshot(page))) {
      out.push(options.locators && node.ref ? `${line} -> ${(await locatorFor(page, node)).code}` : line);
    }
  },

  async find(page, { target }, out) {
    const part = target.toLowerCase();
    const hits = describe(await snapshot(page)).filter(({ node }) =>
      [node.name, node.text, node.placeholder].some((s) => s?.toLowerCase().includes(part)));
    if (!hits.length) throw new Error(`nothing on the page contains "${target}"`);
    for (const { node, line } of hits) {
      const found = node.ref ? await locatorFor(page, node) : await textLocator(page, node.text);
      out.push(`${line} -> ${found ? found.code : 'no locator'}`);
      if (found) logLocators([found.code]);
    }
  },

  async locator(page, step, out) {
    for (const target of step.rest) {
      const { code } = await resolveTarget(page, { ...step, target });
      logLocators([code]);
      out.push(`${target}: ${code}`);
    }
  },

  async click(page, step, out) {
    const { code, locator } = await resolveTarget(page, step, ROLES.click);
    await locator.click();
    await settle(page);
    logLocators([code]);
    out.push(`await ${code}.click();`);
  },

  async hover(page, step, out) {
    const { code, locator } = await resolveTarget(page, step, ROLES.click);
    await locator.hover();
    await settle(page);
    logLocators([code]);
    out.push(`await ${code}.hover();`);
  },

  async fill(page, step, out) {
    if (step.text === undefined) throw new Error('fill needs a text: fill "<field>" "<text>"');
    const { code, locator } = await resolveTarget(page, step, ROLES.fill);
    await locator.fill(step.text);
    logLocators([code]);
    out.push(`await ${code}.fill(${quote(step.text)});`);
    if (!(await waitFor(async () => (await locator.inputValue()) === step.text))) {
      throw new Error(`the field does not show "${step.text}" after typing`);
    }
    out.push(`await expect(${code}).toHaveValue(${quote(step.text)});`);
  },

  async select(page, step, out) {
    if (step.text === undefined) throw new Error('select needs an option: select "<dropdown>" "<option>"');
    const { code, locator } = await resolveTarget(page, step, ROLES.select);
    await locator.selectOption(step.text);
    await settle(page);
    logLocators([code]);
    out.push(`await ${code}.selectOption(${quote(step.text)});`);
    // The value is the option's value attribute, which can differ from the label: print the real one
    out.push(`await expect(${code}).toHaveValue(${quote(await locator.inputValue())});`);
  },

  async check(page, step, out) {
    const { code, locator } = await resolveTarget(page, step, ROLES.check);
    await locator.check();
    await settle(page);
    logLocators([code]);
    out.push(`await ${code}.check();`, `await expect(${code}).toBeChecked();`);
  },

  async uncheck(page, step, out) {
    const { code, locator } = await resolveTarget(page, step, ROLES.check);
    await locator.uncheck();
    await settle(page);
    logLocators([code]);
    out.push(`await ${code}.uncheck();`, `await expect(${code}).not.toBeChecked();`);
  },

  async press(page, step, out) {
    if (step.text === undefined) {
      await page.keyboard.press(step.target);
      await settle(page);
      out.push(`await page.keyboard.press(${quote(step.target)});`);
      return;
    }
    const { code, locator } = await resolveTarget(page, step, ROLES.fill);
    await locator.press(step.text);
    await settle(page);
    logLocators([code]);
    out.push(`await ${code}.press(${quote(step.text)});`);
  },

  async see(page, step, out) {
    const deadline = Date.now() + WAIT_MS;
    for (;;) {
      // An element with that name (heading, button, ...), else a visible text that contains it
      const node = findNodes(await snapshot(page), step.target, step.options.role).find((n) => n.ref);
      const found = node ? await locatorFor(page, node) : await textLocator(page, step.target);
      if (found && (await found.locator.isVisible())) {
        logLocators([found.code]);
        out.push(`await expect(${found.code}).toBeVisible();`);
        return;
      }
      if (Date.now() > deadline) throw new Error(`"${step.target}" is not visible`);
      await sleep(300);
    }
  },

  async value(page, step, out) {
    const { code, locator } = await resolveTarget(page, step, ROLES.fill);
    const actual = await locator.inputValue();
    if (actual !== step.text) throw new Error(`the field shows "${actual}", not "${step.text}"`);
    logLocators([code]);
    out.push(`await expect(${code}).toHaveValue(${quote(step.text)});`);
  },

  async checked(page, step, out) {
    const { code, locator } = await resolveTarget(page, step, ROLES.check);
    if (!(await waitFor(() => locator.isChecked()))) throw new Error(`"${step.target}" is not checked`);
    logLocators([code]);
    out.push(`await expect(${code}).toBeChecked();`);
  },

  async url(page, step, out) {
    out.push(`await expect(page).toHaveURL(${quote(page.url())});`);
  },

  async back(page, step, out) {
    await page.goBack();
    await settle(page);
    out.push('await page.goBack();');
  },
};

const NO_TARGET = ['open', 'screen', 'url', 'back', 'close'];

function usageError({ command, target, text }, i) {
  if (command === 'close' && i > 0) return 'close must be on its own';
  if (!commands[command] && command !== 'close') return `unknown command "${command}"; use ${Object.keys(commands).join(' | ')} | close`;
  if (!NO_TARGET.includes(command) && target === undefined) return `${command} needs an element, text or URL`;
  if (['fill', 'select', 'value'].includes(command) && text === undefined) return `${command} needs a second text`;
  return null;
}

async function serve(headed) {
  const { chromium, devices, selectors } = await import('@playwright/test');
  // getByTestId() locators use the app's own test id attribute, as the tests do (playwright.config.ts)
  selectors.setTestIdAttribute(qa.web.testIdAttribute);
  const browser = await chromium.launch({ headless: !headed });
  // The same browser settings as the tests (playwright.config.ts: Desktop Chrome)
  const context = await browser.newContext({ ...devices['Desktop Chrome'] });
  let page = await context.newPage();
  context.on('page', (p) => { page = p; });
  let idle;
  let queue = Promise.resolve();

  const quit = async () => {
    server.close();
    await browser.close().catch(() => {});
    if (existsSync(STATE) && JSON.parse(readFileSync(STATE, 'utf8')).pid === process.pid) rmSync(STATE);
    process.exit(0);
  };
  const keepAlive = () => {
    clearTimeout(idle);
    idle = setTimeout(quit, IDLE_MS);
  };

  async function run(steps) {
    const out = [];
    for (const [i, argv] of steps.entries()) {
      const step = parse(argv);
      step.rest = argv.filter((a) => !a.startsWith('--')).slice(1);
      try {
        if (page.isClosed()) page = context.pages().at(-1) ?? await context.newPage();
        await commands[step.command](page, step, out);
      } catch (error) {
        const where = steps.length > 1 ? `step ${i + 1} (${argv.join(' ')}): ` : '';
        out.push(`ERROR: ${where}${error.message.split('\n')[0]}`);
        if (i < steps.length - 1) out.push(`// not run: ${steps.slice(i + 1).map((s) => s.join(' ')).join(' + ')}`);
        return { out, ok: false };
      }
    }
    return { out, ok: true };
  }

  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      keepAlive();
      if (req.url === '/quit') {
        res.end('{}');
        quit();
        return;
      }
      if (req.method !== 'POST') return res.end('{"ok":true}');
      queue = queue.then(async () => res.end(JSON.stringify(await run(JSON.parse(body).steps))));
    });
  });
  server.listen(0, '127.0.0.1', () => {
    writeFileSync(STATE, JSON.stringify({ port: server.address().port, pid: process.pid }));
    keepAlive();
  });
}

// ---- the command line side -----------------------------------------------------------------------------------------

function readState() {
  try {
    return JSON.parse(readFileSync(STATE, 'utf8'));
  } catch {
    return null;
  }
}

async function call(path, payload) {
  const state = readState();
  if (!state) return null;
  try {
    const response = await fetch(`http://127.0.0.1:${state.port}${path}`, {
      method: payload ? 'POST' : 'GET',
      body: payload && JSON.stringify(payload),
    });
    return await response.json();
  } catch {
    return null;
  }
}

async function stopBrowser() {
  const state = readState();
  if (!state) return;
  if (!(await call('/quit', {}))) {
    try { process.kill(state.pid); } catch { /* already gone */ }
  }
  rmSync(STATE, { force: true });
}

async function startBrowser(headed) {
  await stopBrowser();
  spawn(process.execPath, [fileURLToPath(import.meta.url), '--serve', ...(headed ? ['--headed'] : [])], {
    cwd: fileURLToPath(new URL('.', import.meta.url)), detached: true, stdio: 'ignore',
  }).unref();
  const deadline = Date.now() + 30_000;
  while (!(await call('/'))) {
    if (Date.now() > deadline) return false;
    await sleep(200);
  }
  return true;
}

const argv = process.argv.slice(2);
if (argv[0] === '--serve') {
  await serve(argv.includes('--headed'));
} else {
  const steps = splitSteps(argv);
  // open with no URL: the app's page from qa.config.json
  if (steps[0]?.[0] === 'open' && !steps[0].slice(1).some((a) => !a.startsWith('--')) && qa.web.url) steps[0].push(qa.web.url);
  const problem = steps.length ? steps.map(parse).map((s, i) => usageError(s, i)).find(Boolean) : 'no command';
  if (problem) {
    console.log(`ERROR: ${problem}. Usage: node web-tests/act.mjs <command> ["<name or url>"] ["<text>"] [+ <command> ...]`);
    process.exit(2);
  }
  const first = parse(steps[0]);
  if (first.command === 'close') {
    await stopBrowser();
    console.log('// browser closed');
    process.exit(0);
  }
  if (first.command === 'open' && !(await startBrowser(!!first.options.headed))) {
    console.log('ERROR: the browser did not start. Run: node scripts/preflight.mjs web');
    process.exit(1);
  }
  const result = await call('/', { steps });
  if (!result) {
    console.log('ERROR: no browser is open. Start one with: node web-tests/act.mjs open "<url>"');
    process.exit(1);
  }
  console.log(result.out.join('\n'));
  process.exitCode = result.ok ? 0 : 1;
}
