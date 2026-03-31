Run all tests across all three layers and report a unified pass/fail summary.

**Step 1 — Smart Contract Tests**
```bash
cd smart-contract && forge test -vv
```
- Report: number of tests passed/failed, any failing test names and revert reasons
- If forge is not installed or the project hasn't been compiled yet, note this and skip

**Step 2 — Backend Tests**
```bash
cd backend && npm test
```
(or `npx vitest run` / `npx jest --ci` depending on what's configured in package.json)
- Report: test suites passed/failed, any failing test names and error messages
- If no test runner is configured yet, note this and skip

**Step 3 — Frontend Tests**
```bash
cd frontend && npm test
```
(or `npx vitest run` depending on what's configured in package.json)
- Report: test suites passed/failed, any failing test names and error messages
- If no test runner is configured yet, note this and skip

**Step 4 — Summary**

Print a unified summary:
```
SMART CONTRACT:  X passed, Y failed
BACKEND:         X passed, Y failed
FRONTEND:        X passed, Y failed

OVERALL: PASS / FAIL
```

If any layer fails:
- Show the specific failing test(s) and error output
- Do not attempt to fix failures automatically — report them and ask whether to investigate

If a layer has no tests yet, mark it as `NOT SET UP` rather than PASS or FAIL.
