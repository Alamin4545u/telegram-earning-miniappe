import { Bot, InlineKeyboard, webhookCallback } from 'grammy';
import { serverStorage } from '../services/storage.ts';

let botInstance: Bot | null = null;

export function initTelegramBot(): Bot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.trim() === '' || token.includes('MY_BOT_TOKEN')) {
    console.log('[Telegram Bot] No valid TELEGRAM_BOT_TOKEN found. Bot webhook is standby.');
    return null;
  }

  try {
    const bot = new Bot(token);
    const appUrl = process.env.APP_URL || 'https://t.me/TeleVaultBot/app';

    // Start command
    bot.command('start', async (ctx) => {
      const startParam = ctx.match; // referral payload e.g. ref_TV123456
      const user = ctx.from;
      if (!user) return;

      const { profile, wallet } = serverStorage.getOrCreateUser(
        {
          telegram_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
        },
        startParam
      );

      const miniAppUrl = startParam ? `${appUrl}?startapp=${startParam}` : appUrl;
      const keyboard = new InlineKeyboard()
        .webApp('🚀 Open TeleVault App', miniAppUrl)
        .row()
        .url('📢 Announcements', 'https://t.me/TeleVaultAnnouncements');

      await ctx.reply(
        `👋 Welcome to *${serverStorage.appSettings.app_name}*, ${user.first_name}!\n\n` +
          `💼 *Your Wallet Address:*\n\`${wallet.wallet_address}\`\n\n` +
          `🪙 *Coin Balance:* ${wallet.balance.toFixed(4)} ${wallet.coin_symbol}\n` +
          `⭐ *Points Balance:* ${profile.points_balance} PTS\n` +
          `🔗 *Your Referral Link:* \`https://t.me/TeleVaultBot/app?startapp=ref_${profile.referral_code}\`\n\n` +
          `Tap below to launch the Mini App!`,
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        }
      );
    });

    // Balance command
    bot.command('balance', async (ctx) => {
      const user = ctx.from;
      if (!user) return;

      const { profile, wallet } = serverStorage.getOrCreateUser({
        telegram_id: user.id,
        first_name: user.first_name,
        username: user.username,
      });

      await ctx.reply(
        `💼 *Wallet Details:*\n` +
          `Address: \`${wallet.wallet_address}\`\n` +
          `Coin Balance: *${wallet.balance.toFixed(4)} ${wallet.coin_symbol}*\n` +
          `Points Balance: *${profile.points_balance} PTS*`,
        { parse_mode: 'Markdown' }
      );
    });

    // Help command
    bot.command('help', async (ctx) => {
      await ctx.reply(
        `ℹ️ *TeleVault Help & Commands:*\n\n` +
          `/start - Open wallet & mini app\n` +
          `/balance - Check wallet balance & address\n` +
          `/help - Show this guide\n\n` +
          `Need assistance? Contact our support channel.`,
        { parse_mode: 'Markdown' }
      );
    });

    botInstance = bot;
    console.log('[Telegram Bot] Bot initialized successfully.');
    return bot;
  } catch (err) {
    console.error('[Telegram Bot] Failed to initialize bot:', err);
    return null;
  }
}

export function getBotWebhookMiddleware() {
  if (botInstance) {
    return webhookCallback(botInstance, 'express');
  }
  return (req: any, res: any, next: any) => {
    res.status(200).json({ status: 'Bot token not set, webhook simulated' });
  };
}
