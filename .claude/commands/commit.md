Stage and commit the current changes with a well-formed commit message.

Steps:
1. Run `git status` and `git diff` to understand what changed.
2. Stage only files relevant to the feature or fix — do not stage unrelated files, build artifacts, `.env` files, or generated files that should be in `.gitignore`.
3. Write a commit message following Conventional Commits:
   - Format: `type(scope): short description`
   - Types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`
   - Scope: `contract`, `backend`, `frontend`, or omit if cross-cutting
   - Subject line: imperative mood, ≤72 chars, no period
   - Body (if needed): explain *why*, not *what* — the diff shows what
   - Examples:
     - `feat(contract): add soulbound ERC-1155 with ADMIN and RELAY roles`
     - `feat(backend): implement QR payload generation and verification`
     - `fix(frontend): handle expired QR code with user-facing error toast`
4. Commit. Do not amend existing commits unless explicitly asked.
5. Report the commit hash and message.
