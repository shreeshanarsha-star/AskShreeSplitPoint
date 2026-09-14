-- Migration: 20260914_fix_auth_users_null_tokens.sql
-- Fix for GoTrue Scan error: "converting NULL to string is unsupported"
-- when scanning confirmation_token, recovery_token, or email_change in auth.users

UPDATE auth.users
SET confirmation_token = ''
WHERE confirmation_token IS NULL;

UPDATE auth.users
SET recovery_token = ''
WHERE recovery_token IS NULL;

UPDATE auth.users
SET email_change = ''
WHERE email_change IS NULL;

UPDATE auth.users
SET email_change_token_new = ''
WHERE email_change_token_new IS NULL;

UPDATE auth.users
SET reauthentication_token = ''
WHERE reauthentication_token IS NULL;
