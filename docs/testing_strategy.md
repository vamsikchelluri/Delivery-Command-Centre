# Testing Strategy

## Purpose
Define how the `Delivery Command Center` project should be tested for realistic business scenarios without depending only on static seed data.

## Testing Goals
- Validate end-to-end business behavior
- Reduce dependence on manual repetitive testing
- Reduce false confidence from seed-only demos
- Catch broken navigation, partial CRUD, bad calculations, and inconsistent linked data

## Testing Layers

### 1. Business Scenario Testing
Focus:
- Real user workflows across multiple screens

Examples:
- Client -> Opportunity -> Opportunity Roles
- Client -> SOW -> SOW Roles -> Deployments -> Actuals
- Resource creation -> detail review -> filter visibility
- Opportunity notes progression over time
- Missing actuals -> zero visible revenue scenario

Owner:
- QA Testing Agent

### 2. CRUD Validation
Focus:
- Create, edit, view, and list behavior for master and transaction objects

Required Objects:
- Client
- Resource
- Opportunity
- Opportunity Role
- SOW
- SOW Role
- Milestone
- Actual
- Admin master data

Additional validation:
- PM and DM user creation
- Assignment of PM and DM to opportunities and SOWs through dropdown-backed selection
- Role location capture and persistence
- Master-data-backed dropdown behavior for SAP modules, sub-modules, and other controlled lists

### 3. UI Consistency Validation
Focus:
- Compare screens against `ui_standards.md`

Checks:
- Header card
- Filter row
- KPI card row
- Register section card
- Tab consistency
- Font consistency
- Proportional layout

### 4. Calculation Validation
Focus:
- Weighted pipeline
- Target margin display
- Resource availability and deployed %
- Resource cost-rate derivation
- SOW visible revenue / visible cost / margin

## Test Data Strategy

### Baseline Seed Data
Use only for:
- initial startup
- smoke navigation
- default demo access

### Scenario Data
Preferred for QA:
- Create records through UI or API specifically for a test case
- Use targeted scenario names
- Avoid reusing unrelated old test data where possible

Example scenario labels:
- `QA Client 01`
- `QA Opportunity 01`
- `QA SOW 01`
- `QA Resource 01`

### Reset Approach
Preferred future model:
- maintain baseline seed
- run scenario setup scripts before tests
- clean up or isolate scenario data

## Required Business Scenarios

### Resource Scenario
- Create a resource
- Add primary and secondary skills
- Set offshore employment
- Confirm visa shows `NA (Offshore)`
- Confirm detail page and register reflect the new record
- Confirm filters can find the record

### Opportunity Scenario
- Create a client-linked opportunity
- Add source and target margin
- Add roles
- Add dated notes
- Validate opportunity detail tabs
- Validate register row reflects the new values
- Validate PM/DM or ownership selections come from dropdown-backed values where applicable

### SOW Scenario
- Create a SOW
- Add SOW roles
- Validate detail tabs
- Validate register metrics and header values
- Validate Project Manager and Delivery Manager assignment through dropdown-backed selection
- Validate role location persists as Offshore or Onsite

### Actuals Scenario
- Create or use a valid SOW/deployment path
- Enter actuals manually
- Confirm actuals appear in the workbench
- Confirm related visibility updates where applicable

### Empty-State Scenario
- Apply filters that yield no rows
- Confirm clear empty-state messaging

### Master Data Dropdown Scenario
Focus:
- Wherever master data exists, the field should render as a dropdown/select rather than free text

Required checks:
- SAP Module
- SAP Sub-Module
- PM / DM assignment
- Other admin-backed master selections

## QA Defect Format

Each defect should include:
- ID or title
- Screen / module
- Preconditions
- Steps to reproduce
- Expected result
- Actual result
- Severity

## Current Tooling Recommendation

### Immediate
- Manual business-scenario test scripts
- API-assisted scenario setup where useful

### Next
- Playwright for browser automation
- API setup helpers for scenario creation

## Release Gate Recommendation
A feature should not be treated as complete unless:
- target CRUD works
- linked scenario works
- empty state works
- key derived values render correctly
- UI follows `ui_standards.md`
