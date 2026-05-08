# Codex Build Annex
## Delivery Command Center for SAP Service SBU

This annex captures the detailed build decisions agreed after the final functional specification. It is intended to reduce ambiguity during implementation.

## 1. Object Naming

- `SOW` is the primary signed-work object
- `Project` and `SOW` are treated as the same object in MVP
- `SOW` should be the canonical term in data model and business logic

## 2. Statuses and Workflow Rules

### 2.1 Resource

#### Employment status

Stored field:

- Active
- On Leave
- Sabbatical
- Inactive
- Terminated
- Exited

#### Delivery status

Operational field:

- Available
- Fully Deployed
- Partially Deployed

Rules:

- `Fully Deployed` threshold defaults to `90%` allocation and must be configurable
- `Partially Deployed` must show deployed % and remaining available %
- leave should not be modeled as delivery status for MVP
- instead use:
  - `Not Available From`
  - `Not Available To`
  - `Not Available Reason`

### 2.2 Opportunity

Stages:

- Qualifying
- Proposed
- Negotiating
- Won
- Lost

Stage probabilities default to:

- Qualifying: 20%
- Proposed: 40%
- Negotiating: 70%
- Won: 100%
- Lost: 0%

Rules:

- probability defaults from stage
- user may manually override probability
- if stage changes later, probability resets to the new stage default
- user may edit probability again after the reset

### 2.3 SOW

Statuses:

- Draft
- Active
- On Hold
- Completed
- Terminated

Rules:

- SOW may be saved as `Draft` with partial data
- at least one role is required before activation
- SOW may be created directly or from a won opportunity

### 2.4 Deployment

Statuses:

- Planned
- Active
- Ended
- Cancelled

Purpose:

- deployment status controls the lifecycle of each assignment record
- delivery status remains the summarized resource availability state

### 2.5 Milestone

Statuses:

- Upcoming
- In Progress
- Invoiced
- Paid

### 2.6 Actuals

- no approval status required for MVP
- actuals are entered or uploaded by authorized managers

## 3. Roles and Permissions

### 3.1 Roles

- COO
- Vice President
- Delivery Manager
- Project Manager
- Account Manager
- Finance Viewer
- Super Admin
- Read Only

### 3.2 Permissions Baseline

#### Opportunities

- create/edit: Account Manager, Delivery Manager, Vice President, COO
- convert to SOW: opportunity creator, assigned Delivery Manager, Vice President, COO

#### SOWs

- create/edit: Account Manager, Delivery Manager, Vice President, COO
- assign resources: assigned Delivery Manager or assigned Project Manager
- enter/upload actuals: assigned Delivery Manager or assigned Project Manager

#### Commercial visibility

- default cost and gross margin visibility: Delivery Manager, Vice President, COO
- Project Manager: margin hidden by default, configurable
- Account Manager: cost visibility configurable
- Finance Viewer: read-only access, detailed field visibility configurable

### 3.3 MVP Permission Design

Keep permissioning simple in MVP:

- module-level access
- action-level access
- two configurable field visibility flags:
  - `Can View Cost`
  - `Can View Margin`

## 4. Header Field Decisions

### 4.1 Opportunity mandatory fields

- Account / Client
- Opportunity Name
- Account Manager
- Delivery Manager
- Stage
- Estimated Revenue
- Expected Close Date
- Expected Start Date
- Currency

Additional rules:

- `Role-estimated revenue` is system-derived and read-only
- `Deal type` is included in MVP

### 4.2 SOW mandatory fields

- Account / Client
- SOW / Engagement Name
- SOW Number
- Billing Model
- Currency
- Start Date
- End Date
- Delivery Manager
- Project Manager
- Account Manager
- Contract Value

Additional rules:

- SOW may save as Draft with partial data
- `Source Opportunity` is optional
- include basic `Project Health / RAG` framework in MVP
- include `Created From` concept:
  - Opportunity
  - Direct

## 5. Role-Level Design

Both Opportunity and SOW must support multiple roles.

### 5.1 Opportunity Role fields

- Role Title
- SAP Skill
- Sub-module
- Quantity
- Engagement Type
- Experience Level
- Start Date
- Duration
- End Date
- Estimated Hours
- Bill Rate
- Cost Guidance
- Allocation %
- Resource Identification Status
- Optional Candidate Resource
- Notes

### 5.2 SOW Role fields

- Role Title
- SAP Skill
- Sub-module
- Quantity
- Engagement Type
- Billing Type
- Bill Rate
- Cost Rate / Cost Guidance
- Start Date
- Duration
- End Date
- Planned Allocation %
- Planned Hours
- Location Requirement
- Staffing Priority
- Staffing Status
- Remarks

### 5.3 Role rules

