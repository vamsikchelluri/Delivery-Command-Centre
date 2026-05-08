# Final Functional Specification
## Delivery Command Center for SAP Service SBU

## 1. Purpose

This document defines the final functional specification for a **Delivery Command Center (DCC)** for an SAP Service SBU.

The product is intended to be a **COO review and delivery visibility application** that provides a single view of:

- pipeline and opportunities
- active SOWs and delivery progress
- resource deployments and bench visibility
- actual effort-based revenue visibility
- gross margin visibility
- upcoming roll-offs and milestone risks

This is **not** intended, at this stage, to be a full ERP, financial accounting system, or enterprise planning platform. The design should remain practical, lightweight, and operationally useful.

## 2. Product Vision

Build a browser-based internal operations platform that allows leadership and delivery teams to answer, in near real time:

- What opportunities are in the pipeline and what is the weighted forecast?
- Which SOWs are active, at risk, or nearing roll-off?
- Which resources are available, deployed, partially deployed, on leave, or nearing bench?
- What revenue, cost, and gross margin are visible across active delivery?
- Where are staffing gaps, milestone risks, or actuals delays affecting delivery visibility?

## 3. Business Goals

- Create a single operational source of truth for SAP service delivery.
- Replace spreadsheet-driven tracking for pipeline, staffing, and SOW visibility.
- Improve deployment planning and bench management.
- Give leadership a consolidated dashboard for delivery, margin, and forecast review.
- Enable delivery teams to enter actual efforts and maintain reliable revenue visibility.
- Keep the product simple enough for regular operational adoption.

## 4. Primary Users

- `SBU Head / COO`: full cross-functional dashboard and portfolio visibility
- `Delivery Manager`: staffing, SOW oversight, actuals review, deployment and roll-off planning
- `Project Manager`: SOW roles, deployments, actual effort entry, milestone tracking
- `Account Manager`: opportunities, forecast, demand shaping, opportunity-to-SOW handoff
- `Finance Viewer`: read-only commercial visibility for revenue, cost, margin, and milestone status
- `Super Admin`: user access, settings, skills, currencies, configurations, audit access
- `Read Only Leadership`: read-only visibility into dashboards and operational reports

## 5. Product Scope for MVP

The MVP includes:

- Command Center dashboard
- Resource management
- Opportunity and pipeline management
- SOW management
- Actual effort capture
- Settings and access control

The MVP does **not** need:

- advanced financial accounting
- advanced holiday/work calendar planning
- sophisticated workflow approvals
- highly complex field-level permission administration

## 6. Design Principles

- Keep the product operational and review-oriented.
- Prefer clear linkage between modules over deep complexity.
- Allow practical flexibility where business operations are not rigid.
- Separate master data from derived operational data.
- Use drill-down UX from dashboard to registers to detail workspaces.
- Preserve historical cost accuracy without turning the product into a finance platform.

## 7. Core Modules

### 7.1 Command Center Dashboard

The dashboard is the landing page after login and should refresh every 60 seconds.

It should show:

- active opportunities count
- weighted pipeline value
- active SOW count
- active resources count
- available resources count
- partially deployed resources count
- on-bench resources count
- total visible revenue for active SOWs
- total visible cost for active SOWs
- gross margin and margin %
- upcoming delivery roll-offs within 30 days
- resources on bench for more than 14 days
- resources on bench for more than 30 days
- upcoming fixed-price milestones due in the next 14 days
- actuals pending or missing for active delivery

Recommended sections:

- KPI cards
- revenue vs cost trend
- pipeline funnel
- bench aging list
- upcoming roll-off list
- milestone alert list
- active SOW summary
- exception queue for missing actuals or staffing gaps

Each KPI or alert widget should drill into a filtered detail screen.

### 7.2 Resource Management

This module manages SAP employees, contractors, and C2C resources across offshore and onsite locations.

#### Resource master fields

