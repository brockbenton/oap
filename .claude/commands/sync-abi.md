Propagate the current compiled contract ABI from the Foundry artifact to the frontend and backend. Run this after any contract change or after `/deploy`.

---

**Step 1 — Get the source ABI**
Read the Foundry artifact:
`smart-contract/out/AttendanceRegistry.sol/AttendanceRegistry.json`

If the file doesn't exist:
```bash
cd smart-contract && forge build
```
Then re-read the artifact. If build fails, stop and report errors.

Extract the `abi` array from the artifact JSON.

---

**Step 2 — Update frontend ABI**
Write the ABI to `frontend/lib/contracts/abis/AttendanceRegistry.json` as a standalone JSON file containing only the ABI array.

If the project uses typed ABI generation (e.g. `wagmi generate` or `@wagmi/cli`):
```bash
cd frontend && npx wagmi generate
```
If not configured, write the raw JSON file and note that typed generation is not set up.

---

**Step 3 — Update backend ABI**
Write the same ABI to `backend/lib/abis/AttendanceRegistry.json`.

Check `backend/lib/contract.ts` (or equivalent) — if the contract is initialized with a hardcoded ABI inline, replace it with an import of the JSON file instead. Inline ABIs cause exactly this drift problem.

---

**Step 4 — Verify TypeScript types are consistent**
Check `frontend/lib/contracts/` and `backend/lib/` for any TypeScript interfaces or types manually derived from the ABI (e.g. manually typed event args, function param types).

If any exist, compare them against the current ABI and flag mismatches. Do not auto-fix type definitions — report them for human review, as type changes may have application-level implications.

---

**Step 5 — Run abi-sync-checker**
Use the `abi-sync-checker` subagent to confirm that after the sync, both layers match the artifact.

---

**Step 6 — Report**
- Which files were updated
- Whether typed generation was run
- Any TypeScript type mismatches found that need manual review
- Confirmation that abi-sync-checker shows IN SYNC for both layers
