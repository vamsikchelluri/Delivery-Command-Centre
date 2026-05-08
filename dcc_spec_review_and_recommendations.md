# Review of Draft Functional Specification

## Overall Assessment

The draft is a strong first pass, but it is still more of a **feature summary** than a complete **functional design**. The main gaps are:

- some core objects are not linked tightly enough
- a few fields are duplicated across modules without a clear system of record
- several statuses are defined but not governed by workflow rules
- screen-to-screen flow and data lineage are not fully specified
- some business rules will create conflicting data if implemented as written

The biggest improvement is to make the design more canonical: define which object owns which data, how records move from one stage to another, and which fields are derived versus manually maintained.

## Highest-Priority Design Issues

### 1. Resource status should be split into employment status and delivery status

The draft originally defined one combined resource status while also defining bench and deployment logic elsewhere.

Why this is a problem:

- delivery availability and HR status are not the same thing
- a resource may be on leave, terminated, or on sabbatical regardless of deployment logic
- "Available" and "On Bench" overlap unless clearly separated

Recommended fix:

- make `employment status` a stored field such as:
  - Active
  - On Leave
  - Sabbatical
  - Inactive
  - Terminated
  - Exited
- make `delivery status` a largely derived operational field such as:
  - On Bench
  - Partially Deployed
  - Fully Deployed
  - Future Assigned
  - Available
  - On Leave
  - Terminated
- calculate it from active and future deployments plus availability context
- allow limited operational override for cases like leave or sabbatical so the design stays practical rather than overly rigid

### 2. Roll-off is duplicated and may become inconsistent

The draft includes `Expected roll-off date` on the resource and also uses deployment end dates to drive bench logic.

Why this is a problem:

- a resource can have multiple deployments
- the true roll-off should come from the latest active deployment end date
- a separate resource-level roll-off field will drift out of sync

Recommended fix:

- remove `expected roll-off date` naming from resource master
- use `delivery roll-off date` as the operational field name
- derive it primarily from the latest relevant deployment end date
- allow it to remain a business-facing operational date rather than introducing more technical naming

### 3. Client/account master is missing

Both opportunities and SOWs use free-form `Client name`, but there is no canonical customer object.

Why this is a problem:

- duplicate client names will appear in multiple spellings
- pipeline-to-project reporting by account will be unreliable
- leadership reporting usually needs account hierarchy

Recommended fix:

Add these entities:

- `Account`
- `ClientContact` or `Stakeholder` if needed later

Minimum `Account` fields:

- account ID
- account name
- account type
- region
- vertical / industry
- parent account
- active flag

Then:

- opportunity must link to `accountId`
- project/SOW must link to `accountId`
- dashboard and reports should aggregate by account

### 4. Opportunity revenue should support both early header estimate and role-based estimate

The opportunity may be created before detailed roles exist, so a single role-driven revenue field is not sufficient.

Why this matters:

- account managers need to enter a top-down estimate early
- role-based demand may be added later
- both values need to coexist without confusion

Recommended fix:

Document two fields clearly:

- `estimated revenue`
  - header-level value entered by account manager
  - available at opportunity creation time
- `role-estimated revenue`
  - derived from opportunity roles once role demand is captured

Behavior:

- weighted pipeline should use the header `estimated revenue`
- role-estimated revenue should be shown as a comparison/reference number
- account manager can later adjust header estimate closer to the role-based estimate

### 5. Role and deployment cardinality is under-defined

The draft says "assign one resource to a role" but real staffing often needs:

- one role staffed by multiple people
- staged replacements
- shadow resources
- partial split allocations

Recommended fix:

Define the model explicitly:

- a `ProjectRole` is a demand position
- a `Deployment` is a time-bound assignment of a resource to that role
- one role can have multiple deployments over time
- one role may optionally allow multiple concurrent deployments if quantity > 1

Add role-level fields:

- quantity requested
- quantity filled
- role status: Open, Partially Staffed, Fully Staffed, Closed
- required start date
- required end date

### 6. No formal state machine for SOW, opportunity, resource, or milestone status

Statuses exist, but transition rules do not.

Why this matters:

- users will need to know who can move a record and when
- reports depend on state consistency
- automation and validation depend on legal transitions

Recommended fix:

Document allowed transitions.

Example:

- Opportunity:
  - Qualifying -> Proposed -> Negotiating -> Won / Lost
  - Won allows conversion
  - Lost requires loss reason

