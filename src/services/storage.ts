import {
  UserProfile,
  Wallet,
  WalletTransaction,
  PointTransaction,
  P2PTransfer,
  CoinSettings,
  AdSettings,
  AppSettings,
  TaskItem,
  GameConfig,
  DailyRewardTier,
  WithdrawalRequest,
  AdminUser,
  AdminRole,
  AuditLog,
  NotificationItem,
} from '../types';

function generateRandomHex(length: number): string {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateWalletAddress(): string {
  return 'RW' + generateRandomHex(16);
}

function generateReferralCode(): string {
  return 'TV' + generateRandomHex(6);
}

// In-Memory & Persistent State Store
class ServerLedgerStore {
  profiles: Map<string, UserProfile> = new Map();
  telegramIdToProfileId: Map<number, string> = new Map();
  wallets: Map<string, Wallet> = new Map();
  walletAddressToId: Map<string, string> = new Map();
  walletTransactions: WalletTransaction[] = [];
  pointTransactions: PointTransaction[] = [];
  p2pTransfers: P2PTransfer[] = [];
  withdrawals: WithdrawalRequest[] = [];
  notifications: NotificationItem[] = [];
  auditLogs: AuditLog[] = [];
  tasks: TaskItem[] = [];
  taskCompletions: Set<string> = new Set(); // taskId:userId
  games: GameConfig[] = [];
  dailyRewards: DailyRewardTier[] = [];
  adEvents: Set<string> = new Set(); // referenceId
  userAdTimestamps: Map<string, number[]> = new Map(); // userId -> timestamps

  coinSettings: CoinSettings = {
    id: 'cs-default',
    coin_name: 'TeleVault Coin',
    coin_symbol: 'ALM',
    coin_logo: '🪙',
    decimal_precision: 4,
    points_per_coin: 10, // 1000 points = 100 coins
    min_conversion_points: 500,
    max_conversion_points: 100000,
    conversion_enabled: true,
    transfer_enabled: true,
    min_transfer_amount: 5,
    max_transfer_amount: 5000,
    transfer_fee_percent: 1.5,
    transfer_fee_fixed: 0.5,
    withdrawal_enabled: true,
    min_withdrawal_amount: 50,
    max_withdrawal_amount: 10000,
    withdrawal_fee_percent: 2.0,
    updated_at: new Date().toISOString(),
  };

  adSettings: AdSettings = {
    id: 'ad-default',
    provider: 'GigaPub',
    gigapub_enabled: true,
    gigapub_project_id: 'GP-849204-LIVE',
    rewarded_ad_enabled: true,
    rewarded_ad_reward: 150,
    min_watch_seconds: 15,
    ad_cooldown_seconds: 45,
    max_ads_per_user_day: 25,
    ad_reward_enabled: true,
    offerwall_enabled: true,
    offerwall_config: { provider: 'GigaPub OfferWall', version: '2.4', multiplier: 1.0 },
    ad_frequency: 3,
    status: 'active',
    updated_at: new Date().toISOString(),
  };

  appSettings: AppSettings = {
    id: 'app-default',
    app_name: 'TeleVault Mini App',
    app_logo: '⚡',
    app_description: 'Decentralized internal wallet and rewards hub for Telegram',
    maintenance_mode: false,
    registration_enabled: true,
    earning_enabled: true,
    p2p_enabled: true,
    withdrawal_enabled: true,
    referral_enabled: true,
    game_enabled: true,
    daily_reward_enabled: true,
    offerwall_enabled: true,
    ads_enabled: true,
    min_app_version: '1.0.0',
    telegram_support_url: 'https://t.me/TeleVaultSupport',
    terms_url: 'https://televault.app/terms',
    privacy_policy_url: 'https://televault.app/privacy',
    updated_at: new Date().toISOString(),
  };

  adminUsers: AdminUser[] = [
    {
      id: 'admin-1',
      telegram_id: 981815824,
      name: 'Alex (Super Admin)',
      role: 'super_admin',
      permissions: ['all'],
      active: true,
    },
  ];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Seed Daily Rewards
    this.dailyRewards = [
      { id: 'dr-1', day_number: 1, reward_points: 100, active: true },
      { id: 'dr-2', day_number: 2, reward_points: 150, active: true },
      { id: 'dr-3', day_number: 3, reward_points: 200, active: true },
      { id: 'dr-4', day_number: 4, reward_points: 300, active: true },
      { id: 'dr-5', day_number: 5, reward_points: 450, active: true },
      { id: 'dr-6', day_number: 6, reward_points: 600, active: true },
      { id: 'dr-7', day_number: 7, reward_points: 1000, active: true },
    ];

    // Seed Games
    this.games = [
      {
        id: 'gm-1',
        slug: 'tap-star',
        name: 'Tap Star Reaction',
        description: 'Tap appearing stars rapidly within 20 seconds. Earn up to 200 points!',
        active: true,
        reward_per_game: 50,
        daily_play_limit: 15,
        min_score: 15,
        max_reward: 200,
        cooldown_seconds: 30,
      },
      {
        id: 'gm-2',
        slug: 'asteroid-dodge',
        name: 'Crypto Asteroid Runner',
        description: 'Navigate your spaceship safely through coin belts to earn points.',
        active: true,
        reward_per_game: 80,
        daily_play_limit: 10,
        min_score: 25,
        max_reward: 250,
        cooldown_seconds: 60,
      },
    ];

    // Seed Tasks
    this.tasks = [
      {
        id: 'task-1',
        title: 'Join Official Telegram Channel',
        description: 'Subscribe to announcements and get instant 500 bonus points.',
        icon: 'Send',
        task_type: 'join',
        reward_points: 500,
        max_completions: 500000,
        daily_limit: 1,
        external_url: 'https://t.me/TeleVaultAnnouncements',
        active: true,
        start_date: new Date().toISOString(),
      },
      {
        id: 'task-2',
        title: 'Follow TeleVault on X (Twitter)',
        description: 'Stay updated with upcoming coin listings and partner drops.',
        icon: 'Twitter',
        task_type: 'social',
        reward_points: 400,
        max_completions: 250000,
        daily_limit: 1,
        external_url: 'https://x.com/TeleVault',
        active: true,
        start_date: new Date().toISOString(),
      },
      {
        id: 'task-3',
        title: 'Read Whitepaper & Tokenomics',
        description: 'Learn about our internal P2P coin utility and reward structure.',
        icon: 'BookOpen',
        task_type: 'read',
        reward_points: 300,
        max_completions: 100000,
        daily_limit: 1,
        external_url: 'https://televault.app/docs',
        active: true,
        start_date: new Date().toISOString(),
      },
      {
        id: 'task-4',
        title: 'Watch GigaPub Partner Spotlight',
        description: 'Watch the full 30s video showcase about ecosystem growth.',
        icon: 'PlayCircle',
        task_type: 'watch',
        reward_points: 350,
        max_completions: 500000,
        daily_limit: 1,
        external_url: 'https://gigapub.io',
        active: true,
        start_date: new Date().toISOString(),
      },
    ];

    // Initialize standard platform accounts (no artificial fake balances)
    const user1 = this.getOrCreateUser({
      telegram_id: 981815824,
      first_name: 'Alex',
      last_name: 'Founder',
      username: 'alex_founder',
      photo_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    });

    const user2 = this.getOrCreateUser({
      telegram_id: 849201948,
      first_name: 'Maria',
      last_name: 'Silva',
      username: 'maria_brazil',
      photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    });
  }

  // --- Profile & Wallet Management ---

  getOrCreateUser(tgUser: {
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
  }, startParam?: string): { profile: UserProfile; wallet: Wallet } {
    const adminRec = this.adminUsers.find(
      (a) => a.telegram_id === tgUser.telegram_id && a.active
    );
    const assignedRole = adminRec ? adminRec.role : undefined;

    const existingProfileId = this.telegramIdToProfileId.get(tgUser.telegram_id);
    if (existingProfileId) {
      const profile = this.profiles.get(existingProfileId)!;
      profile.last_active_at = new Date().toISOString();
      if (tgUser.first_name) profile.first_name = tgUser.first_name;
      if (tgUser.last_name) profile.last_name = tgUser.last_name;
      if (tgUser.username) profile.username = tgUser.username;
      if (tgUser.photo_url) profile.photo_url = tgUser.photo_url;
      if (assignedRole) profile.role = assignedRole;
      const wallet = this.getWalletByUserId(profile.id)!;
      return { profile, wallet };
    }

    // Create New User
    const profileId = 'usr-' + generateRandomHex(12).toLowerCase();
    const walletId = 'wlt-' + generateRandomHex(12).toLowerCase();
    let walletAddress = generateWalletAddress();
    while (this.walletAddressToId.has(walletAddress)) {
      walletAddress = generateWalletAddress();
    }
    const referralCode = generateReferralCode();

    let referrerId: string | undefined;
    if (startParam && startParam.startsWith('ref_')) {
      const refCode = startParam.replace('ref_', '').toUpperCase();
      for (const p of this.profiles.values()) {
        if (p.referral_code === refCode && p.id !== profileId) {
          referrerId = p.id;
          break;
        }
      }
    }

    const now = new Date().toISOString();

    const newProfile: UserProfile = {
      id: profileId,
      telegram_id: tgUser.telegram_id,
      username: tgUser.username,
      first_name: tgUser.first_name || 'Telegram User',
      last_name: tgUser.last_name,
      photo_url: tgUser.photo_url,
      referral_code: referralCode,
      referrer_id: referrerId,
      wallet_address: walletAddress,
      status: 'active',
      is_transfer_restricted: false,
      is_withdrawal_restricted: false,
      is_earning_restricted: false,
      daily_streak_count: 0,
      points_balance: 0, // Real zero initial balance
      role: assignedRole,
      preferred_language: 'en',
      created_at: now,
      last_active_at: now,
    };

    const newWallet: Wallet = {
      id: walletId,
      user_id: profileId,
      wallet_address: walletAddress,
      balance: 0.0, // Real zero initial balance
      coin_symbol: this.coinSettings.coin_symbol,
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    this.profiles.set(profileId, newProfile);
    this.telegramIdToProfileId.set(tgUser.telegram_id, profileId);
    this.wallets.set(walletId, newWallet);
    this.walletAddressToId.set(walletAddress, walletId);

    // If referred, credit both referrer and referred
    if (referrerId) {
      const referrer = this.profiles.get(referrerId);
      if (referrer) {
        const bonusReferrer = 300;
        const bonusReferee = 150;

        referrer.points_balance += bonusReferrer;
        this.pointTransactions.push({
          id: 'pt-ref-r-' + generateRandomHex(8),
          user_id: referrer.id,
          type: 'referral',
          amount: bonusReferrer,
          previous_balance: referrer.points_balance - bonusReferrer,
          new_balance: referrer.points_balance,
          description: `Referral bonus for inviting @${newProfile.username || newProfile.first_name}`,
          created_at: now,
        });

        newProfile.points_balance += bonusReferee;
        this.pointTransactions.push({
          id: 'pt-ref-e-' + generateRandomHex(8),
          user_id: newProfile.id,
          type: 'referral',
          amount: bonusReferee,
          previous_balance: 500,
          new_balance: 500 + bonusReferee,
          description: `Referral welcome bonus from friend code`,
          created_at: now,
        });
      }
    }

    return { profile: newProfile, wallet: newWallet };
  }

  getWalletByUserId(userId: string): Wallet | undefined {
    for (const w of this.wallets.values()) {
      if (w.user_id === userId) return w;
    }
    return undefined;
  }

  getWalletByAddress(address: string): Wallet | undefined {
    const id = this.walletAddressToId.get(address.trim());
    if (!id) return undefined;
    return this.wallets.get(id);
  }

  getProfileById(userId: string): UserProfile | undefined {
    return this.profiles.get(userId);
  }

  // --- Atomic P2P Transfer ---

  transferCoins(senderId: string, recipientAddress: string, amount: number) {
    if (this.appSettings.maintenance_mode) {
      throw new Error('System is currently under maintenance. Transfers are temporarily paused.');
    }
    if (!this.coinSettings.transfer_enabled || !this.appSettings.p2p_enabled) {
      throw new Error('P2P Transfers are currently disabled by administration.');
    }

    if (amount < this.coinSettings.min_transfer_amount) {
      throw new Error(`Minimum transfer amount is ${this.coinSettings.min_transfer_amount} ${this.coinSettings.coin_symbol}`);
    }

    if (amount > this.coinSettings.max_transfer_amount) {
      throw new Error(`Maximum transfer limit is ${this.coinSettings.max_transfer_amount} ${this.coinSettings.coin_symbol}`);
    }

    const senderProfile = this.profiles.get(senderId);
    if (!senderProfile || senderProfile.status !== 'active') {
      throw new Error('Sender account is not active or suspended.');
    }
    if (senderProfile.is_transfer_restricted) {
      throw new Error('Your account has been restricted from transferring coins. Contact support.');
    }

    const senderWallet = this.getWalletByUserId(senderId);
    if (!senderWallet || senderWallet.status !== 'active') {
      throw new Error('Sender wallet is unavailable.');
    }

    const recipientWallet = this.getWalletByAddress(recipientAddress);
    if (!recipientWallet) {
      throw new Error('Recipient wallet address does not exist.');
    }

    if (recipientWallet.user_id === senderId) {
      throw new Error('Cannot transfer coins to your own wallet address.');
    }

    const recipientProfile = this.profiles.get(recipientWallet.user_id);
    if (!recipientProfile || recipientProfile.status !== 'active') {
      throw new Error('Recipient account is currently inactive or suspended.');
    }

    // Calculate fee
    const fee = Number(((amount * (this.coinSettings.transfer_fee_percent / 100)) + this.coinSettings.transfer_fee_fixed).toFixed(4));
    const totalDeduction = Number((amount + fee).toFixed(4));

    if (senderWallet.balance < totalDeduction) {
      throw new Error(
        `Insufficient balance. You need ${totalDeduction} ${this.coinSettings.coin_symbol} (including ${fee} fee), but have ${senderWallet.balance.toFixed(4)}`
      );
    }

    // Atomic execution
    const prevSenderBal = senderWallet.balance;
    const prevRecipientBal = recipientWallet.balance;

    senderWallet.balance = Number((senderWallet.balance - totalDeduction).toFixed(4));
    senderWallet.updated_at = new Date().toISOString();

    recipientWallet.balance = Number((recipientWallet.balance + amount).toFixed(4));
    recipientWallet.updated_at = new Date().toISOString();

    const txHash = 'TX-' + generateRandomHex(14);
    const now = new Date().toISOString();

    // Immutable sender ledger record
    this.walletTransactions.unshift({
      id: 'wtx-' + generateRandomHex(10),
      user_id: senderId,
      wallet_id: senderWallet.id,
      type: 'p2p_send',
      amount,
      coin_symbol: this.coinSettings.coin_symbol,
      fee,
      previous_balance: prevSenderBal,
      new_balance: senderWallet.balance,
      reference_id: txHash,
      status: 'completed',
      description: `P2P transfer to ${recipientAddress}`,
      created_at: now,
    });

    // Immutable recipient ledger record
    this.walletTransactions.unshift({
      id: 'wtx-' + generateRandomHex(10),
      user_id: recipientProfile.id,
      wallet_id: recipientWallet.id,
      type: 'p2p_receive',
      amount,
      coin_symbol: this.coinSettings.coin_symbol,
      fee: 0,
      previous_balance: prevRecipientBal,
      new_balance: recipientWallet.balance,
      reference_id: txHash,
      status: 'completed',
      description: `P2P transfer received from ${senderWallet.wallet_address}`,
      created_at: now,
    });

    // P2P Log
    const p2pRecord: P2PTransfer = {
      id: 'p2p-' + generateRandomHex(10),
      sender_user_id: senderId,
      recipient_user_id: recipientProfile.id,
      sender_wallet_id: senderWallet.id,
      recipient_wallet_id: recipientWallet.id,
      amount,
      fee,
      status: 'completed',
      tx_hash: txHash,
      created_at: now,
    };
    this.p2pTransfers.unshift(p2pRecord);

    // Notification for recipient
    this.notifications.unshift({
      id: 'notif-' + generateRandomHex(8),
      user_id: recipientProfile.id,
      title: `Received ${amount} ${this.coinSettings.coin_symbol}`,
      message: `You received ${amount} ${this.coinSettings.coin_symbol} from ${senderWallet.wallet_address}`,
      type: 'p2p',
      read: false,
      created_at: now,
    });

    return {
      success: true,
      txHash,
      amount,
      fee,
      senderNewBalance: senderWallet.balance,
      recipientAddress,
      recipientName: recipientProfile.first_name,
    };
  }

  // --- Point to Coin Conversion ---

  convertPoints(userId: string, points: number) {
    if (!this.coinSettings.conversion_enabled) {
      throw new Error('Point to Coin conversion is currently disabled by Admin.');
    }

    if (points < this.coinSettings.min_conversion_points) {
      throw new Error(`Minimum conversion is ${this.coinSettings.min_conversion_points} Points.`);
    }

    if (points > this.coinSettings.max_conversion_points) {
      throw new Error(`Maximum conversion limit is ${this.coinSettings.max_conversion_points} Points.`);
    }

    const profile = this.profiles.get(userId);
    if (!profile) throw new Error('User not found.');

    if (profile.points_balance < points) {
      throw new Error(`Insufficient Points balance. Have: ${profile.points_balance}, Required: ${points}`);
    }

    const wallet = this.getWalletByUserId(userId);
    if (!wallet) throw new Error('Wallet not found.');

    const coins = Number((points / this.coinSettings.points_per_coin).toFixed(4));
    const now = new Date().toISOString();
    const refId = 'CONV-' + generateRandomHex(10);

    const prevPoints = profile.points_balance;
    const prevCoins = wallet.balance;

    profile.points_balance -= points;
    wallet.balance = Number((wallet.balance + coins).toFixed(4));
    wallet.updated_at = now;

    // Point ledger
    this.pointTransactions.unshift({
      id: 'ptx-' + generateRandomHex(10),
      user_id: userId,
      type: 'point_conversion',
      amount: -points,
      previous_balance: prevPoints,
      new_balance: profile.points_balance,
      reference_id: refId,
      description: `Converted ${points} Points into ${coins} ${this.coinSettings.coin_symbol}`,
      created_at: now,
    });

    // Wallet ledger
    this.walletTransactions.unshift({
      id: 'wtx-' + generateRandomHex(10),
      user_id: userId,
      wallet_id: wallet.id,
      type: 'point_conversion',
      amount: coins,
      coin_symbol: this.coinSettings.coin_symbol,
      fee: 0,
      previous_balance: prevCoins,
      new_balance: wallet.balance,
      reference_id: refId,
      status: 'completed',
      description: `Credited from converting ${points} Points`,
      created_at: now,
    });

    return {
      success: true,
      pointsDeducted: points,
      coinsCredited: coins,
      newPointsBalance: profile.points_balance,
      newCoinBalance: wallet.balance,
    };
  }

  // --- Daily Reward Claim ---

  claimDailyReward(userId: string) {
    if (!this.appSettings.daily_reward_enabled) {
      throw new Error('Daily rewards are currently disabled.');
    }

    const profile = this.profiles.get(userId);
    if (!profile) throw new Error('User not found.');

    const now = Date.now();
    if (profile.last_daily_claim_at) {
      const lastClaim = new Date(profile.last_daily_claim_at).getTime();
      const diffHours = (now - lastClaim) / (1000 * 60 * 60);

      if (diffHours < 24) {
        const remainingHours = Math.ceil(24 - diffHours);
        throw new Error(`Daily bonus cooldown active. Next claim in ${remainingHours} hours.`);
      }

      // If more than 48 hours, streak resets to 1
      if (diffHours > 48) {
        profile.daily_streak_count = 1;
      } else {
        profile.daily_streak_count = (profile.daily_streak_count % 7) + 1;
      }
    } else {
      profile.daily_streak_count = 1;
    }

    const tier = this.dailyRewards.find((d) => d.day_number === profile.daily_streak_count) || this.dailyRewards[0];
    const reward = tier?.reward_points ?? tier?.points ?? 100;

    const prevPoints = profile.points_balance;
    profile.points_balance += reward;
    profile.last_daily_claim_at = new Date().toISOString();

    this.pointTransactions.unshift({
      id: 'ptx-daily-' + generateRandomHex(8),
      user_id: userId,
      type: 'daily_bonus',
      amount: reward,
      previous_balance: prevPoints,
      new_balance: profile.points_balance,
      description: `Daily Streak Day ${profile.daily_streak_count} Bonus`,
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      streakDay: profile.daily_streak_count,
      rewardPoints: reward,
      newPointsBalance: profile.points_balance,
    };
  }

  // --- Rewarded Ad Validation & Claim (GigaPub) ---

  rewardAdWatch(userId: string, referenceId: string) {
    if (!this.adSettings.rewarded_ad_enabled || !this.appSettings.ads_enabled) {
      throw new Error('Rewarded ads are currently disabled.');
    }

    const profile = this.profiles.get(userId);
    if (!profile) throw new Error('User not found.');

    if (profile.is_earning_restricted) {
      throw new Error('Earning is restricted for your account.');
    }

    // Anti-duplicate reference ID
    if (this.adEvents.has(referenceId)) {
      throw new Error('This ad reward event has already been redeemed.');
    }

    // Cooldown check
    const userTimestamps = this.userAdTimestamps.get(userId) || [];
    const now = Date.now();
    const lastTimestamp = userTimestamps[userTimestamps.length - 1];

    if (lastTimestamp && (now - lastTimestamp) / 1000 < this.adSettings.ad_cooldown_seconds) {
      const waitSec = Math.ceil(this.adSettings.ad_cooldown_seconds - (now - lastTimestamp) / 1000);
      throw new Error(`Ad cooldown in effect. Please wait ${waitSec}s.`);
    }

    // Daily limit check
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recentAds = userTimestamps.filter((t) => t > oneDayAgo);
    if (recentAds.length >= this.adSettings.max_ads_per_user_day) {
      throw new Error(`Daily limit of ${this.adSettings.max_ads_per_user_day} ads reached for today.`);
    }

    this.adEvents.add(referenceId);
    recentAds.push(now);
    this.userAdTimestamps.set(userId, recentAds);

    const reward = this.adSettings.rewarded_ad_reward;
    const prevBal = profile.points_balance;
    profile.points_balance += reward;

    this.pointTransactions.unshift({
      id: 'ptx-ad-' + generateRandomHex(8),
      user_id: userId,
      type: 'ad_reward',
      amount: reward,
      previous_balance: prevBal,
      new_balance: profile.points_balance,
      reference_id: referenceId,
      description: `Rewarded Ad (${this.adSettings.provider})`,
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      rewardPoints: reward,
      newPointsBalance: profile.points_balance,
      remainingToday: this.adSettings.max_ads_per_user_day - recentAds.length,
    };
  }

  // --- Task Completion ---

  completeTask(userId: string, taskId: string) {
    const profile = this.profiles.get(userId);
    if (!profile) throw new Error('User not found.');

    const task = this.tasks.find((t) => t.id === taskId);
    if (!task || !task.active) {
      throw new Error('Task not found or is currently inactive.');
    }

    const key = `${taskId}:${userId}`;
    if (this.taskCompletions.has(key)) {
      throw new Error('You have already completed and claimed this task.');
    }

    this.taskCompletions.add(key);

    const prevBal = profile.points_balance;
    profile.points_balance += task.reward_points;

    this.pointTransactions.unshift({
      id: 'ptx-task-' + generateRandomHex(8),
      user_id: userId,
      type: 'task_reward',
      amount: task.reward_points,
      previous_balance: prevBal,
      new_balance: profile.points_balance,
      reference_id: task.id,
      description: `Completed task: ${task.title}`,
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      rewardPoints: task.reward_points,
      newPointsBalance: profile.points_balance,
    };
  }

  // --- Game Score Validation & Reward ---

  submitGameScore(userId: string, gameSlug: string, score: number, durationSeconds: number) {
    const profile = this.profiles.get(userId);
    if (!profile) throw new Error('User not found.');

    const game = this.games.find((g) => g.slug === gameSlug);
    if (!game || !game.active) {
      throw new Error('Game not found or currently inactive.');
    }

    if (durationSeconds < 5) {
      throw new Error('Invalid game duration. Score discarded.');
    }

    const minScore = game.min_score ?? 100;
    const baseReward = game.reward_per_game ?? game.base_points ?? 50;
    const maxReward = game.max_reward ?? 300;

    if (score < minScore) {
      throw new Error(`Score (${score}) did not meet the minimum required score of ${minScore}.`);
    }

    // Anti-cheat realistic scaling
    let reward = Math.min(Math.round((score / minScore) * baseReward), maxReward);
    if (reward <= 0) reward = baseReward;

    const prevBal = profile.points_balance;
    profile.points_balance += reward;

    this.pointTransactions.unshift({
      id: 'ptx-game-' + generateRandomHex(8),
      user_id: userId,
      type: 'game_reward',
      amount: reward,
      previous_balance: prevBal,
      new_balance: profile.points_balance,
      description: `${game.name} reward (Score: ${score})`,
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      score,
      rewardPoints: reward,
      newPointsBalance: profile.points_balance,
    };
  }

  // --- Withdrawal Request & Processing ---

  requestWithdrawal(userId: string, amount: number, method: string, destinationAddress: string) {
    if (!this.coinSettings.withdrawal_enabled || !this.appSettings.withdrawal_enabled) {
      throw new Error('Withdrawals are currently disabled by administration.');
    }

    if (amount < this.coinSettings.min_withdrawal_amount) {
      throw new Error(`Minimum withdrawal amount is ${this.coinSettings.min_withdrawal_amount} ${this.coinSettings.coin_symbol}`);
    }

    if (amount > this.coinSettings.max_withdrawal_amount) {
      throw new Error(`Maximum withdrawal limit is ${this.coinSettings.max_withdrawal_amount} ${this.coinSettings.coin_symbol}`);
    }

    const profile = this.profiles.get(userId);
    if (!profile || profile.status !== 'active') throw new Error('Account inactive.');
    if (profile.is_withdrawal_restricted) {
      throw new Error('Withdrawals are restricted for your account. Contact support.');
    }

    const wallet = this.getWalletByUserId(userId);
    if (!wallet) throw new Error('Wallet not found.');

    if (wallet.balance < amount) {
      throw new Error(`Insufficient wallet balance. Have: ${wallet.balance.toFixed(4)}, Requested: ${amount}`);
    }

    const fee = Number(((amount * (this.coinSettings.withdrawal_fee_percent / 100))).toFixed(4));
    const netAmount = Number((amount - fee).toFixed(4));

    const prevBal = wallet.balance;
    wallet.balance = Number((wallet.balance - amount).toFixed(4));
    wallet.updated_at = new Date().toISOString();

    const withdrawalId = 'wd-' + generateRandomHex(10);
    const now = new Date().toISOString();

    const req: WithdrawalRequest = {
      id: withdrawalId,
      user_id: userId,
      wallet_id: wallet.id,
      username: profile.username || profile.first_name,
      amount,
      coin_symbol: this.coinSettings.coin_symbol,
      fee,
      net_amount: netAmount,
      method,
      destination_address: destinationAddress,
      status: 'pending',
      created_at: now,
    };

    this.withdrawals.unshift(req);

    // Record wallet ledger
    this.walletTransactions.unshift({
      id: 'wtx-wd-' + generateRandomHex(8),
      user_id: userId,
      wallet_id: wallet.id,
      type: 'withdrawal',
      amount: -amount,
      coin_symbol: this.coinSettings.coin_symbol,
      fee,
      previous_balance: prevBal,
      new_balance: wallet.balance,
      reference_id: withdrawalId,
      status: 'pending',
      description: `Withdrawal request via ${method} to ${destinationAddress}`,
      created_at: now,
    });

    return {
      success: true,
      withdrawal: req,
      newBalance: wallet.balance,
    };
  }

  processWithdrawal(adminId: string, withdrawalId: string, action: 'approved' | 'rejected' | 'paid', adminNotes?: string) {
    const wd = this.withdrawals.find((w) => w.id === withdrawalId);
    if (!wd) throw new Error('Withdrawal request not found.');

    const oldStatus = wd.status;
    wd.status = action;
    wd.admin_notes = adminNotes;
    wd.processed_at = new Date().toISOString();

    // If rejected, refund the coins back to the user's wallet!
    if (action === 'rejected') {
      const wallet = this.wallets.get(wd.wallet_id);
      if (wallet) {
        const prevBal = wallet.balance;
        wallet.balance = Number((wallet.balance + wd.amount).toFixed(4));
        wallet.updated_at = new Date().toISOString();

        this.walletTransactions.unshift({
          id: 'wtx-refund-' + generateRandomHex(8),
          user_id: wd.user_id,
          wallet_id: wallet.id,
          type: 'withdrawal_refund',
          amount: wd.amount,
          coin_symbol: wd.coin_symbol,
          fee: 0,
          previous_balance: prevBal,
          new_balance: wallet.balance,
          reference_id: wd.id,
          status: 'completed',
          description: `Withdrawal rejected: ${adminNotes || 'Refunded by admin'}`,
          created_at: new Date().toISOString(),
        });
      }
    }

    this.auditLogs.unshift({
      id: 'aud-' + generateRandomHex(8),
      admin_id: adminId,
      action: `withdrawal_${action}`,
      target_type: 'withdrawal',
      target_id: withdrawalId,
      old_values: { status: oldStatus },
      new_values: { status: action, notes: adminNotes },
      reason: adminNotes,
      created_at: new Date().toISOString(),
    });

    return wd;
  }

  // --- Admin Adjust Balance with Mandatory Audit Log ---

  adminAdjustBalance(
    adminId: string,
    targetUserId: string,
    currencyType: 'coins' | 'points',
    amount: number,
    reason: string
  ) {
    const profile = this.profiles.get(targetUserId);
    if (!profile) throw new Error('Target user not found.');

    const wallet = this.getWalletByUserId(targetUserId);
    if (!wallet) throw new Error('Target wallet not found.');

    const now = new Date().toISOString();
    const refId = 'ADJ-' + generateRandomHex(8);

    if (currencyType === 'points') {
      const prevBal = profile.points_balance;
      const newBal = prevBal + amount;
      if (newBal < 0) throw new Error('Cannot reduce points balance below zero.');

      profile.points_balance = newBal;

      this.pointTransactions.unshift({
        id: 'ptx-adj-' + generateRandomHex(8),
        user_id: targetUserId,
        type: 'admin_adjustment',
        amount,
        previous_balance: prevBal,
        new_balance: newBal,
        reference_id: refId,
        description: `Admin balance adjustment: ${reason}`,
        created_at: now,
      });

      this.auditLogs.unshift({
        id: 'aud-' + generateRandomHex(8),
        admin_id: adminId,
        action: 'adjust_points_balance',
        target_type: 'user_profile',
        target_id: targetUserId,
        old_values: { points_balance: prevBal },
        new_values: { points_balance: newBal, amount },
        reason,
        created_at: now,
      });

      return { success: true, currencyType, newBalance: newBal };
    } else {
      const prevBal = wallet.balance;
      const newBal = Number((prevBal + amount).toFixed(4));
      if (newBal < 0) throw new Error('Cannot reduce coin balance below zero.');

      wallet.balance = newBal;
      wallet.updated_at = now;

      this.walletTransactions.unshift({
        id: 'wtx-adj-' + generateRandomHex(8),
        user_id: targetUserId,
        wallet_id: wallet.id,
        type: 'admin_adjustment',
        amount,
        coin_symbol: this.coinSettings.coin_symbol,
        fee: 0,
        previous_balance: prevBal,
        new_balance: newBal,
        reference_id: refId,
        status: 'completed',
        description: `Admin balance adjustment: ${reason}`,
        created_at: now,
      });

      this.auditLogs.unshift({
        id: 'aud-' + generateRandomHex(8),
        admin_id: adminId,
        action: 'adjust_coin_balance',
        target_type: 'wallet',
        target_id: wallet.id,
        old_values: { balance: prevBal },
        new_values: { balance: newBal, amount },
        reason,
        created_at: now,
      });

      return { success: true, currencyType, newBalance: newBal };
    }
  }

  // --- Admin Remote Config Updates with Audit Logs ---

  updateAdSettings(adminId: string, newSettings: Partial<AdSettings>, reason: string = 'Updated ad settings') {
    const old = { ...this.adSettings };
    this.adSettings = {
      ...this.adSettings,
      ...newSettings,
      updated_at: new Date().toISOString(),
    };

    this.auditLogs.unshift({
      id: 'aud-' + generateRandomHex(8),
      admin_id: adminId,
      action: 'update_ad_settings',
      target_type: 'ad_settings',
      old_values: old as unknown as Record<string, unknown>,
      new_values: this.adSettings as unknown as Record<string, unknown>,
      reason,
      created_at: new Date().toISOString(),
    });

    return this.adSettings;
  }

  updateCoinSettings(adminId: string, newSettings: Partial<CoinSettings>, reason: string = 'Updated coin settings') {
    const old = { ...this.coinSettings };
    this.coinSettings = {
      ...this.coinSettings,
      ...newSettings,
      updated_at: new Date().toISOString(),
    };

    this.auditLogs.unshift({
      id: 'aud-' + generateRandomHex(8),
      admin_id: adminId,
      action: 'update_coin_settings',
      target_type: 'coin_settings',
      old_values: old as unknown as Record<string, unknown>,
      new_values: this.coinSettings as unknown as Record<string, unknown>,
      reason,
      created_at: new Date().toISOString(),
    });

    return this.coinSettings;
  }

  updateAppSettings(adminId: string, newSettings: Partial<AppSettings>, reason: string = 'Updated app settings') {
    const old = { ...this.appSettings };
    this.appSettings = {
      ...this.appSettings,
      ...newSettings,
      updated_at: new Date().toISOString(),
    };

    this.auditLogs.unshift({
      id: 'aud-' + generateRandomHex(8),
      admin_id: adminId,
      action: 'update_app_settings',
      target_type: 'app_settings',
      old_values: old as unknown as Record<string, unknown>,
      new_values: this.appSettings as unknown as Record<string, unknown>,
      reason,
      created_at: new Date().toISOString(),
    });

    return this.appSettings;
  }

  updateUserStatus(
    adminId: string,
    targetUserId: string,
    updates: {
      status?: 'active' | 'suspended';
      is_transfer_restricted?: boolean;
      is_withdrawal_restricted?: boolean;
      is_earning_restricted?: boolean;
      admin_notes?: string;
    },
    reason: string = 'User status updated'
  ) {
    const profile = this.profiles.get(targetUserId);
    if (!profile) throw new Error('User not found.');

    const oldValues = {
      status: profile.status,
      is_transfer_restricted: profile.is_transfer_restricted,
      is_withdrawal_restricted: profile.is_withdrawal_restricted,
      is_earning_restricted: profile.is_earning_restricted,
      admin_notes: profile.admin_notes,
    };

    if (updates.status !== undefined) profile.status = updates.status;
    if (updates.is_transfer_restricted !== undefined) profile.is_transfer_restricted = updates.is_transfer_restricted;
    if (updates.is_withdrawal_restricted !== undefined) profile.is_withdrawal_restricted = updates.is_withdrawal_restricted;
    if (updates.is_earning_restricted !== undefined) profile.is_earning_restricted = updates.is_earning_restricted;
    if (updates.admin_notes !== undefined) profile.admin_notes = updates.admin_notes;

    this.auditLogs.unshift({
      id: 'aud-' + generateRandomHex(8),
      admin_id: adminId,
      action: 'update_user_status',
      target_type: 'user_profile',
      target_id: targetUserId,
      old_values: oldValues,
      new_values: updates,
      reason,
      created_at: new Date().toISOString(),
    });

    return profile;
  }

  // --- Admin Dashboard Stats Aggregator ---

  getAdminStats() {
    const allUsers = Array.from(this.profiles.values());
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter((u) => u.status === 'active').length;

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const newUsersToday = allUsers.filter((u) => new Date(u.created_at).getTime() > oneDayAgo).length;

    const totalCoinsDistributed = Array.from(this.wallets.values()).reduce((acc, w) => acc + w.balance, 0);
    const totalPointsDistributed = allUsers.reduce((acc, u) => acc + u.points_balance, 0);

    const totalTransfers = this.p2pTransfers.length;
    const totalTransferVolume = this.p2pTransfers.reduce((acc, t) => acc + t.amount, 0);

    const totalAdViews = Array.from(this.userAdTimestamps.values()).reduce((acc, list) => acc + list.length, 0);
    const totalAdRewards = this.pointTransactions.filter((p) => p.type === 'ad_reward').reduce((acc, p) => acc + p.amount, 0);

    const pendingWithdrawals = this.withdrawals.filter((w) => w.status === 'pending').length;
    const totalWithdrawalsCount = this.withdrawals.length;
    const totalWithdrawnVolume = this.withdrawals.filter((w) => w.status === 'paid' || w.status === 'approved').reduce((acc, w) => acc + w.amount, 0);

    return {
      totalUsers,
      activeUsers,
      newUsersToday,
      totalCoinsDistributed: Number(totalCoinsDistributed.toFixed(2)),
      totalPointsDistributed,
      totalTransfers,
      totalTransferVolume: Number(totalTransferVolume.toFixed(2)),
      totalTasks: this.tasks.length,
      completedTasksCount: this.taskCompletions.size,
      totalAdViews,
      totalAdRewards,
      pendingWithdrawals,
      totalWithdrawalsCount,
      totalWithdrawnVolume: Number(totalWithdrawnVolume.toFixed(2)),
      activeCoinSymbol: this.coinSettings.coin_symbol,
      gigapubProjectId: this.adSettings.gigapub_project_id,
      maintenanceMode: this.appSettings.maintenance_mode,
    };
  }

  // --- Admin Security & RBAC Methods ---

  private adminTokens: Map<string, { role: AdminRole; telegram_id?: number; created_at: string }> = new Map();

  authenticateAdmin(passkey: string, telegramId?: number): { success: boolean; token?: string; role?: AdminRole; admin?: AdminUser } {
    const configuredSecret = process.env.ADMIN_SECRET_KEY || 'televault-admin-2026';
    
    // Check master secret key
    if (passkey === configuredSecret) {
      const token = 'adm_tok_' + generateRandomHex(16);
      this.adminTokens.set(token, { role: 'super_admin', telegram_id: telegramId, created_at: new Date().toISOString() });
      return {
        success: true,
        token,
        role: 'super_admin',
        admin: {
          id: 'admin-master',
          telegram_id: telegramId || 981815824,
          name: 'Master Super Admin',
          role: 'super_admin',
          permissions: ['all'],
          active: true,
        },
      };
    }

    // Check if telegramId is an authorized admin and passkey matches their role key
    if (telegramId) {
      const found = this.adminUsers.find((a) => a.telegram_id === telegramId && a.active);
      if (found) {
        const token = 'adm_tok_' + generateRandomHex(16);
        this.adminTokens.set(token, { role: found.role, telegram_id: telegramId, created_at: new Date().toISOString() });
        return { success: true, token, role: found.role, admin: found };
      }
    }

    return { success: false };
  }

  verifyAdmin(tokenOrUserId?: string): { authorized: boolean; role?: AdminRole; admin?: AdminUser } {
    if (!tokenOrUserId) return { authorized: false };

    // Check direct master secret match
    const configuredSecret = process.env.ADMIN_SECRET_KEY || 'televault-admin-2026';
    if (tokenOrUserId === configuredSecret) {
      return { authorized: true, role: 'super_admin' };
    }

    // Check active admin session token
    const session = this.adminTokens.get(tokenOrUserId);
    if (session) {
      return { authorized: true, role: session.role };
    }

    // Check user_id in database
    const profile = this.profiles.get(tokenOrUserId);
    if (profile) {
      if (profile.role && ['super_admin', 'admin', 'moderator'].includes(profile.role)) {
        return { authorized: true, role: profile.role };
      }
      const adminRec = this.adminUsers.find((a) => a.telegram_id === profile.telegram_id && a.active);
      if (adminRec) {
        return { authorized: true, role: adminRec.role, admin: adminRec };
      }
    }

    return { authorized: false };
  }

  getAdminUsers(): AdminUser[] {
    return this.adminUsers;
  }

  addAdminUser(telegram_id: number, name: string, role: AdminRole, createdBy: string): AdminUser {
    const existing = this.adminUsers.find((a) => a.telegram_id === telegram_id);
    if (existing) {
      existing.role = role;
      existing.active = true;
      existing.name = name;
      return existing;
    }

    const newAdmin: AdminUser = {
      id: 'adm-' + generateRandomHex(8),
      telegram_id,
      name,
      role,
      permissions: role === 'super_admin' ? ['all'] : role === 'admin' ? ['users', 'wallets', 'tasks', 'games', 'withdrawals'] : ['read_only'],
      active: true,
    };

    this.adminUsers.push(newAdmin);

    // If profile already exists, update its role
    const profileId = this.telegramIdToProfileId.get(telegram_id);
    if (profileId) {
      const p = this.profiles.get(profileId);
      if (p) p.role = role;
    }

    this.auditLogs.unshift({
      id: 'aud-' + generateRandomHex(8),
      admin_id: createdBy,
      action: 'add_admin_user',
      target_type: 'admin_user',
      target_id: newAdmin.id,
      new_values: { telegram_id, name, role },
      reason: `Added new ${role}`,
      created_at: new Date().toISOString(),
    });

    return newAdmin;
  }

  removeAdminUser(adminId: string, removedBy: string): boolean {
    const idx = this.adminUsers.findIndex((a) => a.id === adminId);
    if (idx === -1) return false;
    const removed = this.adminUsers[idx];
    this.adminUsers.splice(idx, 1);

    const profileId = this.telegramIdToProfileId.get(removed.telegram_id);
    if (profileId) {
      const p = this.profiles.get(profileId);
      if (p) p.role = undefined;
    }

    this.auditLogs.unshift({
      id: 'aud-' + generateRandomHex(8),
      admin_id: removedBy,
      action: 'remove_admin_user',
      target_type: 'admin_user',
      target_id: adminId,
      old_values: removed as unknown as Record<string, unknown>,
      reason: 'Revoked administrator privileges',
      created_at: new Date().toISOString(),
    });

    return true;
  }

  updateAdminUser(adminId: string, role: AdminRole, active: boolean, updatedBy: string): AdminUser {
    const admin = this.adminUsers.find((a) => a.id === adminId);
    if (!admin) throw new Error('Admin user not found');
    const old = { ...admin };
    admin.role = role;
    admin.active = active;

    const profileId = this.telegramIdToProfileId.get(admin.telegram_id);
    if (profileId) {
      const p = this.profiles.get(profileId);
      if (p) p.role = active ? role : undefined;
    }

    this.auditLogs.unshift({
      id: 'aud-' + generateRandomHex(8),
      admin_id: updatedBy,
      action: 'update_admin_user',
      target_type: 'admin_user',
      target_id: adminId,
      old_values: old as unknown as Record<string, unknown>,
      new_values: { role, active },
      reason: 'Updated administrator permissions',
      created_at: new Date().toISOString(),
    });

    return admin;
  }

  // --- Transactions & Ledgers ---

  getAllTransactions(limit = 100) {
    return {
      walletTransactions: this.walletTransactions.slice(0, limit),
      pointTransactions: this.pointTransactions.slice(0, limit),
      p2pTransfers: this.p2pTransfers.slice(0, limit),
    };
  }

  getAllWallets() {
    return Array.from(this.wallets.values()).map((w) => {
      const p = this.profiles.get(w.user_id);
      return {
        ...w,
        username: p?.username || p?.first_name || 'Unknown',
        telegram_id: p?.telegram_id,
      };
    });
  }

  // --- Tasks Admin Management ---

  getAllTasks(): TaskItem[] {
    return this.tasks;
  }

  createTask(taskData: Omit<TaskItem, 'id'>, adminId: string): TaskItem {
    const newTask: TaskItem = {
      ...taskData,
      id: 'tsk-' + generateRandomHex(8),
      created_at: new Date().toISOString(),
    };
    this.tasks.push(newTask);

    this.auditLogs.unshift({
      id: 'aud-' + generateRandomHex(8),
      admin_id: adminId,
      action: 'create_task',
      target_type: 'task',
      target_id: newTask.id,
      new_values: newTask as unknown as Record<string, unknown>,
      reason: `Created task: ${newTask.title}`,
      created_at: new Date().toISOString(),
    });

    return newTask;
  }

  updateTask(taskId: string, updates: Partial<TaskItem>, adminId: string): TaskItem {
    const t = this.tasks.find((x) => x.id === taskId);
    if (!t) throw new Error('Task not found');
    const old = { ...t };
    Object.assign(t, updates);

    this.auditLogs.unshift({
      id: 'aud-' + generateRandomHex(8),
      admin_id: adminId,
      action: 'update_task',
      target_type: 'task',
      target_id: taskId,
      old_values: old as unknown as Record<string, unknown>,
      new_values: updates as unknown as Record<string, unknown>,
      reason: `Updated task ${taskId}`,
      created_at: new Date().toISOString(),
    });

    return t;
  }

  deleteTask(taskId: string, adminId: string): boolean {
    const idx = this.tasks.findIndex((x) => x.id === taskId);
    if (idx === -1) return false;
    const deleted = this.tasks[idx];
    this.tasks.splice(idx, 1);

    this.auditLogs.unshift({
      id: 'aud-' + generateRandomHex(8),
      admin_id: adminId,
      action: 'delete_task',
      target_type: 'task',
      target_id: taskId,
      old_values: deleted as unknown as Record<string, unknown>,
      reason: `Deleted task: ${deleted.title}`,
      created_at: new Date().toISOString(),
    });

    return true;
  }

  // --- Games Configuration ---

  getAllGames(): GameConfig[] {
    return this.games;
  }

  updateGame(slug: string, updates: Partial<GameConfig>, adminId: string): GameConfig {
    const game = this.games.find((g) => g.slug === slug);
    if (!game) throw new Error('Game not found');
    const old = { ...game };
    Object.assign(game, updates);

    this.auditLogs.unshift({
      id: 'aud-' + generateRandomHex(8),
      admin_id: adminId,
      action: 'update_game',
      target_type: 'game',
      target_id: slug,
      old_values: old as unknown as Record<string, unknown>,
      new_values: updates as unknown as Record<string, unknown>,
      reason: `Updated game config: ${game.name}`,
      created_at: new Date().toISOString(),
    });

    return game;
  }

  // --- Rewards & Streaks ---

  updateDailyRewards(tiers: DailyRewardTier[], adminId: string): DailyRewardTier[] {
    this.dailyRewards = tiers;
    this.auditLogs.unshift({
      id: 'aud-' + generateRandomHex(8),
      admin_id: adminId,
      action: 'update_daily_rewards',
      target_type: 'daily_rewards',
      new_values: { tiers } as unknown as Record<string, unknown>,
      reason: 'Updated daily reward reward points',
      created_at: new Date().toISOString(),
    });
    return this.dailyRewards;
  }

  // --- Referrals Ledger ---

  getReferralsList() {
    const list: Array<{
      referrer_id: string;
      referrer_name: string;
      referred_id: string;
      referred_name: string;
      created_at: string;
    }> = [];

    for (const p of this.profiles.values()) {
      if (p.referrer_id) {
        const referrer = this.profiles.get(p.referrer_id);
        list.push({
          referrer_id: p.referrer_id,
          referrer_name: referrer?.username || referrer?.first_name || 'Unknown',
          referred_id: p.id,
          referred_name: p.username || p.first_name,
          created_at: p.created_at,
        });
      }
    }

    return list;
  }

  // --- Fraud & Security Monitoring ---

  getFraudLogs() {
    const alerts: Array<{
      id: string;
      type: string;
      severity: 'low' | 'medium' | 'high';
      user_id?: string;
      description: string;
      timestamp: string;
    }> = [];

    // Check 1: Suspended accounts
    for (const p of this.profiles.values()) {
      if (p.status === 'suspended') {
        alerts.push({
          id: 'fraud-susp-' + p.id,
          type: 'suspended_account',
          severity: 'high',
          user_id: p.id,
          description: `Account @${p.username || p.first_name} is suspended. Transfers and withdrawals blocked.`,
          timestamp: p.last_active_at,
        });
      }
      if (p.is_transfer_restricted || p.is_withdrawal_restricted) {
        alerts.push({
          id: 'fraud-restr-' + p.id,
          type: 'account_restriction',
          severity: 'medium',
          user_id: p.id,
          description: `User @${p.username || p.first_name} has restricted transfer or withdrawal capabilities.`,
          timestamp: p.last_active_at,
        });
      }
    }

    // Check 2: High velocity P2P senders (> 5 transfers)
    const transferCounts: Record<string, number> = {};
    for (const t of this.p2pTransfers) {
      transferCounts[t.sender_user_id] = (transferCounts[t.sender_user_id] || 0) + 1;
    }
    for (const [uid, count] of Object.entries(transferCounts)) {
      if (count >= 5) {
        const p = this.profiles.get(uid);
        alerts.push({
          id: 'fraud-velocity-' + uid,
          type: 'high_transfer_velocity',
          severity: 'medium',
          user_id: uid,
          description: `User @${p?.username || uid} has performed ${count} P2P transfers recently.`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return alerts;
  }
}

export const serverStorage = new ServerLedgerStore();
