# Supabase Workflow

`schema.sql` is the single latest snapshot of the whole database.

Use it when:
- Creating a fresh database
- Rebuilding local/dev from scratch

`migrations/` stores ordered change history.

Use it when:
- Updating an existing database
- Shipping schema changes without dropping tables

Versioning rule:
- Add the next numbered file: `0003_description.sql`, `0004_description.sql`, ...
- Keep each migration focused on one logical change
- After adding a migration, update `schema.sql` so it stays the latest full snapshot

Recommended flow:
1. Edit SQL in a new migration file.
2. Apply that migration to the existing database.
3. Update `schema.sql` to reflect the new final state.

Current versions:
- `0001_decouple_user_profiles_from_auth_users.sql`
- `0002_fix_daily_summary_trigger.sql`
