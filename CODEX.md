# Delivery Command Center

## Project
- Name: `Delivery Command Center`
- Domain: SAP Service SBU delivery visibility and operational control
- Purpose: Provide COO, VP, Delivery Manager, Project Manager, and Account Manager visibility into pipeline, resources, SOWs, deployments, actuals, and margin

## Current Scope
- Client master
- Resource master
- Opportunity / pipeline management
- SOW management
- Deployment visibility
- Actuals workbench
- Admin configuration
- Audit visibility

## Product Positioning
- This is a COO review and delivery visibility application
- It is not intended to become a full ERP, finance close system, or heavy planning suite in MVP
- Focus on operational visibility, clean navigation, linked data, and strong CRUD workflows

## Core Business Objects
- Client
- Resource
- Opportunity
- Opportunity Role
- SOW
- SOW Role
- Deployment
- Actual
- Milestone
- User
- Role
- SAP Module / Sub-Module
- Currency / FX
- Number Range
- Audit Log

## Key Rules
- Project and SOW are treated as the same object in MVP
- `Client` should be used in the UI instead of `Account`
- Resource has separate `Employment Status` and `Delivery Status`
- Opportunity supports both header estimated revenue and role-estimated revenue
- Roles exist in both Opportunity and SOW
- Role location must always be explicitly maintained as `Offshore` or `Onsite`
- Actuals support manual entry and later Excel upload
- Audit trail must be maintained for master and transaction changes
- Wherever a field is backed by master data, the UI should use a dropdown/select rather than free text

## UI Standards
- Use one shared layout system across Client, Resource, Opportunity, SOW, and Admin
- Standard screen structure:
  - Header card
  - Tab row where applicable
  - Section cards
  - Sticky action footer on create/edit screens
- Register screens should include:
  - Header card
  - Filter row
  - KPI cards
  - Register section card
- Avoid one-off layouts
- Keep proportions balanced and content centered

## Technical Context
- Frontend: React + Vite
- Backend: Node.js + Express
- Local MVP persistence currently uses file-backed storage
- Prisma schema exists but is not the active runtime path in this environment

## Current Build Notes - 2026-04-26
- Local app runtime is `http://localhost:4000`.
- `api/src/server.js` serves both protected `/api/*` routes and the built React client from `client/dist`.
- Active MVP data persistence is file-backed JSON at `api/src/data/db.json`.
- Seed/demo login is `coo@dcc.local` / `admin123`.
- Main React routing lives in `client/src/App.jsx`.
- Shared frontend primitives live in `client/src/components.jsx`.
- Generic child CRUD for opportunity roles, SOW roles, deployments, actuals, and milestones lives in `api/src/routes/children.js`.
- Actuals has moved toward the newer SOW/deployment/month workbench model in `api/src/routes/actuals.js`; Excel upload is still a future step.
- `BUG-001` is closed: opportunity role revenue rolls up after role save.
- `BUG-002` is closed: SOW create persists status and commercial visibility fields.
- `BUG-003` remains in retest: SOW candidate matching needs a clean UI confirmation pass.
- Candidate matching logic currently exists in the SOW role assignment flow, not directly on the SOW workspace Roles tab.
- Playwright E2E files are scaffolds only; the executable browser test suite is not yet installed/configured.
- `api/scripts/dataEntrySmoke.js` is mutating because it creates smoke records.

## Current Build Notes - 2026-04-27
- SOW workspace now has a `Deployment Plan` tab for explicit SOW role-month planning before resource assignment.
- Deployment plans are stored as file-backed child records in `deploymentPlans` with `sowRoleId`, optional `deploymentId`, `month`, `plannedQuantity`, `plannedUnit`, and optional `notes`.
- The Deployment Plan UI is now a spreadsheet-style matrix: SOW role rows, month columns, total hours, total man months, row save, save all, and clear manual plan.
- Actuals read persisted deployment-month plan rows first, then role-month plan rows, and fall back to derived planning only when no manual plan exists.
- SOW workspace old flat `Actuals` tab has been replaced with `Monthly Summary`.
- Monthly Summary aggregates planned, actual, variance, units, deployment row count, and missing rows by month.
- SOW workspace `Financials` tab now uses actual hours from actual entries with locked deployment bill/cost rates to calculate actual revenue, actual cost, gross margin, and margin percent.
- Dashboard revenue/cost/gross margin KPIs now use actual entries instead of static SOW header visible revenue/cost values.
- SOW workspace header KPI cards now show actual revenue, actual cost, actual gross margin, and actual margin percent in view mode.
- SOW workspace no longer includes an Audit Trail tab; audit review belongs in Admin.
- Admin Audit Log now supports filters for search text, feature/entity, action, actor, source screen, and date range.
- Milestones are hidden for `TM_HOURLY` SOWs and remain available for fixed billing models.
- The former `Deployments` tab is now `Assignments`, focused on resource assignment visualization; `Roles` remains the role planning and staffing capture surface.
- SOW `Roles` tab no longer repeats bill rate, loaded cost, resource name, or assigned count; assignment/rate visibility belongs in `Assignments`.
- Role staffing status is displayed from active assignment coverage: `Open`, `Partially Staffed`, or `Fully Staffed`.
- SOW `Financials` tab no longer repeats the top actual KPI cards or shows the static contract snapshot; it focuses on monthly actual financial detail.
- SOW `Financials` monthly rows now include a `Details` action that expands inline to show planned, actual, and variance for Hours, Revenue, Cost, Gross Margin, and Margin % with a single grouped month cell.
- Financial details use role-month plans with role bill rate and loaded cost guidance for planned financials, and deployment actuals with locked deployment bill/cost rates for actual financials.
- Generic child CRUD now supports deleting child records, used by deployment plan clear/manual fallback behavior.
- `http://localhost:4000/api/health` was verified after restart.
- In-app browser verification is currently blocked because the browser plugin requires Node `>=22.22.0`; the machine resolves `C:\Program Files\nodejs\node.exe` as `22.17.0`.

