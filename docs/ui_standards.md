# UI Standards

## Purpose
This document defines the UI standards for the `Delivery Command Center` project so the product feels like one coherent enterprise application instead of a collection of unrelated screens.

## Design Principles
- Keep layouts proportional and balanced across wide screens
- Prefer compact, information-dense enterprise layouts over oversized decorative spacing
- Reuse the same page structure across modules
- Avoid one-off layouts unless there is a strong workflow reason
- Support fast operational scanning first, then drill-down

## Global Layout Standard

### Main Application Shell
- Left navigation remains persistent
- Top bar remains compact
- Main content area should not stretch excessively on large monitors
- Use a centered content width for detail-heavy screens when needed

### Content Width Guidance
- Register/management screens may use broader width
- Detail screens should use controlled max width where full-width stretch harms readability
- Large cards and tables should align to the same horizontal rhythm

## Standard Screen Types

### 1. Register / Management Screen
Use this for:
- Clients
- Resources
- Pipeline
- SOWs
- Actuals

Required structure:
1. Header card
2. Filter row
3. KPI card row
4. Register section card

Behavior:
- Primary action belongs in the header area
- Filters should be horizontally aligned and proportionate
- KPI cards should be equal height
- Register card should occupy the main width cleanly

### 2. Create / Edit Screen
Use this for:
- Client create/edit
- Resource create/edit
- Opportunity create/edit
- SOW create/edit
- Admin create/edit where applicable

Required structure:
1. Header card
2. Tab row if the form is multi-part
3. Section cards
4. Sticky action footer

Behavior:
- No popup for core create/edit flows
- No inline-below-table forms for core records
- `Add` opens a dedicated create page
- `Edit` opens the same workspace layout in edit mode

### 3. Detail / Workspace Screen
Use this for:
- Resource detail
- Opportunity detail
- SOW workspace

Required structure:
1. Back link
2. Header card
3. KPI strip if useful
4. Tab row
5. Section cards within active tab

Behavior:
- View mode and edit mode should share the same overall structure
- Tabs should group related operational content
- Sections should feel balanced and aligned

## Header Card Standard
- Show eyebrow, title, and short subtitle/context
- Show status pills and primary actions on the right
- Keep the header compact; do not leave large empty blocks
- Use metadata chips instead of multiple loose lines when possible

## Filter Row Standard
- Use one horizontal filter row above KPI cards on management screens
- Filters should include search first, then categorical filters
- Filter controls must align vertically and use consistent widths
- Do not oversize filters beyond their content needs

## KPI Card Standard
- KPI cards should be equal height within a row
- Use 3-5 KPI cards per row depending on screen width
- Values should be visually dominant
- Labels should remain concise
- Avoid mixing unrelated KPIs in the same row

## Section Card Standard
- Section title in header
- Content inside a single clear card
- Use consistent padding and border radius
- Keep section spacing even across the page

## Tab Standard
- Tabs should appear directly below the KPI row or header as appropriate
- Use the same visual style across all modules
- Avoid changing tab styling screen to screen
- Tab names should be short and task-oriented

## Table Standard
- Tables should sit inside a section card
- Column headers should be compact and readable
- Use explicit row actions on the right
- Empty states should show a clear friendly message
- Avoid excessive column count without horizontal value

## Form Standard
- Use 2-column form grids by default on desktop
- Use 1-column layout on smaller screens
- Group fields into sections based on business meaning
- Prefer selects over free text for controlled values
- Derived fields should be read-only and clearly labeled
- All master-data-backed fields must render as dropdowns/selects
- SAP module and SAP sub-module must come from master data, not free text
- Role location must be captured explicitly where role definition exists

## Resource Screen Standard

### Resource Register
- Header card
- Search + location + type + status filters
- KPI cards
- Resource register card

### Resource Form
Tabs:
- `Identity and Skills`
- `Employment and Compensation`

### Resource Detail
Structure:
- Back link
- Compact header card
- KPI strip
- Tab row
- Balanced section grids

Do not let the detail screen stretch edge-to-edge in a way that makes cards look thin and long.

## Opportunity Screen Standard

### Opportunity Register
- Header card
- Search + stage + source + DM filters
- KPI cards
- Opportunity register card

### Opportunity Form
Tabs:
- `Engagement`
- `Timeline & Financials`
- `Notes`

### Opportunity Detail
Should follow the same 3-tab structure as the form as much as practical.

## SOW Screen Standard

### SOW Register
- Header card
- Search + status + billing + DM filters
- KPI cards
- SOW register card

### SOW Form
Tabs:
- `Engagement`
- `Timeline & Commercials`

### SOW Workspace
- Back link
- Header card
- KPI strip if useful
- Tab row
- Section cards with balanced widths

## Admin Screen Standard
- Header card
- Tab row for admin areas
- Section card for list
- Prefer eventual dedicated create/edit screens for consistency

## Typography Standard
- Use a single consistent font system across the application
- Apply the same font family to:
  - page titles
  - tabs
  - cards
  - tables
  - nav
  - form controls
- Do not let some screens use one font while others use another

## Spacing Standard
- Avoid very tall headers with too much empty space
- Avoid cards that are too shallow or too stretched horizontally
- Use even vertical rhythm between:
  - header
  - filters
  - KPI cards
  - tabs
  - section cards

## Anti-Patterns
- Inline create/edit forms below tables for core entities
- Popup-based primary record creation
- One-off page layouts
- Giant empty whitespace inside header cards
- Cards stretched full-width without proportional balance
- Different font behavior across screens

## Current Priority
When making UI changes, prioritize in this order:
1. Layout proportionality
2. Shared screen pattern consistency
3. Readability and density
4. Filter and KPI usefulness
5. Visual polish
