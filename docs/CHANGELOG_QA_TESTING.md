# Changelog — QA / Testing feature branch

**Branch:** `feature/qa-testing`  
**Base:** `buyer-portal-redesign`  
**Purpose:** Final testing fixes and UX improvements before merge to `main`.

---

## Checklist of changes (this branch)

### Sign up page (`app/signup/page.js`)
- [x] **States of interest:** Single input for both search and select (no duplicate search box in dropdown)
- [x] **Dropdown:** Shows only filtered state options; typing in the one input filters the list
- [x] **Removed:** Grey/slate blurred background shapes (top-right, bottom-left, etc.) from sign up page

### Login page (`app/login/page.js`)
- [x] **Removed:** Grey/slate blurred background shapes (top-right, bottom-left, etc.) from login page

### Logout / auth (`hooks/useAuth.js`)
- [x] **Sign out redirect:** Redirect to landing page (`/`) after logout (with `origin + '/'` in catch block)
- [x] *(Optional / reverted in prod)* Redirect from `/home` to `/` in next.config — not applied if production already correct

### Other files in this branch (from earlier work)
- `app/marketplace/page.js` — marketplace updates
- `app/profile/page.js` — profile/sign-out UX
- `components/property/FilterBar.js` — filter bar behavior
- `components/property/PropertyCard.js` — display address (e.g. full address when logged in)
- `components/property/PropertyDetail.js` — property detail / analytics
- `components/property/PropertyImageModal.js` — photo view tracking
- `docs/BUYER_PORTAL_FIXES_SUMMARY.md` — summary of buyer portal fixes
- `docs/RESTORE_FROM_BEFORE_MERGE.md` — how to restore from pre-merge commit

---

## Merge plan

1. **Feature branch:** `feature/qa-testing` — all QA/testing-related changes and final code.
2. **Test** on this branch (run through QA checklist).
3. **Merge** `feature/qa-testing` → `main` when sign-off is complete.

---

## Commands used

```bash
# Create and switch to feature branch
git checkout -b feature/qa-testing

# Stage and commit
git add app/signup/page.js app/login/page.js hooks/useAuth.js ...
git add docs/
git commit -m "feat: signup/login UX and QA fixes (single states input, remove background shapes, logout redirect)"

# Push (when ready)
git push -u origin feature/qa-testing
```
