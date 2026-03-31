/Run a full review pass on recent changes using both review subagents in sequence.

Steps:
1. Run `git diff HEAD~1` (or against the branch base if on a feature branch) to identify what changed.
2. Identify which layer(s) were touched: `frontend`, `backend`, `smart-contract`.
3. Run the `code-reviewer` subagent on the changed files. Pass it the file paths and the diff context.
4. If the changes touch any of the following, also run the `security-reviewer` subagent:
   - Auth or wallet connection
   - QR payload generation or verification
   - Contract role checks or minting
   - Private key usage or signing
   - Any user input that reaches the DB or contract
5. Consolidate the findings from both subagents.
6. For each MUST CHANGE / CRITICAL / HIGH finding: fix it immediately.
7. For SHOULD CHANGE / MEDIUM findings: list them and ask whether to fix now or track.
8. Report a final summary: what was reviewed, what was fixed, what is deferred.