- resource ID / employee ID
- first name
- last name
- email
- phone
- primary skill
- primary skill sub-modules
- secondary skills
- secondary skill sub-modules
- base location
- location type: Offshore / Onsite
- employment type: Full-Time / Part-Time / Contractor / C2C
- joining date
- contract start date
- contract end date
- notice period
- visa type
- visa expiry
- background/compliance status
- compensation currency
- compensation input type
- compensation input value
- derived USD hourly cost rate
- manager / owner
- availability date
- delivery roll-off date
- employment status
- delivery status
- active flag

#### Employment status

This is a maintained business field. Suggested values:

- Active
- On Leave
- Sabbatical
- Inactive
- Terminated
- Exited

#### Delivery status

This is a mostly operational field and should be system-driven where possible, but flexible enough to handle real business conditions.

Suggested values:

- Available
- Fully Deployed
- Partially Deployed
- On Bench
- Future Assigned
- On Leave
- Terminated

Design rule:

- `Employment status` and `Delivery status` must be two separate fields.
- `Delivery status` should be mostly derived from deployments, availability, and operational context.
- The design should not be overly rigid; operational exceptions such as leave or sabbatical must be supported.

#### Resource functions

- add/edit resource using a guided form
- search and filter by skill, sub-module, status, availability, location, employment type
- view current deployments and past deployment history
- view cost history
- surface allocation conflicts
- surface bench aging and delivery roll-off risk
- show linked opportunities where a resource is identified or confirmed

### 7.3 Cost Rate Engine

The system calculates a normalized USD/hour cost rate for margin visibility.

#### Configurable values

- standard hours per year, default `1800`
- overhead multiplier, default `1.2`
- FX rates with USD as base

#### Cost logic

- Offshore employee: `(annual CTC / FX rate / standard hours) * overhead multiplier`
- Onsite employee: `(annual salary USD / standard hours) * overhead multiplier`
- Offshore contractor / C2C: hourly rate converted to USD if needed, no overhead
- Onsite contractor / C2C: hourly rate in USD, no overhead

#### Cost history rules

- maintain append-only cost history
- every change requires effective date and reason
- deployments must lock the cost rate effective at assignment time
- historical SOW margin must not change due to future resource rate edits

### 7.4 Opportunity and Pipeline Management

This module manages pre-SOW commercial opportunities and staffing demand.

#### Opportunity header fields

- opportunity ID
- account ID
- client / account name
- opportunity name
- account manager
- stage
- probability
- source
- expected start date
- expected end date
- expected close date
- currency
- estimated revenue
- role-estimated revenue
- target margin
- weighted value
- deal type
- notes / activity log
- win/loss reason

#### Opportunity design rule

Opportunities may be created before detailed demand roles are known.

Therefore:

- `Estimated revenue` is a header-level value entered by the account manager.
- `Role-estimated revenue` is a system-derived value based on defined opportunity roles.
- The account manager may later align the header estimate with the role-based estimate.
- Weighted pipeline should use the header `estimated revenue` unless the business later decides otherwise.

#### Opportunity stages

- Qualifying: `20%`
- Proposed: `40%`
- Negotiating: `70%`
- Won: `100%`
- Lost: `0%`

#### Opportunity role fields

- opportunity role ID
- role title
- SAP skill
- sub-module
- quantity
- location requirement
- engagement type: Full-Time / Part-Time
- experience level
- start date
- duration
- end date
- estimated hours
- bill rate
- cost guidance
- resource identification status
- optional linked candidate resource
- allocation %
- comments / notes

Role behavior:

- users must be able to add one or more roles to an opportunity
- with `start date` and `duration`, the system should calculate `end date`
- users may also directly adjust end date if needed
- `estimated hours` may be derived from duration and allocation, but should remain editable where business teams need flexibility
- role-level data should support early commercial modeling even before final staffing is known

Suggested resource identification statuses:

- Unidentified
- Identified
- Confirmed

#### Opportunity functions

- create and edit opportunity
- maintain demand roles
- update stage and probability
- track activity notes
- compute weighted value
- compare header estimate vs role-estimated revenue
- convert a won opportunity into a draft SOW

### 7.5 SOW Management

This module manages signed work from draft creation through staffing, actuals, milestones, and margin visibility.

