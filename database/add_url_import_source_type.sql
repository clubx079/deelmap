-- Migration: add 'url_import' to temp_seller_logins source_type check constraint
ALTER TABLE temp_seller_logins
  DROP CONSTRAINT IF EXISTS temp_seller_logins_source_type_check;

ALTER TABLE temp_seller_logins
  ADD CONSTRAINT temp_seller_logins_source_type_check
  CHECK (source_type IN ('sms', 'email', 'website', 'unknown', 'url_import'));
