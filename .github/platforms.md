# Web and mobile

The team automates a test case either in a browser (Playwright) or on a phone (Mobilewright: Android emulators
and devices, iOS simulators). Every agent follows these rules. Read this file once, when you first need it.

## 1. Which platform

Requirements and test cases are kept apart by platform:

| Folder                                 | Platform                                                        |
| -------------------------------------- | --------------------------------------------------------------- |
| `requirements/web/`, `test_cases/web/` | Web                                                             |
| `requirements/mobile/`, `test_cases/mobile/` | Mobile: the `Platform:` field or column (`Android` or `iOS`), else Android |

For each test case, the first rule that matches wins:
1. The user says so: "web" or "browser" -> Web; "android", "mobile", "phone" or "app" -> Android; "ios" or "iphone" -> iOS.
2. The folder (table above).
3. The test case's `Platform:` field (`Web`, `Android` or `iOS`).
4. Web.

The app under test is set once in `qa.config.json` at the project root (`web.url`, `mobile.appId`, ...), and each
test case can name its own:
- Web: the page is the test case's `URL:` field (or the URL in its first step), else `web.url`.
- Mobile: the app is the test case's `App:` field, else `mobile.appId`; the platform is `mobile.platform` unless the
  test case says iOS or Android.

A web test case can still run on mobile when the user asks and the app is the same product (e.g. a website and its
Android app): "Navigate to <URL>" means "the app is open on its first screen", and a check of a page's URL or
heading becomes a check of the screen's heading text. Everything else (data, messages, expected results) stays as written.

## 2. Files and commands

`<name>` is the test case file name without `.txt`, in lower case: `test_cases/web/SCRUM-7-TC001.txt` -> `scrum-7-tc001`.
The same test case name can exist in both folders: its tests do not clash, because web and mobile tests live in
different folders.

|                     | Web                                                         | Mobile                                                              |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| Test file           | `web-tests/tests/<name>.spec.ts`                                      | `mobile-tests/tests/<name>.spec.ts`                                 |
| Test framework      | `import { test, expect } from '@playwright/test';`, `page`  | `import { test, expect } from '@mobilewright/test';`, `screen`      |
| Explore with        | `node web-tests/act.mjs` (section 6); the Playwright MCP (`Ran Playwright code`, `browser_generate_locator`, `browser_verify_*`) only if it cannot run | `node mobile-tests/act.mjs` (section 3)          |
| Prepare (once)      | `node scripts/preflight.mjs web <url>`: installs, checks the app is reachable (starts it with `web.startCommand` if set) | `node scripts/preflight.mjs mobile` (`--ios` / `--android`): installs, starts an emulator, checks (or builds) the app file |
| Check the code      | `cd web-tests && npm run typecheck`                         | `cd mobile-tests && npm run typecheck`                              |
| Run one test        | `cd web-tests && npx playwright test tests/<name>.spec.ts --reporter=list --retries=0 --headed` | `cd mobile-tests && npx mobilewright test tests/<name>.spec.ts --reporter=list --retries=0` |
| After a failure     | `web-tests/test-results/<name>-*/error-context.md` (the page at failure) | the error output (it names the locator and what it found)        |

