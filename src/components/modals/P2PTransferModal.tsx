import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext.tsx';
import { X, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2, User, Loader2 } from 'lucide-react';
import { triggerHaptic } from '../../lib/telegram.ts';

export const P2PTransferModal: React.FC = () => {
  const {
    p2pModalOpen,
    setP2pModalOpen,
    wallet,
    coinSettings,
    refreshUserData,
    showToast,
    t,
  } = useApp();

  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [validatingAddress, setValidatingAddress] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState<{ found: boolean; name?: string; address?: string } | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<any>(null);

  // Reset when opened
  useEffect(() => {
    if (p2pModalOpen) {
      setRecipientAddress('');
      setAmount('');
      setRecipientInfo(null);
      setConfirmStep(false);
      setProcessing(false);
      setErrorMsg('');
      setSuccessData(null);
    }
  }, [p2pModalOpen]);

  // Debounce address lookup
  useEffect(() => {
    const trimmed = recipientAddress.trim();
    if (!trimmed || trimmed.length < 5) {
      setRecipientInfo(null);
      return;
    }

    const timer = setTimeout(async () => {
      setValidatingAddress(true);
      setErrorMsg('');
      try {
        const res = await fetch(`/api/wallet/lookup?address=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (data.found) {
          setRecipientInfo({
            found: true,
            name: data.first_name + (data.username ? ` (@${data.username})` : ''),
            address: data.wallet_address,
          });
        } else {
          setRecipientInfo({ found: false });
        }
      } catch {
        setRecipientInfo({ found: false });
      } finally {
        setValidatingAddress(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [recipientAddress]);

  const numAmount = parseFloat(amount) || 0;
  const fee = numAmount > 0
    ? Number(((numAmount * (coinSettings.transfer_fee_percent / 100)) + coinSettings.transfer_fee_fixed).toFixed(4))
    : 0;
  const totalDeduction = Number((numAmount + fee).toFixed(4));
  const availableBal = wallet?.balance || 0;

  const handleNextStep = () => {
    setErrorMsg('');
    if (!recipientAddress.trim()) {
      setErrorMsg('Please enter a recipient wallet address.');
      return;
    }
    if (!recipientInfo?.found) {
      setErrorMsg('Recipient wallet address could not be verified on the ledger.');
      return;
    }
    if (wallet && recipientAddress.trim() === wallet.wallet_address) {
      setErrorMsg('Cannot send coins to your own wallet.');
      return;
    }
    if (numAmount <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }
    if (numAmount < coinSettings.min_transfer_amount) {
      setErrorMsg(`Minimum transfer is ${coinSettings.min_transfer_amount} ${coinSettings.coin_symbol}`);
      return;
    }
    if (numAmount > coinSettings.max_transfer_amount) {
      setErrorMsg(`Maximum transfer limit is ${coinSettings.max_transfer_amount} ${coinSettings.coin_symbol}`);
      return;
    }
    if (totalDeduction > availableBal) {
      setErrorMsg(`Insufficient balance. Total deduction including fee is ${totalDeduction} ${coinSettings.coin_symbol}`);
      return;
    }

    triggerHaptic('medium');
    setConfirmStep(true);
  };

  const handleExecuteTransfer = async () => {
    if (!wallet) return;
    setProcessing(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': wallet.user_id,
        },
        body: JSON.stringify({
          recipientAddress: recipientAddress.trim(),
          amount: numAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'P2P transfer failed.');
      }

      triggerHaptic('success');
      setSuccessData(data);
      await refreshUserData();
      showToast('Transfer completed successfully!', 'success');
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMsg(err.message || 'Transfer failed');
    } finally {
      setProcessing(false);
    }
  };

  if (!p2pModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
              ⇄
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">{t('p2p.title')}</h2>
              <p className="text-xs text-slate-400">Server-authoritative atomic ledger</p>
            </div>
          </div>
          <button
            onClick={() => setP2pModalOpen(false)}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4">
          {successData ? (
            /* Success View */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t('p2p.success')}</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Sent {successData.amount} {coinSettings.coin_symbol} to {successData.recipientName}
                </p>
              </div>

              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 text-xs text-left space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tx Hash:</span>
                  <span className="text-sky-300 font-semibold">{successData.txHash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Network Fee:</span>
                  <span className="text-slate-200">{successData.fee} {coinSettings.coin_symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">New Balance:</span>
                  <span className="text-emerald-400 font-bold">{successData.senderNewBalance.toFixed(4)} {coinSettings.coin_symbol}</span>
                </div>
              </div>

              <button
                onClick={() => setP2pModalOpen(false)}
                className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl transition-all"
              >
                Close & Return
              </button>
            </div>
          ) : !confirmStep ? (
            /* Form View */
            <>
              {/* Recipient Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Recipient Wallet Address</span>
                  {validatingAddress && (
                    <span className="text-[11px] text-sky-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Verifying...
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="RW8F7K2M9X4P9A7D..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none transition-colors"
                  />
                </div>

                {recipientInfo && recipientInfo.found && (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Recipient verified: <strong>{recipientInfo.name}</strong></span>
                  </div>
                )}
                {recipientInfo && !recipientInfo.found && !validatingAddress && (
                  <div className="flex items-center gap-2 p-2.5 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Address does not exist on internal ledger</span>
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300">{t('p2p.amount')}</label>
                  <span className="text-slate-400">
                    {t('p2p.available')}: <strong className="text-sky-300">{availableBal.toFixed(4)} {coinSettings.coin_symbol}</strong>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min={coinSettings.min_transfer_amount}
                    max={coinSettings.max_transfer_amount}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Min ${coinSettings.min_transfer_amount}`}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none transition-colors pr-20"
                  />
                  <button
                    onClick={() => {
                      const maxTransferable = Math.max(
                        0,
                        (availableBal - coinSettings.transfer_fee_fixed) / (1 + coinSettings.transfer_fee_percent / 100)
                      );
                      setAmount(maxTransferable.toFixed(2));
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-bold rounded-lg transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Transfer Fee ({coinSettings.transfer_fee_percent}% + {coinSettings.transfer_fee_fixed}):</span>
                  <span className="text-slate-200 font-mono">{fee.toFixed(4)} {coinSettings.coin_symbol}</span>
                </div>
                <div className="flex justify-between text-slate-300 font-semibold border-t border-slate-800/60 pt-2">
                  <span>Total Deduction:</span>
                  <span className="text-sky-400 font-mono text-sm">{totalDeduction.toFixed(4)} {coinSettings.coin_symbol}</span>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Next Button */}
              <button
                onClick={handleNextStep}
                disabled={!recipientInfo?.found || numAmount <= 0}
                className="w-full py-3 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-sky-500/20"
              >
                <span>Review & Confirm</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            /* Confirmation Step */
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 text-xs">
                <div className="text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  Transfer Summary
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Recipient Name:</span>
                  <span className="text-white font-bold">{recipientInfo?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Recipient Address:</span>
                  <span className="text-sky-300 font-mono truncate max-w-[200px]">{recipientAddress}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Amount:</span>
                  <span className="text-white font-mono font-bold text-sm">{numAmount} {coinSettings.coin_symbol}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Fee:</span>
                  <span className="text-slate-300 font-mono">{fee} {coinSettings.coin_symbol}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-300 font-bold">Total Wallet Debit:</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">{totalDeduction} {coinSettings.coin_symbol}</span>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirmStep(false)}
                  disabled={processing}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all text-xs"
                >
                  Back
                </button>
                <button
                  onClick={handleExecuteTransfer}
                  disabled={processing}
                  className="flex-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>{t('p2p.confirm_btn')}</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
