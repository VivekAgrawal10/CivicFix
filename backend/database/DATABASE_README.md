# CivicFix database (MySQL 8 — the only datastore)

CivicFix stores everything in MySQL through one `mysql2/promise` connection pool
(`backend/src/config/mysql.js`). MongoDB is no longer used anywhere.

## Configuration

`backend/.env` (see `.env.example`):

```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=civicfix_db
# MYSQL_CONNECTION_LIMIT=10
```

## Create the schema and demo data

```bash
cd backend
npm run db:init   # creates the database (if the user may) and applies database/schema.sql — idempotent
npm run seed      # demo admin / citizen / contractor, 5 reports, 2 work orders
```

The server also applies `schema.sql` on start-up (`CREATE TABLE IF NOT EXISTS`), so a fresh database works
without a separate init step.

## Tables

| Table | Replaces (MongoDB) | Notes |
|---|---|---|
| `users` | `users` | unique e-mail, bcrypt hash, role / language enums, CivicCreds, tier |
| `user_badges` | `users.badges[]` | one row per badge |
| `creds_history` | `users.credsHistory[]` | audit trail; also drives the 24 h reward caps |
| `reports` | `reports` | `latitude`/`longitude` DECIMAL(10,7) instead of GeoJSON; AI analysis in `ai_*` columns |
| `report_images` | `reports.images[]` | image URL metadata, ordered by `position` |
| `report_upvotes` | `reports.upvotes[]` | PK (report_id, user_id) |
| `report_confirmations` | `reports.confirmations[]` | UNIQUE (report_id, user_id) — one vouch per citizen |
| `report_status_history` | — (new) | audit trail of status transitions |
| `work_orders` | `workorders` | `assignedTo` of a report = its newest work order |
| `work_order_evidence` | `workorders.repairEvidence[]` | ordered URLs |
| `notifications` | `notifications` | per-recipient, read flag, optional related report |
| `road_segments` + `road_segment_points` | `roadsegments` (GeoJSON LineString) | unique segment name |
| `translations` | `translations` | text + en/pa/hi renderings |

Views (ported from the original analytics schema, now over the tables above):
`v_unresolved_issues`, `v_recurring_problems_by_locality`, `v_repair_company_performance`,
`v_road_health_metrics`. "Locality" is the report's address text; contractors are users with role `contractor`.

## Design notes

* Ids are `BIGINT UNSIGNED AUTO_INCREMENT`; the API still returns them as strings in `_id`, so the frontend is unchanged.
* The API keeps the Mongo-era response shapes (`location: {type:'Point', coordinates:[lng,lat]}`, populated
  `submittedBy`, `createdAt`/`updatedAt`, nested `aiAnalysis`, …). The conversion lives in `backend/src/models/*`.
* Geo queries use a latitude/longitude bounding box in SQL (indexed) plus an exact haversine check in Node.
* Multi-row changes (confirmations + priority escalation, CivicCreds + history + badges, upvote toggles,
  road-segment upserts, work-order evidence) run in transactions with `SELECT … FOR UPDATE`, so concurrent
  requests cannot lose updates or bypass the daily reward cap.
* All values are bound parameters; the only interpolated SQL is fixed column lists chosen in code.
* `database/legacy/` keeps the original database teammate's analytics schema and notes for reference only; it is not loaded.

## Testing

`database/test_queries.sql` has runnable reference queries (`mysql -u root -p civicfix_db < database/test_queries.sql`).

Automated tests (`npm test` in `backend/`) exercise every API route group, constraints, cascades, transactions and
concurrency. They run on one of two backends:

* default — an in-memory SQLite adapter (`tests/helpers/testDb.js`) that loads the real `schema.sql` translated to
  SQLite and speaks the same `pool.query` interface; needs Node 22.5+ and no database server;
* real MySQL — `TEST_DB=mysql MYSQL_DATABASE=civicfix_test npm test` (plus `MYSQL_HOST/PORT/USER/PASSWORD` if not the
  defaults). The database name must contain `test`; its tables are emptied between suites.

A SQLite pass proves the application logic and the portable SQL; confirm the MySQL-specific parts (types, ENUMs, views,
`FOR UPDATE` locking) with the `TEST_DB=mysql` run.
