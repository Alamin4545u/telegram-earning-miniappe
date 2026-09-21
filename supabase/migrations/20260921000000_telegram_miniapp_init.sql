-- ==========================================================
-- TELEVAULT: PRODUCTION-READY TELEGRAM MINI APP DATABASE SCHEMA
-- Normalized PostgreSQL Schema for Supabase
-- Includes RLS policies, constraints, indexes & atomic transaction RPCs
-- ==========================================================

-- Enable pgcrypto for UUIDs & hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    photo_url TEXT,
    referral_code TEXT UNIQUE NOT NULL,
    referrer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    is_transfer_restricted BOOLEAN NOT NULL DEFAULT false,
    is_withdrawal_restricted BOOLEAN NOT NULL DEFAULT false,
    is_earning_restricted BOOLEAN NOT NULL DEFAULT false,
    admin_notes TEXT,
    last_daily_claim_at TIMESTAMPTZ,
    daily_streak_count INT NOT NULL DEFAULT 0,
    points_balance BIGINT NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
    preferred_language TEXT NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON public.profiles(telegram_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- 2. WALLETS (One wallet strictly per profile, unique wallet address)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_address TEXT UNIQUE NOT NULL,
    balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000 CHECK (balance >= 0),
    coin_symbol TEXT NOT NULL DEFAULT 'ALM',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallets_address ON public.wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);

-- 3. WALLET TRANSACTIONS (Immutable Ledger)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'p2p_send', 'p2p_receive', 'point_conversion',
        'withdrawal', 'withdrawal_refund', 'admin_adjustment'
    )),
    amount NUMERIC(18, 4) NOT NULL,
    coin_symbol TEXT NOT NULL DEFAULT 'ALM',
    fee NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    previous_balance NUMERIC(18, 4) NOT NULL,
    new_balance NUMERIC(18, 4) NOT NULL,
    reference_id TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created ON public.wallet_transactions(created_at DESC);

-- 4. POINT TRANSACTIONS (Separate Ledger)
CREATE TABLE IF NOT EXISTS public.point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'ad_reward', 'task_reward', 'game_reward',
        'daily_bonus', 'referral', 'point_conversion', 'admin_adjustment'
    )),
    amount BIGINT NOT NULL,
    previous_balance BIGINT NOT NULL,
    new_balance BIGINT NOT NULL,
    reference_id TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_tx_user ON public.point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_tx_created ON public.point_transactions(created_at DESC);

-- 5. P2P TRANSFERS
CREATE TABLE IF NOT EXISTS public.p2p_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_user_id UUID NOT NULL REFERENCES public.profiles(id),
    recipient_user_id UUID NOT NULL REFERENCES public.profiles(id),
    sender_wallet_id UUID NOT NULL REFERENCES public.wallets(id),
    recipient_wallet_id UUID NOT NULL REFERENCES public.wallets(id),
    amount NUMERIC(18, 4) NOT NULL CHECK (amount > 0),
    fee NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (fee >= 0),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    tx_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. COIN CONVERSIONS
CREATE TABLE IF NOT EXISTS public.coin_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    points_deducted BIGINT NOT NULL CHECK (points_deducted > 0),
    coins_credited NUMERIC(18, 4) NOT NULL CHECK (coins_credited > 0),
    conversion_rate NUMERIC(18, 6) NOT NULL,
    coin_symbol TEXT NOT NULL DEFAULT 'ALM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TASKS & COMPLETIONS
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'Award',
    task_type TEXT NOT NULL CHECK (task_type IN ('visit', 'read', 'watch', 'join', 'social', 'custom')),
    reward_points BIGINT NOT NULL CHECK (reward_points > 0),
    max_completions INT NOT NULL DEFAULT 1000000,
    daily_limit INT NOT NULL DEFAULT 1,
    external_url TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    country_targeting TEXT[] DEFAULT ARRAY[]::TEXT[],
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reward_points BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('pending', 'verified', 'rejected')),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_task UNIQUE (task_id, user_id)
);

