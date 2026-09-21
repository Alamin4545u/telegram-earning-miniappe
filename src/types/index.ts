/**
 * Core Domain Types for TeleVault Telegram Mini App
 */

export type AccountStatus = 'active' | 'suspended' | 'pending';
export type AdminRole = 'super_admin' | 'admin' | 'moderator';

export interface UserProfile {
  id: string; // Internal User ID (UUID)
  telegram_id: number; // Telegram User ID
  username?: string;
  first_name: string;
  last_name?: string;
  photo_url?: string;
  referral_code: string;
  referrer_id?: string;
  wallet_address: string;
  status: AccountStatus;
  is_transfer_restricted: boolean;
  is_withdrawal_restricted: boolean;
  is_earning_restricted: boolean;
  admin_notes?: string;
  last_daily_claim_at?: string;
  daily_streak_count: number;
  points_balance: number;
  total_referrals?: number;
  role?: AdminRole;
  preferred_language: string;
  created_at: string;
  last_active_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  wallet_address: string;
  balance: number;
  coin_symbol: string;
  status: 'active' | 'frozen' | 'closed';
  created_at: string;
  updated_at: string;
}

export type WalletTxType =
  | 'p2p_send'
  | 'p2p_receive'
  | 'point_conversion'
  | 'withdrawal'
  | 'withdrawal_refund'
  | 'admin_adjustment';

export interface WalletTransaction {
  id: string;
  user_id: string;
  wallet_id: string;
  type: WalletTxType;
  amount: number;
  coin_symbol: string;
  fee: number;
  previous_balance: number;
  new_balance: number;
  reference_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  created_at: string;
}

export type PointTxType =
  | 'ad_reward'
  | 'task_reward'
  | 'game_reward'
  | 'daily_bonus'
  | 'referral'
  | 'point_conversion'
  | 'admin_adjustment';

export interface PointTransaction {
  id: string;
  user_id: string;
  type: PointTxType;
  amount: number;
  previous_balance: number;
  new_balance: number;
  reference_id?: string;
  description?: string;
  created_at: string;
}

export interface P2PTransfer {
  id: string;
  sender_user_id: string;
  recipient_user_id: string;
  sender_wallet_id: string;
  recipient_wallet_id: string;
  amount: number;
  fee: number;
  status: 'completed' | 'pending' | 'failed';
  tx_hash: string;
  created_at: string;
}

export interface CoinSettings {
  id: string;
  coin_name: string;
  coin_symbol: string;
  coin_logo: string;
  decimal_precision: number;
  points_per_coin: number; // e.g. 10 means 1000 points = 100 coins
  min_conversion_points: number;
  max_conversion_points: number;
  conversion_enabled: boolean;
  transfer_enabled: boolean;
  min_transfer_amount: number;
  max_transfer_amount: number;
  transfer_fee_percent: number;
  transfer_fee_fixed: number;
  withdrawal_enabled: boolean;
  min_withdrawal_amount: number;
  max_withdrawal_amount: number;
  withdrawal_fee_percent: number;
  updated_at: string;
}

export interface AdSettings {
  id: string;
  provider: string;
  gigapub_enabled: boolean;
  gigapub_project_id: string;
  rewarded_ad_enabled: boolean;
  rewarded_ad_reward: number;
  min_watch_seconds: number;
  ad_cooldown_seconds: number;
  max_ads_per_user_day: number;
  ad_reward_enabled: boolean;
  offerwall_enabled: boolean;
  offerwall_config: Record<string, unknown>;
  ad_frequency: number;
  status: string;
  updated_at: string;
}

export interface AppSettings {
  id: string;
  app_name: string;
  app_logo: string;
  app_description: string;
  maintenance_mode: boolean;
  registration_enabled: boolean;
  earning_enabled: boolean;
  p2p_enabled: boolean;
  withdrawal_enabled: boolean;
  referral_enabled: boolean;
  game_enabled: boolean;
  daily_reward_enabled: boolean;
  offerwall_enabled: boolean;
  ads_enabled: boolean;
  min_app_version: string;
  telegram_support_url: string;
  terms_url: string;
  privacy_policy_url: string;
  updated_at: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  task_type?: 'visit' | 'read' | 'watch' | 'join' | 'social' | 'custom' | 'telegram' | 'twitter' | 'daily';
  type?: 'telegram' | 'twitter' | 'custom' | 'daily' | 'visit' | 'read' | 'watch' | 'join' | 'social';
  reward_points: number;
  max_completions?: number;
  daily_limit?: number;
  external_url?: string;
  action_url?: string;
  active?: boolean;
  is_active?: boolean;
  country_targeting?: string[];
  start_date?: string;
  end_date?: string;
  completed?: boolean;
  created_at?: string;
}

export interface GameConfig {
  id: string;
  slug: string;
  name: string;
  description: string;
  active?: boolean;
  is_enabled?: boolean;
  reward_per_game?: number;
  base_points?: number;
  daily_play_limit?: number;
  max_daily_plays?: number;
  min_score?: number;
  max_reward?: number;
  max_multiplier?: number;
  cooldown_seconds?: number;
}

export interface DailyRewardTier {
  id?: string;
  day_number?: number;
  day?: number;
  reward_points?: number;
  points?: number;
  active?: boolean;
}

export interface ReferralItem {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referred_username?: string;
  reward_points_referrer: number;
  reward_points_referred: number;
  status: 'completed' | 'pending' | 'flagged';
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  wallet_id: string;
  username?: string;
  amount: number;
  coin_symbol: string;
  fee: number;
  net_amount: number;
  method: string;
  destination_address: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  admin_notes?: string;
  created_at: string;
  processed_at?: string;
}

export interface AdminUser {
  id: string;
  user_id?: string;
  telegram_id: number;
  name: string;
  role: AdminRole;
  permissions: string[];
  active: boolean;
}

export interface AuditLog {
  id: string;
  admin_id?: string;
  admin_telegram_id?: number;
  admin_name?: string;
  action: string;
  target_type: string;
  target_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  reason?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'p2p' | 'reward' | 'admin' | 'system';
  read: boolean;
  created_at: string;
}

export type SupportedLanguage = 'pt-BR' | 'en' | 'es' | 'id' | 'bn';