- users can add multiple roles to Opportunity and SOW
- `Start Date + Duration` should auto-calculate `End Date`
- `End Date` remains editable
- planned or estimated hours may be derived but should remain editable
- role-level pricing must support hourly, man-day, or man-month structures based on billing model

## 6. Staffing and Allocation Rules

- one SOW role may have multiple deployments
- one role may be staffed in phases
- one role may have replacements over time
- one role may have overlapping staffing where business requires it
- resource assignment above 100% allocation is allowed with warning
- all over-allocation warnings should be visible and audit logged

## 7. Actual Effort and Excel Upload Rules

### 7.1 Actual entry

- actuals are required once the SOW is active and work has started
- actuals should only be entered after at least one active deployment exists
- if no actuals are entered after SOW start, visible revenue should remain zero
- such SOWs must be highlighted in dashboard/reporting

### 7.2 Upload scope

- one upload file per `SOW + Month`

### 7.3 Upload matching key

- `SOW Number + Role + Resource ID + Month`

### 7.4 Upload columns

- SOW Number
- Month
- Resource Name
- Hours or Actual Quantity
- Remarks

### 7.5 Upload behavior

- upload overwrites existing values for the same matching row
- only assigned PM/DM may upload for that SOW
- downloadable template must be available
- template should be prefilled with active deployed resources where possible
- upload must validate SOW, role, resource, month, and quantity
- invalid rows should create a pending exception
- pending exception rows must not post into actuals until resolved
- upload must show preview and errors before final import

### 7.6 Measurement basis

- actual measurement follows SOW billing measurement
- if SOW is hourly, actuals are entered in hours
- if SOW is man-month based, actuals are entered in man-months
- UI and Excel template must reflect the selected measurement basis

## 8. Revenue, Cost, and Visibility Rules

### 8.1 Dashboard revenue/cost default

- default dashboard KPI should show `current month visible revenue/cost`
- users may switch to broader active-SOW views where needed

### 8.2 Opportunity revenue

- `Estimated Revenue` is header-level and entered by account manager
- `Role-estimated revenue` is system-derived
- weighted pipeline uses header estimated revenue by default

### 8.3 Missing actuals

- if no actuals exist for active started work, revenue should remain zero
- dashboard/report should explicitly surface:
  - active SOWs with zero visible revenue
  - active SOWs with missing actuals

## 9. Dashboard and Reporting Defaults

### 9.1 Dashboard period logic

- dashboard uses mixed-by-widget time logic
- each widget may use its own sensible default period

Examples:

- pipeline: all open opportunities
- revenue/cost: current month
- roll-offs: next 30 days by default
- bench: current state

### 9.2 Weighted pipeline

- default scope: all open opportunities
- user-selectable filters must be available

### 9.3 Roll-off window

- configurable
- default: next 30 days

### 9.4 Bench aging start logic

Use whichever is most recent:

- last deployment end date
- availability date
- not-available end date

### 9.5 Mandatory dashboard filters

- Account
- Delivery Manager
- Account Manager
- SAP Skill

Recommended secondary filters:

- Location
- Billing Model
- Employment Type
- SOW Status

### 9.6 MVP reports

- Resource Utilization Report
- Bench Report
- Active SOW Report
- Opportunity Pipeline Report
- Gross Margin Report
- Milestone Due Report
- Actuals Missing Report

### 9.7 Export rules

- reports must support Excel export
- dashboard export is not required for MVP

## 10. Edge Cases and Defaults

- full deployment threshold default: 90%, configurable
- over-allocation allowed with warning
- probability resets on stage change
- SOW direct creation allowed
- invalid actual upload rows create pending exceptions
- no hard deletes for any master or transaction data

Use soft/inactive patterns instead:

- inactive
- cancelled
- terminated

## 11. Audit Trail Rules

Audit trail must be maintained for **all master and transaction changes**.

This includes, at minimum:

- Account
- Skill
- Currency
- SystemConfig
- Resource
- ResourceSkill
- CostHistory
- Opportunity
- OpportunityRole
- SOW
- SOWRole
- Deployment
- Actual
- Milestone
- User
- Permission / FieldPermission
- Session actions where applicable

For each audited change, capture where applicable:

- entity name
- record ID
- action type: create, update, status change, deactivate, import, convert
- changed fields
- old value
- new value
- actor
- timestamp
- source screen / workflow
- import reference if change came from bulk upload

Deletion rule:

- no hard deletes in MVP
- deactivation/cancellation/termination actions must also be audited

## 12. Recommended Immediate Build Sequence

1. Authentication, roles, and navigation
2. Account, skills, and settings masters
3. Resource management with cost logic
4. Opportunity register, detail, and role management
5. SOW register, detail, and role management
6. Opportunity-to-SOW conversion wizard
7. Deployments and staffing workspace
8. Actuals workbench and Excel upload
9. Dashboard and reports
10. Audit trail coverage and exports