#### SOW header fields

- SOW ID
- source opportunity ID
- account ID
- client / account name
- SOW / engagement name
- SOW number
- SOW type
- billing model
- currency
- start date
- end date
- contract value
- project manager
- delivery manager
- account manager
- parent SOW reference
- payment terms
- billing frequency
- purchase order / contract reference
- project health / RAG
- status

#### Suggested SOW status values

- Draft
- Active
- On Hold
- Completed
- Terminated

#### SOW role fields

- role ID
- source opportunity role ID
- role title
- SAP skill
- sub-module
- quantity
- engagement type: Full-Time / Part-Time
- billing type
- bill rate
- cost rate / cost guidance
- start date
- duration
- end date
- planned allocation %
- planned hours
- location requirement
- staffing priority
- staffing status
- remarks

Role behavior:

- users must be able to add one or more roles to a SOW
- with `start date` and `duration`, the system should calculate `end date`
- end date may still be editable if needed
- role commercials should support hourly, man-day, or man-month style pricing depending on billing model
- role-level planned hours should be derived from dates and allocation, but visible to the user

Suggested staffing statuses:

- Open
- Partially Staffed
- Fully Staffed
- Closed

#### SOW role design rule

Do not assume one role always maps to one resource.

- A role may require multiple resources.
- A role may be staffed in phases.
- A role may have replacements or overlapping assignments over time.
- A role is a demand position within the SOW; a deployment is the actual staffing assignment.

#### Deployment fields

- deployment ID
- SOW role ID
- resource ID
- start date
- end date
- allocation %
- deployment status
- locked cost rate
- locked bill rate
- billable flag
- source of assignment

Suggested deployment statuses:

- Planned
- Active
- Ended
- Cancelled

#### Deployment functions

- assign one or more resources to a role
- allow time-phased staffing and replacement staffing
- preview revenue, cost, and margin before confirming
- detect allocation conflicts
- update delivery visibility and capacity views

### 7.6 Actual Effort Capture

Actuals are required once a signed SOW is active and work has started.

This module should remain simple and operational.

#### Actual fields

- actual ID
- deployment ID
- month
- actual quantity
- actual unit
- entered by
- entered date
- remarks

#### Actuals functions

- enter monthly actual effort by deployment
- edit current period actuals
- show missing actuals for active work
- provide a monthly actuals workbench
- support PM and DM review
- support Excel-based bulk upload for one SOW and one month at a time

#### Excel upload rules

- upload is limited to one `SOW + Month` per file
- PM/DM should only be able to upload actuals for SOWs assigned to them
- downloadable template should be available for the selected SOW and month
- template should be prefilled with active deployed resources for that SOW/month where possible
- upload matching key should be:
  - `SOW Number + Role + Resource ID + Month`
- upload columns:
  - `SOW Number`
  - `Month`
  - `Resource Name`
  - `Hours or Actual Quantity`
  - `Remarks`
- upload should overwrite existing values for the same matching row
- upload should validate SOW, role, resource, month, and quantity before import
- upload should show errors and preview results before final confirmation

#### Actual measurement rule

- actuals should follow the selected SOW measurement basis
- if the SOW billing measurement is hourly, actuals should be entered in hours
- if the SOW billing measurement is man-month based, actuals should be entered in man-months
- the UI and Excel template should reflect the measurement basis for that SOW

### 7.7 Milestone Tracking

For fixed-price SOWs, milestone tracking is used for revenue visibility.

#### Milestone fields

- milestone ID
- SOW ID
- milestone name
- sequence
- planned date
- planned amount
- actual date
- actual amount
- invoice date
- payment date
- status
- remarks

Suggested milestone statuses:

- Upcoming
- In Progress
- Invoiced
- Paid

#### Milestone functions

- create milestone plan at SOW level
- update milestone progress
- flag upcoming uninvoiced milestones due within 14 days

## 8. Financial and Revenue Visibility Logic

The product should support commercial visibility without becoming a finance system.

### 8.1 T&M Hourly Billing

