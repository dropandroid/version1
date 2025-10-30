
'use client';

import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Wifi, Router } from 'lucide-react';

// --- Firebase Initialization ---
function getClientApp() {
  if (typeof window === 'undefined') return null; // do not run on server/build
  if (!getApps().length) {
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };
      initializeApp(firebaseConfig);
  }
  return getApp();
}

const app = getClientApp();
const db = app ? getFirestore(app) : null;


// --- Configuration Mode Component ---

const ConfigurationMode = () => {

  const handleSetupClick = () => {
    if (window.AndroidBridge && typeof window.AndroidBridge.startDeviceSetup === 'function') {
      console.log("Calling AndroidBridge.startDeviceSetup()");
      window.AndroidBridge.startDeviceSetup();
    } else {
      alert("This feature is only available on the native Android app. Please open the app on your device to configure a new RO unit.");
      console.warn("AndroidBridge.startDeviceSetup not found.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-center items-center mb-4">
          <Wifi className="w-12 h-12 text-primary" />
        </div>
        <CardTitle className="text-center">Configure New Device</CardTitle>
        <CardDescription className="text-center">
          Add a new AquaTrack device to your account by starting the setup process.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-6 text-center">
          <p>This will open the device provisioning screen on your phone to connect the RO unit to your local Wi-Fi.</p>
        </div>
        <Button size="lg" className="w-full" onClick={handleSetupClick}>
          <Router className="mr-2 h-5 w-5" />
          Start Device Setup
        </Button>
      </CardContent>
    </Card>
  );
};


// --- Monitoring Mode Components ---

const DeviceCard = ({ deviceId, localIp }) => {
  const [deviceData, setDeviceData] = useState<{totalHours?: number} | null>(null);
  const [litersUsed, setLitersUsed] = useState(0);

  useEffect(() => {
    if (!db || !deviceId) return;
    const dataDocRef = doc(db, 'device_data', deviceId);
    
    const unsubscribe = onSnapshot(dataDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDeviceData(data);
        const calculatedLiters = (data.totalHours || 0) * 15;
        setLitersUsed(calculatedLiters);
      } else {
        console.log(`No data document for device: ${deviceId}`);
        setDeviceData(null);
      }
    }, (error) => {
      console.error(`Error listening to data for device ${deviceId}:`, error);
    });

    return () => unsubscribe();
  }, [deviceId]);

  return (
    <Card className="flex flex-col justify-between p-4">
      <div>
        <h3 className="text-base font-bold text-foreground truncate" title={deviceId}>{deviceId}</h3>
        <p className="text-xs text-muted-foreground mb-3">IP: {localIp || 'Unknown'}</p>
      </div>
      {deviceData !== null ? (
        <div className="text-right">
          <p className="text-muted-foreground text-xs">Total Liters Used</p>
          <p className="text-2xl font-bold text-primary">{litersUsed.toFixed(1)} L</p>
        </div>
      ) : (
         <div className="flex items-center justify-center text-xs text-muted-foreground">
            <Loader2 className="mr-2 h-3 w-3 animate-spin"/>
            <span>Waiting for data...</span>
        </div>
      )}
    </Card>
  );
};

const MonitoringMode = () => {
  const [devices, setDevices] = useState<{id: string, deviceId: string, localIp: string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
        setLoading(false);
        return;
    }
    const devicesColRef = collection(db, 'devices');
    
    const unsubscribe = onSnapshot(devicesColRef, (snapshot) => {
      const deviceList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as {id: string, deviceId: string, localIp: string}));
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
        <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
    );
  }
  
  if (!db) {
    return <p className="text-center text-destructive">Firebase is not initialized.</p>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Device Monitoring</CardTitle>
        <CardDescription>Real-time status of all connected devices on your network.</CardDescription>
      </CardHeader>
      <CardContent>
        {devices.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No online devices found. Please configure a device to see its status here.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map(device => (
              <DeviceCard key={device.id} deviceId={device.deviceId} localIp={device.localIp} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};


// --- Main App Component ---

export default function DeviceDashboardPage() {
  const [mode, setMode] = useState('monitor'); // 'monitor' or 'config'

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">Device Dashboard</h1>
          <p className="text-lg text-muted-foreground">Provision new devices and monitor live data.</p>
        </header>

        <div className="flex justify-center mb-6 border-b">
            <button 
                onClick={() => setMode('monitor')}
                className={`px-6 py-2 text-sm font-medium border-b-2 transition-colors ${mode === 'monitor' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
                Live Monitoring
            </button>
            <button 
                onClick={() => setMode('config')}
                className={`px-6 py-2 text-sm font-medium border-b-2 transition-colors ${mode === 'config' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
                Device Configuration
            </button>
        </div>

        <main className="max-w-4xl mx-auto">
          {mode === 'config' ? <ConfigurationMode /> : <MonitoringMode />}
        </main>
      </div>
    </div>
  );
}
