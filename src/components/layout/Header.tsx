import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Sparkles, Copy, Check, ShieldCheck } from 'lucide-react';
import { triggerHaptic } from '../../lib/telegram.ts';

export const Header: React.FC = () => {
  const { profile, wallet, coinSettings, appSettings, setActiveTab, setConvertModalOpen, showToast } = useApp();
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.wallet_address);
    setCopied(true);
    triggerHaptic('success');
    showToast('Wallet address copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!profile) return null;

  return (
    <header className="px-4 py-2.5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-900/80">
      <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
        {/* User Profile & Branding */}
        <div
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('profile');
          }}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="relative">
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.first_name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-sky-500/30"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-sky-500/30">
                {profile.first_name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-slate-100 text-xs sm:text-sm leading-tight truncate max-w-[110px] sm:max-w-[140px]">
                {profile.first_name}
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <span className="font-mono text-[10px] truncate max-w-[80px]">
                {wallet ? `${wallet.wallet_address.slice(0, 4)}...${wallet.wallet_address.slice(-4)}` : ''}
              </span>
              <button
                onClick={handleCopy}
                className="text-slate-500 hover:text-sky-400 p-0.5 transition-colors"
                title="Copy Address"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Currency Quick Badges */}
        <div className="flex items-center gap-2">
          {/* Points Pill */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setConvertModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 hover:border-amber-500/50 px-2.5 py-1 rounded-full transition-all group"
            title="Convert Points"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-amber-300 text-xs font-mono">
              {profile.points_balance.toLocaleString()}
            </span>
          </button>

          {/* Coins Pill */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('wallet');
            }}
            className="flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/25 hover:border-sky-500/50 px-2.5 py-1 rounded-full transition-all group"
            title="View Wallet"
          >
            <span className="text-xs">{coinSettings.coin_logo}</span>
            <span className="font-bold text-sky-300 text-xs font-mono">
              {wallet ? wallet.balance.toFixed(2) : '0.00'}
            </span>
            <span className="text-[10px] text-sky-400/80 font-bold">{coinSettings.coin_symbol}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
