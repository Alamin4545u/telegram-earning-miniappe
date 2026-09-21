import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext.tsx';
import { X, Copy, Check, Share2, QrCode } from 'lucide-react';
import { triggerHaptic } from '../../lib/telegram.ts';

export const QrCodeModal: React.FC = () => {
  const { qrModalOpen, setQrModalOpen, wallet, profile, showToast } = useApp();
  const [copied, setCopied] = useState(false);

  if (!qrModalOpen || !wallet) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet.wallet_address);
    setCopied(true);
    triggerHaptic('success');
    showToast('Wallet address copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const shareText = `Send coins to my TeleVault internal address:\n${wallet.wallet_address}`;
    if (navigator.share) {
      navigator.share({
        title: 'TeleVault Wallet Address',
        text: shareText,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center"
      >
        <div className="flex justify-between items-center pb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Receive Coins</span>
          <button
            onClick={() => setQrModalOpen(false)}
            className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Visual */}
        <div className="bg-white p-6 rounded-2xl mx-auto w-52 h-52 flex flex-col items-center justify-center shadow-lg my-3">
          <QrCode className="w-40 h-40 text-slate-950" />
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Only send internal {wallet.coin_symbol} coins to this address.
        </p>

        {/* Address Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 my-4 flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-sky-300 font-semibold truncate select-all">
            {wallet.wallet_address}
          </span>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>Copy Address</span>
          </button>
          <button
            onClick={handleShare}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
