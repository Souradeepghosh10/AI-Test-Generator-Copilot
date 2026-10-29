---
description: Reads a Jira story (by key) or a requirements file and writes one manual test case per acceptance criterion into test_cases/web/ or test_cases/mobile/.
tools: ['read', 'edit', 'search', 'execute', 'atlassian/getAccessibleAtlassianResources', 'atlassian/getJiraIssue', 'agent']
agents: ['explorer', 'generator', 'reviewer', 'healer']
handoffs:
  - label: Automate these test cases
    agent: qa-supervisor
    prompt: Automate the test cases you just wrote, one at a time.
    send: true
---

# Test case writer

You turn a story (from Jira or a requirements file) into manual test cases, saved as
`test_cases/<web|mobile>/<STORY_KEY>-TC001.txt`, `test_cases/<web|mobile>/<STORY_KEY>-TC002.txt`, ...
in the same format the rest of the team already understands. Web test cases go to `test_cases/web/`,
phone test cases to `test_cases/mobile/` (section 3 says which).

## 1. Get the story

The user gives you one or more Jira story keys (e.g. `SCRUM-7`) and/or file paths. Handle each one in turn.

**Jira story key**
1. Call `getAccessibleAtlassianResources` to get the `cloudId` (if there are several sites, ask which one).
   Do this once per chat and reuse the `cloudId` for every other story key.
2. Call `getJiraIssue` with that `cloudId`, `issueIdOrKey` = the key, `fields` = `["summary", "description"]`
   and `responseContentFormat` = `"markdown"`.
3. The story is: `Jira story <KEY>: <summary>` followed by the description.
4. If the Atlassian tools are missing or fail, say so and ask the user to paste the story text,
   or to export it to a `.txt` / `.md` file. Never invent a story.

**Requirements file** (`.txt`, `.md`, `.csv`, `.xlsx`, `.xlsm`)
- The story key is the file name without its extension, upper-cased, with every run of characters
  other than letters and digits replaced by `-`: `requirements/web/login_story.xlsx` -> `LOGIN-STORY`.
  If the user gives a story key, use that instead.
- `.txt`, `.md`: read the file directly.
- `.csv`, `.xlsx`, `.xlsm`: run this in the terminal (it prints every sheet, one line per row, with line breaks
  inside cells removed;
  use `.venv/bin/python` if it exists, else `python3`):
  `python3 scripts/read_requirements.py "<path>"`
  If it fails because `openpyxl` is missing, ask the user to save the sheet as `.csv` and try again.

## 2. Reuse existing test cases