- SOW:
  - Draft -> Active -> On Hold -> Active
  - Active -> Completed / Terminated
  - Completed is allowed only when all deployments end and billing is closed

- Milestone:
  - Upcoming -> Delivered -> Invoiced -> Paid
  - current draft skips `Delivered`, which would be useful operationally

- Resource employment:
  - Active -> Inactive -> Exited

### 7. Actuals, revenue visibility, and billing rules should stay simple and operational

The draft mixes actual hours, planned hours, T&M billing, fixed monthly billing, and milestone billing but does not define the accounting behavior clearly enough.

Clarifications now needed in the spec:

- actuals should be entered once the SOW is signed and active
- for fixed monthly billing, what field stores the monthly fixed amount?
- for fixed-price milestone projects, are actual hours used only for internal cost and utilization?
- what month is used when a deployment starts or ends mid-month?
- which working day calendar is used for planned hours?

Recommended fix:

Add a dedicated `Financial Logic` section with:

- billing model enum:
  - T&M Hourly
  - Fixed Monthly
  - Fixed Price Milestone
- revenue visibility rule per billing model
- cost rule per billing model
- month-close process kept lightweight for MVP

Specific direction:

- fixed monthly should use a monthly or man-month rate
- fixed-price milestone actuals should support internal cost, utilization, and margin visibility
- mid-month start/end should be prorated using the days active in that calendar month
- MVP can use the regular calendar excluding weekends
- no advanced work calendar feature is needed initially; holidays can be handled through actuals entry

### 8. Field-level permission design should be pragmatic

The draft mentions field masking but does not say where permissions are applied.

Recommended fix:

Define permissions at three layers:

- module access
- action permissions: create, edit, delete, approve, convert, close
- field visibility / field editability

Example restricted fields:

- cost rate
- gross margin
- overhead multiplier
- FX rates
- salary/CTC inputs
- payment dates

But keep the MVP light:

- use sensible defaults for sensitive commercial fields
- do not over-design field-level administration at the expense of core usability
- revisit deeper permission administration after the base product is stable

## Field List Improvements

### Resource fields to add or clarify

- resource code / unique ID
- legal entity
- base location city and country
- time zone
- manager / reporting lead
- availability date
- resume / profile link
- vendor name for contractor/C2C
- billing eligibility flag
- active flag
- created by / updated by

Clarifications needed:

- `notice period` should specify unit
- `payment currency` and `compensation currency` may be different concepts
- `compensation input type` should be an enum, not free text

### Opportunity fields to add or clarify

- opportunity ID
- expected close date
- probability source: default by stage or manual override
- deal type: new logo, existing account expansion, addendum, renewal
- linked source opportunity if it came from another opportunity
- practice / sub-practice
- delivery region
- ownership fields beyond AM if required
- win/loss reason

### SOW / Project fields to add or clarify

- project ID
- linked opportunity ID
- account ID
- billing model
- invoicing entity
- billing frequency
- payment terms
- purchase order / contract reference
- customer contract start and end
- project health / RAG status
- forecast finish date
- close date

### Role fields to add or clarify

- role ID
- quantity
- location requirement
- mandatory vs preferred skills
- minimum experience
- staffing priority
- staffing status
- backfill required flag

### Deployment fields to add or clarify

- deployment ID
- billable flag
- shadow/non-billable flag
- locked cost rate
- locked bill rate
- source of assignment
- deployment status: Planned, Active, Ended, Cancelled

### Actuals fields to add or clarify

- actual month
- actual hours
- submitted by
- submitted date
- approval status
- approved by
- locked period flag

### Milestone fields to add or clarify

- milestone name
- milestone sequence
- billing owner
- invoice number
- payment status
- overdue flag

## Missing Cross-Module Linkages

The draft needs an explicit lineage model.

Recommended master flow:

`Account -> Opportunity -> Opportunity Roles -> SOW -> Project Roles -> Deployments -> Actuals -> P&L -> Dashboard`

Required system link fields:

- `Opportunity.accountId`
- `Project.accountId`
- `Project.sourceOpportunityId`
- `ProjectRole.sourceOppRoleId`
- `Deployment.projectRoleId`
- `Actual.deploymentId`

This will make it possible to answer:

- which won opportunity became which project
- which demand role became which staffed role
- which resource was proposed before assignment
- how pipeline translated into real revenue

## Screen-to-Screen Data Flow Improvements

### 1. Dashboard drill-throughs should be explicit

Every dashboard tile should open a filtered register.

Examples:

