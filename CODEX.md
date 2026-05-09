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
- Seed/demo login is `coo@dcc.local` / `DccDemo!2026`.
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

## Current Build Notes - 2026-05-08
- Railway Postgres is connected through `DATABASE_URL`, but the live MVP scope is intentionally limited to platform/admin master data and configurable authorizations.
- Postgres-backed runtime collections are SAP modules/skills, currencies, regions, locations, experience levels, system configs, number ranges, application roles, permission features, role permissions, and Admin audit entries for those master-data changes.
- Users are identity/security data, not master data. Runtime login currently uses the local JSON bootstrap user `coo@dcc.local`; Railway Postgres user rows were cleared.
- Business data is intentionally not in Railway Postgres for the live MVP start. Clients, resources, opportunities, SOWs, roles, deployments, deployment plans, actuals, milestones, financials, and dashboard business facts remain JSON-backed and have been cleared from `api/src/data/db.json` for a fresh start.
- Old JSON demo business records were archived under `api/src/data/archive/` before clearing. A full pre-clear JSON backup was also written there.
- Phase 2 is closed for the approved scope: master/admin data and authorizations use Postgres repositories/routes, while business data migration is explicitly out of scope.
- Phase 3 is closed for the approved scope: production seed/import defaults are master-data-only; old demo business data is archived and is not reseeded in production.
- `npm run db:seed --workspace api`, `npm run db:seed-master --workspace api`, and `npm run db:import-json --workspace api` now import only master data and authorizations. The full JSON importer remains available only as `npm run db:import-full-json:dev --workspace api` for intentional development recovery.
- Runtime business routes still use the fresh JSON shell until a future business-data repository design is approved. Do not reintroduce demo clients/resources/SOWs/actuals into production seeds.
- Phase 4 deployment approach is one Railway project with two services: the existing Railway Postgres service and one app service that builds the React client and starts the Express API. Express serves `client/dist`, so frontend and backend move together under one Railway domain.
- Production scripts are Railway/Linux-safe: root `build` runs Prisma generate and client build, root `start` starts the API, and `nixpacks.toml` pins Node 22 with `npm ci`, `npm run build`, and `npm start`.
- Frontend API calls use `VITE_API_URL` when supplied, localhost API during Vite dev, and same-origin `/api` in production.
- `CLIENT_URL` supports comma-separated allowed origins for CORS. After Railway generates the app domain, set `CLIENT_URL` to that domain.
- For Railway app and database in the same project, use the Railway Postgres internal/service `DATABASE_URL` reference for the app service. The public proxy URL can work from local machines but may be intermittently unreachable and should not be preferred for the deployed service.
- Resource create/edit now separates operational resource profile data from planning/costing data.
- Resource form tab `Identity and Skills` is now `Resource Profile`; it keeps identity/skill fields and also holds Location, Location Type, Engagement Type, Engagement Status, and Reporting Manager.
- Resource form tab `Employment and Compensation` is now `Resource Planning and Costing`; HR/compliance fields such as Start Date / Joining Date, Notice Period, Visa / Work Authorization, and Background Check are no longer shown in the standard resource form.
- Resource planning labels now use operational language: `Current Allocation %`, `Remaining Capacity %`, and `Current Engagement Roll-Off Date`.
- Cost labels now use the approved language: `Costing Type`, `Cost Basis Amount`, and `Estimated Cost Rate`.
- Blank `Costing Type` is allowed and means the estimated hourly cost rate is entered directly.
- Estimated cost rate is visible to DM, Director, VP, COO, Finance, and Admin-level users; PM users do not see resource cost fields.
- Raw costing setup fields are limited to Finance/Admin visibility in the current UI. Backend field names remain compatible with the existing actuals and financial calculations.
- `Director` is seeded as an application role with the same cost and margin visibility as VP/COO/Finance.
- Authorization is moving from hard-coded role checks to configurable role permissions.
- Admin now includes a `Role Permissions` matrix where each role can be granted feature/action access such as `view`, `create`, `edit`, `delete`, `export`, `viewCost`, `viewMargin`, and `edit`.
- The permission catalog currently covers Command Center, Clients, Resources, Resource Costing, Pipeline, SOWs, SOW Financials, Actuals, Resource Planning, Attachments, Master Data, Audit Logs, and Admin.
- Login and `/api/auth/me` now return a `permissions` array such as `resourceCosting:view`; resource costing visibility uses this permission model with legacy `canViewCost` retained only as compatibility fallback.
- Prisma schema is now pointed at PostgreSQL and includes relational authorization models: `AppRole`, `PermissionFeature`, and `RolePermission`.
- Added a top-level `Financial Cockpit` menu item at `/financials`. This is a portfolio cockpit and does not replace SOW-level Financials.
- Financial Cockpit uses `/api/financials` to aggregate planned-to-date versus actual revenue/cost/gross margin, margin %, actuals completion, monthly financial trends, revenue by client, margin leakage SOWs, missing actuals, and top revenue SOWs.
- Financial Cockpit access is governed by the configurable `financialCockpit:view` permission.
- Phase 1 database foundation is complete: `api/prisma/schema.prisma` now models the current MVP collections as PostgreSQL relational tables, including clients, users, resources, pipeline, SOWs, SOW roles, deployments, deployment month plans, actuals, milestones, SOW attachments, audit logs, SAP modules, currencies, regions, locations, experience levels, system configs, number ranges, app roles, permission features, and role permissions.
- `api/scripts/importJsonToPostgres.js` supports master-data-only imports for the live MVP boundary. Full business import is development-only and should not be used for production seeding.
- Root/API scripts include `db:migrate`, `db:seed`, `db:seed-master`, `db:import-json`, and development-only `db:import-full-json:dev`.
- `api/.env.example` expects a PostgreSQL `DATABASE_URL`; local `.env` is configured for Railway Postgres in this workspace.

## Current Build Notes - 2026-05-09
- Runtime business collections now hydrate from Railway Postgres through `api/src/data/store.js`; `db.json` is only a bootstrap fallback when a table is empty.
- Create/update/delete flows for clients, resources, opportunities, SOWs, child records, admin local collections, and password changes now wait for queued Postgres persistence before returning success.
- If Postgres rejects a write, the API returns a `500` save failure instead of silently keeping the record only in server memory.
- This hardening prevents the prior failure mode where a newly entered SOW/role/deployment could appear in the running app but vanish after a Railway redeploy because the Postgres write had failed.
- The SOW that vanished after the deployment-plan fix was not present in Railway Postgres and cannot be recovered from the current database state; it needs to be recreated unless Railway backups or logs contain it.

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