- planned hours = `working days in month * 8 * allocation %`
- if deployment starts or ends mid-month, planned hours must be prorated for the active days in that month
- actual hours override planned hours once entered
- revenue = `billed hours * bill rate`
- cost = `hours * locked cost rate`
- gross margin = `revenue - cost`
- margin % = `gross margin / revenue * 100`

### 8.2 Fixed Monthly Billing

- use a monthly or man-month rate at role level
- revenue visibility is based on the applicable monthly rate
- cost visibility still uses resource actual effort or planned effort against locked cost rate

### 8.3 Fixed Price / Milestone Billing

- revenue visibility is based on milestone amounts
- actual hours are used mainly for internal cost, utilization, and margin visibility
- milestone due/in-progress/invoiced/paid state should be shown on the dashboard and SOW detail

### 8.4 Calendar Rule

For MVP:

- use the normal calendar excluding weekends for planned-hour calculations
- do not implement an advanced work calendar or holiday engine
- holidays and practical exceptions can be handled through actual effort entry

## 9. Bench and Roll-Off Logic

Bench and roll-off visibility are key COO review features.

### 9.1 Bench definitions

- On Bench: no active deployment
- Partially Deployed: active allocation below full utilization
- Future Assigned: no current deployment but future assignment exists
- Upcoming Bench Risk: delivery roll-off within 30 days with no confirmed next assignment

### 9.2 Bench alerts

- warning when bench duration > 14 days
- critical when bench duration > 30 days
- upcoming roll-off alert within 30 days

### 9.3 Roll-off rule

- use `delivery roll-off date` as the business-facing field
- it should be primarily derived from the latest relevant deployment end date
- avoid duplicate unrelated roll-off tracking fields

## 10. Master Data and Core Relationships

The system should be linked through a simple but clear data model.

### 10.1 Core entities

- `Account`
- `Skill`
- `Currency`
- `SystemConfig`
- `Resource`
- `ResourceSkill`
- `CostHistory`
- `Opportunity`
- `OpportunityRole`
- `SOW`
- `SOWRole`
- `Deployment`
- `Actual`
- `Milestone`
- `AppRole`
- `Permission`
- `FieldPermission`
- `User`
- `Session`
- `AuditLog`

### 10.2 Required object lineage

`Account -> Opportunity -> OpportunityRole -> SOW -> SOWRole -> Deployment -> Actual -> Dashboard`

Key link fields:

- `Opportunity.accountId`
- `SOW.accountId`
- `SOW.sourceOpportunityId`
- `SOWRole.sourceOpportunityRoleId`
- `Deployment.sowRoleId`
- `Actual.deploymentId`
- `Milestone.sowId`

### 10.3 Account / Client master

An `Account` master is required to avoid duplicate client naming and to support clean pipeline-to-project reporting.

Suggested fields:

- account ID
- account name
- parent account
- vertical / industry
- geography / region
- active flag

## 11. Settings and Administration

Admin features should cover:

- users
- roles
- module permissions
- field permissions
- SAP skill catalog and sub-modules
- currencies and FX rates
- system config
- sessions
- audit logs

Implementation approach:

- follow best practices for access control
- keep the MVP lightweight
- do not over-invest in highly granular permission administration until the product is stable and actively used

## 12. Security

- JWT authentication
- short-lived access token
- refresh token support
- bcrypt password hashing
- route-level RBAC
- masking of sensitive commercial fields for restricted roles
- audit logging for create/update/delete actions
- session visibility and forced logout
- HTTPS in production

## 13. UI / UX Model

The product should use an operations cockpit style rather than disconnected CRUD pages.

### 13.1 Navigation

- Command Center
- Resources
- Pipeline
- Projects
- Actuals
- Reports
- Admin

### 13.2 Interaction pattern

- dashboard widgets drill into filtered registers
- registers open detail workspaces
- detail workspaces use tabs for related data
- create/convert actions use guided wizards where needed

### 13.3 Key screens

