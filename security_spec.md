# Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Identity Integrity**: A user document `/users/{userId}` can only be created with `uid == request.auth.uid`. Non-Super-Admin users cannot self-assign privileged roles (`Super Admin`, `Administrator`, `Editor`, `Reporter`, `Author` cannot be self-granted by random sign-ups—only the bootstrapped Super Admin email `jesank501@gmail.com` with `email_verified == true` or an existing Admin/Super Admin can grant editorial roles).
2. **RBAC Tier Separation**:
   - **Super Admin / Administrator**: Full control over users, settings, design, navigation, ads, pages, analytics, and all editorial content.
   - **Editor**: Full editorial control over `news`, `categories`, `tags`, `media`, `comments`, `pages`, and `homepageSections`.
   - **Reporter / Author**: Can create `news` with `authorId == request.auth.uid`, edit/delete only their own `news`, and upload `media` with `uploadedBy == request.auth.uid`. Cannot alter site-wide design, settings, users, or ads.
   - **Reader / Public**: Can read `status == 'published'` `news`, active `categories`/`tags`/`navigationMenus`/`advertisements`/`pages`, `designSettings/published`, `websiteSettings/global`, `approved` `comments`; can submit `pending` `comments`, `newsletterSubscribers`, `contactMessages`, and `analytics` view events, and increment `viewsCount` by exactly `+1` on published articles.
3. **PII Isolation**: `users/{userId}`, `newsletterSubscribers/{id}`, and `contactMessages/{id}` contain emails and are strictly unreadable via `get` or `list` to non-owners/non-admins.
4. **Anti-Update-Gap & Temporal Integrity**: All creates enforce `createdAt == request.time && updatedAt == request.time`; all updates enforce `updatedAt == request.time` and preserve `createdAt == existing().createdAt` and `authorId == existing().authorId`.
5. **Path Variable Hardening**: Every single-document target checks `isValidId(docId)`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Self-Privilege Escalation on Signup**: New user registers `/users/attacker` with `{ role: "Super Admin" }`. -> `PERMISSION_DENIED`
2. **Profile Role Tampering**: Author updates `/users/author1` with `{ role: "Super Admin" }`. -> `PERMISSION_DENIED`
3. **Unverified Admin Email Spoof**: Caller with `email: "jesank501@gmail.com"` and `email_verified: false` attempts admin write. -> `PERMISSION_DENIED`
4. **PII Scraping (`newsletterSubscribers`)**: Non-admin executes `list` or `get` on `/newsletterSubscribers`. -> `PERMISSION_DENIED`
5. **PII Scraping (`users`)**: Non-admin executes `list` on `/users` or `get` on another user's `/users/otherUid`. -> `PERMISSION_DENIED`
6. **Draft Article Leak**: Anonymous reader executes `get` or `list` on `/news` without `status == 'published'` filter or targeting a `draft` doc. -> `PERMISSION_DENIED`
7. **Shadow Field Injection on Article Update**: Author updates `/news/article1` injecting `{ isVerified: true, extraBackdoor: 1 }`. -> `PERMISSION_DENIED`
8. **Author Spoofing on Create**: Reporter creates `/news/article2` with `{ authorId: "someoneElseUid" }`. -> `PERMISSION_DENIED`
9. **Public Comment Auto-Approval**: Unauthenticated/reader creates `/comments/c1` with `{ status: "approved" }` instead of `"pending"`. -> `PERMISSION_DENIED`
10. **Views Tampering**: Reader updates `/news/article1` setting `{ viewsCount: 999999, title: "Hacked" }`. -> `PERMISSION_DENIED`
11. **Timestamp Forgery**: Staff creates `/categories/cat1` with client timestamp `{ createdAt: "2020-01-01T00:00:00Z" }` instead of `request.time`. -> `PERMISSION_DENIED`
12. **Path Poisoning (Oversized ID)**: Attacker attempts write to `/news/${'a'.repeat(500)}`. -> `PERMISSION_DENIED`
