# MVP Backlog
## Delivery Command Center for SAP Service SBU

## Phase 1: Foundation

- Set up application shell, routing, auth, and role scaffolding
- Set up database schema and migrations
- Create shared masters:
  - Account
  - Skill
  - Currency
  - SystemConfig
- Add configurable number range framework
- Add audit trail framework

## Phase 2: Resource Management

- Build resource register
- Build resource create/edit form
- Add primary and secondary skill mapping
- Add employment status and delivery status model
- Add not-available date range handling
- Add cost engine and cost history
- Add resource detail tabs:
  - Overview
  - Skills
  - Deployments
  - Cost History
  - Availability / Not Available
  - Linked Opportunities
  - Audit Trail

## Phase 3: Opportunity Management

- Build opportunity register with quick filters
- Build opportunity create/edit flow
- Add opportunity header fields and probability override logic
- Build opportunity role table and role editing
- Compute role-estimated revenue
- Compute weighted pipeline
- Add notes/activity section
- Add conversion eligibility rules

## Phase 4: SOW Management

- Build SOW register with quick filters
- Build SOW create/edit flow
- Support direct SOW creation
- Add SOW role table and role editing
- Add billing-model-aware SOW detail behavior
- Add financial visibility section
- Add milestone framework

## Phase 5: Opportunity-to-SOW Conversion

- Build conversion wizard
- Prefill from won opportunity
- Allow commercial adjustment during conversion
- Map opportunity roles to SOW roles
- Preserve source links and audit trail

## Phase 6: Staffing and Deployments

- Build staffing workspace/modal
- Add candidate matching columns
- Add deployment creation flow
- Add allocation conflict detection
- Allow over-allocation with warning
- Update resource deployment visibility

## Phase 7: Actuals Workbench

- Build monthly actuals workbench
- Add manual actual entry
- Add Excel template generation
- Add Excel upload preview and validation
- Add overwrite logic by matching key
- Add pending exception handling
- Add zero-revenue exception logic for missing actuals

## Phase 8: Dashboard and Reports

- Build command center dashboard
- Add widget drill-through behavior
- Add mixed-by-widget default logic
- Add mandatory top filters
- Build reports:
  - Resource Utilization
  - Bench
  - Active SOW
  - Opportunity Pipeline
  - Gross Margin
  - Milestone Due
  - Actuals Missing
- Add Excel export for reports

## Phase 9: Stabilization

- Complete audit coverage for all master and transaction changes
- Refine permissions and commercial field visibility
- Improve validation and exception handling
- Add seed/reference data
- Prepare deployment-ready MVP
