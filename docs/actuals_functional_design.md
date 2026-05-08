# Actuals Functional Design

## Purpose

Build `Actuals` as a PM/DM-operated SOW-level monthly effort capture workbench.

This is not an end-user timesheet product.
This is a delivery operations module for entering actuals against deployed resources under an SOW.

## Final Workflow

### Screen 1: Actuals Overview

Show a compact list of SOWs only.

Columns:
- `SOW Number`
- `Client Name`
- `SOW Name`
- `Billing Model`
- `Project Manager`
- `Delivery Manager`
- `Actions`

This screen should not show month-level detail.
Its purpose is to select the SOW that needs actual entry.

### Screen 2: SOW Actuals Detail

When a user opens one SOW:
- show the SOW header
- show deployments under that SOW
- each deployment row can expand inline
- expanded row shows monthly planned vs actual entries

## Core Data Logic

Actuals are anchored to:
- `SOW`
- `Role`
- `Deployment`
- `Month`

Resource is shown for usability, but the true system anchor is `deployment`.

### Row identity

One actual row represents:
- one deployment
- one month

### Visible row labels

Each deployment row should show:
- `Role`
- `Deployment ID`
- `Resource Name`

## Planned vs Actual Model

The system should maintain planned values at deployment-month level.

That means SOW planning should ultimately support:
- role
- deployment
- monthly planned quantity

Actuals then compare directly against that monthly deployment plan.

## Current MVP Implementation Rule

Until explicit deployment-month plans are captured in SOW planning,
monthly planned values may be derived from:
- deployment start date
- deployment end date
- allocation %
- role planned hours / measurement unit

This is a temporary derived-planning rule, not the final target state.

## SOW Actuals Detail Layout

### Header

- `SOW Number`
- `Client Name`
- `SOW Name`
- `Billing Model`
- `Project Manager`
- `Delivery Manager`

### KPI cards

- `Deployments`
- `Planned Total`
- `Actual Total`
- `Missing Rows`

### Body

Deployment rows with:
- `Role`
- `Deployment ID`
- `Resource Name`
- `Measurement Unit`
- `Planned Total`
- `Actual Total`
- `Status`
- `Action`

### Expand row behavior

Clicking or opening a deployment row should show inline month rows:

- `Month`
- `Planned Quantity`
- `Actual Quantity`
- `Unit`
- `Status`
- `Variance`
- `Remarks`
- `Save`

## Manual Entry

Manual entry should happen inline inside the expanded deployment row.

For each month:
- planned quantity is read-only
- actual quantity is editable
- remarks are editable
- save persists only that deployment-month row

## Excel Upload

Upload should be scoped to:
- one `SOW`
- one `Month`

### Upload template columns

- `SOW Number`
- `Month`
- `Deployment ID`
- `Role`
- `Resource ID`
- `Resource Name`
- `Actual Hours`
- `Remarks`

### Behavior

- read the file
- match against valid deployment-month rows
- overwrite existing values for that same deployment-month row
- invalid lines go to exception list

## Missing Actuals / Status Logic

Status is derived at deployment-month level:

- `Not Entered`
- `Entered`
- `Variance`

Definitions:
- no actual row -> `Not Entered`
- actual row exists and actual != planned -> `Variance`
- actual row exists and actual == planned -> `Entered`

## Additional Summary Need

Because entry is deployment-driven, we also need a summary view of:
- total planned by month
- total actual by month
- variance by month

This can be a later tab inside SOW Actuals Detail:
- `Entry View`
- `Monthly Summary`

## Recommended Build Order

1. Actuals Overview
2. SOW Actuals Detail
3. Deployment row expansion
4. Inline month entry
5. Missing-row status
6. Excel upload by `SOW + Month`
7. Monthly summary tab

## Current Direction

The current build should move away from the old flat global actuals grid.

Target architecture:
- `Actuals Overview`
- `SOW Actuals Detail`
- `Deployment rows`
- `Inline month rows`
