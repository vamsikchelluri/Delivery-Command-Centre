# Functional Specification and Build Prompt

## 1. Purpose

This document translates the source product documentation into a practical functional specification for building a **Delivery Command Center (DCC) for an SAP Service SBU**. It is designed for leadership, product, engineering, and implementation teams that need a clear target operating model and a ready-to-use product build prompt.

The platform should give the SAP Service SBU leadership team a single operational control tower covering:

- Resource management
- SOW / project delivery management
- Pipeline and forecast management
- Margin, utilization, and bench visibility
- Role-based operational and financial reporting

This should remain primarily a **COO review and delivery visibility application**, not a full financial system or enterprise planning platform. The design should stay practical, linked, and flexible without becoming overly rigid in areas that can mature later.

## 2. Product Vision

Build a browser-based internal operations platform for an SAP services business unit that consolidates delivery, staffing, and pipeline data into one system. The application must help leadership answer, in real time:

- Which SAP resources are deployed, partially deployed, or on bench?
- What projects and SOWs are active, at risk, or nearing roll-off?
- What is the current and projected revenue, cost, and gross margin?
- What pipeline is likely to convert, and what staffing demand is coming?
- Where are billing milestones, actuals, and resource utilization slipping?

## 3. Business Goals

- Create a single source of truth for SAP delivery operations.
- Reduce spreadsheet-based tracking across staffing, P&L, and pipeline.
- Improve bench management and roll-off planning.
- Enable faster staffing decisions using cost and margin previews.
- Provide leadership-level KPI visibility refreshed at near real-time intervals.
- Preserve historical financial accuracy through cost rate versioning.
- Keep data entry and controls lightweight enough for operational adoption by delivery and account teams.

## 4. Primary Users

- `SBU Head / COO`: full visibility across all modules, financials, trends, and alerts
- `Delivery Managers`: manage projects, staffing, assignments, actuals, and roll-off planning
- `Project Managers`: manage project roles, monthly actuals, and delivery execution
- `Account Managers`: manage opportunities, pipeline stages, and conversion to SOW
- `Finance Viewers`: read-only access to project financials, milestone billing, and margin reports
- `Super Admin`: manage users, roles, permissions, reference data, and system settings
- `Read Only / Leadership`: view dashboards and reports without edit rights

## 5. Scope of the MVP

The MVP should include six core modules:

- Executive dashboard
- Resource management
- Project / SOW management
- Pipeline management
- Settings and administration
- Authentication and RBAC

## 6. Core Modules and Functional Requirements

### 6.1 Executive Dashboard

The dashboard is the default landing page after login and must refresh automatically every 60 seconds.

It should display:

- Active resources count
- Available bench count
- Partially deployed count
- Active SOW count
- Total monthly revenue
- Total monthly cost
- Gross margin and margin %
- Weighted pipeline value
- Upcoming roll-offs within 30 days
- Bench aging alerts for 14+ days and 30+ days
- Upcoming fixed-price milestones due in the next 14 days

Visualizations should include:

- Revenue vs cost monthly trend chart
- Pipeline funnel by stage
- Bench aging list with skill, location, and idle days
- Upcoming roll-off list
- Milestone billing alert list
- Top active SOWs by revenue and margin

### 6.2 Resource Management

This module manages SAP employees, contractors, and C2C resources across offshore and onsite delivery locations.

Resource master should support:

- Employee ID
- First name
- Last name
- Email
- Phone
- Primary skill
- Primary skill sub-modules
- Secondary skills
- Secondary skill sub-modules
- Location type: offshore or onsite
- Employment type: full-time, part-time, contractor, C2C
- Joining date
- Contract start and end dates
- Notice period
- Delivery roll-off date
- Visa type and expiry
- Background/compliance status
- Payment currency
- Compensation input type and value
- Derived USD hourly cost rate
- Employment status: Active, On Leave, Sabbatical, Inactive, Terminated, Exited
- Delivery status: Available, Fully Deployed, Partially Deployed, On Bench, Future Assigned, On Leave, Terminated

Resource functions should include:

- Add and edit resource via guided multi-step form
- Search and filter by skill, sub-module, location, status, employment type, and availability
- View current and historical deployments
- Prevent over-allocation and highlight allocation conflicts
- Track delivery roll-off dates and automatically surface bench risk
- Maintain append-only cost history with effective date and reason

Design note:

- `Employment status` is a maintained HR-style field
- `Delivery status` should be largely system-derived from deployments and availability, but must allow operational exceptions such as leave or sabbatical so the design is not overly rigid