- login
- command center dashboard
- resource register
- resource detail
- opportunity register
- opportunity detail
- opportunity-to-SOW conversion wizard
- SOW register
- SOW detail with tabs:
  - overview
  - roles
  - deployments
  - actuals
  - milestones
  - financials
- actuals workbench
- admin settings

### 13.4 Important UI behavior

- Bench count tile -> filtered resource roster
- Roll-off alert -> filtered resource list
- Weighted pipeline tile -> filtered opportunity register
- Active SOW count -> filtered SOW register
- Milestone alerts -> filtered milestone list
- Staffing action from SOW role should open a candidate matching workspace with:
  - skill match
  - sub-module match
  - location fit
  - availability
  - allocation capacity
  - margin preview

## 14. Process Flows

### 14.1 Resource onboarding

1. Admin creates a resource.
2. Skill and sub-module information is captured.
3. Employment and compensation information is entered.
4. System calculates USD hourly cost.
5. Initial cost history is created.
6. Resource becomes available for staffing visibility.

### 14.2 Opportunity flow

1. Account manager selects or creates an account.
2. Account manager creates an opportunity.
3. Header-level estimated revenue is entered.
4. Opportunity roles may be added later as demand becomes clearer.
5. Role-estimated revenue is computed once roles exist.
6. Opportunity progresses through stages.
7. When won, the opportunity becomes eligible for conversion to SOW.

### 14.3 Opportunity to SOW conversion

1. Open a won opportunity.
2. Launch conversion wizard.
3. Confirm account and opportunity details.
4. Select billing model and SOW setup details.
5. Review and adjust commercial values based on the actual winning deal.
6. Map opportunity roles to SOW roles.
7. Create draft SOW with source links preserved.
8. Delivery manager reviews and activates the SOW.

The conversion wizard must allow the user to revise commercial details to match the actual won engagement, including:

- contract value
- billing model
- hourly bill rate
- man-day rate
- man-month rate
- role-level rates where needed
- start and end dates

Design rule:

- opportunity values are prefilled into the conversion wizard
- users must be able to overwrite pricing and effort assumptions during conversion
- the final SOW should reflect the actual winning commercial structure, not just the original pipeline estimate

### 14.4 SOW staffing

1. Open SOW.
2. Define or review SOW roles.
3. Search matching resources.
4. Review allocation, availability, and margin preview.
5. Confirm deployment.
6. System updates delivery visibility and staffing coverage.

### 14.5 Actual effort capture

1. PM enters actual efforts for the month.
2. DM reviews exceptions or missing entries.
3. Actuals update revenue and margin visibility.
4. Dashboard reflects the current visible delivery picture.

Actual effort entry should support both:

- manual entry by deployment/resource
- bulk upload through Excel

Excel upload capability should support:

- downloadable template
- upload by month and project
- one row per resource or deployment effort line
- validation of resource, project, month, and hours
- error report for invalid rows
- preview before final import

This is important so PMs can upload actual efforts in bulk instead of maintaining effort line by line in the UI.

## 15. KPIs and Reporting

The MVP should support:

- weighted pipeline
- opportunity count by stage
- active SOW count
- visible revenue for active SOWs
- visible cost for active SOWs
- gross margin $
- gross margin %
- active resources
- fully deployed resources
- partially deployed resources
- on-bench resources
- bench aging buckets
- upcoming delivery roll-offs
- actuals completion status
- milestone due and invoice status
- resource deployment coverage by SAP skill

## 16. Non-Functional Requirements

- web-based responsive UI
- 60-second dashboard refresh
- searchable, filterable registers
- clear audit trail for important updates
- role-based UI and API behavior
- modular architecture for future scale
- support for future integration with HRMS, ERP, CRM, or staffing systems

## 17. Final Product Positioning

This product should be implemented as a **delivery command center for leadership review and operational visibility**.

It should help the SAP Service SBU answer:

- what business is coming
- what work is active
- who is deployed
- who is nearing bench
- what actual effort has been entered
- what revenue and gross margin are visible right now

It should remain connected, useful, and scalable, while intentionally avoiding unnecessary complexity in finance, planning, or control workflows during the MVP stage.
