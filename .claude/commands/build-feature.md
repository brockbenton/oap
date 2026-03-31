Read CHECKPOINT.md (if it exists), then MASTER_PLAN.md. Identify the next unchecked item (`- [ ]`) in the earliest phase with open items.

1. **Announce** the item and phase. Ask if unclear before proceeding.

2. **Implement** following the conventions in the relevant layer's CLAUDE.md. Touch only what is necessary — no scope creep.

3. **Verify** — build and tests must pass before continuing. Fix any failures.

4. **Security check** — run the `security-reviewer` subagent ONLY if the feature touches any of: auth/JWT, QR payload signing or verification, private keys, contract role assignments, or user input that reaches the database or chain. Skip otherwise.

5. **Tests** — run the `test-writer` subagent ONLY if the feature introduces new logic with no test coverage. Skip if tests already exist and pass.

6. **Mark done** — check off the item in MASTER_PLAN.md (`- [x]`). Update CHECKPOINT.md.

7. **Report** — what was built, files changed, any open questions.
