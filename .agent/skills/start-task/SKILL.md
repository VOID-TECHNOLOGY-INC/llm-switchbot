---
name: start-task
description: Starts and executes implementation tasks in the llm-switchbot (RoomSense GPT) repository with the repository's own planning and quality rules. Use when the user asks to start work, pick the next task, or continue implementation.
---

# Start Task (llm-switchbot)

Use this workflow when the user asks to start implementation, pick the next task, or continue development.

## 1. Gather Context First

1. Check branch and working tree (`git branch --show-current`, `git status --short`).
2. Read repository docs in priority order (refer to `doc/PROMPT.md` §6, §9):
   1. `doc/PROMPT.md` (Task execution rules)
   2. `doc/spec.md` (Technical specifications)
   3. `doc/plan.md` (Implementation roadmap)
   4. `README.md`
   5. `doc/debug.md`
3. If docs conflict, follow the priority above and note the mismatch in your response.
4. Identify the smallest deliverable unit (explicit user request first, otherwise next incomplete item in `doc/plan.md`).

## 2. Plan the Change (TDD First)

1. List affected areas before editing:
   - Backend: `apps/api/src/**/*` (Fastify)
   - Frontend: `apps/web/src/**/*` (Next.js)
   - Packages: `packages/switchbot-adapter/**/*`, `packages/harmony-tools/**/*`, `packages/shared/**/*`
   - Tests: `__tests__/` or `*.test.ts` alongside source files.
2. Define acceptance criteria tied to user-visible behavior or API contracts (refer to `doc/spec.md`).
3. Prepare the **Red** phase: Identify which tests need to be written first to reproduce a bug or define a new feature (refer to `doc/PROMPT.md` §2).

## 3. Implement (Red-Green-Refactor)

1. **Red**: Write a failing test first.
2. **Green**: Implement the minimum code to pass the test.
3. **Refactor**: Clean up the code while keeping tests green.
4. Preserve repository constraints from `doc/PROMPT.md`:
   - Use `LLMFactory` for LLM calls; avoid direct adapter instantiation.
   - Centralize SwitchBot HMAC signatures in `packages/switchbot-adapter`.
   - Ensure 2FA for dangerous operations (e.g., unlocking doors).
   - Use `pino` for structured logging; never log secrets.
5. Update `doc/spec.md` or `doc/plan.md` if implementation deviates from the original plan (refer to `doc/PROMPT.md` §6.2).

## 4. Verify Locally

Run the narrowest useful checks first, then full checks before handoff (refer to `doc/PROMPT.md` §4.3, §8.3):

1. Lint & Typecheck: `pnpm lint && pnpm typecheck`
2. Package tests: `pnpm --filter <package-name> test` (e.g., `pnpm --filter api test`)
3. All tests: `pnpm test`
4. Build: `pnpm build`

If a command cannot run, report why and what remains unverified.

## 5. Commit and Push

1. Use branch naming from `doc/PROMPT.md` §1.1: `<type>/<short-description>` (e.g., `feat/dynamic-system-prompt`).
2. Use Conventional Commit format: `<type>(<scope>): <summary>` (refer to `doc/PROMPT.md` §1.3).
   - Scopes: `api`, `web`, `switchbot-adapter`, `harmony-tools`, `shared`.
3. Commit only relevant files.
4. Push to origin: `git push origin <current-branch>`.
5. Report:
   - What changed
   - Validation commands and results
   - Specification/Plan updates (if any)
   - Remaining risks or follow-ups