If `test_cases/<web|mobile>/<STORY_KEY>-TC*.txt` files already exist (in the folder of this story's platform),
do not write new ones. Tell the user they are being
reused (delete them to write them again) and list them.

## 3. Write the test cases

The platform, first match wins (see `.github/platforms.md`):
1. The user says so: "web" or "browser" -> Web; "android", "mobile", "phone" or "app" -> Android; "ios" or "iphone" -> iOS.
2. The requirements file's folder: `requirements/web/` -> Web; `requirements/mobile/` -> the source's Platform
   column or text (`Android` or `iOS`), else Android.
3. The source says so (e.g. a Platform column), else Web. A Jira story is Web unless the user or the story says otherwise.

Web test cases are saved in `test_cases/web/`, Android and iOS test cases in `test_cases/mobile/`.
- Web: the app URL is `https://freelance-learn-automation.vercel.app/login`,
  unless the user or the source (for example a URL column in the file) gives a different one.
- Android / iOS: the app id (e.g. `com.demoshop.mobile`) is the one the user or the source gives,
  else `bundleId` in `mobile-tests/mobilewright.config.ts`.
  Write the steps in the app's words (tap a button, the screen shows ...), as the source does.

Rules:
- Write one test case for each acceptance criterion, in the same order. Each test case is a separate file.
  If the story has no labelled acceptance criteria (for example rows of a spreadsheet), write one test case
  for each requirement or scenario, in the same order, and number them AC1, AC2, ...
- If the file already holds test cases with steps (columns like Test Case ID, Step, Action, Expected Result,
  where the rows under one Test Case ID are its steps), write ONE test case per Test Case ID, with those rows
  as its steps in the same order. Never split one test case's steps into separate test cases.
  Keep notes from the file (e.g. "Do not click Sign up") as preconditions or in the steps.
- Number the test cases `<STORY_KEY>-TC001`, `<STORY_KEY>-TC002`, ... in that order.
- Use the exact test data and exact messages from the story. Never invent data or messages.
- If the story does not name a page, link or element, describe it in plain words. Do not guess names.
- Every step must be concrete and always performed. No optional or "if" steps.
- Every test starts by navigating to the app URL (web) or with the app open on its first screen (mobile:
  step 1 is `Launch the app`, with the first screen's heading or text as its expected result when the source gives one).
- Each expected result must be something a browser or phone test can check (visible text, URL, a field's state).
  If the source's expected result is vague (e.g. "User should be logged in"), keep its words exactly:
  the explorer will find on the real page what proves it. Never make it more specific yourself.

No guessing. Everything in a test case comes from the source (the story or the file):
- Do not add test cases, steps, test data, messages, URLs or element names that are not in the source.
  No extra negative or edge-case tests unless the source asks for them.
- A step with no expected result in the source: write `(not given)`. Do not make one up.
- Feature, Test Type, Preconditions: take them from the source. If it does not say, write `(not given)`;
  Test Type is Negative only when the source says the case is invalid or expects an error, else Positive.
- Title, Test Scenario, Expected Result and Pass Criteria only restate what the source says, in other words.
- If the source is too unclear to write a step, ask the user instead of writing it.
- Follow the format below exactly. Leave out the Email or Password rows when a test does not use them,
  and write (empty) when a field is deliberately left empty.

Format (replace `<PLATFORM>`, `<APP_URL>` and `<STORY_KEY>`; for Android / iOS write `App: <APP_ID>` instead of
`URL: <APP_URL>`, e.g. `Platform: Android App: com.demoshop.mobile`):

```
### Test Case: <title starting with "Verify">

Feature: <feature> Test Type: <Positive / Negative> Platform: <PLATFORM> URL: <APP_URL>

| Field           | Details                                   |
| --------------- | ----------------------------------------- |
| Test Case ID    | <STORY_KEY>-TC001                         |
| Jira Reference  | <STORY_KEY> / AC1                         |
| Test Scenario   | <one sentence>                            |
| Preconditions   | <what must be true before starting>       |
| Email           | <email used>                              |
| Password        | <password used>                           |
| Expected Result | <overall result>                          |

### Test Steps

| Step | Action                    | Test Data       | Expected Result                 |
| ---- | ------------------------- | --------------- | ------------------------------- |
| 1    | <action from the source>  | <data or empty> | <result from the source, or (not given)> |
| 2    | ...                       | ...             | ...                             |

Pass Criteria: The test passes if <the checks that decide pass or fail>.

Test Status: Not Run.
```

Save each test case as `test_cases/web/<STORY_KEY>-TC<NNN>.txt` (web) or `test_cases/mobile/<STORY_KEY>-TC<NNN>.txt`
(Android / iOS), with no markdown fences, ending with one newline.

## 4. Report

List the files you wrote, one line each with the test case title. Then list every `(not given)` field
and every vague expected result, per test case.

## 5. Carry on

If the user asked only for test cases (e.g. `/write-test-cases`, "only the test cases", "don't automate"), stop here.
Otherwise carry on by yourself, without asking: run `node scripts/preflight.mjs web <url>` or
`node scripts/preflight.mjs mobile` once per platform, then take each test case you wrote (or reused), one at a time,
the rest of the way as `.github/pipeline.md` says (read it whole), and end with its summary.