## 13. Number Range and Document Template Design

The system should use configurable number ranges for all key masters and transaction records.

Design principles:

- number ranges should be template-driven
- prefixes should be human-readable
- sequence should be auto-generated by the system
- numbering should support future growth across SBUs, years, and locations
- users should not manually type document numbers except where explicitly allowed
- all number range settings should be maintained in admin/configuration

### 13.1 General template structure

Recommended template structure:

`<PREFIX>-<YYYY>-<SEQ>`

Example:

- `OPP-2026-000123`
- `SOW-2026-000045`

Optional extended structure if later needed:

`<PREFIX>-<SBU>-<YYYY>-<SEQ>`

Example:

- `OPP-SAP-2026-000123`
- `SOW-SAP-2026-000045`

MVP recommendation:

- use the simpler format first
- keep prefix and sequence length configurable
- keep year inclusion configurable

### 13.2 Recommended number ranges by object

#### Account

- prefix: `ACC`
- template: `ACC-<YYYY>-<SEQ>`
- example: `ACC-2026-000012`

#### Resource

- prefix: `RES`
- template: `RES-<YYYY>-<SEQ>`
- example: `RES-2026-000341`

Note:

- if employee ID already exists from HR, store that separately
- internal DCC resource ID should still exist for system consistency

#### Opportunity

- prefix: `OPP`
- template: `OPP-<YYYY>-<SEQ>`
- example: `OPP-2026-000128`

#### Opportunity Role

- prefix: `ORL`
- template: `<OpportunityNumber>-<SEQ>`
- example: `OPP-2026-000128-01`

Alternative internal format:

- `ORL-2026-000001`

MVP recommendation:

- display child role numbering under parent opportunity using:
  - `OPP-2026-000128-01`
  - `OPP-2026-000128-02`

#### SOW

- prefix: `SOW`
- template: `SOW-<YYYY>-<SEQ>`
- example: `SOW-2026-000057`

Design note:

- since SOW is the primary signed-work object, this should be the main business document number
- users may optionally store external client SOW/PO/reference number separately

#### SOW Role

- prefix: `SRL`
- template: `<SOWNumber>-<SEQ>`
- example: `SOW-2026-000057-01`

MVP recommendation:

- display role numbering under parent SOW using child sequence

#### Deployment

- prefix: `DPL`
- template: `DPL-<YYYY>-<SEQ>`
- example: `DPL-2026-000442`

#### Actual Upload Batch

- prefix: `ACT`
- template: `ACT-<YYYY>-<SEQ>`
- example: `ACT-2026-000019`

Use:

- to identify each import batch or manual posting session
- to support audit and traceability

#### Milestone

- prefix: `MS`
- template: `<SOWNumber>-MS-<SEQ>`
- example: `SOW-2026-000057-MS-01`

#### User

- prefix: `USR`
- template: `USR-<YYYY>-<SEQ>`
- example: `USR-2026-000023`

#### Audit Event

- prefix: `AUD`
- template: `AUD-<YYYY>-<SEQ>`
- example: `AUD-2026-004581`

### 13.3 Separate external reference fields

The system should distinguish between:

- system-generated internal number
- external/client/business reference number

Examples:

- SOW internal number: `SOW-2026-000057`
- external client SOW number: `CTS-PO-88421`
- resource internal ID: `RES-2026-000341`
- HR employee ID: `IE-1045`

This avoids forcing business users to repurpose system numbers for client-facing references.

### 13.4 Configurable number range setup

Admin should be able to configure:

- object type
- prefix
- starting number
- sequence length
- year inclusion on/off
- manual override allowed yes/no
- uniqueness validation
- active/inactive template

### 13.5 Manual override rule

MVP recommendation:

- manual override should be disabled by default for system-generated document numbers
- external reference fields should be used when business-specific numbering must be captured

Exception:

- SOW external/client reference number should be manually enterable

### 13.6 Sequence reset rule

MVP recommendation:

- sequence resets annually for business documents that include year
- if year is disabled later, sequence continues globally

Examples:

- `OPP-2026-000001`
- `OPP-2026-000002`
- next year: `OPP-2027-000001`

### 13.7 Display rule

In UI:

- show the main business document number prominently
- show external reference number near it if available
- child objects like roles and milestones may use compact child numbering in the screen

### 13.8 Best-practice recommendation

For MVP, use these as the primary visible number ranges:

- `ACC-YYYY-SEQ`
- `RES-YYYY-SEQ`
- `OPP-YYYY-SEQ`
- `SOW-YYYY-SEQ`
- `DPL-YYYY-SEQ`
- `ACT-YYYY-SEQ`
- `AUD-YYYY-SEQ`

