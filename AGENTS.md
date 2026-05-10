# Agent Workflow: Claude Designs, Codex Builds

This project uses a two-agent workflow:

- Claude is the design, product, UX, and review partner.
- Codex is the implementation, debugging, testing, and refactoring partner.

The goal is to keep design thinking and code execution cleanly separated so the project moves faster without wasting tokens or creating conflicting edits.

## Default Roles

### Claude

Use Claude for:

- Product direction and UX strategy
- Screen flows, layouts, interaction models, and content structure
- Visual design critique and polish suggestions
- User journeys, edge cases, and acceptance criteria
- Reviewing screenshots, summaries, and proposed changes

Claude should usually produce concise implementation briefs, not large code dumps.

### Codex

Use Codex for:

- Reading the actual repository structure
- Implementing features and fixes
- Matching existing code patterns
- Running builds, tests, linters, and debugging commands
- Refactoring safely
- Producing concise change summaries and verification notes

Codex should treat Claude output as product/design input, then ground all implementation decisions in the repository.

## MVP Agent Rule

For this Delivery Command Center MVP, Codex is the default agent for analysis, implementation, debugging, testing, deployment, and repo-level changes.

Claude should be involved only when the user explicitly asks for Claude, UX review, product review, visual critique, or a design brief.

Do not automatically route work to Claude. This MVP is already mostly built, so avoid introducing agent handoff confusion.

For future new projects, a Claude-first design brief followed by Codex implementation may be used, but that is not the default workflow for this repository.

## Workflow For New Features

1. Ask Claude for a design brief.
2. Give the brief to Codex.
3. Codex inspects the repo and implements the smallest clean change.
4. Codex runs relevant checks and summarizes the result.
5. Share screenshots or the summary with Claude for design review.
6. Give Claude's review notes back to Codex for final polish.

## Workflow For Existing Apps

If Codex built the app:

- Start with Codex for modifications.
- Use Claude for UX review, copy, product decisions, and visual critique.

If Claude built the app:

- Ask Codex to inspect the architecture before making changes.
- Codex should preserve the existing structure and style unless there is a clear reason to change it.
- Use Claude for design clarification or review after Codex has a working implementation.

## Token Discipline

Do not send the same large context to both agents.

Prefer:

- Claude gets concise goals, screenshots, summaries, and UX questions.
- Codex gets implementation briefs and direct repo access.
- Large logs, full files, and build output stay mostly with Codex.
- Claude reviews outcomes, not the whole codebase.

Good Claude prompt:

```text
You are the design lead. Create a concise implementation brief for this feature.
Include user goal, layout, components, states, responsive behavior, accessibility notes, and acceptance criteria.
Avoid code unless absolutely necessary.
```

Good Codex prompt:

```text
Implement this brief in the existing repo.
Read the codebase first, match current patterns, keep the diff focused, run relevant checks, and summarize changed files.
```

## Collaboration Rules

- Only one agent should edit files at a time.
- Before switching agents, check the current git diff.
- Do not let both agents modify the same files simultaneously.
- Prefer small, reviewable changes over broad rewrites.
- Commit after a stable milestone when the build and tests pass.
- If there is a conflict between Claude's design and the existing codebase, Codex should explain the tradeoff and choose the least risky implementation.

## Design Principles

- Build the real usable screen first, not a marketing page, unless the project is explicitly a landing page.
- Match the existing app's design system, spacing, typography, and interaction patterns.
- Keep operational tools quiet, dense, and scannable.
- Use clear states for loading, empty, error, disabled, hover, focus, and success.
- Make responsive behavior explicit for mobile, tablet, and desktop.
- Avoid decorative UI that does not help the user complete the task.
- Keep copy short, direct, and useful.
- Prefer accessible controls, semantic markup, keyboard support, and visible focus states.

## Done Criteria

A change is not done until:

- The implementation matches the design brief or explains any intentional deviation.
- Relevant checks have been run, or the reason they could not run is documented.
- The diff is focused and does not include unrelated churn.
- The user receives a concise summary of what changed and what was verified.
