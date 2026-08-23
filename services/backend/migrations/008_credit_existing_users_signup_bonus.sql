-- Migration: Credit all existing users with ₦1,000 signup bonus
-- Run this ONCE after deploying the universal signup bonus feature
-- This ensures existing users also receive the welcome bonus

-- Start transaction
BEGIN;

-- 1. Update shopping_credit for all existing users who haven't received signup bonus
-- This prevents double-crediting if migration is run twice
UPDATE users
SET shopping_credit = shopping_credit + 1000,
    updated_at = NOW()
WHERE id NOT IN (
    SELECT DISTINCT user_id FROM credit_entries
    WHERE type = 'signup_bonus'
);

-- 2. Create credit entries for audit trail
-- Using gen_random_uuid() for PostgreSQL UUID generation
INSERT INTO credit_entries (id, user_id, amount, remaining, type, source, description, created_at, updated_at)
SELECT
    gen_random_uuid(),
    u.id,
    1000,
    1000,
    'signup_bonus',
    'admin',
    '₦1,000 welcome bonus - thank you for being an early myInstaShop user!',
    NOW(),
    NOW()
FROM users u
WHERE u.id NOT IN (
    SELECT DISTINCT user_id FROM credit_entries
    WHERE type = 'signup_bonus'
);

-- Log the count of users credited
DO $$
DECLARE
    credited_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO credited_count
    FROM credit_entries
    WHERE type = 'signup_bonus'
    AND source = 'admin'
    AND created_at >= NOW() - INTERVAL '1 minute';

    RAISE NOTICE 'Credited % existing users with ₦1,000 signup bonus', credited_count;
END $$;

COMMIT;
