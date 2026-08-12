# NEBRIN Database Migrations

Only NEW production database changes belong in this directory.

Rules:
1. Never place the existing production schema here as a new migration.
2. Use timestamped SQL filenames, for example `20260812150000_add_feature.sql`.
3. Every migration must be reviewed for compatibility with existing tables, RLS policies, functions, triggers, and role permissions.
4. Prefer additive and backward-compatible changes.
5. Destructive changes require an explicit backup/rollback plan before merge to `main`.
6. Test role-based access carefully, especially CEO, Manager, HR, Finance roles, Secretary, Customer Care, and external-auditor access.
7. Finance duties must remain separated: Cashier, Accounts, Treasury/Internal Audit, and External Audit permissions must not inherit CEO-only controls such as overtime management unless explicitly authorized.

Production baseline documentation is stored in `supabase/baseline/` and is reference-only.
