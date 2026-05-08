# QA Bug Log

This file is the running defect log for Delivery Command Center QA passes.

## Status values
- `Open`
- `In Progress`
- `Fixed`
- `Retest`
- `Closed`
- `Deferred`

## Severity values
- `Critical`
- `High`
- `Medium`
- `Low`

## QA Pass 1

Test basis:
- Fresh UI-created records in the live app at `http://localhost:4000`
- Client: `QA Client 20260425084522`
- Resource: `QARes723815 Tester`
- Opportunity: `QA Opportunity 20260425084522`
- SOW: `QA SOW 20260425084522`

### BUG-001
- Status: `Closed`
- Severity: `High`
- Area: `Pipeline / Opportunity`
- Title: `Opportunity role revenue does not roll up after saving roles`

**Scenario**
- Opportunity role revenue does not roll up after adding an opportunity role.

**Steps to reproduce**
1. Create a new opportunity with `Estimated Revenue = 120000`, `Probability = 60`, and `Target Margin = 35`.
2. Open the opportunity detail page.
3. Add an opportunity role with `Estimated Hours = 320` and `Bill Rate = 110`.
4. Save the role and review the opportunity KPIs and register.

**Expected result**
- `Role Revenue` should update based on the saved role.
- Related opportunity and pipeline metrics should reflect the added role revenue.

**Actual result**
- The role saves and appears in the roles table.
- `Role Revenue` remains `$0` on the opportunity detail.
- The saved opportunity record still has `roleEstimatedRevenue: 0`.

**Impact**
- Pipeline numbers are unreliable.
- Opportunity role CRUD has no commercial roll-up effect.

**Fix direction**
- Recalculate and persist `roleEstimatedRevenue` from opportunity roles.
- Refresh weighted/pipeline metrics after role create or edit.

**Implementation note**
- Backend roll-up logic added on `2026-04-25`.
- API smoke verification confirmed `roleEstimatedRevenue = 35200` after creating a 320-hour / 110-rate role.

**Retest result**
- Retested from a fresh browser session with a hard refresh and fresh UI-created records.
- Passed in UI retest.
- Evidence: Opportunity detail showed `Role Revenue $35,200` for `QA Opportunity 20260425103652`.
- Closed on `2026-04-25`.

### BUG-002
- Status: `Closed`
- Severity: `High`
- Area: `SOW Create / Register / Workspace`
- Title: `SOW create form does not persist status and commercial visibility fields`

**Scenario**
- SOW create form does not persist status and commercial visibility values.

**Steps to reproduce**
1. Open SOW create.
2. Enter a new SOW.
3. Set `Status = Active`.
4. Enter `Contract Value = 90000`, `Visible Revenue = 90000`, and `Visible Cost = 60000`.
5. Save and review the SOW register and workspace.

**Expected result**
- The SOW should save with `Active` status.
- `Visible Revenue` should save as `90000`.
- `Visible Cost` should save as `60000`.
- Margin values should compute from the saved values.

**Actual result**
- The SOW saves as `Draft`.
- `Visible Revenue` becomes `$0`.
- `Visible Cost` becomes `$0`.
- Margin stays `0%`.

**Impact**
- Newly created SOWs are commercially unusable.
- Register and workspace financial visibility is misleading.

**Fix direction**
- Fix create payload mapping and persistence for status and visibility fields.
- Ensure margin values are recalculated from saved commercial fields.

**Implementation note**
- SOW create route updated on `2026-04-25` to persist submitted `status`, `visibleRevenue`, and `visibleCost`.
- API smoke verification confirmed `status = ACTIVE`, `visibleRevenue = 90000`, `visibleCost = 60000`, `grossMargin = 30000`, `grossMarginPercent = 33.33`.

**Retest result**
- Retested from a fresh browser session with a hard refresh and fresh UI-created records.
- Passed in UI retest.
- Evidence: SOW register showed `QA SOW 20260425103652 ... ACTIVE ... $90,000 ... $90,000 ... $60,000 ... 33.33%`.
- Closed on `2026-04-25`.

### BUG-003
- Status: `Retest`
- Severity: `Medium`
- Area: `SOW Workspace / Roles`
- Title: `SOW candidate matching panel shows static content unrelated to the selected role`

**Scenario**
- Candidate matching panel shows hard-coded content unrelated to the current role.

**Steps to reproduce**
1. Create a new SOW.
2. Open the SOW workspace `Roles` tab.
3. Add a role such as `QA Basis Lead` with `Location = Onsite`.
4. Review the Candidate Resource Matching panel.

**Expected result**
- The panel should be role-aware and reflect the currently selected SOW role.
- Candidate rows should align to the role skill, location, and availability context.

**Actual result**
- The panel shows static content such as `Selected role: SAP FICO Lead / required FTE 1.0`.
- It shows unrelated candidate rows even when the visible SOW role is different.

**Impact**
- Staffing UX is misleading.
- Users may assume matching is functional when it is still placeholder content.

**Fix direction**
- Replace the static candidate panel with a role-aware matching panel.
- Bind selected role context to skill, location, and staffing data.

**Implementation note**
- Static placeholder candidate panel replaced on `2026-04-25`.
- Panel now derives selected role context from the current SOW role selection and scores resources from live resource data.

**Retest result**
- Fresh-browser retest could not verify the panel behavior with confidence.
- The SOW register rendered correctly, but the follow-up workspace capture did not produce reliable candidate-panel evidence.
- Keep open pending a clean UI confirmation pass.

## Working agreements
- Update this file after every QA pass before making fixes where practical.
- Add new bugs with the next sequential bug number.
- When a fix is made, update the bug status to `Retest` and note the change in the related implementation pass.
