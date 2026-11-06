Propagate the current compiled contract ABI from the Foundry artifact to the backend. The frontend has no ABI copy. Run this after any contract change or after `/deploy`.

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

**Step 2 — Update backend ABI**
`backend/src/lib/abi.ts` exports `ATTENDANCE_ABI`, a minimal hand-kept ABI with only what the backend uses. Update those entries to match the artifact, and add any new function, event or error the backend now calls.

---

**Step 3 — Verify TypeScript types are consistent**
Check `backend/src/` for any TypeScript interfaces or types manually derived from the ABI (e.g. manually typed event args, function param types).

If any exist, compare them against the current ABI and flag mismatches. Do not auto-fix type definitions — report them for human review, as type changes may have application-level implications.

---

**Step 4 — Run abi-sync-checker**
Use the `abi-sync-checker` subagent to confirm that after the sync, the backend matches the artifact.

---

**Step 5 — Report**
- Which files were updated
- Any TypeScript type mismatches found that need manual review
- Confirmation that abi-sync-checker shows IN SYNC
