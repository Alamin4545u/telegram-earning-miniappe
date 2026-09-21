import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  QrCode,
  Calendar,
  Check,
  Clock,
  ChevronRight,
  TrendingUp,
  Shield,
  Loader2,
} from 'lucide-react';
import { triggerHaptic } from '../lib/telegram.ts';

export const HomePage: React.FC = () => {
  const {
    profile,
    wallet,
    coinSettings,
    walletTransactions,
    setP2pModalOpen,
    setConvertModalOpen,
    setWithdrawModalOpen,
    setQrModalOpen,
    setActiveTab,
    refreshUserData,
    showToast,
    t,
  } = useApp();

  const [claimingDaily, setClaimingDaily] = useState(false);

  if (!profile || !wallet) return null;

  const currentStreak = profile.daily_streak_count || 0;
  const streakRewards = [100, 150, 200, 300, 450, 600, 1000];

  // Daily claim check
  const lastClaim = profile.last_daily_claim_at ? new Date(profile.last_daily_claim_at).getTime() : 0;
  const hoursSinceClaim = (Date.now() - lastClaim) / (1000 * 60 * 60);
  const canClaimDaily = !profile.last_daily_claim_at || hoursSinceClaim >= 24;

  const handleClaimDaily = async () => {
    if (!canClaimDaily || claimingDaily) return;
    setClaimingDaily(true);
    try {
      const res = await fetch('/api/daily/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': profile.id,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to claim daily reward');
      }

      triggerHaptic('success');
      showToast(`Claimed Day ${data.streakDay} Bonus: +${data.rewardPoints} PTS!`, 'success');
      await refreshUserData();
    } catch (err: any) {
      triggerHaptic('error');
      showToast(err.message, 'error');
    } finally {
      setClaimingDaily(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto px-4 pt-2">
      {/* Main Asset Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950/60 to-slate-900 p-6 border border-sky-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-300/80 flex items-center gap-1.5">
              <span>{coinSettings.coin_logo}</span> {coinSettings.coin_name}
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Verified Internal Ledger
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-4xl font-extrabold text-white tracking-tight font-mono">
                {wallet.balance.toFixed(2)}
              </h1>
              <span className="text-lg font-bold text-sky-400">{coinSettings.coin_symbol}</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 font-medium">
                <Shield className="w-3 h-3 text-sky-400" />
                Internal App Coin
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-[11px] text-slate-400">Non-exchange ledger token</span>
            </div>
          </div>

          {/* Points Sub-Balance */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Reward Points:</span>
              <strong className="text-amber-300 font-mono">{profile.points_balance.toLocaleString()} PTS</strong>
            </div>
            <button
              onClick={() => setConvertModalOpen(true)}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold hover:underline"
            >
              Convert to Coins →
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            <button
              onClick={() => setP2pModalOpen(true)}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 transition-all group"
            >
              <ArrowUpRight className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-bold">{t('home.send')}</span>
            </button>

            <button
              onClick={() => setQrModalOpen(true)}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-all group"
            >
              <QrCode className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform text-slate-300" />
              <span className="text-[11px] font-bold">Receive</span>
            </button>

            <button
              onClick={() => setConvertModalOpen(true)}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-all group"
            >
              <Sparkles className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-bold">{t('home.convert')}</span>
            </button>

            <button
              onClick={() => setWithdrawModalOpen(true)}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 transition-all group"
            >
              <ArrowDownLeft className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-bold">{t('home.withdraw')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Daily Streak Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{t('home.streak_title')}</h3>
              <p className="text-[11px] text-slate-400">Current Streak: Day {currentStreak} of 7</p>
            </div>
          </div>

          <button
            onClick={handleClaimDaily}
            disabled={!canClaimDaily || claimingDaily}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
              canClaimDaily
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            {claimingDaily ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : canClaimDaily ? (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('home.claim_now')}</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('home.claimed')}</span>
              </>
            )}
          </button>
        </div>

        {/* 7-Day Timeline Pill List */}
        <div className="grid grid-cols-7 gap-1.5 pt-2">
          {streakRewards.map((reward, idx) => {
            const dayNum = idx + 1;
            const isCompleted = dayNum <= currentStreak;
            const isCurrent = dayNum === (currentStreak % 7) + 1;
            return (
              <div
                key={dayNum}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                  isCompleted
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : isCurrent
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-2 ring-amber-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                <span className="text-[10px] font-semibold">D{dayNum}</span>
                <span className="text-[11px] font-mono font-bold mt-0.5">+{reward}</span>
              </div>
            );
          })}
        </div>

        {!canClaimDaily && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Next streak bonus available in {Math.ceil(24 - hoursSinceClaim)}h.
            </span>
          </div>
        )}
      </div>

      {/* Featured Banner: Earn & Tasks */}
      <div className="grid grid-cols-2 gap-3">
        <div
          onClick={() => setActiveTab('earn')}
          className="cursor-pointer bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl p-4 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              🎮
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </div>
          <h4 className="text-sm font-bold text-white mt-3">Play & Earn</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Mini games & ads</p>
        </div>

        <div
          onClick={() => setActiveTab('tasks')}
          className="cursor-pointer bg-gradient-to-br from-sky-950/60 to-slate-900 border border-sky-500/20 hover:border-sky-500/40 rounded-2xl p-4 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              📋
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors" />
          </div>
          <h4 className="text-sm font-bold text-white mt-3">Daily Quests</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Big reward tasks</p>
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">{t('home.recent_activity')}</h3>
          <button
            onClick={() => setActiveTab('wallet')}
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
          >
            View All →
          </button>
        </div>

        {walletTransactions.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">{t('home.no_activity')}</div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {walletTransactions.slice(0, 4).map((tx) => {
              const isSend = tx.type === 'p2p_send';
              const isReceive = tx.type === 'p2p_receive';
              const isConv = tx.type === 'point_conversion';
              const isWithdraw = tx.type === 'withdrawal';

              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${
                        isSend
                          ? 'bg-rose-500/10 text-rose-400'
                          : isReceive
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : isConv
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {isSend ? '↑' : isReceive ? '↓' : isConv ? '⚡' : '⊘'}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200">{tx.description}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Ref:{' '}
                        {tx.reference_id?.slice(0, 8)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono font-bold">
                    <span className={isSend || isWithdraw ? 'text-rose-400' : 'text-emerald-400'}>
                      {isSend || isWithdraw ? '-' : '+'}
                      {tx.amount.toFixed(2)} {tx.coin_symbol}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