-- 8. GAMES & SESSIONS
CREATE TABLE IF NOT EXISTS public.games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    reward_per_game BIGINT NOT NULL DEFAULT 50,
    daily_play_limit INT NOT NULL DEFAULT 10,
    min_score INT NOT NULL DEFAULT 10,
    max_reward BIGINT NOT NULL DEFAULT 200,
    cooldown_seconds INT NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    score INT NOT NULL DEFAULT 0,
    reward_points BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- 9. DAILY REWARD TIERS (Days 1 - 7)
CREATE TABLE IF NOT EXISTS public.daily_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_number INT UNIQUE NOT NULL CHECK (day_number BETWEEN 1 AND 7),
    reward_points BIGINT NOT NULL CHECK (reward_points > 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. REFERRALS
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES public.profiles(id),
    referred_user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id),
    reward_points_referrer BIGINT NOT NULL DEFAULT 250,
    reward_points_referred BIGINT NOT NULL DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'flagged')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. WITHDRAWALS
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id),
    amount NUMERIC(18, 4) NOT NULL CHECK (amount > 0),
    coin_symbol TEXT NOT NULL DEFAULT 'ALM',
    fee NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (fee >= 0),
    net_amount NUMERIC(18, 4) NOT NULL CHECK (net_amount > 0),
    method TEXT NOT NULL, -- 'USDT_TRC20', 'TON', 'LOCAL_BANK', etc.
    destination_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- 12. AD SETTINGS (Remote Configuration for GigaPub & Ads)
CREATE TABLE IF NOT EXISTS public.ad_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'GigaPub',
    gigapub_enabled BOOLEAN NOT NULL DEFAULT true,
    gigapub_project_id TEXT NOT NULL DEFAULT 'GP-849204-LIVE',
    rewarded_ad_enabled BOOLEAN NOT NULL DEFAULT true,
    rewarded_ad_reward BIGINT NOT NULL DEFAULT 150,
    min_watch_seconds INT NOT NULL DEFAULT 15,
    ad_cooldown_seconds INT NOT NULL DEFAULT 60,
    max_ads_per_user_day INT NOT NULL DEFAULT 20,
    ad_reward_enabled BOOLEAN NOT NULL DEFAULT true,
    offerwall_enabled BOOLEAN NOT NULL DEFAULT true,
    offerwall_config JSONB NOT NULL DEFAULT '{"provider": "GigaPub OfferWall", "multiplier": 1.0}'::JSONB,
    ad_frequency INT NOT NULL DEFAULT 3,
    status TEXT NOT NULL DEFAULT 'active',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. AD EVENTS & OFFERWALL EVENTS
CREATE TABLE IF NOT EXISTS public.ad_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    provider TEXT NOT NULL DEFAULT 'GigaPub',
    project_id TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'rewarded_ad',
    reward_points BIGINT NOT NULL,
    reference_id TEXT UNIQUE,
    verified BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.offerwall_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    provider TEXT NOT NULL DEFAULT 'GigaPub',
    reward_points BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    verified BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. COIN SETTINGS (Dynamic remote control)
