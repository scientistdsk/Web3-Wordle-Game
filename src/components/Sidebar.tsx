import React from 'react';
import { Button } from './ui/button';
import { WalletConnect } from './WalletConnect';
import { NavigationPage } from '../App';
import {
  Dice3,
  Target,
  Plus,
  Trophy,
  User,
  Moon,
  Sun,
  X,
  TestTube,
  Shield
} from 'lucide-react';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  onClose: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const navigationItems = [
  { id: 'random-word' as NavigationPage, label: 'Play Random Word', icon: Dice3 },
  { id: 'bounty-hunt' as NavigationPage, label: 'Join a Bounty Hunt', icon: Target },
  { id: 'create-bounty' as NavigationPage, label: 'Create Advanced Wordle', icon: Plus },
  { id: 'leaderboard' as NavigationPage, label: 'Leaderboard', icon: Trophy },
  { id: 'profile' as NavigationPage, label: 'Profile', icon: User },
  { id: 'admin' as NavigationPage, label: 'Admin Dashboard', icon: Shield },
  { id: 'payment-test' as NavigationPage, label: 'Payment Testing', icon: TestTube },
];

export function Sidebar({ currentPage, onNavigate, onClose, isDark, onToggleTheme }: SidebarProps) {
  return (
    <div className="h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-sidebar-foreground">Wordle Bounty</h2>
          <p className="text-sm text-sidebar-foreground/70">Web3 Word Game</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="lg:hidden"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={`
                w-full justify-start gap-3 h-auto py-3 px-4
                ${isActive 
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }
              `}
              onClick={() => {
                onNavigate(item.id);
                onClose();
              }}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Button>
          );
        })}
      </nav>

      {/* Wallet & Theme */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <WalletConnect />
        <Button
          variant="ghost"
          onClick={onToggleTheme}
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </Button>
      </div>
    </div>
  );
}