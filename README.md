# Delivery Command Center

Greenfield MVP implementation for the SAP Service SBU Delivery Command Center.

## Apps

- `api`: Express + Prisma API
- `client`: React + Vite UI

## Local development

1. `npm.cmd install --workspaces`
2. `npm.cmd run db:generate --workspace api`
3. `npm.cmd run db:push --workspace api`
4. `npm.cmd run db:seed --workspace api`
5. `npm.cmd run dev --workspace api`
6. `npm.cmd run dev --workspace client`
