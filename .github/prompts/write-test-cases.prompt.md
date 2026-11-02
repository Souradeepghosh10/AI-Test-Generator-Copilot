---
agent: test-case-writer
description: Write manual test cases from Jira story keys or requirements files
argument-hint: requirements/web/<file>.xlsx, requirements/mobile/<file>.xlsx or SCRUM-7 (add "for android" for a phone app)
---

Write the manual test cases for: ${input:sources:Jira story keys and/or requirements file paths (files in requirements/mobile/ become phone test cases)}

Only write the manual test cases; do not automate them.
