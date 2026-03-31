Save the current state of work so the next conversation can resume without losing context.

Steps:
1. Read MASTER_PLAN.md and note which items are checked vs unchecked.
2. Run `git log --oneline -10` to see recent commits.
3. Run `git status` to see any uncommitted work.
4. If there are uncommitted changes, ask whether to commit them first (using `/commit`) before checkpointing.
5. Write a checkpoint summary to `CHECKPOINT.md` at the project root with:
   - **Date**: today's date
   - **Current phase**: which phase is actively being worked on
   - **Last completed**: the most recently checked-off item
   - **Next up**: the next unchecked item to work on
   - **In progress**: any partially implemented work (uncommitted or just committed)
   - **Decisions made this session**: any non-obvious choices that were made (not already in MASTER_PLAN.md)
   - **Blockers / open questions**: anything unresolved that will need attention
6. Confirm the checkpoint is written and summarize what was saved.
