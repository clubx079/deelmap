# Messages schema reference (marketplace DB)

Reference for the tables used by buyer/seller chat and email notifications.

## conversations

- `id` **bigint** (identity, PK)
- `lender_id` bigint null
- `seller_id` uuid null
- `financing_request_id` uuid null
- `user_id` bigint null
- `is_active` boolean not null default true
- `last_message_at` timestamptz null
- `last_message_preview` text null
- `created_at`, `updated_at` timestamptz not null
- `buyer_uuid` uuid null
- `property_id` **text** null  — deal/property this thread is about (one thread per seller+buyer+property)
- `property_address` text null

Optional columns (if added): `property_slug` text, `property_thumbnail_url` text.  
If absent, slug/thumbnail are resolved in API from `property_id` via `getDealAddressAndSlug` / `getPropertyThumbnail`.

Index: `idx_conversations_seller_property` on `(seller_id, property_id)`.

---

## messages

- `id` bigint (identity, PK)
- `conversation_id` **bigint** not null → `conversations(id)` ON DELETE CASCADE
- `sender_type` text not null — check: `'user' | 'lender' | 'seller'`
- `sender_id` text null
- `sender_email` text null
- `message_text` text null
- `html_message` text null
- `has_attachment` boolean default false
- `attachment_url`, `attachment_name`, `attachment_type`, `attachment_size`
- `reply_to_email` text null
- `is_from_email` boolean default false
- `email_message_id` text null
- `is_read` boolean default false, `read_at` timestamptz null
- `created_at` timestamptz not null default now()

---

## message_presence

Used to decide whether to send an email when the other party sends a message (if they are not “active”, send email).

- `user_id` uuid not null
- `user_type` text not null — check: `'buyer' | 'seller'`
- `last_seen` timestamptz not null default now()
- PK: `(user_id, user_type)`

Heartbeats from buyer/seller update `last_seen`. If the recipient’s `last_seen` is older than the TTL (e.g. 60s), send the notification email.
