# AI Test Generator for GitHub Copilot (no API keys)

Give GitHub Copilot a **Jira story** (e.g. `SCRUM-7`) or a **requirements file** (`.xlsx`, `.csv`, `.txt`, `.md`).
A team of Copilot custom agents writes manual test cases, turns each one into a working test, and asks before
opening a **pull request**: a **Playwright** test for a web app, or a **Mobilewright** test for an Android / iOS app.

The AI model is Copilot's: no OpenAI or other LLM API key. Jira is read through the Atlassian MCP server,
which signs you in through the browser: no API token either.

## The team

```
 /write-test-cases or /automate-tests  <Jira key | requirements file | test case file | web | mobile>
        │
        ▼
 TEST CASE WRITER ──► test_cases/web/<KEY>-TC001.txt or test_cases/mobile/<KEY>-TC001.txt, ...
        │           (/write-test-cases stops here)
        │
        ▼
 QA SUPERVISOR  picks the platform (web, Android, iOS), then the next agent from a fixed table,
        │       max 12 steps per test case
        ├─► EXPLORER   does the steps in a real browser (Playwright MCP) or app (mobile MCP) and records the
        │              real code for each step (real locators + assertions); a failing step: 3 tries, then STOP
        ├─► GENERATOR  copies that code into the test, never writes a locator itself (max 2 rewrites)
        ├─► REVIEWER   8-point checklist (incl. "every locator is a real one"): APPROVED or CHANGES REQUESTED
        ├─► HEALER     runs the test; if it fails, fixes it (max 3 runs)
        ▼
 FINISH  close the browser or app, show the result, "Create a pull request? (yes/no)"
```