CREATE TABLE IF NOT EXISTS public.coin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coin_name TEXT NOT NULL DEFAULT 'TeleVault Coin',
    coin_symbol TEXT NOT NULL DEFAULT 'ALM',
    coin_logo TEXT NOT NULL DEFAULT '🪙',
    decimal_precision INT NOT NULL DEFAULT 4,
    points_per_coin NUMERIC(18, 4) NOT NULL DEFAULT 10.0000, -- e.g. 1000 points = 100 coins
    min_conversion_points BIGINT NOT NULL DEFAULT 500,
    max_conversion_points BIGINT NOT NULL DEFAULT 100000,
    conversion_enabled BOOLEAN NOT NULL DEFAULT true,
    transfer_enabled BOOLEAN NOT NULL DEFAULT true,
    min_transfer_amount NUMERIC(18, 4) NOT NULL DEFAULT 5.0000,
    max_transfer_amount NUMERIC(18, 4) NOT NULL DEFAULT 5000.0000,
    transfer_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.50, -- 1.5%
    transfer_fee_fixed NUMERIC(18, 4) NOT NULL DEFAULT 0.5000,
    withdrawal_enabled BOOLEAN NOT NULL DEFAULT true,
    min_withdrawal_amount NUMERIC(18, 4) NOT NULL DEFAULT 50.0000,
    max_withdrawal_amount NUMERIC(18, 4) NOT NULL DEFAULT 10000.0000,
    withdrawal_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 2.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. APP SETTINGS (Global App Controls)
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_name TEXT NOT NULL DEFAULT 'TeleVault Mini App',
    app_logo TEXT NOT NULL DEFAULT '⚡',
    app_description TEXT NOT NULL DEFAULT 'Decentralized internal wallet and rewards hub for Telegram',
    maintenance_mode BOOLEAN NOT NULL DEFAULT false,
    registration_enabled BOOLEAN NOT NULL DEFAULT true,
    earning_enabled BOOLEAN NOT NULL DEFAULT true,
    p2p_enabled BOOLEAN NOT NULL DEFAULT true,
    withdrawal_enabled BOOLEAN NOT NULL DEFAULT true,
    referral_enabled BOOLEAN NOT NULL DEFAULT true,
    game_enabled BOOLEAN NOT NULL DEFAULT true,
    daily_reward_enabled BOOLEAN NOT NULL DEFAULT true,
    offerwall_enabled BOOLEAN NOT NULL DEFAULT true,
    ads_enabled BOOLEAN NOT NULL DEFAULT true,
    min_app_version TEXT NOT NULL DEFAULT '1.0.0',
    telegram_support_url TEXT NOT NULL DEFAULT 'https://t.me/TeleVaultSupport',
    terms_url TEXT NOT NULL DEFAULT 'https://televault.app/terms',
    privacy_policy_url TEXT NOT NULL DEFAULT 'https://televault.app/privacy',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. ADMIN USERS & ROLES
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    telegram_id BIGINT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator')),
    permissions TEXT[] NOT NULL DEFAULT ARRAY['read', 'manage_users', 'manage_settings', 'manage_withdrawals']::TEXT[],
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. AUDIT LOGS (Immutable record of administrative actions)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    admin_telegram_id BIGINT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

-- 18. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'system', -- 'p2p', 'reward', 'admin', 'system'
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Users can only read their own private information.
-- Balance modifications are strictly forbidden through direct client updates.
-- ==========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Public readable configs
CREATE POLICY "Public configs can be read by anyone" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Coin settings can be read by anyone" ON public.coin_settings FOR SELECT USING (true);
CREATE POLICY "Ad public settings can be read by anyone" ON public.ad_settings FOR SELECT USING (true);
CREATE POLICY "Tasks can be read by anyone" ON public.tasks FOR SELECT USING (active = true);
CREATE POLICY "Games can be read by anyone" ON public.games FOR SELECT USING (active = true);
CREATE POLICY "Daily rewards can be read by anyone" ON public.daily_rewards FOR SELECT USING (active = true);

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
-- Wallets: user can only view their own wallet
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
-- Transactions: user can only view their own transactions
CREATE POLICY "Users can view own wallet transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own point transactions" ON public.point_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own p2p transfers" ON public.p2p_transfers FOR SELECT USING (auth.uid() = sender_user_id OR auth.uid() = recipient_user_id);
CREATE POLICY "Users can view own task completions" ON public.task_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

-- Explicitly NO DIRECT INSERT / UPDATE / DELETE on balances for anon / authenticated users
-- All mutations must be executed through RPC stored procedures or via service role.

-- ==========================================================
-- ATOMIC STORED PROCEDURES (RPCs)
-- ==========================================================

