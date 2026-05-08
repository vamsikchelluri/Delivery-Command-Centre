# Delivery Command Center

Greenfield MVP implementation for the SAP Service SBU Delivery Command Center.

## Apps

- `api`: Express + Prisma API
- `client`: React + Vite UI

## Local development

1. `npm install --workspaces`
2. `npm run db:generate`
3. `npm run db:push`
4. `npm run db:seed`
5. `npm run dev:api`
6. `npm run dev:client`

## Railway deployment

Deploy the backend and frontend as one Railway app service in the same Railway project as the Postgres service.

- Build command: `npm run build`
- Start command: `npm start`
- Health check: `/api/health`

Required Railway variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=production`
- `CLIENT_URL=https://your-railway-app-domain`

Use the Railway Postgres service reference/internal connection string for `DATABASE_URL` when the app service and database service are in the same Railway project. The public proxy URL is useful from local machines but can be slower or intermittently unreachable.

After the first app deploy, set `CLIENT_URL` to the generated Railway domain. If using additional local/test origins, provide a comma-separated list.

Production seed/import commands are master-data-only:

- `npm run db:seed`
- `npm run db:seed-master`
- `npm run db:import-json`

Do not run the development-only full importer in production:

- `npm run db:import-full-json:dev`
