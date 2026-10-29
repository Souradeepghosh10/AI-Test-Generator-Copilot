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

The mobile app is the test case's `App:` field, else `bundleId` in `mobile-tests/mobilewright.config.ts`.

A web test case can still run on mobile when the user asks and the app is the same product (e.g. the Demo Shop and
its Android twin): "Navigate to <URL>" means "the app is open on its first screen", and a check of a page's URL or
heading becomes a check of the screen's heading text. Everything else (data, messages, expected results) stays as written.

## 2. Files and commands

`<name>` is the test case file name without `.txt`, in lower case: `test_cases/web/SCRUM-7-TC001.txt` -> `scrum-7-tc001`.
The same test case name can exist in both folders: its tests do not clash, because web and mobile tests live in
different folders.

|                     | Web                                                         | Mobile                                                              |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| Test file           | `web-tests/tests/<name>.spec.ts`                                      | `mobile-tests/tests/<name>.spec.ts`                                 |
| Test framework      | `import { test, expect } from '@playwright/test';`, `page`  | `import { test, expect } from '@mobilewright/test';`, `screen`      |
| Explore with        | Playwright MCP (`Ran Playwright code`, `browser_generate_locator`, `browser_verify_*`) | `node mobile-tests/act.mjs` (section 3)          |
| Prepare (once)      | `node scripts/preflight.mjs web <url>`: installs, starts the Demo Shop | `node scripts/preflight.mjs mobile`: installs, starts an emulator, builds the Demo Shop app |
| Check the code      | `cd web-tests && npm run typecheck`                         | `cd mobile-tests && npm run typecheck`                              |
| Run one test        | `cd web-tests && npx playwright test tests/<name>.spec.ts --reporter=list --retries=0 --headed` | `cd mobile-tests && npx mobilewright test tests/<name>.spec.ts --reporter=list --retries=0` |
| After a failure     | `web-tests/test-results/<name>-*/error-context.md` (the page at failure) | the error output (it names the locator and what it found)        |

A mobile test does not open the app itself: `mobile-tests/mobilewright.config.ts` installs it and starts it fresh
before each test, so the test begins on the app's first screen.

"Check the code" type-checks every test in the section in a few seconds, without a browser or phone. Run it after
writing or changing a test: an error there means the test calls something that does not exist (e.g.
`Property 'mobile' does not exist`, `Property 'findElement' does not exist`). Fix every error before running the test.

## 3. Mobile: explore with act.mjs

On a phone, every action goes through `mobile-tests/act.mjs`, in the terminal, from the project root. It acts on the
device with Mobilewright itself and prints the exact Mobilewright line for what it did: the mobile twin of the
Playwright MCP's `Ran Playwright code`. You copy its lines; you never write a mobile locator or API call yourself.

```
node mobile-tests/act.mjs launch                        start the app fresh (always first)
node mobile-tests/act.mjs screen                        what is on the screen, each element with its real locator
node mobile-tests/act.mjs tap "<element>"               tap a button, checkbox, radio, dropdown, dropdown option, ...
node mobile-tests/act.mjs fill "<field>" "<text>"       type into a field (prints the fill line and its value check)
node mobile-tests/act.mjs see "<text or element>"       check that something is visible
node mobile-tests/act.mjs value "<field>" "<text>"      check a field's value
node mobile-tests/act.mjs checked "<element>"           check that a checkbox or radio is checked
node mobile-tests/act.mjs back                          press Back
node mobile-tests/act.mjs scroll                        scroll down (for an element below the screen)
```

`<element>` is an element's text, label or resource id, exactly as `screen` shows it. Example:

```
$ node mobile-tests/act.mjs screen
Button text="Add to cart" label="Add Notebook A5 to cart" -> screen.getByRole('button', { name: 'Add Notebook A5 to cart' })
$ node mobile-tests/act.mjs tap "Add Notebook A5 to cart"
await screen.getByRole('button', { name: 'Add Notebook A5 to cart' }).tap();
$ node mobile-tests/act.mjs see "Notebook A5 added to cart"
await expect(screen.getByText('Notebook A5 added to cart')).toBeVisible();
```

- Run `screen` on every new screen before acting on it, and use the names it shows. The test case's wording is often
  not an element's name: six buttons say "Add to cart", and each has its own label ("Add Notebook A5 to cart").
- `act.mjs` scrolls by itself to an element below the screen or under the on-screen keyboard, and then prints a
  `scrollIntoViewIfNeeded()` line before the action: copy it too. It keeps the test working whether the keyboard
  shows or not. Use the `scroll` command only to look further down a long screen with `screen`.
- A line starting with `ERROR:` says what to do: use the exact name from `screen`, or a label instead of a shared
  text. Never work around an error by writing a line yourself.
- Options: `--device=<id>` when several devices run (ids from `mobile_list_available_devices`), `--ios` for iOS,
  `--type=Button` to pick one of several elements with the same name, `--app=<id>` for another app.
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
  await expect(screen.getByText('Sign in').first()).toBeVisible();

  // Step 2: Enter the email
  await screen.getByLabel('Email').fill('demo@shop.test');
  await expect(screen.getByLabel('Email')).toHaveValue('demo@shop.test');
});
```

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
