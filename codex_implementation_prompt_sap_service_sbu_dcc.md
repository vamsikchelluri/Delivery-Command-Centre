# Codex Implementation Prompt

Build a web application called **Delivery Command Center (DCC)** for an SAP Service SBU.

Use these two source documents as the functional baseline:

- [final_functional_spec_sap_service_sbu_dcc.md](C:/Users/vamsi/Documents/Codex/2026-04-23-files-mentioned-by-the-user-dcc/final_functional_spec_sap_service_sbu_dcc.md)
- [codex_build_annex_sap_service_sbu_dcc.md](C:/Users/vamsi/Documents/Codex/2026-04-23-files-mentioned-by-the-user-dcc/codex_build_annex_sap_service_sbu_dcc.md)

## Product Positioning

This is a **COO review and delivery visibility application** for an SAP services business unit. It is not a full ERP, accounting, or advanced planning system.

The application must provide one connected view of:

- pipeline and opportunities
- SOWs and delivery execution
- resource deployments and availability
- actual effort-driven revenue visibility
- gross margin visibility
- delivery roll-offs, bench risk, and milestones

## Core Modules

Build these modules:

1. Authentication and navigation
2. Command Center dashboard
3. Account master
4. Resource management
5. Opportunity and pipeline management
6. SOW management
7. Staffing and deployments
8. Actuals workbench with Excel upload
9. Milestones
10. Reports
11. Admin and configuration
12. Audit trail

## Product Rules

- Treat `SOW` as the main signed-work object.
- Treat `Project` and `SOW` as the same object in MVP.
- Support both direct SOW creation and opportunity-to-SOW conversion.
- Opportunity should support both header `Estimated Revenue` and derived `Role-estimated revenue`.
- SOW and Opportunity should both support multiple roles.
- Roles must support hourly, man-day, and man-month style commercial structures.
- Delivery status must be separate from employment status.
- Delivery status values for MVP:
  - Available
  - Fully Deployed
  - Partially Deployed
- Full deployment threshold defaults to 90% and should be configurable.
- Resource not-available periods should be handled through date range fields, not through delivery status proliferation.
- Actuals are required for active started SOWs and must support Excel upload by `SOW + Month`.
- If actuals are missing after SOW start, visible revenue should remain zero and the SOW must be surfaced in dashboard/report exceptions.
- Keep permissions practical and lightweight for MVP.
- Maintain audit trail for all master and transaction changes.

## Suggested Technical Stack

- Frontend: React + Vite
- Routing: React Router
- State: TanStack Query
- Backend: Node.js + Express
- ORM: Prisma
- Database: PostgreSQL
- Auth: JWT + refresh token
- File handling: Excel upload support

## Core Entities

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
- Permission
- FieldPermission
- Session
- AuditLog

## UI Expectations

Use an enterprise operations-cockpit UX:

- left navigation
- dashboard with KPI cards and drill-through widgets
- register/list screens with quick filters
- detail workspaces with tabs
- guided conversion wizard for opportunity to SOW
- staffing workspace/modal with fit and margin preview
- actuals workbench with Excel template download and upload preview

## Must-Have Screens

- Login
- Command Center dashboard
- Resource register and detail
- Opportunity register and detail
- Opportunity-to-SOW conversion wizard
- SOW register and detail
- Staffing assignment workspace
- Actuals workbench
- Reports
- Admin/configuration

## Delivery Expectations

Implement in phases:

1. schema and auth foundation
2. master data and resources
3. opportunities and roles
4. SOWs and conversion flow
5. staffing and deployments
6. actuals and Excel upload
7. dashboard and reports
8. audit trail hardening

## Output Requested

Produce:

1. Database schema
2. API design
3. Frontend routes and screen structure
4. Core business logic services
5. MVP implementation plan
6. Initial working application skeleton with modules wired together
