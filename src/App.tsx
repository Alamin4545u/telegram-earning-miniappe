import React from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Header } from './components/layout/Header.tsx';
import { BottomNav } from './components/layout/BottomNav.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { EarnPage } from './pages/EarnPage.tsx';
import { TasksPage } from './pages/TasksPage.tsx';
import { WalletPage } from './pages/WalletPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { P2PTransferModal } from './components/modals/P2PTransferModal.tsx';
import { ConvertModal } from './components/modals/ConvertModal.tsx';
import { WithdrawModal } from './components/modals/WithdrawModal.tsx';
import { QrCodeModal } from './components/modals/QrCodeModal.tsx';
import { ToastContainer } from './components/modals/ToastContainer.tsx';
import { AlertTriangle, Loader2 } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { activeTab, appSettings, loading } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        <span className="text-xs font-mono">Initializing TeleVault...</span>
      </div>
    );
  }

  // Maintenance Mode Guard
  if (appSettings.maintenance_mode) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white">System Under Maintenance</h1>
        <p className="text-xs text-slate-400 max-w-sm">
          TeleVault is undergoing scheduled ledger upgrades. Please check back shortly or visit our Telegram support channel.
        </p>
        <a
          href={appSettings.telegram_support_url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-sky-500 text-slate-950 text-xs font-bold rounded-xl"
        >
          Open Support Channel
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-slate-950 pb-[env(safe-area-inset-bottom)]">
      {/* Clean Production Header */}
      <Header />

      {/* Active Screen Tab View */}
      <main className="flex-1">
        {activeTab === 'home' && <HomePage />}
        {activeTab === 'earn' && <EarnPage />}
        {activeTab === 'tasks' && <TasksPage />}
        {activeTab === 'wallet' && <WalletPage />}
        {activeTab === 'profile' && <ProfilePage />}
      </main>

      {/* Telegram Native Mobile Bottom Nav */}
      <BottomNav />

      {/* Global Modals */}
      <P2PTransferModal />
      <ConvertModal />
      <WithdrawModal />
      <QrCodeModal />

      {/* Toast Notification Stack */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
