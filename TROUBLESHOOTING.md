# Brandapp Troubleshooting Notes

## Issue: Data not loading after Supabase schema update (blank dashboard/wall)

**Symptom:** Pages load but show empty data or "Your Wall is Empty" even though data exists. Console shows `Brand fetch error: Object`.

**Root Cause:** PostgREST re-introspects relationships whenever the remote schema is updated. The `profiles:profile_id (...)` alias syntax in Supabase JS queries breaks after a schema refresh because PostgREST can no longer resolve the alias correctly.

**Bad (breaks after schema update):**
```js
supabase.from('brands').select(`
  id,
  profiles:profile_id (username, brandible_coins)
`)
```

**Good (always works — matches mobile app pattern):**
```js
supabase.from('brands').select(`
  id,
  profiles(username, brandible_coins)
`)
```

**Rule:** Never use the `relation:foreign_key (columns)` alias syntax for joins in the web app. Use plain `relation(columns)` — the same way the mobile app does it. PostgREST resolves the FK automatically when there is only one relationship between the two tables.

**Also fixed alongside this:**
- `.single()` → `.maybeSingle()` on the brands query so a missing brands row returns `null` instead of throwing PGRST116.
- All data fetches moved to `Promise.all()` with individual error logging so one failing query doesn't silently kill the rest.

**Files affected:** `src/app/dashboard/wall/page.tsx`, `src/app/dashboard/page.tsx`

---

## General Rule: When data stops showing after a Supabase schema update

1. Check browser console for `fetch error: Object` — expand the object to see the PostgREST error code.
2. Look for any Supabase JS `.select()` calls using the `relation:foreign_key (columns)` alias syntax and simplify to `relation(columns)`.
3. Do **not** run SQL scripts to fix what looks like an RLS or FK issue until you've ruled out a query syntax problem on the client side.
4. Compare the failing web query against the equivalent working mobile query — the mobile is the source of truth for query patterns.