-- Function 1: Atomic P2P Transfer
CREATE OR REPLACE FUNCTION transfer_coins_atomic(
    p_sender_id UUID,
    p_recipient_address TEXT,
    p_amount NUMERIC(18, 4),
    p_tx_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sender_wallet RECORD;
    v_recipient_wallet RECORD;
    v_coin_settings RECORD;
    v_fee NUMERIC(18, 4);
    v_total_deduction NUMERIC(18, 4);
    v_transfer_id UUID;
BEGIN
    -- 1. Fetch coin settings
    SELECT * INTO v_coin_settings FROM public.coin_settings LIMIT 1;
    IF NOT v_coin_settings.transfer_enabled THEN
        RAISE EXCEPTION 'P2P Transfers are currently disabled by administration.';
    END IF;

    IF p_amount < v_coin_settings.min_transfer_amount THEN
        RAISE EXCEPTION 'Amount is below minimum transfer limit of %', v_coin_settings.min_transfer_amount;
    END IF;

    IF p_amount > v_coin_settings.max_transfer_amount THEN
        RAISE EXCEPTION 'Amount exceeds maximum transfer limit of %', v_coin_settings.max_transfer_amount;
    END IF;

    -- Calculate fee
    v_fee := ROUND((p_amount * (v_coin_settings.transfer_fee_percent / 100.0)) + v_coin_settings.transfer_fee_fixed, 4);
    v_total_deduction := p_amount + v_fee;

    -- 2. Lock sender wallet
    SELECT * INTO v_sender_wallet FROM public.wallets WHERE user_id = p_sender_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sender wallet not found.';
    END IF;

    IF v_sender_wallet.status != 'active' THEN
        RAISE EXCEPTION 'Sender wallet is not active.';
    END IF;

    IF v_sender_wallet.balance < v_total_deduction THEN
        RAISE EXCEPTION 'Insufficient balance. Required: % (including fee %), Available: %', v_total_deduction, v_fee, v_sender_wallet.balance;
    END IF;

    -- 3. Lock recipient wallet
    SELECT * INTO v_recipient_wallet FROM public.wallets WHERE wallet_address = p_recipient_address FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recipient wallet address does not exist.';
    END IF;

    IF v_recipient_wallet.user_id = p_sender_id THEN
        RAISE EXCEPTION 'Cannot transfer coins to your own wallet.';
    END IF;

    IF v_recipient_wallet.status != 'active' THEN
        RAISE EXCEPTION 'Recipient wallet is currently frozen.';
    END IF;

    -- 4. Deduct sender balance
    UPDATE public.wallets
    SET balance = balance - v_total_deduction, updated_at = now()
    WHERE id = v_sender_wallet.id;

    -- Credit recipient balance
    UPDATE public.wallets
    SET balance = balance + p_amount, updated_at = now()
    WHERE id = v_recipient_wallet.id;

    -- 5. Record immutable transactions
    INSERT INTO public.wallet_transactions (
        user_id, wallet_id, type, amount, coin_symbol, fee,
        previous_balance, new_balance, reference_id, description
    ) VALUES (
        p_sender_id, v_sender_wallet.id, 'p2p_send', p_amount, v_sender_wallet.coin_symbol, v_fee,
        v_sender_wallet.balance, v_sender_wallet.balance - v_total_deduction, p_tx_hash,
        'P2P transfer to ' || p_recipient_address
    );

    INSERT INTO public.wallet_transactions (
        user_id, wallet_id, type, amount, coin_symbol, fee,
        previous_balance, new_balance, reference_id, description
    ) VALUES (
        v_recipient_wallet.user_id, v_recipient_wallet.id, 'p2p_receive', p_amount, v_recipient_wallet.coin_symbol, 0,
        v_recipient_wallet.balance, v_recipient_wallet.balance + p_amount, p_tx_hash,
        'P2P transfer received from ' || v_sender_wallet.wallet_address
    );

    -- 6. Insert P2P Transfer log
    INSERT INTO public.p2p_transfers (
        sender_user_id, recipient_user_id, sender_wallet_id, recipient_wallet_id,
        amount, fee, status, tx_hash
    ) VALUES (
        p_sender_id, v_recipient_wallet.user_id, v_sender_wallet.id, v_recipient_wallet.id,
        p_amount, v_fee, 'completed', p_tx_hash
    ) RETURNING id INTO v_transfer_id;

    -- 7. Send notification to recipient
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        v_recipient_wallet.user_id,
        'Received ' || p_amount || ' ' || v_sender_wallet.coin_symbol,
        'You received ' || p_amount || ' ' || v_sender_wallet.coin_symbol || ' from ' || v_sender_wallet.wallet_address,
        'p2p'
    );

    RETURN jsonb_build_object(
        'success', true,
        'transfer_id', v_transfer_id,
        'tx_hash', p_tx_hash,
        'amount', p_amount,
        'fee', v_fee,
        'sender_new_balance', v_sender_wallet.balance - v_total_deduction
    );