### 6.3 Cost Rate Engine

The system must calculate standardized USD/hour cost rates used in all project and portfolio P&L views.

Configurable system values:

- Standard hours per year, default `1800`
- Overhead multiplier, default `1.2`
- FX rates with USD as base

Rules:

- Offshore employee: `(annual CTC / FX rate / standard hours) * overhead multiplier`
- Onsite employee: `(annual salary in USD / standard hours) * overhead multiplier`
- Offshore contractor/C2C: `hourly rate converted to USD if needed`, no overhead
- Onsite contractor/C2C: `hourly USD rate as-is`, no overhead

Important behavior:

- Cost history must be versioned
- Deployments must lock the cost rate effective at assignment time
- Historical project P&L must not change when a resource’s current rate changes later

### 6.4 Project / SOW Management

This module manages client SOWs from creation through staffing, actuals, and billing visibility.

SOW header should include:

- Client name
- Project name
- SOW number
- SOW type: T&M or Fixed Price
- Currency
- Start date
- End date
- Contract value
- Project Manager
- Delivery Manager
- Account Manager
- Parent SOW reference for addendums
- Status: Draft, Active, On Hold, Completed, Terminated

Each SOW should support:

- One or more billable roles
- Role quantity and phased staffing over time
- Bill rate and billing type per role
- Planned dates per role
- Planned hours logic from working days and allocation
- Resource deployment assignments
- Margin preview before assignment
- Monthly actuals entry per deployment
- SOW-level and role-level P&L
- Fixed-price milestone billing

Role management should support:

- Role title
- SAP skill and sub-module requirement
- Quantity
- Billing type
- Bill rate
- Start and end date
- Planned allocation %
- Planned hours
- Role staffing status: Open, Partially Staffed, Fully Staffed, Closed

Deployment management should support:

- Assign one or more resources to a role across date ranges and allocation %
- Show preview of revenue, cost, and margin before confirmation
- Update resource status upon assignment
- Prevent conflicting assignments or over-allocation

Monthly actuals should support:

- Upsert of actual hours by deployment and month
- Override of planned hours when actuals exist
- Computation of billed value, cost, and margin using actuals

Fixed-price milestones should support:

- Planned date
- Planned amount
- Actual date
- Actual amount
- Invoice date
- Payment date
- Status: Upcoming, Invoiced, Paid

### 6.5 Project Financial Logic

For T&M SOWs:

- Planned hours = `working days in month * 8 * allocation %`
- If a deployment starts or ends mid-month, planned hours must be prorated using the active days in that calendar month
- Actuals are required once the SOW is active and work has started
- If actual hours exist, they override planned hours for financial calculations
- Revenue = `billed hours * bill rate`
- Cost = `hours * locked resource cost rate`
- Gross margin = `revenue - cost`
- Margin % = `gross margin / revenue * 100`

For fixed monthly / fixed-price scenarios:

- Fixed monthly billing should use a monthly or man-month rate at the role level
- Fixed-price milestone billing should use milestone amounts for revenue
- Actual hours on fixed-price work should primarily support internal cost, utilization, and margin visibility
- Cost should still derive from deployed resource effort and locked cost rate
- Dashboard must surface upcoming uninvoiced milestones due within 14 days

Calendar rule:

- Planned hours may use the normal calendar excluding weekends
- A separate work calendar or holiday engine is not required for MVP
- Public holidays and delivery-specific non-working time can be reflected through actuals entry rather than an advanced planning calendar

### 6.6 Pipeline Management

This module manages pre-SOW opportunities and forecasted staffing demand.

Opportunity master should include:

- Client
- Opportunity name
- Account Manager
- Stage
- Probability
- Source
- Start and end date
- Currency
- Estimated revenue (header value entered by account manager)
- Role-estimated revenue (system-derived from opportunity roles when available)
- Target margin
- Weighted value
- Notes / activity log

Opportunity stages:

- Qualifying: `20%`
- Proposed: `40%`
- Negotiating: `70%`
- Won: `100%`
- Lost: `0%`

Opportunity roles should include:

- Role title
- SAP skill
- Sub-module
- Location
- Experience level
- Estimated hours
- Bill rate
- Cost guidance
- Resource identification status: Unidentified, Identified, Confirmed
- Optional linked candidate resource

Pipeline functions should include:

- Auto-compute weighted value as `estimated revenue * probability / 100`
- Roll up weighted pipeline across all active non-lost opportunities
- Convert won opportunities into draft SOWs with role carry-forward
- Preserve opportunity history after conversion

Design note:

- Opportunities may be created before detailed role demand is known
- The account manager should be able to enter a header-level `estimated revenue` early
- As roles are added, the system should calculate `role-estimated revenue`
- The account manager may later align the header estimate with the role-based estimate

### 6.7 Bench and Utilization Management

The system must continuously detect resource bench and utilization conditions.

Definitions:

- On bench: no active deployments
- Partial deployment: active allocation less than full utilization threshold
- Upcoming bench: resource roll-off within 30 days and no future assignment

Alerts:

- Warning for bench duration greater than 14 days
- Critical alert for bench duration greater than 30 days
- Upcoming roll-off alert within 30 days

Utilization views should show:

- Current allocation %
- Planned utilization by month
- Actual hours vs planned hours
- Bench start date
- Days idle
- Delivery roll-off date

### 6.8 Settings and Administration

Admin settings should cover:

- User management
- Role management
- Module permissions
- Field-level permissions
- SAP skill catalog and sub-modules
- Currency management and FX rates
- System configuration values
- Session management
- Audit logs

Implementation note:

- Field-level permissions should follow best practices, but the MVP should keep this lightweight
- Start with sensible defaults for sensitive financial fields rather than investing heavily in advanced permission modeling before the base product is stable

Seed data recommended for go-live:

- SAP skill catalog with major modules like FICO, SD, MM, HCM, Basis, ABAP, S/4HANA, EWM, BW/BI, SuccessFactors, Ariba, Concur, Fieldglass, IBP, BTP, C4C, Migration, PM, QM
- Core currencies: USD, INR, GBP, EUR
- Standard roles and default permission matrix
- Initial super admin account

### 6.9 Authentication and Security

Security requirements:

- JWT-based authentication
- Access token validity of 15 minutes
- Refresh token validity of 7 days
- Password hashing using bcrypt
- RBAC enforcement on every API route
- Field-level masking for sensitive values such as cost rate and margin
- Audit logging for all create, update, delete actions
- Session visibility and forced logout support
- TLS/HTTPS in production

## 7. Data Model

Recommended entities:

- `Skill`
- `Currency`
- `SystemConfig`
- `Resource`
- `ResourceSkill`
- `CostHistory`
- `Project`
- `Role`
- `Deployment`
- `Actual`
- `Milestone`
- `Opportunity`
- `OppRole`
- `AppRole`
- `Permission`
- `FieldPermission`
- `User`
- `Session`
- `AuditLog`

## 8. Recommended Screens

- Login
- Dashboard
- Resource roster
- Add/edit resource wizard
- Resource detail with cost history and deployments
- SOW register
- SOW create/edit
- SOW detail with tabs for overview, roles, deployments, actuals, milestones, P&L
- Opportunity register
- Opportunity create/edit
- Opportunity detail with role demand and conversion action
- Settings: users, roles, permissions, skills, currencies, system config, sessions, audit log

## 9. Key Workflows

### Resource onboarding

1. Admin creates a resource.
2. Skills and SAP sub-modules are captured.
3. Employment and compensation details are entered.
4. System computes the USD hourly cost rate.
5. Initial cost history record is created.
6. Resource appears as available.

### SOW staffing

1. Delivery or project manager creates a new SOW.
2. Roles are added with bill rates and dates.
3. User assigns a resource to a role.
4. System previews revenue, cost, and gross margin.
5. Deployment is confirmed and resource status updates.
6. PM enters monthly actual hours.
7. SOW P&L refreshes automatically.

### Pipeline conversion

1. Account manager creates an opportunity.
2. Required SAP roles are defined.
3. Stage and probability progress over time.
4. Once marked won, the system enables conversion.
5. A draft SOW is created with roles copied forward.
6. Delivery manager activates the SOW and staffs it.

## 10. Reporting and KPIs

The solution should support:

- Monthly revenue
- Monthly cost
- Gross margin $
- Gross margin %
- Weighted pipeline $
- Active SOW count
- Available bench count
- Bench aging buckets
- Upcoming roll-offs
- Utilization %
- Hours used %
- Milestone due and invoice status
- Resource deployment coverage by SAP skill
- Revenue visibility for active SOWs based on entered actual efforts

## 11. Non-Functional Requirements

- Web-based responsive UI
- Near real-time dashboard refresh at 60-second intervals
- Role-based UI and API enforcement
- Full auditability of financial and staffing changes
- Historical rate locking for financial accuracy
- Searchable lists with filtering and pagination
- Secure session handling
- Scalable modular architecture for future integration with ERP/HRMS/CRM tools

## 12. Suggested Technical Architecture

