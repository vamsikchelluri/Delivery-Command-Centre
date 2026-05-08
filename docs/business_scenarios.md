# Business Scenarios

## Purpose
This checklist is the first working scenario pack for the `QA Testing Agent`. It focuses on business workflows rather than isolated UI rendering.

## How To Use
- Prefer creating fresh scenario data through the UI or API
- Do not treat seed data as the only valid test input
- Record pass/fail with notes for each scenario
- Capture defects with exact steps and expected vs actual result

## Scenario 1: Client Creation And Reuse
Preconditions:
- User is logged in with access to client, opportunity, and SOW creation

Steps:
1. Create a new client
2. Save the client
3. Open pipeline create screen
4. Confirm the new client is selectable
5. Open SOW create screen
6. Confirm the same client is selectable

Expected:
- Client saves successfully
- Client appears in both Opportunity and SOW flows

## Scenario 2: Resource Creation With Offshore Defaults
Preconditions:
- User is logged in

Steps:
1. Create a resource
2. Set `Location Type = Offshore`
3. Set `Employment Type = Full-Time`
4. Review Employment and Compensation tab
5. Save the resource
6. Open resource detail

Expected:
- Visa / Work Authorization defaults to `NA (Offshore)`
- Compensation input type defaults correctly
- Resource appears in register and detail screens

## Scenario 3: Resource Secondary Skills
Preconditions:
- User is logged in

Steps:
1. Create or edit a resource
2. Add multiple secondary skills with the `+ Add Skill` action
3. Select a module and sub-module for each row
4. Save
5. Open detail view

Expected:
- Multiple secondary skill rows are saved
- Sub-module is shown only after a secondary skill is selected
- Detail view displays the saved secondary skills

## Scenario 4: Opportunity Creation With Engagement Data
Preconditions:
- At least one client exists

Steps:
1. Create a new opportunity
2. Fill:
   - Client Name
   - Project / Opportunity Name
   - Source of Opportunity
   - Deal Type
   - Account Manager
   - Delivery Manager
3. Save
4. Open opportunity detail

Expected:
- Opportunity saves successfully
- Detail screen shows engagement values correctly
- Register reflects client, source, and project/opportunity name

## Scenario 5: Opportunity Timeline And Financials
Preconditions:
- Opportunity exists

Steps:
1. Edit the opportunity
2. Enter:
   - Stage
   - Probability
   - Estimated Revenue
   - Target Margin
   - Expected Close
   - Expected Start
   - Expected End
3. Save
4. Review register and detail screens

Expected:
- Timeline and financial values persist
- Register shows target margin and weighted value
- Detail screen shows updated timeline and financials

## Scenario 6: Opportunity Notes Progression
Preconditions:
- Opportunity exists

Steps:
1. Edit the opportunity
2. Add summary note text
3. Add a progress note
4. Save
5. Reopen detail notes tab

Expected:
- Summary note persists
- Progress note is appended with user and timestamp
- Notes timeline displays in chronological form

## Scenario 7: Opportunity Role CRUD
Preconditions:
- Opportunity exists

Steps:
1. Open opportunity detail
2. Add an opportunity role
3. Set the role location as `Offshore` or `Onsite`
3. Save the role
4. Edit the role
5. Confirm role table updates

Expected:
- Role is created and editable
- Role location is captured and remains visible after save
- Role values appear in the opportunity roles table
- No orphan or duplicate role behavior occurs

## Scenario 8: SOW Creation
Preconditions:
- At least one client exists

Steps:
1. Create a new SOW
2. Fill engagement values
3. Fill timeline and commercial values
4. Save
5. Open the SOW workspace

Expected:
- SOW saves successfully
- Register shows the new SOW
- Detail/workspace opens correctly

## Scenario 9: Project Manager And Delivery Manager Assignment
Preconditions:
- User master supports PM and DM records

Steps:
1. Create or confirm a Project Manager user
2. Create or confirm a Delivery Manager user
3. Open SOW create or edit
4. Assign the PM and DM to the SOW
5. Save
6. Open SOW detail/workspace

Expected:
- PM and DM are selectable from dropdown-backed values
- Saved SOW reflects assigned PM and DM correctly
- Register and detail views stay consistent

## Scenario 10: SOW Role And Deployment Visibility
Preconditions:
- SOW exists

Steps:
1. Open SOW workspace
2. Add a SOW role
3. Set role location to `Offshore` or `Onsite`
3. Review role in the Roles tab
4. Review Deployments tab

Expected:
- Role appears correctly in SOW role list
- Role location persists after save
- Deployment-related areas remain stable
- No broken tab state after role creation

## Scenario 11: Manual Actuals Entry
Preconditions:
- Valid SOW path exists

Steps:
1. Open Actuals workbench
2. Add a manual actual
3. Save
4. Reopen the same month or SOW

Expected:
- Actual is saved
- Actual appears in the workbench
- Related data remains consistent

## Scenario 12: Resource Register Filters
Preconditions:
- Multiple resources exist

Steps:
1. Open Resources
2. Use search
3. Use location filter
4. Use type filter
5. Use status filter

Expected:
- Filters combine correctly
- KPI cards reflect filtered data
- Empty state appears when no records match

## Scenario 13: Pipeline Register Filters
Preconditions:
- Multiple opportunities exist

Steps:
1. Open Pipeline
2. Filter by stage
3. Filter by source
4. Filter by DM
5. Use search

Expected:
- Register rows reflect filters correctly
- KPI cards update based on filtered result set

## Scenario 14: SOW Register Filters
Preconditions:
- Multiple SOWs exist

Steps:
1. Open SOW Register
2. Filter by status
3. Filter by billing model
4. Filter by DM
5. Use search

Expected:
- Register rows reflect filters correctly
- KPI cards update based on filtered result set

## Scenario 15: Master Data Dropdown Validation
Preconditions:
- SAP modules, sub-modules, and user master data exist

Steps:
1. Open resource create/edit
2. Confirm SAP module is a dropdown
3. Confirm SAP sub-module is a dropdown driven by selected module
4. Open opportunity role or SOW role create/edit
5. Confirm SAP module and sub-module use dropdowns
6. Open SOW create/edit
7. Confirm PM and DM assignments use dropdowns where master data exists

Expected:
- All master-data-backed fields render as dropdowns
- Sub-module choices are dependent on selected SAP module
- No free-text entry is used for fields backed by master data

## Scenario 16: Empty State Validation
Preconditions:
- Screen with filters is available

Steps:
1. Apply filters that should return no results

Expected:
- Empty-state message appears
- Layout remains stable
- No broken table rendering

## Scenario 17: Cross-Screen Navigation
Preconditions:
- Resource, opportunity, and SOW data exists

Steps:
1. Open registers
2. Use View and Edit actions
3. Return to register from detail
4. Move across related screens

Expected:
- Navigation is consistent
- View and Edit actions open the correct screens
- No inline-below-table create/edit behavior appears for core records
