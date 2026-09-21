import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  Wallet,
  WalletTransaction,
  PointTransaction,
  CoinSettings,
  AdSettings,
  AppSettings,
  SupportedLanguage,
} from '../types';
import { translations, LANGUAGES } from '../lib/i18n.ts';
import {
  getTelegramWebApp,
  isRealTelegramMiniApp,
  initTelegramApp,
  triggerHaptic,
} from '../lib/telegram.ts';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  profile: UserProfile | null;
  wallet: Wallet | null;
  walletTransactions: WalletTransaction[];
  pointTransactions: PointTransaction[];
  coinSettings: CoinSettings;
  adSettings: AdSettings;
  appSettings: AppSettings;
  loading: boolean;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
  activeTab: 'home' | 'earn' | 'tasks' | 'wallet' | 'profile';
  setActiveTab: (tab: 'home' | 'earn' | 'tasks' | 'wallet' | 'profile') => void;
  refreshUserData: () => Promise<void>;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  isRealTelegram: boolean;

  // Modals
  p2pModalOpen: boolean;
  setP2pModalOpen: (open: boolean) => void;
  convertModalOpen: boolean;
  setConvertModalOpen: (open: boolean) => void;
  withdrawModalOpen: boolean;
  setWithdrawModalOpen: (open: boolean) => void;
  qrModalOpen: boolean;
  setQrModalOpen: (open: boolean) => void;
}

const defaultCoinSettings: CoinSettings = {
  id: 'cs-default',
  coin_name: 'TeleVault Coin',
  coin_symbol: 'ALM',
  coin_logo: '🪙',
  decimal_precision: 4,
  points_per_coin: 10,
  min_conversion_points: 500,
  max_conversion_points: 100000,
  conversion_enabled: true,
  transfer_enabled: true,
  min_transfer_amount: 5,
  max_transfer_amount: 5000,
  transfer_fee_percent: 1.5,
  transfer_fee_fixed: 0.5,
  withdrawal_enabled: true,
  min_withdrawal_amount: 50,
  max_withdrawal_amount: 10000,
  withdrawal_fee_percent: 2.0,
  updated_at: new Date().toISOString(),
};

const defaultAdSettings: AdSettings = {
  id: 'ad-default',
  provider: 'GigaPub',
  gigapub_enabled: true,
  gigapub_project_id: 'GP-849204-LIVE',
  rewarded_ad_enabled: true,
  rewarded_ad_reward: 150,
  min_watch_seconds: 15,
  ad_cooldown_seconds: 45,
  max_ads_per_user_day: 25,
  ad_reward_enabled: true,
  offerwall_enabled: true,
  offerwall_config: {},
  ad_frequency: 3,
  status: 'active',
  updated_at: new Date().toISOString(),
};

const defaultAppSettings: AppSettings = {
  id: 'app-default',
  app_name: 'TeleVault Mini App',
  app_logo: '⚡',
  app_description: 'Decentralized internal wallet and rewards hub for Telegram',
  maintenance_mode: false,
  registration_enabled: true,
  earning_enabled: true,
  p2p_enabled: true,
  withdrawal_enabled: true,
  referral_enabled: true,
  game_enabled: true,
  daily_reward_enabled: true,
  offerwall_enabled: true,
  ads_enabled: true,
  min_app_version: '1.0.0',
  telegram_support_url: 'https://t.me/TeleVaultSupport',
  terms_url: 'https://televault.app/terms',
  privacy_policy_url: 'https://televault.app/privacy',
  updated_at: new Date().toISOString(),
};

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([]);
  const [coinSettings, setCoinSettings] = useState<CoinSettings>(defaultCoinSettings);
  const [adSettings, setAdSettings] = useState<AdSettings>(defaultAdSettings);
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [loading, setLoading] = useState<boolean>(true);
  const [language, setLanguageState] = useState<SupportedLanguage>('en');
  const [activeTab, setActiveTab] = useState<'home' | 'earn' | 'tasks' | 'wallet' | 'profile'>('home');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals state
  const [p2pModalOpen, setP2pModalOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const isRealTg = isRealTelegramMiniApp();

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    triggerHaptic(type === 'error' ? 'error' : type === 'success' ? 'success' : 'light');
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('televault_lang', lang);
  };

  const t = useCallback(
    (key: string): string => {
      const dict = translations[language] || translations['en'];
      return dict[key] || translations['en'][key] || key;
    },
    [language]
  );

  const initAuth = useCallback(async () => {
    setLoading(true);
    try {
      initTelegramApp();
      const tg = getTelegramWebApp();
      const savedLang = (localStorage.getItem('televault_lang') as SupportedLanguage) || 'en';
      if (LANGUAGES.some((l) => l.code === savedLang)) {
        setLanguageState(savedLang);
      }

      const realTgUser = tg?.initDataUnsafe?.user;
      const startParam =
        tg?.initDataUnsafe?.start_param ||
        new URLSearchParams(window.location.search).get('startapp') ||
        undefined;

      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: tg?.initData || '',
          telegramUser: realTgUser,
          startParam,
        }),
      });

      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
        setWallet(data.wallet);
        if (data.coinSettings) setCoinSettings(data.coinSettings);
        if (data.adSettings) setAdSettings(data.adSettings);
        if (data.appSettings) setAppSettings(data.appSettings);

        // Fetch full transactions
        await fetchUserData(data.profile.id);
      }
    } catch (err) {
      console.error('Failed to init auth:', err);
      showToast('Connection to server established in offline mode', 'info');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchUserData = async (userId: string) => {
    try {
      const res = await fetch('/api/user/me', {
        headers: { 'x-user-id': userId },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) setProfile(data.profile);
        if (data.wallet) setWallet(data.wallet);
        if (data.walletTransactions) setWalletTransactions(data.walletTransactions);
        if (data.pointTransactions) setPointTransactions(data.pointTransactions);
      }
    } catch (err) {
      console.error('Failed to fetch user state:', err);
    }
  };

  const refreshUserData = async () => {
    if (!profile) return;
    await fetchUserData(profile.id);
  };

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <AppContext.Provider
      value={{
        profile,
        wallet,
        walletTransactions,
        pointTransactions,
        coinSettings,
        adSettings,
        appSettings,
        loading,
        language,
        setLanguage,
        t,
        activeTab,
        setActiveTab,
        refreshUserData,
        toasts,
        showToast,
        isRealTelegram: isRealTg,
        p2pModalOpen,
        setP2pModalOpen,
        convertModalOpen,
        setConvertModalOpen,
        withdrawModalOpen,
        setWithdrawModalOpen,
        qrModalOpen,
        setQrModalOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
