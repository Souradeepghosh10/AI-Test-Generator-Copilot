---
agent: qa-supervisor
description: Automate test cases end to end (web with Playwright, mobile with Mobilewright); the team does all the work and reports as it goes
argument-hint: test_cases/web/SCRUM-7-TC001.txt, requirements/mobile/<file>.xlsx, SCRUM-7, "web", "mobile" (add "and open pull requests" to skip the last question)
---

Automate: ${input:sources:test case files, requirements files, Jira story keys, "web" or "mobile" (empty = every test case in test_cases/web/ and test_cases/mobile/)}

Do all the work yourself, from preparing the browser or phone to a passing, reviewed test, and recover from failures
on your own. Post a short update after each step. Do not ask me anything until the end.
