
"use client";

import { Bell } from 'lucide-react';
import type { FC } from 'react';

interface HeaderProps {
  notificationCount: number;
}

export const Header: FC<HeaderProps> = ({ notificationCount }) => {
  return (
    <header className="sticky top-0 z-10 bg-card shadow-sm p-4 flex justify-between items-center">
      <div>
        <h1 className="text-lg font-bold text-foreground">Drop Purity</h1>
        <p className="text-xs text-muted-foreground">RO Monitor v2.1</p>
      </div>
      <div className="relative">
        <Bell className="w-6 h-6 text-muted-foreground" />
        {notificationCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {notificationCount}
          </span>
        )}
      </div>
    </header>
  );
};
