import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  WalletCards,
  ArrowUpRight,
  ArrowDownLeft,
  QrCode,
  Copy,
  Check,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { triggerHaptic } from '../lib/telegram.ts';

export const WalletPage: React.FC = () => {
  const {
    wallet,
    profile,
    coinSettings,
    walletTransactions,
    setP2pModalOpen,
    setConvertModalOpen,
    setWithdrawModalOpen,
    setQrModalOpen,
    showToast,
    t,
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  if (!wallet || !profile) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet.wallet_address);
    setCopied(true);
    triggerHaptic('success');
    showToast('Wallet address copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredTx = walletTransactions.filter((tx) => {
    if (filterType === 'all') return true;
    if (filterType === 'transfers') return tx.type.startsWith('p2p_');
    if (filterType === 'conversions') return tx.type === 'point_conversion';
    if (filterType === 'withdrawals') return tx.type === 'withdrawal';
    return true;
  });

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto px-4 pt-2">
      {/* Wallet Card */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
              <WalletCards className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-300">Internal Vault Wallet</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
            Active Ledger
          </span>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <div className="text-xs text-slate-400">Coin Balance</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold text-white font-mono">{wallet.balance.toFixed(4)}</span>
              <span className="text-xs font-bold text-sky-400">{coinSettings.coin_symbol}</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">Points Balance</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold text-amber-300 font-mono">
                {profile.points_balance.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-amber-400">PTS</span>
            </div>
          </div>
        </div>

        {/* Address Bar */}
        <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="text-slate-500 font-mono text-[11px]">ADDR:</span>
            <span className="font-mono text-slate-200 truncate select-all">{wallet.wallet_address}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Copy"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setQrModalOpen(true)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Show QR"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <button
            onClick={() => setP2pModalOpen(true)}
            className="py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-sky-500/20 flex items-center justify-center gap-1.5"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Send P2P</span>
          </button>

          <button
            onClick={() => setConvertModalOpen(true)}
            className="py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Convert</span>
          </button>

          <button
            onClick={() => setWithdrawModalOpen(true)}
            className="py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-1.5"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Withdraw</span>
          </button>
        </div>
      </div>

      {/* Ledger History */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Transaction Ledger</span>
            <span className="text-[10px] text-slate-400 font-mono">({walletTransactions.length})</span>
          </h3>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All' },
            { id: 'transfers', label: 'P2P Transfers' },
            { id: 'conversions', label: 'Conversions' },
            { id: 'withdrawals', label: 'Withdrawals' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                filterType === tab.id
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredTx.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">No transactions in this category</div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredTx.map((tx) => {
              const isDebit = tx.type === 'p2p_send' || tx.type === 'withdrawal';
              return (
                <div key={tx.id} className="py-3.5 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{tx.description}</span>
                    <span
                      className={`font-mono font-bold text-sm ${isDebit ? 'text-rose-400' : 'text-emerald-400'}`}
                    >
                      {isDebit ? '-' : '+'}
                      {tx.amount.toFixed(4)} {tx.coin_symbol}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>
                      {new Date(tx.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      Balance: <strong className="text-slate-300">{tx.new_balance.toFixed(4)}</strong>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                    <span className="truncate max-w-[200px]">Ref: {tx.reference_id}</span>
                    {tx.fee > 0 && <span>Fee: {tx.fee.toFixed(4)}</span>}
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
