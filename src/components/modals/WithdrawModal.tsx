import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext.tsx';
import { X, ArrowUpRight, AlertCircle, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { triggerHaptic } from '../../lib/telegram.ts';

export const WithdrawModal: React.FC = () => {
  const {
    withdrawModalOpen,
    setWithdrawModalOpen,
    wallet,
    coinSettings,
    refreshUserData,
    showToast,
  } = useApp();

  const [method, setMethod] = useState<'USDT_TRC20' | 'TON' | 'LOCAL_BANK'>('USDT_TRC20');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<any>(null);

  useEffect(() => {
    if (withdrawModalOpen) {
      setDestinationAddress('');
      setAmount('');
      setProcessing(false);
      setErrorMsg('');
      setSuccessData(null);
    }
  }, [withdrawModalOpen]);

  if (!withdrawModalOpen || !wallet) return null;

  const numAmount = parseFloat(amount) || 0;
  const fee = Number(((numAmount * (coinSettings.withdrawal_fee_percent / 100))).toFixed(4));
  const netAmount = Number((numAmount - fee).toFixed(4));

  const handleWithdraw = async () => {
    setErrorMsg('');
    if (!destinationAddress.trim()) {
      setErrorMsg('Destination address/account is required.');
      return;
    }
    if (numAmount < coinSettings.min_withdrawal_amount) {
      setErrorMsg(`Minimum withdrawal is ${coinSettings.min_withdrawal_amount} ${coinSettings.coin_symbol}`);
      return;
    }
    if (numAmount > coinSettings.max_withdrawal_amount) {
      setErrorMsg(`Maximum withdrawal is ${coinSettings.max_withdrawal_amount} ${coinSettings.coin_symbol}`);
      return;
    }
    if (numAmount > wallet.balance) {
      setErrorMsg(`Insufficient balance. You have ${wallet.balance.toFixed(4)} ${coinSettings.coin_symbol}`);
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/withdrawals/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': wallet.user_id,
        },
        body: JSON.stringify({
          amount: numAmount,
          method,
          destinationAddress: destinationAddress.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Withdrawal request failed');
      }

      triggerHaptic('success');
      setSuccessData(data);
      await refreshUserData();
      showToast('Withdrawal request submitted for review', 'success');
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMsg(err.message || 'Withdrawal error');
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
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Request Coin Withdrawal</h2>
              <p className="text-xs text-slate-400">Available: {wallet.balance.toFixed(4)} {coinSettings.coin_symbol}</p>
            </div>
          </div>
          <button
            onClick={() => setWithdrawModalOpen(false)}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          {successData ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Withdrawal Request Submitted</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Your request to withdraw {successData.withdrawal.amount} {coinSettings.coin_symbol} is in pending review.
                </p>
              </div>

              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 text-xs text-left space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Request ID:</span>
                  <span className="text-sky-300 font-semibold">{successData.withdrawal.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Method:</span>
                  <span className="text-slate-200">{successData.withdrawal.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Net Payout:</span>
                  <span className="text-emerald-400 font-bold">{successData.withdrawal.net_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-amber-400 font-bold uppercase">Pending Review</span>
                </div>
              </div>

              <button
                onClick={() => setWithdrawModalOpen(false)}
                className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Method Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Select Withdrawal Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'USDT_TRC20', label: 'USDT (TRC20)', badge: 'Fast' },
                    { id: 'TON', label: 'TON Network', badge: 'Popular' },
                    { id: 'LOCAL_BANK', label: 'Bank Transfer', badge: 'Direct' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                        method === m.id
                          ? 'bg-sky-500/10 border-sky-500 text-sky-300 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-white truncate">{m.label}</div>
                      <span className="text-[10px] text-sky-400/80">{m.badge}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Address Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {method === 'LOCAL_BANK' ? 'Bank Account / IBAN' : 'External Wallet Address'}
                </label>
                <input
                  type="text"
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder={method === 'LOCAL_BANK' ? 'Account Number / IBAN' : 'T... or EQ...'}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none"
                />
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="font-semibold text-slate-300">Amount ({coinSettings.coin_symbol})</label>
                  <span className="text-slate-400">Min: {coinSettings.min_withdrawal_amount}</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Min ${coinSettings.min_withdrawal_amount}`}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none pr-16"
                  />
                  <button
                    onClick={() => setAmount(wallet.balance.toFixed(2))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-bold rounded-lg"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Fee and Net Breakdown */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Processing Fee ({coinSettings.withdrawal_fee_percent}%):</span>
                  <span className="text-slate-200 font-mono">{fee.toFixed(4)} {coinSettings.coin_symbol}</span>
                </div>
                <div className="flex justify-between text-slate-200 font-bold border-t border-slate-800 pt-1.5">
                  <span>Net Estimated Payout:</span>
                  <span className="text-emerald-400 font-mono text-sm">{netAmount > 0 ? netAmount.toFixed(4) : '0.0000'}</span>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                onClick={handleWithdraw}
                disabled={processing || numAmount <= 0}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <span>Submit Withdrawal Request</span>
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