## Current Build Notes - 2026-04-29
- SOW `projectHealth` is currently a manual field with `Green`, `Amber`, and `Red` values.
- Future enhancement: derive SOW health from rule-based signals by billing model, including actuals completeness, margin versus target, planned versus actual revenue/cost variance, staffing gaps, roll-off risk, and for fixed-bid projects milestone/budget burn risk.
- Until that enhancement is built, Health should be treated as a PM/DM-entered status rather than a system-calculated contract health score.
- Admin now maintains `Regions` and `Locations` as master data collections. Client create/edit uses Admin Regions as a dropdown, seeded with North America, LATAM, Europe, Middle East, Africa, India, APAC, and ANZ.
- Resource create/edit uses Admin Locations and Admin Currencies as dropdowns. Location can default compensation/payment currency and location type, but compensation currency and payment currency remain editable.
- Resource primary skill now supports multiple primary sub-modules. The legacy `subModule` field is retained as the first selected sub-module for compatibility.
- SOW commercial setup now includes Travel & Expenses fields: allowed flag, billing type, cap amount, approval required, and notes.
- SOW workspace now includes an `Attachments` tab next to Financials. Attachment records support document type, document name, reference/URL, and notes for SOW document, scope document, project plan, pricing sheet, change request, approval email, and other references.
- Actuals month entry now supports both row-level Save and `Save All Changes`, with dirty-row highlighting and per-row success/failure messages after bulk save.
- Resource Planning is a new read-only top-level report for future staffing. It includes opportunity roles with probability `>= 70%`, opportunities in `SOW` stage, won opportunities not yet converted to SOW, and open/partially staffed SOW roles.
- Opportunity pipeline now supports `SOW` stage with a default probability of `90%`; probability remains editable.
- Resource Planning matches demand to active resources by SAP module for MVP and excludes resources that are exited, terminated, inactive, sabbatical, or on leave from available supply.
- Resource Planning does not assign resources. Assignment remains only in the SOW role assignment workflow.
- Resource Planning report supports CSV download of the displayed demand/supply rows.
- Resource Planning now has two read-only reports: `Open Positions Report` for future demand/supply matching and `Active Resource Deployment` for current active resource assignments by SOW/project.
- Active Resource Deployment only shows active deployments under active SOWs; deployment number, SOW status, resource ID, and resource status are intentionally omitted to keep the report focused on resource-to-SOW assignment and allocation.
- Resource Planning status labels are defined as `Confirmed Open`, `Open`, `Match Available`, `Partial Match`, and `At Risk`; `Covered` should not be used because the report does not perform assignment.
- Dashboard financial donut must show the calculation basis explicitly: `Actual`, `Actual - No Entries`, or `Projected Revenue Only`. Future months show projected revenue from plans but do not project cost or margin yet.

## Build Priorities
1. Consistent screen system
2. Complete CRUD for header and child objects
3. Linked workflows across pipeline, SOW, staffing, and actuals
4. Admin-driven master/config data
5. Audit and permission hardening

## Review Priorities
- Broken or partial CRUD
- Inconsistent UI patterns
- Missing data linkage
- Derived vs stored field conflicts
- Security and validation gaps
- Missing audit coverage

## Working Mode
- Prefer full-page create/edit screens over popups or inline forms
- Preserve consistent naming and business language
- Make small, reviewable improvements that move the app toward the approved functional spec
