import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext.tsx';
import { X, Sparkles, ArrowDown, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { triggerHaptic } from '../../lib/telegram.ts';

export const ConvertModal: React.FC = () => {
  const {
    convertModalOpen,
    setConvertModalOpen,
    profile,
    wallet,
    coinSettings,
    refreshUserData,
    showToast,
    t,
  } = useApp();

  const [pointsInput, setPointsInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState<any>(null);

  useEffect(() => {
    if (convertModalOpen) {
      setPointsInput('');
      setProcessing(false);
      setErrorMsg('');
      setSuccessResult(null);
    }
  }, [convertModalOpen]);

  if (!convertModalOpen || !profile) return null;

  const points = parseInt(pointsInput, 10) || 0;
  // Calculate coins based on Admin-configured conversion rate
  const coinsExpected = points > 0 ? Number((points / coinSettings.points_per_coin).toFixed(4)) : 0;

  const handlePreset = (percent: number) => {
    const calculated = Math.floor((profile.points_balance * percent) / 100);
    setPointsInput(calculated.toString());
  };

  const handleConvert = async () => {
    setErrorMsg('');
    if (points <= 0) {
      setErrorMsg('Please enter a valid amount of points.');
      return;
    }
    if (points < coinSettings.min_conversion_points) {
      setErrorMsg(`Minimum conversion is ${coinSettings.min_conversion_points} Points.`);
      return;
    }
    if (points > coinSettings.max_conversion_points) {
      setErrorMsg(`Maximum conversion limit is ${coinSettings.max_conversion_points} Points.`);
      return;
    }
    if (points > profile.points_balance) {
      setErrorMsg(`Insufficient points. You have ${profile.points_balance} PTS.`);
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/points/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': profile.id,
        },
        body: JSON.stringify({ points }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Conversion failed');
      }

      triggerHaptic('success');
      setSuccessResult(data);
      await refreshUserData();
      showToast('Points converted to coins!', 'success');
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMsg(err.message || 'Conversion error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">{t('convert.title')}</h2>
              <p className="text-xs text-slate-400">
                1 {coinSettings.coin_symbol} = {coinSettings.points_per_coin} Points
              </p>
            </div>
          </div>
          <button
            onClick={() => setConvertModalOpen(false)}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          {successResult ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t('convert.success')}</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Converted {successResult.pointsDeducted} PTS into {successResult.coinsCredited} {coinSettings.coin_symbol}
                </p>
              </div>

              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 text-xs text-left space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">New Points Balance:</span>
                  <span className="text-amber-400 font-bold">{successResult.newPointsBalance.toLocaleString()} PTS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">New Coin Balance:</span>
                  <span className="text-sky-300 font-bold">{successResult.newCoinBalance.toFixed(4)} {coinSettings.coin_symbol}</span>
                </div>
              </div>

              <button
                onClick={() => setConvertModalOpen(false)}
                className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl transition-all"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* From Points Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">{t('convert.points_input')}</span>
                  <span className="text-slate-300">
                    Available: <strong className="text-amber-400">{profile.points_balance.toLocaleString()} PTS</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  <input
                    type="number"
                    value={pointsInput}
                    onChange={(e) => setPointsInput(e.target.value)}
                    placeholder={`Min ${coinSettings.min_conversion_points}`}
                    className="w-full bg-transparent text-xl font-bold font-mono text-white focus:outline-none"
                  />
                </div>

                {/* Percentage Chips */}
                <div className="flex gap-2 pt-1">
                  {[25, 50, 75, 100].map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePreset(p)}
                      className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 transition-colors"
                    >
                      {p === 100 ? 'MAX' : `${p}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversion Arrow Indicator */}
              <div className="flex justify-center -my-1">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shadow-md">
                  <ArrowDown className="w-4 h-4" />
                </div>
              </div>

              {/* To Coins Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1">
                <div className="text-xs text-slate-400">{t('convert.coins_receive')}</div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold font-mono text-sky-400">
                    {coinsExpected.toFixed(4)}
                  </span>
                  <span className="text-sm font-bold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                    {coinSettings.coin_logo} {coinSettings.coin_symbol}
                  </span>
                </div>
              </div>

              {/* Rate Notice */}
              <div className="text-xs text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 flex items-center justify-between">
                <span>{t('convert.rate_notice')}:</span>
                <span className="text-slate-200 font-mono font-semibold">
                  {coinSettings.points_per_coin} PTS = 1 {coinSettings.coin_symbol}
                </span>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                onClick={handleConvert}
                disabled={processing || points <= 0}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <span>{t('convert.btn')}</span>
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
