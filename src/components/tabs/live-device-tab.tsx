'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wifi, Router, Info, Loader2, ExternalLink, Smartphone, Network } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeviceControl } from '@/hooks/useDeviceControl';


// --- Monitoring Mode Components ---

const DeviceCard = ({ deviceId, localIp, totalHours }: { deviceId: string, localIp: string, totalHours: number }) => {
  const litersUsed = (totalHours || 0) * 15;

  return (
    <a href={`http://${localIp}`} target="_blank" rel="noopener noreferrer" className="block hover:shadow-lg transition-shadow rounded-lg">
      <Card className="flex flex-col justify-between h-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base truncate">{deviceId}</CardTitle>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </div>
          <CardDescription>IP: {localIp}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-right">
            <p className="text-muted-foreground text-sm">Total Liters Used</p>
            <p className="text-3xl font-bold text-primary">{litersUsed.toFixed(1)}L</p>
            <p className="text-xs text-muted-foreground">{totalHours ? totalHours.toFixed(2) : '0.00'} hours</p>
          </div>
        </CardContent>
      </Card>
    </a>
  );
};

const MonitoringMode = () => {
  const { deviceData, connectionStatus } = useDeviceControl();

  if (connectionStatus === 'connecting') {
    return (
        <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
  }
  
  if (connectionStatus === 'no-ip' || !deviceData) {
    return (
        <Card className="text-center p-6">
            <Info className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold">No Online Devices Found</h3>
            <p className="text-sm text-muted-foreground mt-1">
                Your device doesn't seem to be connected to the local network. 
                Use the "New Device Setup" tab if this is a new device.
            </p>
        </Card>
    )
  }

  return (
    <div>
      {connectionStatus !== 'connected' ? (
         <Card className="text-center p-6">
            <Wifi className="w-12 h-12 mx-auto text-muted-foreground mb-3 animate-pulse" />
            <h3 className="font-semibold">Connecting to Device...</h3>
            <p className="text-sm text-muted-foreground mt-1">Attempting to establish a live connection with your device at {deviceData.customerId}.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DeviceCard 
                key={deviceData.customerId} 
                deviceId={deviceData.customerId!} 
                localIp={deviceData.customerId!}
                totalHours={deviceData.total_hours || 0}
            />
        </div>
      )}
    </div>
  );
};

// --- Configuration Mode Component ---

const ConfigurationMode = () => {
    
    const handleStartSetup = () => {
        // This will navigate the current app window to the device's config page.
        // The user must be connected to the device's hotspot first.
        window.location.href = 'http://192.168.4.1/scanwifi';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">New Device Setup</CardTitle>
                <CardDescription>Follow these steps to provision a new Droppurity device.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="bg-primary/10 p-4 rounded-lg space-y-3 mb-6">
                    <h3 className="font-semibold text-primary">Instructions</h3>
                    <ol className="text-sm text-primary/90 list-decimal list-inside space-y-2">
                        <li>Power on your new Droppurity device. It will begin broadcasting its own Wi-Fi network.</li>
                        <li>Go to your phone's Wi-Fi settings and connect to the network named <strong>droppurity</strong>.</li>
                        <li>Once connected, return to this app and tap the button below.</li>
                        <li>The device's Wi-Fi settings page will open. Follow the on-screen steps to connect it to your home Wi-Fi.</li>
                    </ol>
                </div>
                <Button onClick={handleStartSetup} className="w-full" size="lg">
                    <Network className="mr-2" />
                    Open Device Wi-Fi Settings
                </Button>
            </CardContent>
        </Card>
    )
}


export const LiveDeviceTab: React.FC = () => {
  return (
    <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Live Device Management</h2>
        <Tabs defaultValue="wifi-mode" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="wifi-mode"><Wifi className="mr-2"/> Online Device</TabsTrigger>
                <TabsTrigger value="hotspot-mode"><Router className="mr-2"/> New Device Setup</TabsTrigger>
            </TabsList>
            <TabsContent value="wifi-mode">
                <MonitoringMode />
            </TabsContent>
            <TabsContent value="hotspot-mode">
                <ConfigurationMode />
            </TabsContent>
        </Tabs>
    </div>
  );
};
