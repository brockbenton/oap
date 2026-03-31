Read MASTER_PLAN.md and identify the next unchecked item (`- [ ]`) in the current phase. If multiple phases have unchecked items, work on the earliest phase first.

Then follow this sequence:

1. **Announce** which item you are implementing and which phase it belongs to. Confirm this is the right item before proceeding (ask if unclear).

2. **Architect review** — before writing any code, use the `architect` subagent to evaluate the approach. Pass it the feature description and any relevant existing code. If the verdict is REVISE or DISCUSS, resolve it before continuing.

3. **Implement** the feature following the conventions in the relevant CLAUDE.md file(s). Touch only what is necessary for this feature — no scope creep.

4. **Review** — use the `code-reviewer` subagent on the implementation. Fix any MUST CHANGE items before continuing.

5. **Security check** — if the feature involves auth, signing, QR payloads, contract roles, private keys, or user input handling, run the `security-reviewer` subagent. Fix any CRITICAL or HIGH findings.

6. **Tests** — use the `test-writer` subagent to write tests for the implementation.

7. **Mark done** — check off the completed item in MASTER_PLAN.md (`- [x]`).

8. **Report** — summarize what was built, what files were changed, and any open questions or follow-up items discovered during implementation.
