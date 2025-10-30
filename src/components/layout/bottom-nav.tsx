"use client";

import type { FC, Dispatch, SetStateAction } from 'react';
import { Home, BarChart3, Settings, User, Router } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
}

const navItems = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'live', icon: Router, label: 'Live' },
  { id: 'settings', icon: Settings, label: 'Settings' },
  { id: 'profile', icon: User, label: 'Profile' }
];

export const BottomNav: FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-card border-t shadow-lg z-20">
      <div className="flex">
        {navItems.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 py-3 px-2 text-center transition-all duration-200 ease-in-out',
              activeTab === tab.id 
                ? 'text-primary bg-primary/10 transform scale-105' 
                : 'text-muted-foreground hover:text-primary'
            )}
            aria-current={activeTab === tab.id}
          >
            <tab.icon className="w-5 h-5 mx-auto mb-1" />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
