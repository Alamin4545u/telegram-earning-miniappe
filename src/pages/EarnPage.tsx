import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Flame,
  Play,
  Clock,
  Sparkles,
  Gamepad2,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { triggerHaptic } from '../lib/telegram.ts';

export const EarnPage: React.FC = () => {
  const { profile, adSettings, refreshUserData, showToast, t } = useApp();

  // Ad Watching State
  const [watchingAd, setWatchingAd] = useState(false);
  const [adSecondsLeft, setAdSecondsLeft] = useState(0);
  const [adCooldown, setAdCooldown] = useState(0);
  const [claimingAd, setClaimingAd] = useState(false);

  // Tap Star Mini Game State
  const [gameActive, setGameActive] = useState(false);
  const [gameTimeLeft, setGameTimeLeft] = useState(20);
  const [gameScore, setGameScore] = useState(0);
  const [starPosition, setStarPosition] = useState({ top: 40, left: 50 });
  const [submittingGame, setSubmittingGame] = useState(false);
  const [lastGameResult, setLastGameResult] = useState<any>(null);

  // Ad timer
  useEffect(() => {
    let interval: any;
    if (watchingAd && adSecondsLeft > 0) {
      interval = setInterval(() => {
        setAdSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (watchingAd && adSecondsLeft === 0) {
      handleCompleteAd();
    }
    return () => clearInterval(interval);
  }, [watchingAd, adSecondsLeft]);

  // Game timer
  useEffect(() => {
    let interval: any;
    if (gameActive && gameTimeLeft > 0) {
      interval = setInterval(() => {
        setGameTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (gameActive && gameTimeLeft === 0) {
      handleFinishGame();
    }
    return () => clearInterval(interval);
  }, [gameActive, gameTimeLeft]);

  const handleStartWatchAd = () => {
    if (adCooldown > 0 || watchingAd) return;
    triggerHaptic('medium');
    setWatchingAd(true);
    setAdSecondsLeft(adSettings.min_watch_seconds || 15);
  };

  const handleCompleteAd = async () => {
    setWatchingAd(false);
    setClaimingAd(true);
    try {
      const refToken = `gp_ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const res = await fetch('/api/ads/reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': profile?.id || '',
        },
        body: JSON.stringify({ referenceId: refToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to claim ad reward');
      }

      triggerHaptic('success');
      showToast(`+${data.rewardPoints} Points credited via ${adSettings.provider}!`, 'success');
      setAdCooldown(adSettings.ad_cooldown_seconds || 45);
      await refreshUserData();
    } catch (err: any) {
      triggerHaptic('error');
      showToast(err.message, 'error');
    } finally {
      setClaimingAd(false);
    }
  };

  // Cooldown countdown
  useEffect(() => {
    if (adCooldown > 0) {
      const timer = setTimeout(() => setAdCooldown(adCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [adCooldown]);

  // Mini-Game Logic
  const handleStartGame = () => {
    setGameScore(0);
    setGameTimeLeft(20);
    setLastGameResult(null);
    setGameActive(true);
    triggerHaptic('medium');
    moveStarRandomly();
  };

  const moveStarRandomly = () => {
    const top = Math.floor(Math.random() * 70) + 15; // 15% to 85%
    const left = Math.floor(Math.random() * 75) + 10;
    setStarPosition({ top, left });
  };

  const handleTapStar = () => {
    if (!gameActive) return;
    triggerHaptic('light');
    setGameScore((prev) => prev + 1);
    moveStarRandomly();
  };

  const handleFinishGame = async () => {
    setGameActive(false);
    setSubmittingGame(true);
    try {
      const res = await fetch('/api/games/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': profile?.id || '',
        },
        body: JSON.stringify({
          gameSlug: 'tap-star',
          score: gameScore,
          durationSeconds: 20,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Score submission failed');
      }

      triggerHaptic('success');
      setLastGameResult(data);
      showToast(`+${data.pointsAwarded} Points earned in Tap Star!`, 'success');
      await refreshUserData();
    } catch (err: any) {
      triggerHaptic('error');
      showToast(err.message, 'error');
    } finally {
      setSubmittingGame(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto px-4 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <span>{t('earn.title')}</span>
          </h2>
          <p className="text-xs text-slate-400">Play games, watch ads, and earn verified points</p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-400">Points Balance</span>
          <div className="text-sm font-bold text-amber-300 font-mono">
            {profile?.points_balance.toLocaleString()} PTS
          </div>
        </div>
      </div>

      {/* GigaPub Rewarded Ads Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
              <Play className="w-4 h-4 fill-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">{t('earn.ads_title')}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono">
                  {adSettings.provider}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Reward: <strong className="text-amber-400">+{adSettings.rewarded_ad_reward} PTS</strong> per completed view
              </p>
            </div>
          </div>
        </div>

        {/* Ad Video Player Simulation */}
        {watchingAd ? (
          <div className="bg-slate-950 rounded-2xl p-6 border border-sky-500/40 text-center space-y-4 relative">
            <div className="w-12 h-12 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto animate-pulse">
              <Play className="w-6 h-6 fill-sky-400" />
            </div>

            <div>
              <div className="text-xs text-sky-300 font-mono font-semibold uppercase tracking-wider">
                GigaPub Video Stream Active
              </div>
              <p className="text-xs text-slate-400 mt-1">Watching sponsored partner announcement...</p>
            </div>

            {/* Countdown Progress */}
            <div className="space-y-1.5 max-w-xs mx-auto">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>Reward unlocks in:</span>
                <span className="text-white font-bold">{adSecondsLeft}s</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-sky-500 h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{
                    width: `${((adSettings.min_watch_seconds - adSecondsLeft) / adSettings.min_watch_seconds) * 100}%`,
                  }}
                />
              </div>
            </div>

            <span className="text-[11px] text-slate-500 block">Do not close window during playback.</span>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80">
            <div className="space-y-0.5 text-xs">
              <div className="text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Daily Limit: <strong>25 ads/day</strong></span>
              </div>
              {adCooldown > 0 && (
                <div className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <Clock className="w-3 h-3 text-sky-400" />
                  <span>Cooldown: {adCooldown}s</span>
                </div>
              )}
            </div>

            <button
              onClick={handleStartWatchAd}
              disabled={adCooldown > 0 || claimingAd}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
                adCooldown === 0
                  ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              {claimingAd ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : adCooldown > 0 ? (
                <span>Wait {adCooldown}s</span>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Watch & Earn</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Mini-Games Section: Tap Star */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Tap Star Reflex Game</h3>
              <p className="text-[11px] text-slate-400">Tap golden stars before time runs out!</p>
            </div>
          </div>
          {!gameActive && (
            <button
              onClick={handleStartGame}
              disabled={submittingGame}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20"
            >
              {submittingGame ? 'Verifying...' : 'Play Now'}
            </button>
          )}
        </div>

        {/* Interactive Play Arena */}
        {gameActive ? (
          <div className="relative w-full h-64 bg-slate-950 border border-amber-500/40 rounded-2xl overflow-hidden select-none touch-none">
            {/* Top Bar inside arena */}
            <div className="absolute top-3 left-4 right-4 flex justify-between items-center text-xs font-mono z-10">
              <span className="text-amber-400 font-bold bg-slate-900/90 px-3 py-1 rounded-full border border-amber-500/30">
                Score: {gameScore}
              </span>
              <span className="text-rose-400 font-bold bg-slate-900/90 px-3 py-1 rounded-full border border-rose-500/30 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {gameTimeLeft}s
              </span>
            </div>

            {/* Tap Target Star */}
            <button
              onClick={handleTapStar}
              style={{
                top: `${starPosition.top}%`,
                left: `${starPosition.left}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/50 flex items-center justify-center text-2xl active:scale-90 transition-transform cursor-pointer animate-bounce"
            >
              ⭐
            </button>
          </div>
        ) : (
          lastGameResult && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Score: {lastGameResult.score} • Earned: <strong>+{lastGameResult.pointsAwarded} PTS</strong></span>
              </div>
              <button
                onClick={handleStartGame}
                className="text-emerald-400 hover:underline font-bold text-xs"
              >
                Play Again
              </button>
            </div>
          )
        )}
      </div>

      {/* OfferWall Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{t('earn.offerwall_title')}</h3>
              <p className="text-[11px] text-slate-400">High-yield partner promotions</p>
            </div>
          </div>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
            Up to 10,000 PTS
          </span>
        </div>

        <div className="space-y-2">
          {[
            {
              id: 'ow-1',
              title: 'Subscribe to CoinMarketCap Telegram',
              reward: 800,
              badge: 'Fast',
            },
            {
              id: 'ow-2',
              title: 'Install Partner DeFi Wallet & Create ID',
              reward: 3500,
              badge: 'High Reward',
            },
          ].map((offer) => (
            <div
              key={offer.id}
              className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="font-semibold text-white">{offer.title}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-amber-400 font-bold font-mono">+{offer.reward} PTS</span>
                  <span className="text-[10px] text-slate-500">{offer.badge}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  showToast('Redirecting to partner offer portal...', 'info');
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold rounded-xl flex items-center gap-1"
              >
                <span>Start</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
