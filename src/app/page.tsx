"use client";

import type { FC } from 'react';
import { useState } from 'react';
import { useRoData } from '@/hooks/use-ro-data';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { HomeTab } from '@/components/tabs/home-tab';
import { AnalyticsTab } from '@/components/tabs/analytics-tab';
import { SettingsTab } from '@/components/tabs/settings-tab';
import { ProfileTab } from '@/components/tabs/profile-tab';
import { Skeleton } from '@/components/ui/skeleton';

const AppSkeleton: FC = () => (
  <div className="p-4 space-y-4">
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-28 w-full" />
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
    <Skeleton className="h-40 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

export default function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const roData = useRoData();

  const renderTab = () => {
    if (roData.isInitialLoading) {
      return <AppSkeleton />;
    }
    switch (activeTab) {
      case 'home':
        return <HomeTab {...roData} />;
      case 'analytics':
        return <AnalyticsTab {...roData} />;
      case 'settings':
        return <SettingsTab {...roData} />;
      case 'profile':
        return <ProfileTab {...roData} />;
      default:
        return <HomeTab {...roData} />;
    }
  };

  return (
    <div className="max-w-md mx-auto bg-background min-h-screen font-body">
      <Header notificationCount={roData.notifications.length} />
      <main className="pb-24">
        {renderTab()}
      </main>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