- Frontend: React + Vite
- State management: TanStack Query
- Routing: React Router
- Backend: Node.js + Express
- ORM: Prisma
- Database: PostgreSQL
- Auth: JWT + refresh token rotation
- Hosting: Dockerized deployment on cloud platform

## 13. Assumptions and Adaptations for an SAP Service SBU

This specification preserves the operating model from the source document but adapts it for a broader SAP Service SBU context:

- Replace company-specific branding with SBU branding
- Keep SAP skill hierarchy as a first-class object model
- Preserve staffing, P&L, and pipeline as the three primary control pillars
- Treat SOWs as the primary delivery unit
- Keep margin-aware staffing decisions central to the user experience

## 14. Build Prompt for an AI Product/Engineering Assistant

Use the prompt below to generate the product, architecture, and implementation plan:

```text
Create a web-based internal product called "Delivery Command Center" for an SAP Service SBU. The system should act as an operations control tower for leadership, delivery managers, project managers, account managers, finance viewers, and admins.

The application must have these modules:
1. Executive dashboard
2. Resource management
3. Project / SOW management
4. Pipeline management
5. Settings and administration
6. Authentication and role-based access control

Core business goal:
Provide real-time visibility into SAP resource utilization, bench, project financials, roll-offs, milestone billing, and weighted pipeline forecast in one browser-based platform.

Functional requirements:
- Dashboard should refresh every 60 seconds and show KPIs for active resources, bench count, active SOWs, revenue, cost, margin, weighted pipeline, upcoming roll-offs, bench aging, and milestone alerts.
- Resource management must support employees, contractors, and C2C resources across offshore and onsite locations.
- Each resource must capture identity, primary skill, skill sub-modules, secondary skills, location, employment type, joining/contract dates, notice period, roll-off date, visa/compliance details, currency, compensation inputs, and computed USD hourly cost.
- Include a cost rate engine with configurable standard hours/year, overhead multiplier, and FX rates.
- Cost formulas:
  - Offshore employee: (annual CTC / FX rate / standard hours) * overhead multiplier
  - Onsite employee: (annual salary USD / standard hours) * overhead multiplier
  - Offshore contractor/C2C: hourly rate converted to USD if needed, no overhead
  - Onsite contractor/C2C: hourly USD rate as-is, no overhead
- Maintain append-only cost history and lock the effective cost rate at deployment time so historical P&L remains unchanged after later rate edits.
- Project/SOW management must support T&M and fixed-price SOWs with client, project, managers, dates, contract value, status, roles, deployments, actuals, milestones, and project-level P&L.
- Role assignment must show a preview of revenue, cost, and margin before confirmation.
- Planned hours should be based on working days/month * 8 * allocation %, while actual hours should override planned hours when entered.
- Revenue, cost, gross margin, margin %, and hours used % should be computed automatically.
- Fixed-price SOWs must support milestone-based billing with planned date, planned amount, actual date, actual amount, invoice date, payment date, and status.
- Pipeline management must support opportunities with stages, probabilities, weighted value, required SAP roles, account manager ownership, notes, and one-click conversion of won opportunities into draft SOWs.
- Default stage probabilities:
  - Qualifying 20%
  - Proposed 40%
  - Negotiating 70%
  - Won 100%
  - Lost 0%
- Bench logic:
  - Resource is on bench when no active deployment exists
  - Alert when bench > 14 days
  - Critical alert when bench > 30 days
  - Upcoming bench alert when roll-off is within 30 days
- Add settings for users, roles, permissions, field visibility, SAP skills, currencies, system config, sessions, and audit logs.
- Enforce JWT auth, refresh tokens, RBAC, field-level masking, audit logs, and session management.

Recommended data model:
Skill, Currency, SystemConfig, Resource, ResourceSkill, CostHistory, Project, Role, Deployment, Actual, Milestone, Opportunity, OppRole, AppRole, Permission, FieldPermission, User, Session, AuditLog.

Preferred stack:
React + Vite frontend, Node.js + Express backend, PostgreSQL database, Prisma ORM, JWT authentication, Docker deployment.

Design the UX for fast operational decision-making. Leadership should be able to open the dashboard and instantly understand utilization, delivery health, gross margin, and forecast. Delivery managers should be able to staff roles quickly with cost and margin clarity. Finance viewers should get trustworthy, historically accurate project P&L.

Return:
1. Product architecture
2. Database schema proposal
3. API design
4. Screen-by-screen UX specification
5. KPI definitions and formulas
6. User roles and permission matrix
7. Delivery roadmap for MVP and phase 2
```
