import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Home, Flame, CheckSquare, WalletCards, User } from 'lucide-react';
import { triggerHaptic } from '../../lib/telegram.ts';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, t } = useApp();

  const navItems = [
    { id: 'home', label: t('nav.home'), icon: Home },
    { id: 'earn', label: t('nav.earn'), icon: Flame },
    { id: 'tasks', label: t('nav.tasks'), icon: CheckSquare },
    { id: 'wallet', label: t('nav.wallet'), icon: WalletCards },
    { id: 'profile', label: t('nav.profile'), icon: User },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-900 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around max-w-lg mx-auto py-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                triggerHaptic('light');
                setActiveTab(item.id);
              }}
              className={`flex flex-col items-center justify-center w-16 py-1.5 transition-all relative ${
                isActive ? 'text-sky-400 font-semibold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400/80"></span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-full">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