| | Web | Mobile (Android / iOS) |
|---|---|---|
| Requirements | `requirements/web/` | `requirements/mobile/` |
| Test cases | `test_cases/web/` | `test_cases/mobile/` |
| Drives the app with | Playwright MCP | `mobile-tests/act.mjs` (Mobilewright), plus the mobile MCP ([mobile-mcp](https://github.com/mobile-next/mobile-mcp)) to find devices and take screenshots |
| Real locators from | the code the Playwright MCP runs (`browser_generate_locator`, `browser_verify_*`) | `mobile-tests/act.mjs`: it taps and types with Mobilewright and prints the exact line for each action |
| Test file | `web-tests/tests/<name>.spec.ts` | `mobile-tests/tests/<name>.spec.ts` |

## Project layout

```
web-tests/          Playwright: package.json, playwright.config.ts, tests/, its own node_modules and reports
mobile-tests/       Mobilewright: package.json, mobilewright.config.ts, tests/, act.mjs + locator.mjs, its own node_modules and reports
demo-app/           the web Demo Shop (served at http://localhost:4173)
demo-mobile-app/    the native Android Demo Shop (build.sh -> build/demo-shop.apk)
requirements/
  web/              requirement files for web apps
  mobile/           requirement files for phone apps (Platform and App columns)
test_cases/
  web/              manual test cases for web apps     -> automated into web-tests/tests/
  mobile/           manual test cases for phone apps   -> automated into mobile-tests/tests/
```

The folder decides the platform: a requirements file in `requirements/mobile/` becomes test cases in
`test_cases/mobile/`, and those become Mobilewright tests. A test case can have the same name in both folders
(e.g. `DEMO-SHOP-TC011.txt`): its web and mobile tests do not clash. To run a web test case on a phone anyway,
add "on android" (or "on ios") to the command.

The two test sections are separate npm packages on purpose. Each installs only what it needs, so a web-only setup
never downloads the mobile tools (and the other way round), and each keeps its own Playwright version:
Mobilewright pins its own, which would clash with the web one in a shared `node_modules`. Reports and test
results stay inside each section.

| File | What it is |
|---|---|
| `.github/agents/*.agent.md` | The 6 agents: their instructions and allowed tools |
| `.github/pipeline.md` | How a run goes: which agent runs next, what each is told, retries; used by every agent |
| `.github/platforms.md` | Web vs mobile: how the platform is chosen, file names, commands, how mobile locators are found |
| `.github/prompts/*.prompt.md` | The `/write-test-cases` and `/automate-tests` commands |
| `.vscode/mcp.json` | Playwright MCP (browser), mobile MCP (phone) and Atlassian MCP (Jira) |
| `scripts/read_requirements.py` | Turns `.xlsx` / `.csv` into plain text for the writer (Copilot cannot open Excel) |
| `requirements/web/`, `requirements/mobile/` | Put your requirement files here |
| `test_cases/web/`, `test_cases/mobile/`, `web-tests/tests/`, `mobile-tests/tests/` | Written by the agents |

## Setup (one time)

Needs VS Code with GitHub Copilot Chat, Node.js 18+, and Python 3 for Excel/CSV files.

```bash
npm run setup:web                   # web-tests: Playwright, Playwright MCP and Chromium
npm run setup:mobile                # mobile-tests: Mobilewright (only for mobile)
pip install -r requirements.txt     # openpyxl, only for .xlsx files
```

For mobile you also need the Android SDK with an emulator (or Xcode with a simulator for iOS).

Then open `.vscode/mcp.json` and click **Start** above `playwright`, `mobile` (only for mobile) and `atlassian`
(Atlassian opens the browser to sign in). Your organization's Copilot policy must allow MCP servers.

## Run

In Copilot Chat, ask once; the team does the rest on its own (start a new chat each time you change an agent file):

```
/write-test-cases requirements/web/TC008.xlsx                  only the manual test cases (web)
/write-test-cases requirements/mobile/demo_shop.xlsx           only the manual test cases (phone)
/write-test-cases SCRUM-7                                      from Jira (add "for android" for a phone app)
/automate-tests test_cases/web/DEMO-SHOP-TC001.txt             explore, write, review and run the test
/automate-tests test_cases/mobile/DEMO-SHOP-TC001.txt          the same on a phone
/automate-tests "requirements/web/test_cases_test demo.csv"    everything in one go (quote paths with spaces)
/automate-tests mobile                                         every test case in test_cases/mobile/
/automate-tests mobile and open pull requests                  ... and no question at the end
```

What the supervisor does by itself, like a QA engineer handed the task:
- **Prepares the platform** with `node scripts/preflight.mjs web|mobile`: installs missing packages, starts the
  Demo Shop server, starts the Android emulator, builds the Demo Shop app. Only what it cannot fix (no Android SDK,
  no emulator set up) is reported back to you, with what to do.
- **Explores, writes, reviews, runs and heals** each test case in turn, posting one short line per step.
- **Recovers on its own**: an exploration that gets stuck is redone once from the start; a test that still fails
  after 3 healing runs is explored and written again once.
- **Asks one question at the end**: whether to open pull requests for the passing tests (none if you already said so).

`.vscode/settings.json` lets the agents run the project's own commands (preflight, act.mjs, test runs, type checks)
without a confirmation each time. Pushing and pull requests still ask. The first time Copilot asks to use a
`playwright` or `mobile` tool, choose **Always allow in this workspace**.

Or start with any one agent from the agent dropdown (e.g. **explorer** with a test case file): it does its own job,
then runs the rest of the team by itself as subagents (generator → reviewer → healer, with retries), posting one line
per step. No handoff buttons to click; they stay only as a manual fallback. How a run goes is in
`.github/pipeline.md`. `/write-test-cases` stops after the test cases; pick the **test-case-writer** agent directly
to have it carry on and automate them too.

Run the tests yourself:

```bash
npm run test:web                                        # every web test
npm run test:mobile                                     # every mobile test (emulator running)
cd web-tests && npx playwright test tests/<name>.spec.ts --headed
cd mobile-tests && npx mobilewright test tests/<name>.spec.ts
cd mobile-tests && npm run typecheck                    # catches calls that do not exist, in seconds (same in web-tests)
```

The generator type-checks every test it writes, and the healer type-checks before running: a test that calls an
API that does not exist (e.g. an Appium-style `mobile.findElement(...)`) is rewritten in the real API, with every
locator taken again from the real page or screen.

## Try it on the local Demo Shop

`demo-app/` is a small shop (login, sign up, products, cart, checkout) made for trying out the agents, and
`requirements/web/demo_shop.xlsx` holds 11 test cases for it (already written out in `test_cases/web/`).

```bash
npm run demo        # serves demo-app/ at http://localhost:4173 (the agents start it themselves when needed)
```

```
/write-test-cases requirements/web/demo_shop.xlsx
/automate-tests test_cases/web/DEMO-SHOP-TC001.txt
```

Demo account: `demo@shop.test` / `Demo@123`. `npm run test:web` starts the server by itself (see `webServer`
in `web-tests/playwright.config.ts`).

## Try it on the native Android Demo Shop (Mobilewright)

`demo-mobile-app/` is the same shop as a native Android app (package `com.demoshop.mobile`): same users,
products, prices, messages and order numbers. `requirements/mobile/demo_shop.xlsx` holds the same 11 test cases
written for the app (launch the app, tap, screens), already written out in `test_cases/mobile/`. Each element
has a resource id (`getByTestId('email')`) and an accessibility label (`getByLabel('Email')`).
The app keeps everything in memory, so every launch starts signed out with an empty cart, and the first order is `DS-1001`.

`mobile-tests/` holds [Mobilewright](https://mobilewright.dev) tests for it. Needs the Android SDK
(`ANDROID_HOME`), an Android emulator, JDK 17+ and Node.js (Mobilewright asks for 22.12+; it also ran here on 20).
No Gradle or Android Studio.

```bash
npm run build:mobile-app                # builds demo-mobile-app/build/demo-shop.apk
emulator -avd <your AVD> &               # start an emulator (list them: emulator -list-avds)
cd mobile-tests
npx mobilewright test                    # installs the app and runs tests/*.spec.ts
npx mobilewright inspect                 # browse the app's elements and locators in the browser
cd ..
node mobile-tests/act.mjs launch                    # start the app fresh
node mobile-tests/act.mjs screen                    # every element on screen with its real locator
node mobile-tests/act.mjs tap "Sign in"             # tap it, and print: await screen.getByRole('button', ...).tap();
```

With the emulator running, the agents automate them on the app:

```
/automate-tests test_cases/mobile/DEMO-SHOP-TC011.txt
```

## Faster runs

- When Copilot asks to use a `playwright` or `mobile` tool, choose **Always allow in this workspace**.
- Pick a fast model in the Copilot Chat model picker.
- An existing test file is run and healed, not explored again (say "regenerate" to rebuild it).
