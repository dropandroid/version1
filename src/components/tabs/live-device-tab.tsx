
'use client';

import React, { useState, useEffect } from 'react';
import { getFirestore, collection, onSnapshot, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wifi, Router, Info, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/use-auth';
import { app } from '@/lib/firebase'; // Import the central app instance

const db = getFirestore(app);

// --- Monitoring Mode Components ---

const DeviceCard = ({ deviceId, localIp, totalHours }) => {
  const litersUsed = (totalHours || 0) * 15;

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="pb-2">
        <CardTitle className="text-base truncate">{deviceId}</CardTitle>
        <CardDescription>IP: {localIp}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-right">
          <p className="text-muted-foreground text-sm">Total Liters Used</p>
          <p className="text-3xl font-bold text-primary">{litersUsed.toFixed(1)}L</p>
           <p className="text-xs text-muted-foreground">{totalHours.toFixed(2)} hours</p>
        </div>
      </CardContent>
    </Card>
  );
};

const MonitoringMode = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
        setLoading(false);
        return;
    };
    const devicesColRef = collection(db, 'devices');
    
    const unsubscribe = onSnapshot(devicesColRef, (snapshot) => {
      const deviceList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDevices(deviceList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching devices:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
        <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
  }
  
  if (!db) {
    return <p className="text-center text-destructive">Firebase is not initialized.</p>
  }

  return (
    <div>
      {devices.length === 0 ? (
         <Card className="text-center p-6">
            <Info className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold">No Online Devices Found</h3>
            <p className="text-sm text-muted-foreground mt-1">Use the "Device Setup" tab to configure a new device. Once connected, it will appear here.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map(device => (
            <DeviceCard 
                key={device.id} 
                deviceId={device.deviceId} 
                localIp={device.localIp}
                totalHours={device.totalHoursRun}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- Configuration Mode Component ---

const ConfigurationMode = () => {
    
    const handleSetupClick = () => {
         if (window.AndroidBridge && window.AndroidBridge.startDeviceSetup) {
            console.log("Calling AndroidBridge.startDeviceSetup()");
            window.AndroidBridge.startDeviceSetup();
        } else {
            alert("This feature is only available on the Android app. Please open the app to set up a new device.");
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Hotspot Mode</CardTitle>
                <CardDescription>Provision a new device by connecting to its local hotspot.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="bg-primary/10 p-4 rounded-lg space-y-3 mb-6">
                    <h3 className="font-semibold text-primary">Instructions</h3>
                    <ol className="text-sm text-primary/90 list-decimal list-inside space-y-2">
                        <li>Power on your AquaTrack device.</li>
                        <li>Click the "Start Device Setup" button below.</li>
                        <li>Your phone will open a new screen to connect to the device's Wi-Fi.</li>
                        <li>Follow the on-screen steps to complete setup.</li>
                    </ol>
                </div>
                <Button onClick={handleSetupClick} className="w-full" size="lg">
                    Start Device Setup
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
                <TabsTrigger value="wifi-mode"><Wifi className="mr-2"/> WiFi Mode</TabsTrigger>
                <TabsTrigger value="hotspot-mode"><Router className="mr-2"/> Device Setup</TabsTrigger>
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
