# How to get your code back (restore from before merge)

## What we found

- **Commit before the merge:** `035b924` — "fix: resolve build errors..."  
  That’s the last state of `buyer-portal-redesign` **before** you ran “Merge main into buyer-portal-redesign”.

- **“Full address when logged in”** was **not** in any branch. Every branch (main, buyer-portal-redesign, integration) had the old logic (only city/state on cards). The fix we added in your working copy was new. So you don’t “restore” that from a branch — you **keep your current changes and commit them**.

- **Navbar (animated user icon)** is already in your branch. Commit `d913360` is in the history and the current `Navbar.js` includes that design. If something looks wrong, you can restore the file from the pre-merge commit (see below).

---

## Option 1: Restore specific files from before the merge

If you think a file was overwritten by the merge and you want the **exact version from before the merge**:

```bash
cd /Users/yousafzahid/Documents/Airosoft/deelmap-buyer

# Restore one file (e.g. Navbar) from commit 035b924
git checkout 035b924 -- components/layout/Navbar.js

# Restore another file
git checkout 035b924 -- components/property/PropertyCard.js
# ⚠️ PropertyCard from 035b924 has the OLD address logic (no full address when logged in). Only do this if you want that old behavior.
```

Use the file paths you care about. After `git checkout 035b924 -- <file>`, that file will match `035b924` and be staged; then you can commit.

---

## Option 2: Keep your current work and commit it (recommended)

Your working tree already has:

- **PropertyCard.js** — fixed so logged-in users see **full address** on marketplace cards.
- **PropertyDetail.js / PropertyImageModal.js** — photo view tracking for analytics.
- Other edits (marketplace, profile, FilterBar, etc.).

To save this and not lose it again:

```bash
cd /Users/yousafzahid/Documents/Airosoft/deelmap-buyer

git add components/property/PropertyCard.js
# Add any other files you want to keep:
git add app/marketplace/page.js app/profile/page.js components/property/FilterBar.js components/property/PropertyDetail.js components/property/PropertyImageModal.js

git commit -m "Restore/fix: full address for logged-in users on marketplace, photo view tracking"
git push origin buyer-portal-redesign
```

After this, the “full address when logged in” and your other fixes are on `buyer-portal-redesign` and won’t be lost if you merge or switch branches (as long as you don’t overwrite these files again).

---

## If you pushed to a different feature branch

If you remember another branch name (e.g. `feature/navbar-icon` or `feature/full-address`):

1. List branches: `git branch -a`
2. Inspect that branch: `git log origin/your-branch-name -3`
3. Restore a file from that branch:  
   `git checkout origin/your-branch-name -- path/to/file`

If you don’t see the branch locally, run `git fetch origin` first.

---

## Summary

- **Full address on cards:** Only exists in your current working copy. Keep it by committing (Option 2).
- **Navbar icon:** Already on this branch; if something looks off, restore with  
  `git checkout 035b924 -- components/layout/Navbar.js` (Option 1).
- **Pre-merge snapshot:** Commit `035b924`. Use `git checkout 035b924 -- <file>` to restore that version of any file.