- Bench count -> resource roster filtered to `deliveryStatus = On Bench`
- Upcoming roll-offs -> resource roster filtered to `systemRollOffDate <= next 30 days`
- Active SOW count -> SOW register filtered to `status = Active`
- Weighted pipeline -> opportunity register filtered to open stages
- Milestone alerts -> milestone list filtered to due soon and not invoiced

### 2. Resource screen should link outward to delivery context

Resource detail should show:

- current deployments
- upcoming assignments
- bench history
- cost history
- linked opportunities where the resource is marked as identified or confirmed

This avoids resource planning being isolated from pipeline planning.

### 3. Opportunity conversion flow needs a mapping screen

Current draft says "convert to SOW" in one step. That is risky.

Recommended conversion wizard:

1. confirm account/client
2. choose SOW template or billing model
3. map opportunity fields to SOW header
4. review role mapping
5. create draft SOW
6. preserve source links

### 4. SOW staffing should be capacity-aware

From SOW role screen, resource search should automatically filter and rank by:

- matching skill and sub-module
- availability for the requested dates
- allocation capacity
- location fit
- employment type
- cost and margin fit

### 5. Actuals should not be buried only inside the SOW detail

Provide both:

- SOW-level actuals entry
- period-based actuals workbench for PMs and finance

This is important for month-end operations.

## Process Flow Improvements

### Revised opportunity-to-project flow

1. Create account or select existing account.
2. Create opportunity under the account.
3. Add opportunity roles and staffing demand.
4. Track stage movement and probability.
5. When stage becomes `Won`, require close date and expected start date.
6. Launch conversion wizard.
7. Create draft SOW with source opportunity links.
8. Review and activate SOW.
9. Add or confirm project roles.
10. Staff roles through deployments.
11. Capture actuals monthly.
12. Roll financials to dashboard.

### Revised staffing flow

1. Create or open SOW.
2. Define role demand and planned allocation.
3. Run resource match suggestions.
4. Review availability, cost, bill rate, and margin.
5. Confirm deployment.
6. System updates derived delivery status and capacity.
7. If resource is over-allocated, require override justification.

### Revised month-end flow

1. PM submits actuals.
2. Delivery manager or finance reviews exceptions.
3. Approved actuals lock the month.
4. P&L visibility is refreshed for reporting.
5. Keep locking and approvals lightweight in MVP.

## Reporting Improvements

Add these missing KPI families:

- utilization by skill / sub-practice
- bench cost exposure
- forecasted demand vs available capacity
- account-wise revenue and margin
- role fulfillment aging
- actuals completion status by month
- milestone overdue amount
- pipeline-to-SOW conversion rate
- win rate by stage and account manager

## Recommended Structural Changes to the Spec

To make the document implementation-ready, add these sections:

### 1. Canonical object model

For each entity define:

- purpose
- owner module
- key fields
- derived fields
- relationships
- source of truth

### 2. State transitions and business rules

For each major object define:

- statuses
- who can change status
- required validations
- downstream effects

### 3. Screen-level design

For each screen define:

- purpose
- entry points
- fields shown
- actions
- filters
- drill-through targets
- role visibility

### 4. Data flow and lineage

Document:

- what gets created where
- what gets copied
- what stays linked by reference
- what is derived
- what is immutable once posted

### 5. Operational controls

Define:

- month close
- audit events
- approval steps
- exception handling
- data correction flow

## Priority Recommendations

### Must fix before design sign-off

- add `Account` as a core entity
- define how header estimated revenue and role-estimated revenue coexist
- split resource status into employment status and delivery status
- define role/deployment cardinality clearly
- add state transition rules for opportunity, SOW, milestone, and deployment
- define actuals and revenue visibility rules by billing model
- add explicit lineage from opportunity to project to deployment

### Should fix in the next draft

- expand field lists with IDs, ownership, approval, and operational metadata
- add dashboard drill-through behavior
- add conversion wizard instead of one-click blind conversion
- add month-end actuals workbench
- define capacity-aware resource matching rules

### Nice to have

- demand vs capacity forecasting
- suggested staffing recommendations
- account-level performance reporting
- approval workflow for financial changes

## Bottom Line

The draft already has the right modules and the right business intent. What it needs now is stronger design discipline around:

- canonical masters
- derived vs editable fields
- object relationships
- workflow states
- conversion and drill-through logic
- lightweight month-end operational controls

Once those are added, the specification will move from a good concept document to something engineering and product teams can implement with much less ambiguity.
