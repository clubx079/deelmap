-- Community: subscription notifications
-- Run ONCE in the Supabase SQL editor BEFORE deploying the matching code.
-- Shared Deelmap DB: https://caoynokephxfyqofpufv.supabase.co
--
-- What this enables:
--   1. A per-user email preference for "new posts in Lots you follow".
--   2. The new `lot_post` notification type used when a subscribed Lot gets a post.

-- 1. Email preference (defaults ON for everyone, like the other community email prefs)
ALTER TABLE community_profiles
  ADD COLUMN IF NOT EXISTS email_subscriptions boolean NOT NULL DEFAULT true;

-- 2. Allow the new notification type. Recreate the CHECK with the full set
--    (existing: comment_reply, post_reply, mention, verification_status, mod_action)
ALTER TABLE community_notifications
  DROP CONSTRAINT IF EXISTS community_notifications_type_check;

ALTER TABLE community_notifications
  ADD CONSTRAINT community_notifications_type_check
  CHECK (type IN (
    'comment_reply',
    'post_reply',
    'mention',
    'verification_status',
    'mod_action',
    'lot_post'
  ));
