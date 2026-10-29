# Running the team

How a test case goes from manual steps to a reviewed, passing test. The **qa-supervisor** runs it from the start.
Any other team agent the user starts directly (explorer, generator, reviewer, healer, test-case-writer) does its own
job first and then runs the rest from here, so the user never has to click a handoff button.
Read this file whole, once.

## Who runs what

The agent that runs the team (the supervisor, or the agent the user started) is the **lead**. The lead starts each
other agent as a subagent with the `runSubagent` tool: `agentName` = `explorer`, `generator`, `reviewer` or `healer`,
`description` = `<Agent>: <test case name>`, and a `prompt` that starts with `[team run]`.

- A subagent starts with an empty memory: its prompt must hold everything it needs (below).
- Its reply is not shown to the user. After each one, post its outcome in one line, e.g.
  `Explorer: 8/8 steps done`, `Generator: wrote mobile-tests/tests/demo-shop-tc007.spec.ts, typecheck OK`,
  `Reviewer: APPROVED`, `Healer: PASSED after 1 fix (wrong button name in step 5)`.
- If `runSubagent` is not available or fails, do that agent's job yourself, following its `.agent.md` file whole.
- An agent whose prompt starts with `[team run]` is a subagent: it does only its own job, replies with its result in
  its usual format, and never runs other agents.

Prompts to send (fill in the parts in <>; paste reports and feedback whole, never shortened):

| Agent | Prompt |
| ----- | ------ |
| explorer | `[team run] Explore <test case file> (Platform: <platform>).` For a second try add: `The first try stopped at step <N>: <problem>. Start again from the beginning, run screen/snapshot on every screen and use exact names.` |
| generator | `[team run] Write <test file> for <test case file> from this explorer's report:` + the report |
| generator (rewrite) | `[team run] Rewrite <test file> for <test case file> with this reviewer feedback:` + the feedback + `The explorer's report:` + the report |
| reviewer | `[team run] Review <test file> for <test case file>. The explorer's report:` + the report (or `No explorer's report: the test file existed before.`) |
| healer | `[team run] Run and heal <test file> for <test case file>.` |

## Notes the lead keeps (in its head, one set per test case)

- Platform: Web | Android | iOS (`.github/platforms.md` section 1)
- Explorations: 0, Exploration: none | done (keep the report) | stopped at step N (keep the problem)
- Test code written: no | yes (`web-tests/tests/<name>.spec.ts` or `mobile-tests/tests/<name>.spec.ts`)
- Review status: not reviewed | approved | changes requested (keep the feedback)
- Test status: not run | passed | failed
- Rewrites: 0, Healer runs: 0 (one healer call counts as its runs, as it reports them)

When a lead takes over from its own job, it starts the notes from its result: explorer -> exploration done (or
stopped); generator -> code written, not reviewed; reviewer -> its review status; healer -> its test status, code
"changed" if it changed the test. If the platform's test file already exists, "Test code written: yes".

## Who goes next

First match wins:

| Notes | Next |
|---|---|
| Test status passed AND review approved | finish |
| Exploration stopped AND Explorations < 2 | explorer again, from the start (the second-try prompt) |
| Exploration stopped | finish (stuck) |
| Healer runs >= 3 AND test status failed AND Explorations < 2 | explorer again, from the start; then the generator writes the test anew from the new report (Rewrites and Healer runs back to 0) |
| Healer runs >= 3 AND test status failed | finish (stuck) |
| No code AND exploration not done | explorer |
| No code | generator |
| Review not reviewed | reviewer |
| Review changes requested AND rewrites < 2 | generator (rewrite) |
| Test status not run, or the code changed since the last run | healer |
| anything else | finish |

New or changed code is "not reviewed" and "not run" again; a rewrite counts in Rewrites.
Before each call, post `Team (step N): <agent> - <the rule that matched>`. At most 20 steps per test case.
Never ask the user anything along the way: decide with this table and keep going.

## Finish

Show the final test file path and `Platform: <platform>   Test: <status>   Review: <status>   Steps: <N>`
(and "WARNING: the test is not passing." if it is not). For a test case stuck in exploration, show
`STOPPED in exploration at step <N>: <what failed>` and what the user can change. Pull requests are the
supervisor's job: a lead other than the supervisor ends with the summary and suggests `/automate-tests` with
"and open pull requests" if the user wants them.
