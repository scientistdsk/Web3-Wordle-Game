import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { InitialDialog } from './components/InitialDialog';
import { BountyHuntPage } from './components/BountyHuntPage';
import { ProfilePage } from './components/ProfilePage';
import { GameplayPage } from './components/GameplayPage';
import { CreateBountyPage } from './components/CreateBountyPage';
import { LeaderboardPage } from './components/LeaderboardPage';
import { RandomWordPage } from './components/RandomWordPage';
import { PaymentTestPage } from './components/PaymentTestPage';
import { WalletProvider } from './components/WalletContext';
import { Button } from './components/ui/button';

export type NavigationPage = 'bounty-hunt' | 'profile' | 'gameplay' | 'create-bounty' | 'leaderboard' | 'random-word' | 'payment-test';

export default function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('bounty-hunt');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showInitialDialog, setShowInitialDialog] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [currentBountyId, setCurrentBountyId] = useState<string | null>(null);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleNavigateToGameplay = (bountyId: string) => {
    setCurrentBountyId(bountyId);
    setCurrentPage('gameplay');
  };

  const handleBackToBountyHunt = () => {
    setCurrentBountyId(null);
    setCurrentPage('bounty-hunt');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'bounty-hunt':
        return <BountyHuntPage onNavigateToGameplay={handleNavigateToGameplay} />;
      case 'profile':
        return <ProfilePage onCreateBounty={() => setCurrentPage('create-bounty')} />;
      case 'gameplay':
        return <GameplayPage bountyId={currentBountyId} onBackToBountyHunt={handleBackToBountyHunt} />;
      case 'create-bounty':
        return <CreateBountyPage />;
      case 'leaderboard':
        return <LeaderboardPage />;
      case 'random-word':
        return <RandomWordPage />;
      case 'payment-test':
        return <PaymentTestPage />;
      default:
        return <BountyHuntPage onNavigateToGameplay={handleNavigateToGameplay} />;
    }
  };

  return (
    <WalletProvider>
      <div className={`min-h-screen flex ${isDark ? 'dark' : ''}`}>
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <Sidebar 
            currentPage={currentPage}
            onNavigate={setCurrentPage}
            onClose={() => setSidebarOpen(false)}
            isDark={isDark}
            onToggleTheme={toggleTheme}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Mobile Header */}
          <div className="lg:hidden bg-background border-b px-4 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-medium">Wordle Bounty</h1>
            <div className="w-9" /> {/* Spacer for centering */}
          </div>

          {/* Page Content */}
          <main className="flex-1 p-4 lg:p-6">
            {renderPage()}
          </main>
        </div>

        {/* Initial Dialog */}
        {showInitialDialog && (
          <InitialDialog 
            onClose={() => setShowInitialDialog(false)}
            onNavigateToBountyHunt={() => {
              setCurrentPage('bounty-hunt');
              setShowInitialDialog(false);
            }}
            onNavigateToCreateBounty={() => {
              setCurrentPage('create-bounty');
              setShowInitialDialog(false);
            }}
          />
        )}
      </div>
    </WalletProvider>
  );
}