END;
$$;

-- Function 2: Atomic Point to Coin Conversion
CREATE OR REPLACE FUNCTION convert_points_atomic(
    p_user_id UUID,
    p_points BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile RECORD;
    v_wallet RECORD;
    v_coin_settings RECORD;
    v_coins NUMERIC(18, 4);
    v_tx_ref TEXT;
BEGIN
    SELECT * INTO v_coin_settings FROM public.coin_settings LIMIT 1;
    IF NOT v_coin_settings.conversion_enabled THEN
        RAISE EXCEPTION 'Point to Coin conversion is currently disabled by Admin.';
    END IF;

    IF p_points < v_coin_settings.min_conversion_points THEN
        RAISE EXCEPTION 'Minimum conversion is % Points.', v_coin_settings.min_conversion_points;
    END IF;

    IF p_points > v_coin_settings.max_conversion_points THEN
        RAISE EXCEPTION 'Maximum conversion is % Points.', v_coin_settings.max_conversion_points;
    END IF;

    -- Lock Profile
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF v_profile.points_balance < p_points THEN
        RAISE EXCEPTION 'Insufficient Points balance. Have: %, Required: %', v_profile.points_balance, p_points;
    END IF;

    -- Calculate coins: e.g. 1000 points / 10 = 100 coins
    v_coins := ROUND(p_points / v_coin_settings.points_per_coin, 4);
    v_tx_ref := 'CONV-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 12));

    -- Lock Wallet
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

    -- Update Profile Points
    UPDATE public.profiles
    SET points_balance = points_balance - p_points, last_active_at = now()
    WHERE id = p_user_id;

    -- Update Wallet Balance
    UPDATE public.wallets
    SET balance = balance + v_coins, updated_at = now()
    WHERE id = v_wallet.id;

    -- Record in point ledger
    INSERT INTO public.point_transactions (
        user_id, type, amount, previous_balance, new_balance, reference_id, description
    ) VALUES (
        p_user_id, 'point_conversion', -p_points, v_profile.points_balance,
        v_profile.points_balance - p_points, v_tx_ref,
        'Converted ' || p_points || ' Points to ' || v_coins || ' ' || v_coin_settings.coin_symbol
    );

    -- Record in wallet ledger
    INSERT INTO public.wallet_transactions (
        user_id, wallet_id, type, amount, coin_symbol, fee,
        previous_balance, new_balance, reference_id, description
    ) VALUES (
        p_user_id, v_wallet.id, 'point_conversion', v_coins, v_coin_settings.coin_symbol, 0,
        v_wallet.balance, v_wallet.balance + v_coins, v_tx_ref,
        'Received from converting ' || p_points || ' Points'
    );

    -- Record conversion event
    INSERT INTO public.coin_conversions (
        user_id, points_deducted, coins_credited, conversion_rate, coin_symbol
    ) VALUES (
        p_user_id, p_points, v_coins, v_coin_settings.points_per_coin, v_coin_settings.coin_symbol
    );

    RETURN jsonb_build_object(
        'success', true,
        'points_deducted', p_points,
        'coins_credited', v_coins,
        'new_points_balance', v_profile.points_balance - p_points,
        'new_coin_balance', v_wallet.balance + v_coins
    );
END;
$$;
