import express from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { serverStorage } from './src/services/storage.ts';
import { initTelegramBot, getBotWebhookMiddleware } from './src/bot/telegramBot.ts';

dotenv.config();

const PORT = 3000;

function validateTelegramWebAppData(initData: string, botToken: string): { valid: boolean; user?: any } {
  if (!initData) return { valid: false };
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { valid: false };

    params.delete('hash');
    const sortedKeys = Array.from(params.keys()).sort();
    const dataCheckString = sortedKeys.map((key) => `${key}=${params.get(key)}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash === hash) {
      const userStr = params.get('user');
      const user = userStr ? JSON.parse(userStr) : null;
      return { valid: true, user };
    }
  } catch (err) {
    console.error('Error validating Telegram initData:', err);
  }
  return { valid: false };
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Global CORS Middleware - Ensures browser/iframe fetch requests succeed with custom headers
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, x-admin-token, x-user-id, x-requested-with, Accept, Origin'
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // Initialize bot if token is configured
  initTelegramBot();

  // --- API Routes ---

  // Health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      coin: serverStorage.coinSettings.coin_name,
      maintenance: serverStorage.appSettings.maintenance_mode,
    });
  });

  // Public Configuration (No secrets exposed)
  app.get('/api/config', (req, res) => {
    res.json({
      appSettings: serverStorage.appSettings,
      coinSettings: serverStorage.coinSettings,
      adSettings: {
        provider: serverStorage.adSettings.provider,
        gigapub_enabled: serverStorage.adSettings.gigapub_enabled,
        gigapub_project_id: serverStorage.adSettings.gigapub_project_id,
        rewarded_ad_enabled: serverStorage.adSettings.rewarded_ad_enabled,
        rewarded_ad_reward: serverStorage.adSettings.rewarded_ad_reward,
        ad_cooldown_seconds: serverStorage.adSettings.ad_cooldown_seconds,
        max_ads_per_user_day: serverStorage.adSettings.max_ads_per_user_day,
        offerwall_enabled: serverStorage.adSettings.offerwall_enabled,
      },
      dailyRewards: serverStorage.dailyRewards,
    });
  });

  // Telegram User Auth & Auto-Registration
  app.post('/api/auth/telegram', (req, res) => {
    try {
      const { initData, telegramUser, startParam } = req.body;
      let tgUser: any = null;

      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (initData && botToken && !botToken.includes('MY_BOT_TOKEN')) {
        const validation = validateTelegramWebAppData(initData, botToken);
        if (validation.valid && validation.user) {
          tgUser = {
            telegram_id: validation.user.id,
            first_name: validation.user.first_name,
            last_name: validation.user.last_name,
            username: validation.user.username,
            photo_url: validation.user.photo_url,
          };
        }
      }

      // If initData is passed from real Telegram WebApp and contains user parameter
      if (!tgUser && initData) {
        try {
          const params = new URLSearchParams(initData);
          const userStr = params.get('user');
          if (userStr) {
            const parsed = JSON.parse(userStr);
            if (parsed && parsed.id) {
              tgUser = {
                telegram_id: parsed.id,
                first_name: parsed.first_name,
                last_name: parsed.last_name,
                username: parsed.username,
                photo_url: parsed.photo_url,
              };
            }
          }
        } catch {
          // ignore
        }
      }

      // If client provided telegramUser directly from Telegram WebApp
      if (!tgUser && telegramUser && telegramUser.id) {
        tgUser = {
          telegram_id: telegramUser.id,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          username: telegramUser.username,
          photo_url: telegramUser.photo_url,
        };
      }

      // Fallback for standalone browser outside Telegram
      if (!tgUser) {
        tgUser = {
          telegram_id: 100000001,
          first_name: 'Telegram User',
          username: 'telegram_user',
          photo_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        };
      }

      const { profile, wallet } = serverStorage.getOrCreateUser(tgUser, startParam);
      res.json({
        success: true,
        profile,
        wallet,
        coinSettings: serverStorage.coinSettings,
        adSettings: serverStorage.adSettings,
        appSettings: serverStorage.appSettings,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Authentication error' });
    }
  });

  // User Current State
  app.get('/api/user/me', (req, res) => {
    try {
      const userId = (req.headers['x-user-id'] as string) || '';
      const profile = serverStorage.getProfileById(userId);
      if (!profile) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      const wallet = serverStorage.getWalletByUserId(userId);
      const userWalletTx = serverStorage.walletTransactions.filter((tx) => tx.user_id === userId).slice(0, 30);
      const userPointTx = serverStorage.pointTransactions.filter((tx) => tx.user_id === userId).slice(0, 30);
      const userNotifs = serverStorage.notifications.filter((n) => n.user_id === userId);

      res.json({
        profile,
        wallet,
        walletTransactions: userWalletTx,
        pointTransactions: userPointTx,
        notifications: userNotifs,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Verify Recipient Address lookup (for P2P send)
  app.get('/api/wallet/lookup', (req, res) => {
    try {
      const address = (req.query.address as string) || '';
      const wallet = serverStorage.getWalletByAddress(address);
      if (!wallet) {
        return res.status(404).json({ found: false, error: 'Wallet address not found' });
      }

      const profile = serverStorage.getProfileById(wallet.user_id);
      res.json({
        found: true,
        wallet_address: wallet.wallet_address,
        first_name: profile?.first_name || 'User',
        username: profile?.username,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // P2P Transfer (Atomic Server-Side Transaction)
  app.post('/api/wallet/transfer', (req, res) => {
    try {
      const userId = (req.headers['x-user-id'] as string) || '';
      const { recipientAddress, amount } = req.body;

      if (!recipientAddress || !amount || isNaN(Number(amount))) {
        return res.status(400).json({ error: 'Recipient address and valid amount required.' });
      }

      const result = serverStorage.transferCoins(userId, recipientAddress, Number(amount));
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Transfer failed' });
    }
  });

  // Point to Coin Conversion
  app.post('/api/points/convert', (req, res) => {
    try {
      const userId = (req.headers['x-user-id'] as string) || '';
      const { points } = req.body;

      if (!points || isNaN(Number(points)) || Number(points) <= 0) {
        return res.status(400).json({ error: 'Valid points amount required.' });
      }

      const result = serverStorage.convertPoints(userId, Math.floor(Number(points)));
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Conversion failed' });
    }
  });

  // Daily Bonus Claim
  app.post('/api/daily/claim', (req, res) => {
    try {
      const userId = (req.headers['x-user-id'] as string) || '';
      const result = serverStorage.claimDailyReward(userId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Claim failed' });
    }
  });

  // Rewarded Ad Validation & Reward Credit (GigaPub)
  app.post('/api/ads/reward', (req, res) => {
    try {
      const userId = (req.headers['x-user-id'] as string) || '';
      const { referenceId } = req.body;

      if (!referenceId) {
        return res.status(400).json({ error: 'Ad verification reference token missing.' });
      }

      const result = serverStorage.rewardAdWatch(userId, referenceId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Ad reward validation failed' });
    }
  });

  // Tasks List
  app.get('/api/tasks', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || '';
    const tasksWithStatus = serverStorage.tasks.map((t) => ({
      ...t,
      completed: serverStorage.taskCompletions.has(`${t.id}:${userId}`),
    }));
    res.json(tasksWithStatus);
  });

  // Complete Task
  app.post('/api/tasks/complete', (req, res) => {
    try {
      const userId = (req.headers['x-user-id'] as string) || '';
      const { taskId } = req.body;
      const result = serverStorage.completeTask(userId, taskId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Task completion failed' });
    }
  });

  // Games List
  app.get('/api/games', (req, res) => {
    res.json(serverStorage.games);
  });

  // Game Score Submission with Server-side Anti-Cheat
  app.post('/api/games/submit', (req, res) => {
    try {
      const userId = (req.headers['x-user-id'] as string) || '';
      const { gameSlug, score, durationSeconds } = req.body;

      const result = serverStorage.submitGameScore(userId, gameSlug, Number(score), Number(durationSeconds));
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Game score submission failed' });
    }
  });

  // Withdrawal Request
  app.post('/api/withdrawals/request', (req, res) => {
    try {
      const userId = (req.headers['x-user-id'] as string) || '';
      const { amount, method, destinationAddress } = req.body;

      if (!amount || !method || !destinationAddress) {
        return res.status(400).json({ error: 'Amount, method, and destination address are required.' });
      }

      const result = serverStorage.requestWithdrawal(userId, Number(amount), method, destinationAddress);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Withdrawal request failed' });
    }
  });

  // --- Admin Authentication & API Routes ---

  // Admin Auth Login (Verifies secret passkey or Telegram admin account)
  app.post('/api/admin/auth', (req, res) => {
    try {
      const { passkey, telegramId } = req.body;
      if (!passkey) {
        return res.status(400).json({ error: 'Admin passkey is required.' });
      }
      const result = serverStorage.authenticateAdmin(passkey, telegramId ? Number(telegramId) : undefined);
      if (!result.success) {
        return res.status(401).json({ error: 'Invalid administrator credentials.' });
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Authentication Middleware
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const adminToken = (req.headers['x-admin-token'] as string) || '';
    const userId = (req.headers['x-user-id'] as string) || '';

    let verification = serverStorage.verifyAdmin(adminToken);
    if (!verification.authorized && userId) {
      verification = serverStorage.verifyAdmin(userId);
    }

    if (!verification.authorized) {
      return res.status(403).json({ error: 'Access denied. Authorized administrators only.' });
    }
    (req as any).adminRole = verification.role || 'admin';
    (req as any).adminUser = verification.admin;
    next();
  };

  // Admin Dashboard
  app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
    res.json(serverStorage.getAdminStats());
  });

  // Admin Users List
  app.get('/api/admin/users', requireAdmin, (req, res) => {
    const search = ((req.query.search as string) || '').toLowerCase().trim();
    let users = Array.from(serverStorage.profiles.values());

    if (search) {
      users = users.filter((u) => {
        return (
          u.first_name.toLowerCase().includes(search) ||
          (u.username && u.username.toLowerCase().includes(search)) ||
          u.telegram_id.toString().includes(search) ||
          u.wallet_address.toLowerCase().includes(search)
        );
      });
    }

    const enhancedUsers = users.map((u) => {
      const wallet = serverStorage.getWalletByUserId(u.id);
      return {
        ...u,
        wallet_balance: wallet?.balance || 0,
      };
    });

    res.json(enhancedUsers);
  });

  // Admin Wallets List
  app.get('/api/admin/wallets', requireAdmin, (req, res) => {
    res.json(serverStorage.getAllWallets());
  });

  // Admin All Transactions
  app.get('/api/admin/transactions', requireAdmin, (req, res) => {
    const limit = Number(req.query.limit) || 100;
    res.json(serverStorage.getAllTransactions(limit));
  });

  // Admin Tasks Management
  app.get('/api/admin/tasks', requireAdmin, (req, res) => {
    res.json(serverStorage.getAllTasks());
  });

  app.post('/api/admin/tasks', requireAdmin, (req, res) => {
    try {
      const task = serverStorage.createTask(req.body, 'admin');
      res.json({ success: true, task });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/admin/tasks/:id', requireAdmin, (req, res) => {
    try {
      const updated = serverStorage.updateTask(req.params.id, req.body, 'admin');
      res.json({ success: true, task: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/admin/tasks/:id', requireAdmin, (req, res) => {
    try {
      const deleted = serverStorage.deleteTask(req.params.id, 'admin');
      res.json({ success: deleted });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin Games Configuration
  app.get('/api/admin/games', requireAdmin, (req, res) => {
    res.json(serverStorage.getAllGames());
  });

  app.post('/api/admin/games/update', requireAdmin, (req, res) => {
    try {
      const { slug, updates } = req.body;
      const game = serverStorage.updateGame(slug, updates, 'admin');
      res.json({ success: true, game });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin Daily Rewards Configuration
  app.get('/api/admin/rewards/daily', requireAdmin, (req, res) => {
    res.json(serverStorage.dailyRewards);
  });

  app.post('/api/admin/rewards/daily', requireAdmin, (req, res) => {
    try {
      const { tiers } = req.body;
      const updated = serverStorage.updateDailyRewards(tiers, 'admin');
      res.json({ success: true, tiers: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin Referrals List
  app.get('/api/admin/referrals', requireAdmin, (req, res) => {
    res.json(serverStorage.getReferralsList());
  });

  // Admin Fraud & Security Logs
  app.get('/api/admin/fraud', requireAdmin, (req, res) => {
    res.json(serverStorage.getFraudLogs());
  });

  // Admin User Management (Roles & Staff)
  app.get('/api/admin/admins', requireAdmin, (req, res) => {
    res.json(serverStorage.getAdminUsers());
  });

  app.post('/api/admin/admins/add', requireAdmin, (req, res) => {
    try {
      const { telegram_id, name, role } = req.body;
      const admin = serverStorage.addAdminUser(Number(telegram_id), name, role, 'super_admin');
      res.json({ success: true, admin });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/admin/admins/:id', requireAdmin, (req, res) => {
    try {
      const ok = serverStorage.removeAdminUser(req.params.id, 'super_admin');
      res.json({ success: ok });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin User Status & Restrictions
  app.post('/api/admin/users/status', requireAdmin, (req, res) => {
    try {
      const { targetUserId, updates, reason } = req.body;
      const updated = serverStorage.updateUserStatus('admin-1', targetUserId, updates, reason);
      res.json({ success: true, user: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin Manual Balance Control (Controlled adjustment with mandatory audit log)
  app.post('/api/admin/balance/adjust', requireAdmin, (req, res) => {
    try {
      const { targetUserId, currencyType, amount, reason } = req.body;
      if (!targetUserId || !currencyType || amount === undefined || !reason) {
        return res.status(400).json({ error: 'Target user, currency type, amount, and reason are required.' });
      }

      const result = serverStorage.adminAdjustBalance('admin-1', targetUserId, currencyType, Number(amount), reason);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin Update Remote Config: Coin Settings
  app.post('/api/admin/config/coin', requireAdmin, (req, res) => {
    try {
      const { settings, reason } = req.body;
      const updated = serverStorage.updateCoinSettings('admin-1', settings, reason);
      res.json({ success: true, settings: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin Update Remote Config: Ad & GigaPub Settings
  app.post('/api/admin/config/ads', requireAdmin, (req, res) => {
    try {
      const { settings, reason } = req.body;
      const updated = serverStorage.updateAdSettings('admin-1', settings, reason);
      res.json({ success: true, settings: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin Update Remote Config: App & Maintenance Settings
  app.post('/api/admin/config/app', requireAdmin, (req, res) => {
    try {
      const { settings, reason } = req.body;
      const updated = serverStorage.updateAppSettings('admin-1', settings, reason);
      res.json({ success: true, settings: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin Withdrawals List
  app.get('/api/admin/withdrawals', requireAdmin, (req, res) => {
    res.json(serverStorage.withdrawals);
  });

  // Admin Process Withdrawal (Approve/Reject/Paid)
  app.post('/api/admin/withdrawals/process', requireAdmin, (req, res) => {
    try {
      const { withdrawalId, action, notes } = req.body;
      const result = serverStorage.processWithdrawal('admin-1', withdrawalId, action, notes);
      res.json({ success: true, withdrawal: result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin Audit Logs List
  app.get('/api/admin/audit-logs', requireAdmin, (req, res) => {
    res.json(serverStorage.auditLogs);
  });

  // Telegram Bot Webhook
  app.post('/api/bot/webhook', getBotWebhookMiddleware());

  // --- Vite Dev & Production Static Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
