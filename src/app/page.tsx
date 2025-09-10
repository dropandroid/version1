
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
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WifiOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

const AppSkeleton: FC = () => (
  <div className="p-4 space-y-4">
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-28 w-full" />
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
    <Skeleton className="h-40 w-full" />
  </div>
);

const DisconnectedState: FC = () => (
    <div className="p-4 mt-8">
        <Card className="text-center">
            <CardHeader>
                <WifiOff className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <CardTitle>No Device Connected</CardTitle>
                <CardDescription>
                    It looks like you haven't set up your AquaTrack device yet.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                    Please go to the setup page to connect your device to your Wi-Fi network.
                </p>
                <Link href="/setup" passHref>
                    <Button>Go to Device Setup</Button>
                </Link>
            </CardContent>
        </Card>
    </div>
);


export default function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const roData = useRoData();
  const { user, loading, customerStatus } = useAuth();

  if (loading || !user || customerStatus !== 'verified') {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    )
  }

  // A simple way to check if data has been loaded or is still in its initial "disconnected" state.
  const isConnected = roData.roDevice.serialNumber !== '';

  const renderTab = () => {
    if (roData.isInitialLoading) {
      return <AppSkeleton />;
    }
    if (!isConnected) {
        return <DisconnectedState />;
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
      {isConnected && <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />}
    </div>
  );
}