And use parent-linked child numbering for:

- Opportunity Roles
- SOW Roles
- Milestones

## 14. Register and Table Column Defaults

### 14.1 Opportunity Register

Default columns:

- Opportunity Number
- Account / Client
- Opportunity Name
- Stage
- Probability
- Estimated Revenue
- Role-Estimated Revenue
- Weighted Value
- Account Manager
- Delivery Manager
- Expected Close Date
- Expected Start Date
- Status / Win-Loss
- Last Updated

Quick filters:

- Stage
- Account Manager
- Delivery Manager
- Account
- Expected Close Date

Sorting:

- users should be able to sort by column
- no rigid default sort needs to be enforced beyond a sensible initial view

### 14.2 SOW Register

Default columns:

- SOW Number
- Account / Client
- SOW / Engagement Name
- Billing Model
- Status
- Project Health / RAG
- Start Date
- End Date
- Contract Value
- Visible Revenue
- Visible Cost
- Gross Margin
- Gross Margin %
- Delivery Manager
- Project Manager
- Account Manager
- Delivery Roll-Off Risk / Next Roll-Off
- Last Updated

Quick filters:

- Status
- Delivery Manager
- Project Manager
- Account
- Billing Model
- Project Health / RAG

Sorting:

- users should be able to sort by column
- no rigid default sort needs to be enforced beyond a sensible initial view

### 14.3 Resource Register

Default columns:

- Resource ID
- Resource Name
- Primary Skill
- Sub-Module
- Location
- Employment Type
- Employment Status
- Delivery Status
- Deployed %
- Available %
- Availability Date
- Delivery Roll-Off Date
- Delivery Manager / Owner
- Cost Rate
- Current SOW
- Last Updated

Quick filters:

- Primary Skill
- Sub-Module
- Delivery Status
- Employment Status
- Location
- Employment Type
- Availability Date
- Roll-Off Window

Sorting:

- users should be able to sort by column

### 14.4 Actuals Workbench

Default columns:

- SOW Number
- SOW Name
- Month
- Role
- Resource Name
- Measurement Unit
- Actual Quantity
- Remarks
- Last Updated
- Upload Batch Reference

Quick filters:

- Month
- SOW
- Delivery Manager
- Project Manager
- Billing Measurement
- Missing Actuals
- Uploaded vs Manual

Sorting:

- users should be able to sort by column

### 14.5 Resource Detail Tabs

- Overview
- Skills
- Deployments
- Cost History
- Availability / Not Available
- Linked Opportunities
- Audit Trail

## 15. Detail Screens and Form Layout Defaults

### 15.1 SOW Detail Tabs

- Overview
- Roles
- Deployments
- Actuals
- Milestones
- Financials
- Audit Trail

Additional design rule:

- billing method must be clearly shown in SOW detail
- the screen should behave differently based on billing method
- T&M SOWs and milestone/fixed-price SOWs should not force exactly the same data-entry pattern

Examples:

- T&M / time-based SOW:
  - emphasize roles, deployments, actuals, bill rate, and visible revenue
- milestone/fixed-price SOW:
  - emphasize milestone plan, milestone progress, invoice/payment visibility, and internal cost visibility

### 15.2 Opportunity Detail Tabs

- Overview
- Roles
- Commercials
- Notes / Activity
- Conversion History
- Audit Trail

### 15.3 SOW Role Table Columns

- Role Number
- Role Title
- Skill
- Sub-Module
- Quantity
- Engagement Type
- Billing Type
- Bill Rate
- Cost Rate / Cost Guidance
- Start Date
- Duration
- End Date
- Allocation %
- Planned Hours
- Staffing Status
- Assigned Resources Count
- Remarks

### 15.4 Opportunity Role Table Columns

- Role Number
- Role Title
- Skill
- Sub-Module
- Quantity
- Engagement Type
- Experience Level
- Start Date
- Duration
- End Date
- Estimated Hours
- Bill Rate
- Cost Guidance
- Allocation %
- Resource Identification Status
- Candidate Resource
- Notes

### 15.5 Resource Assignment Workspace / Modal Columns

- Resource ID
- Resource Name
- Primary Skill
- Sub-Module Match
- Location
- Delivery Status
- Deployed %
- Availability Date
- Delivery Roll-Off Date
- Cost Rate
- Margin Preview
- Current SOW

Design note:

- `Available %` does not have to be shown as a separate column if `Deployed %` is already visible
- system may still derive available % internally as `100 - deployed %`
- UI should avoid unnecessary duplication where it does not improve staffing decisions

### 15.6 Opportunity to SOW Conversion Wizard Steps

- Opportunity Review
- SOW Header
- Commercial Adjustment
- Role Mapping
- Review & Create
