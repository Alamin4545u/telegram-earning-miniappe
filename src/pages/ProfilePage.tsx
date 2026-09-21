import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  User,
  Users,
  Copy,
  Check,
  Share2,
  Globe,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { triggerHaptic } from '../lib/telegram.ts';
import { LANGUAGES } from '../lib/i18n.ts';

export const ProfilePage: React.FC = () => {
  const { profile, appSettings, language, setLanguage, showToast, t } = useApp();
  const [copiedRef, setCopiedRef] = useState(false);

  if (!profile) return null;

  const botUsername = 'TeleVaultBot';
  const referralLink = `https://t.me/${botUsername}/app?startapp=ref_${profile.referral_code}`;

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedRef(true);
    triggerHaptic('success');
    showToast('Referral link copied to clipboard!', 'success');
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleShareTelegram = () => {
    const text = `Join me on TeleVault! Earn coins and rewards directly inside Telegram. Use my referral link: ${referralLink}`;
    const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(
      text
    )}`;
    window.open(tgShareUrl, '_blank');
  };

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto px-4 pt-2">
      {/* Profile Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center gap-4">
        {profile.photo_url ? (
          <img
            src={profile.photo_url}
            alt={profile.first_name}
            className="w-16 h-16 rounded-full object-cover ring-4 ring-sky-500/20"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl ring-4 ring-sky-500/20">
            {profile.first_name.slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold text-white">{profile.first_name} {profile.last_name || ''}</h2>
            <ShieldCheck className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-xs text-slate-400">@{profile.username || 'telegram_user'}</p>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
              {profile.status}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">TG ID: {profile.telegram_id}</span>
          </div>
        </div>
      </div>

      {/* Referral Program Card */}
      <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{t('profile.referral_title')}</h3>
              <p className="text-xs text-slate-400">Invite friends & earn 250 PTS per signup</p>
            </div>
          </div>
        </div>

        {/* Referral Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 text-center">
            <span className="text-[11px] text-slate-400">{t('profile.invited')}</span>
            <div className="text-lg font-bold text-white font-mono mt-0.5">
              {profile.total_referrals || 0}
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 text-center">
            <span className="text-[11px] text-slate-400">Referral Earnings</span>
            <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">
              {((profile.total_referrals || 0) * 250).toLocaleString()} PTS
            </div>
          </div>
        </div>

        {/* Link Share Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs">
            <span className="font-mono text-indigo-300 truncate max-w-[220px] select-all">
              {referralLink}
            </span>
            <button
              onClick={handleCopyReferral}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              {copiedRef ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopyReferral}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              {copiedRef ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{t('profile.copy_link')}</span>
            </button>
            <button
              onClick={handleShareTelegram}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Language Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-bold text-white">{t('profile.language')}</h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                triggerHaptic('light');
                setLanguage(lang.code);
              }}
              className={`p-3 rounded-2xl border text-xs font-semibold text-left flex items-center gap-2 transition-all ${
                language === lang.code
                  ? 'bg-sky-500/10 border-sky-500 text-sky-300 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Help & Legal */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-2 text-xs">
        <a
          href={appSettings.telegram_support_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/60 text-slate-300 transition-colors"
        >
          <span>{t('profile.support')}</span>
          <ExternalLink className="w-4 h-4 text-slate-500" />
        </a>
        <a
          href={appSettings.terms_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/60 text-slate-300 transition-colors"
        >
          <span>Terms & Conditions</span>
          <ExternalLink className="w-4 h-4 text-slate-500" />
        </a>
      </div>
    </div>
  );
};