A mobile test does not open the app itself: `mobile-tests/mobilewright.config.ts` installs it (`mobile.appFile`) and
starts it fresh (`mobile.appId`) before each test, so the test begins on the app's first screen. A test for another
app than `mobile.appId` (the test case's `App:` differs) adds one line after the import: `test.use({ bundleId: '<App>' });`.

"Check the code" type-checks every test in the section in a few seconds, without a browser or phone. Run it after
writing or changing a test: an error there means the test calls something that does not exist (e.g.
`Property 'mobile' does not exist`, `Property 'findElement' does not exist`). Fix every error before running the test.

## 3. Mobile: explore with act.mjs

On a phone, every action goes through `mobile-tests/act.mjs`, in the terminal, from the project root. It acts on the
device with Mobilewright itself and prints the exact Mobilewright line for what it did: the mobile twin of the
Playwright MCP's `Ran Playwright code`. You copy its lines; you never write a mobile locator or API call yourself.

```
node mobile-tests/act.mjs launch --app=<App>            start the test case's app fresh (always first; no --app: mobile.appId)
node mobile-tests/act.mjs screen                        what is on the screen, each element with its real locator
node mobile-tests/act.mjs tap "<element>"               tap a button, checkbox, radio, dropdown, dropdown option, ...
node mobile-tests/act.mjs fill "<field>" "<text>"       type into a field (prints the fill line and its value check)
node mobile-tests/act.mjs see "<text or element>"       check that something is visible
node mobile-tests/act.mjs value "<field>" "<text>"      check a field's value
node mobile-tests/act.mjs checked "<element>"           check that a checkbox or radio is checked
node mobile-tests/act.mjs back                          press Back
node mobile-tests/act.mjs scroll                        scroll down (for an element below the screen)
node mobile-tests/act.mjs find "<part of a name>"       only the elements whose text, label or id contains it
```

Several steps in one call, separated by a standalone `+`, run in order and stop at the first `ERROR:` (the steps
after it are listed as `// not run: ...`; every line printed before the error is real):
`node mobile-tests/act.mjs fill "Email" "user@example.com" + fill "Password" "Secret@123" + tap "Log in" --type=Button + see "Welcome"`.
Put every step whose element names you already know (from `screen` or `find`) into one call: it is one connection to
the phone and one tool call instead of one per step. An option such as `--type=Button` belongs to the step it is in.

`<element>` is an element's text, label or resource id, exactly as `screen` shows it. Example:

```
$ node mobile-tests/act.mjs screen
Button text="Delete" label="Delete Invoice 42" -> screen.getByRole('button', { name: 'Delete Invoice 42' })
$ node mobile-tests/act.mjs tap "Delete Invoice 42"
await screen.getByRole('button', { name: 'Delete Invoice 42' }).tap();
$ node mobile-tests/act.mjs see "Invoice 42 deleted"
await expect(screen.getByText('Invoice 42 deleted')).toBeVisible();
```

- Run `screen` on every new screen before acting on it, and use the names it shows. The test case's wording is often
  not an element's name: several buttons can say "Delete", each with its own label ("Delete Invoice 42").
- `act.mjs` scrolls by itself to an element below the screen or under the on-screen keyboard, and then prints a
  `scrollIntoViewIfNeeded()` line before the action: copy it too. It keeps the test working whether the keyboard
  shows or not. Use the `scroll` command only to look further down a long screen with `screen`.
- A line starting with `ERROR:` says what to do: use the exact name from `screen`, or a label instead of a shared
  text. Never work around an error by writing a line yourself.
- Options: `--device=<id>` when several devices run (ids from `mobile_list_available_devices`), `--ios` / `--android`
  when the test case's platform is not `mobile.platform`, `--type=Button` to pick one of several elements with the
  same name, `--app=<id>` (with `launch`) for the test case's app.
- The mobile MCP is for `mobile_list_available_devices` and `mobile_take_screenshot` (to look at the screen when
  something is unclear). Do not tap, type or list elements with it: its refs and ids are not test code.

## 4. Mobile: real locators

Every locator `act.mjs` prints is checked against the live screen with Mobilewright's own matching, and kept in
`mobile-tests/locators.log`, which the reviewer reads to check that a test's locators are real.
`node mobile-tests/locator.mjs "<element>" ...` prints locators without acting on the elements, if you need one.

## 5. Mobile: the Mobilewright API

A mobile test is Mobilewright, not Appium, WebdriverIO or Detox. It has exactly this shape:

```ts
import { test, expect } from '@mobilewright/test';

test('<TEST CASE ID> - <title>', async ({ screen }) => {
  // Step 1: Launch the app
  await expect(screen.getByText('Log in').first()).toBeVisible();

  // Step 2: Enter the email
  await screen.getByLabel('Email').fill('user@example.com');
  await expect(screen.getByLabel('Email')).toHaveValue('user@example.com');
});
```

- Only when the test case's `App:` is not `mobile.appId` in `qa.config.json`: add `test.use({ bundleId: '<App>' });`
  right after the import line. Nothing else changes.

- The only fixture is `screen` (and `device` if you need the device itself). There is no `mobile`, `driver`,
  `app`, `client` or `page` fixture.
- There is no step to launch, install or close the app: the config does it.
- Elements are found only with locators copied from `act.mjs`: `screen.getByRole(...)`, `getByLabel(...)`,
  `getByText(...)`, `getByTestId(...)`, sometimes with `.first()` / `.nth(i)`. Never pass an object like
  `{ id, text, type }`, never use `android.widget...` class names, `findElement`, `$()`, `launchApp`, `tap({...})`
  or `type(...)`: those do not exist in Mobilewright.

`act.mjs` prints these lines for you; they have a fixed shape (`<locator>` is a printed locator):

| Step                                      | Code                                                  |
| ----------------------------------------- | ----------------------------------------------------- |
| tap a button, link, menu item, radio, ... | `await <locator>.tap();`                              |
| pick an option in a dropdown              | tap the dropdown, then tap the option (two `act.mjs tap` calls) |
| type into a field                         | `await <locator>.fill('<text>');`                     |
| go back                                   | `await screen.goBack();`                              |
| scroll down                               | `await screen.swipe('up');`                           |
| something is visible                      | `await expect(<locator>).toBeVisible();`              |
| a field holds a value                     | `await expect(<locator>).toHaveValue('<text>');`      |
| a checkbox or radio is checked            | `await expect(<locator>).toBeChecked();`              |
| a button is enabled / disabled            | `await expect(<locator>).toBeEnabled();` / `toBeDisabled()` |

## 6. Web: explore with act.mjs

In a browser, every action goes through `web-tests/act.mjs`, in the terminal, from the project root. It drives a real
browser with Playwright (the same Desktop Chrome settings as the tests) and prints the exact Playwright line for what it
did: the same code the Playwright MCP prints as `Ran Playwright code`, made by the same locator generator, for far fewer
tokens (a short list of elements instead of the whole page snapshot, and several steps per call). You copy its lines;
you never write a locator yourself. The browser stays open between calls until `close`.

```
node web-tests/act.mjs open "<url>"                  start a fresh browser on the page (always first; prints page.goto)
node web-tests/act.mjs screen                        the page's elements, one line each: role "name", value, options
node web-tests/act.mjs find "<part of a name>"       only the elements whose name or text contains it, with locators
node web-tests/act.mjs click "<element>"             click a button, link, checkbox, menu item, ... (hover: the same)
node web-tests/act.mjs fill "<field>" "<text>"       type into a field (prints the fill line and its value check)
node web-tests/act.mjs select "<dropdown>" "<option>"  pick an option (prints the selectOption line and its value check)
node web-tests/act.mjs check "<element>"             tick a checkbox or radio (uncheck: the same)
node web-tests/act.mjs press "<key>"                 press a key, e.g. "Enter" (press "<field>" "<key>" for one field)
node web-tests/act.mjs see "<text or element>"       check that something is visible
node web-tests/act.mjs value "<field>" "<text>"      check a field's value
node web-tests/act.mjs checked "<element>"           check that a checkbox or radio is checked
node web-tests/act.mjs url                           check the page URL
node web-tests/act.mjs goto "<url>" | back           open another URL / go back
node web-tests/act.mjs locator "<element>" ...       print locators without acting (like browser_generate_locator)
node web-tests/act.mjs close                         close the browser (always last)
```

`<element>` is an element's accessible name, text or placeholder, exactly as `screen` shows it. Steps can be joined
with `+`, exactly as on mobile (section 3), and stop at the first `ERROR:`. Example (a login page):

```
$ node web-tests/act.mjs open "https://example.com/login" + see "Log in" + screen
await page.goto('https://example.com/login');
await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
// https://example.com/login
heading "Log in"
textbox "Email" placeholder="Enter your email"
textbox "Password" placeholder="Enter your password"
button "Log in"
link "Forgot password?"
$ node web-tests/act.mjs fill "Email" "user@example.com" + fill "Password" "Secret@123" + click "Log in" + see "Dashboard" + url
await page.getByRole('textbox', { name: 'Email' }).fill('user@example.com');
await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue('user@example.com');
...
await expect(page).toHaveURL('https://example.com/dashboard');
```

- Run `screen` (or `find`) on every new page, or after opening a menu, and use the names it shows. Several buttons
  can show "Delete" and each have its own name ("Delete Invoice 42"): `screen` shows
  `button "Delete Invoice 42" text="Delete"`.
- A line starting with `ERROR:` says what to do: use the exact name, or add `--role=<role>` / `--nth=<i>`. Never work
  around an error by writing a line yourself.
- Every locator it prints is kept in `web-tests/locators.log`, which the reviewer reads.
- `open` with no URL opens `web.url` from `qa.config.json`. `getByTestId` uses its `web.testIdAttribute`, as the
  tests do. `open "<url>" --headed` shows the browser window. If `act.mjs` cannot run at all, use the Playwright MCP tools
  instead (same report, same rules).
