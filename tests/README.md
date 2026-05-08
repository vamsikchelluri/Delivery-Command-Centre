# Automated Test Scaffold

## Status
Playwright is installed and the core business-scenario tests now run from the root with `npm run test:e2e`.

## Intended Usage
- Use API or UI setup to create scenario-specific data
- Run browser tests against the local app at `http://localhost:4000`
- Keep business-scenario tests separate from low-level unit concerns

## Current Coverage
- `tests/e2e/resource-flow.spec.js`
  Resource creation, offshore defaults, secondary skills, register filters, and detail verification
- `tests/e2e/pipeline-flow.spec.js`
  Opportunity creation, notes, weighted pipeline check, opportunity role creation, and role revenue roll-up
- `tests/e2e/sow-flow.spec.js`
  SOW creation, commercial persistence, SOW role creation, and role-aware assignment candidate coverage

## Proposed Structure
- `tests/e2e/`
  Browser-driven business scenario tests
- `tests/scenarios/`
  Scenario setup helpers and data creation helpers
- `tests/fixtures/`
  Shared credentials and reusable data labels

## Run
- Ensure the local app is running at `http://localhost:4000`
- Run `npm run test:e2e`
- Open [`playwright-report/index.html`](C:/Users/vamsi/Documents/Codex/2026-04-23-files-mentioned-by-the-user-dcc/playwright-report/index.html) after a run to review scenario inputs, observed outputs, screenshots, and pass/fail results
