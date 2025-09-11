
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
import { WifiOff, User, Home as HomeIcon, Phone, MapPin } from 'lucide-react';
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

const DisconnectedState: FC = () => {
    const { customerData } = useAuth();
    
    return (
        <div className="p-4 mt-8">
            <Card>
                <CardHeader>
                    <div className="flex justify-center items-center mb-4">
                        <WifiOff className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-center">No Device Connected</CardTitle>
                    <CardDescription className="text-center">
                        Your account is verified. Please connect your AquaTrack device to begin monitoring.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {customerData && (
                        <div className="mb-6 border-t pt-4">
                             <h3 className="text-lg font-semibold text-center mb-4 text-primary">Customer Details</h3>
                             <div className="space-y-3 text-sm">
                                <div className="flex items-center"><User className="w-4 h-4 mr-3 text-muted-foreground"/><span className="font-medium">{customerData.customerName}</span></div>
                                <div className="flex items-center"><MapPin className="w-4 h-4 mr-3 text-muted-foreground"/><span className="font-medium">{customerData.customerAddress}, {customerData.customerCity}</span></div>
                                <div className="flex items-center"><Phone className="w-4 h-4 mr-3 text-muted-foreground"/><span className="font-medium">{customerData.customerPhone}</span></div>
                                <div className="flex items-center"><HomeIcon className="w-4 h-4 mr-3 text-muted-foreground"/><span className="font-medium">Customer ID: {customerData.generatedCustomerId}</span></div>
                            </div>
                        </div>
                    )}
                    <Link href="/setup" passHref>
                        <Button size="lg" className="w-full">Connect Device</Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
};


export default function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const roData = useRoData();
  const { user, loading, customerStatus, customerData } = useAuth();

  if (loading || !user || customerStatus !== 'verified' || !customerData) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    )
  }

  const isConnected = roData.roDevice.serialNumber !== '';

  const renderTab = () => {
    if (roData.isInitialLoading && isConnected) {
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
