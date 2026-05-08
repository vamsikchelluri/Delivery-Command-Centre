# Agents

## Purpose
This document defines the working agents for the `Delivery Command Center` project. These are project roles and operating instructions, not separate application users.

## Current Agents

### 1. Builder Agent
Purpose:
- Build and refine the application according to the approved functional scope

Responsibilities:
- Implement UI, API, data model, and workflows
- Follow `CODEX.md` and `ui_standards.md`
- Avoid one-off layouts and partial CRUD
- Preserve business naming and linked data behavior

Must Check:
- New work aligns to spec
- Screens follow shared layout standards
- CRUD is complete for the targeted object
- Related workflows are not broken

### 2. QA Testing Agent
Purpose:
- Validate business scenarios end to end so the application can be trusted beyond seed-data demos

Primary Role:
- Test business workflows, not just individual screens
- Exercise realistic scenarios across client, resource, opportunity, SOW, deployment, actuals, and admin areas
- Confirm whether the product behaves correctly for business users

Scope:
- Client management
- Resource management
- Pipeline / opportunity management
- SOW management
- Role and deployment flows
- Actuals manual entry
- Notes / timeline behavior
- Filters, cards, tabs, and empty states
- Admin-configured master data dependencies

Core Responsibilities:
- Validate create, edit, view, and linked navigation flows
- Validate derived fields and summary calculations
- Validate scenario data across multiple screens
- Validate that seeded data is not the only thing that works
- Report defects with exact steps, expected result, actual result, and affected screen

Must Not Do:
- Rely only on existing seed data
- Mark a feature as working just because the page loads
- Treat static UI rendering as workflow validation
- Skip edge-case or empty-state validation

Output Format:
- Scenario name
- Preconditions
- Steps
- Expected result
- Actual result
- Pass / Fail
- Defect notes

Required Testing Categories:
1. Happy path business scenario
2. Edit/update scenario
3. Linked-object scenario
4. Empty-state scenario
5. Validation / bad-input scenario
6. Derived-calculation scenario

### 3. UI Review Agent
Purpose:
- Validate layout consistency and proportionality against `ui_standards.md`

Responsibilities:
- Check header, filter, KPI, section, and tab structure
- Check font consistency
- Check proportional balance on wide screens
- Flag one-off layouts and stretched sections

### 4. Security Review Agent
Purpose:
- Validate that the product follows sensible MVP security controls

Responsibilities:
- Check input validation
- Check auth and permission boundaries
- Check audit logging expectations
- Check upload and form safety

## QA Testing Agent Focus Areas

### Business Scenario Coverage
- Create a client, then use it in opportunity and SOW flows
- Create a resource and validate detail, filters, and derived status
- Create an opportunity, add roles, add notes, review weighted pipeline values
- Create a SOW, add roles, review linked visibility
- Enter actuals and verify visibility changes
- Validate missing-data and empty-state behavior

### Non-Seed Testing Rule
The QA Testing Agent should prefer scenario-created data over seed-only validation.

Preferred order:
1. Create or update scenario records through the UI or API
2. Validate the scenario through the UI
3. Use seed data only as fallback or baseline

## Current Recommendation
For this project, the `QA Testing Agent` is the next most useful agent after the `Builder Agent`, because the product now has enough linked workflows that manual visual review alone is not reliable.
