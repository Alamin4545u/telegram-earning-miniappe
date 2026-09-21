/**
 * Telegram WebApp Integration & Simulator Layer
 * Works in real Telegram WebApp (iOS, Android, Desktop)
 * and provides dev simulation inside standard browser & preview frames.
 */

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface TelegramWebAppContext {
  initData: string;
  initDataUnsafe?: {
    user?: TelegramWebAppUser;
    start_param?: string;
    auth_date?: number;
    hash?: string;
  };
  themeParams?: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  colorScheme?: 'light' | 'dark';
  isExpanded?: boolean;
  viewportHeight?: number;
  viewportStableHeight?: number;
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebAppContext;
    };
  }
}

// Simulated users for quick testing & P2P transfers in AI Studio / Browser preview
export const SIMULATED_USERS: {
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username: string;
  photo_url: string;
}[] = [
  {
    telegram_id: 981815824,
    first_name: 'Alex',
    last_name: 'Dev',
    username: 'alex_founder',
    photo_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  },
  {
    telegram_id: 849201948,
    first_name: 'Maria',
    last_name: 'Silva',
    username: 'maria_brazil',
    photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  },
  {
    telegram_id: 712395821,
    first_name: 'Kenji',
    last_name: 'Takahashi',
    username: 'kenji_crypto',
    photo_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
  },
];

export function getTelegramWebApp(): TelegramWebAppContext | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function isRealTelegramMiniApp(): boolean {
  const tg = getTelegramWebApp();
  return Boolean(tg && tg.initData && tg.initData.length > 0);
}

export function initTelegramApp() {
  const tg = getTelegramWebApp();
  if (tg) {
    try {
      tg.ready();
      tg.expand();
    } catch (e) {
      console.warn('Telegram WebApp init notice:', e);
    }
  }
}

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' = 'light') {
  const tg = getTelegramWebApp();
  if (tg?.HapticFeedback) {
    try {
      if (type === 'success' || type === 'error' || type === 'warning') {
        tg.HapticFeedback.notificationOccurred(type);
      } else {
        tg.HapticFeedback.impactOccurred(type);
      }
    } catch {
      // ignore
    }
  }
}
