# Merge Seller DB into Marketplace DB

Goal: **One database only** – Marketplace (caoynokephxfyqofpufv). All Seller tables and data move there; app uses only Marketplace env vars.

---

## Step 1 – Get Seller schema

**Option A – SQL in Supabase (recommended)**  
In the **Seller** project → SQL Editor, run the queries in:

`scripts/seller-db-schema-queries.sql`

1. Run **query 1** → note the list of tables.
2. Run **queries 2–6** → copy the results (or export CSV) and share them (or paste into a file and share).  
   With that we can write `CREATE TABLE` and constraints for Marketplace.

**Option B – pg_dump (if you have DB connection string)**  
From your machine (with Seller DB URL from Supabase → Settings → Database):

```bash
# Schema only (no data) – safe to inspect
pg_dump "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-privileges \
  > seller_schema_only.sql
```

Then share `seller_schema_only.sql` (or its contents). That file is the full DDL we need to adapt for Marketplace.

---

## Step 2 – What we’ll do with the schema

Once we have the Seller schema we will:

1. **Check for name clashes**  
   If Marketplace already has a table with the same name (e.g. `users`), we’ll either:
   - use a different name (e.g. `buyer_users`), or  
   - merge into the existing table (if structure matches).

2. **Write DDL for Marketplace**  
   - `CREATE TABLE` for each Seller table (and sequences if any).  
   - Same columns, types, and nullability; primary keys; unique constraints.  
   - Foreign keys: point to tables that will exist in Marketplace (either moved from Seller or already there).  
   - Indexes and RLS policies if you want them (you can share those too).

3. **Give you a migration script**  
   - Run the DDL in Marketplace (create tables).  
   - Copy data: e.g. `INSERT INTO marketplace.public.users SELECT * FROM dblink(...)` or export from Seller / import into Marketplace (Supabase CSV or a small script).  
   - We’ll base exact INSERTs on the final table list and any renames.

---

## Step 3 – After migration (code and env)

- **Env:** Remove Seller-only vars. Use only Marketplace:
  - `NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL`
  - `NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY`
  - `MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY`
  (We can rename these to `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY` in the app so one “main” DB is clear.)

- **Code:**  
  - Replace every use of the Seller client/URL with the single Marketplace client.  
  - Favorites, auth (signin, verify-otp, reset-password, Google/Facebook callbacks), buyer/verify, etc. will all point at Marketplace.

---

## What to send back

After running the queries (or pg_dump), provide one of:

1. **Paste/upload the results** of queries 1–6 from `seller-db-schema-queries.sql`, or  
2. **The contents of** `seller_schema_only.sql` from pg_dump, or  
3. **Manual schema**: list of tables and for each: column names, types, primary key, and any foreign keys.

Plus:

- Whether Marketplace already has a `users` (or similar) table.  
- If you want RLS and triggers migrated too (we can do that in the same pass).

Then we can produce the exact DDL for Marketplace and the data-migration steps.
