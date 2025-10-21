
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc } from 'firebase/firestore';

// --- Placeholder for Firebase Config ---
// In a real Firebase Studio environment, these would be injected.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Helper Components ---

const Card = ({ children, className = '' }) => (
  <div className={`bg-white shadow-md rounded-lg p-6 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, disabled = false, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:bg-gray-400 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

const Input = ({ value, onChange, placeholder, type = 'text', className = '' }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className}`}
  />
);

const Label = ({ children, htmlFor, className = '' }) => (
    <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-700 ${className}`}>
        {children}
    </label>
);


// --- Configuration Mode Component ---

const ConfigurationMode = ({ setMode }) => {
  const [deviceIp, setDeviceIp] = useState('192.168.4.1');
  const [networks, setNetworks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [configStatus, setConfigStatus] = useState('');

  const handleConnect = async () => {
    setIsLoading(true);
    setError('');
    setNetworks([]);
    try {
      const response = await fetch(`http://${deviceIp}/scanwifi`);
      if (!response.ok) {
        throw new Error('Device not found or did not respond correctly.');
      }
      const htmlText = await response.text();
      
      // Basic HTML parsing to extract SSIDs
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const foundNetworks = Array.from(doc.querySelectorAll('.network-item strong')).map(el => el.textContent);

      if (foundNetworks.length === 0) {
        setError('No WiFi networks found by the device. Try refreshing.');
      }

      setNetworks(foundNetworks);
      setIsConnected(true);
    } catch (e) {
      console.error('Failed to connect to device:', e);
      setError('Could not connect to the device. Ensure you are connected to the "droppurity" WiFi hotspot and the IP is correct.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    setConfigStatus('');
    setError('');
    try {
        const formData = new URLSearchParams();
        formData.append('ssid', ssid);
        formData.append('pass', password);

      const response = await fetch(`http://${deviceIp}/scanwifi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
      if (!response.ok) {
        throw new Error('Failed to send configuration to the device.');
      }
      setConfigStatus('Configuration sent. The device will now attempt to connect to your WiFi. Please switch your computer back to your local WiFi network to access the Monitoring Dashboard.');
      setSsid('');
      setPassword('');
    } catch (e) {
      console.error('Failed to save config:', e);
      setError('Failed to send configuration. Please check the device connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectNetwork = (netSsid) => {
    setSsid(netSsid);
  };

  return (
    <Card>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Device Configuration</h2>
      {!isConnected ? (
        <div>
          <p className="text-gray-600 mb-4">Connect to the device's hotspot (SSID: droppurity) and click below.</p>
          <div className="mb-4">
            <Label htmlFor="device-ip">Device IP Address</Label>
            <Input 
                id="device-ip"
                value={deviceIp} 
                onChange={(e) => setDeviceIp(e.target.value)} 
            />
          </div>
          <Button onClick={handleConnect} disabled={isLoading}>
            {isLoading ? 'Connecting...' : 'Connect to Device'}
          </Button>
        </div>
      ) : (
        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-3">WiFi Setup</h3>
          {networks.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-600 mb-2">Click a network to select it:</p>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                {networks.map(net => (
                  <div key={net} onClick={() => selectNetwork(net)} className="p-2 rounded-md hover:bg-blue-100 cursor-pointer text-sm">
                    {net}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <Label htmlFor="ssid">WiFi Name (SSID)</Label>
              <Input id="ssid" value={ssid} onChange={(e) => setSsid(e.target.value)} placeholder="Enter SSID manually" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter WiFi password" />
            </div>
          </div>
          <Button onClick={handleSaveConfig} disabled={isLoading || !ssid} className="mt-6 w-full">
            {isLoading ? 'Saving...' : 'Save & Connect to WiFi'}
          </Button>
        </div>
      )}
      {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
      {configStatus && <p className="text-green-600 mt-4 text-sm font-semibold">{configStatus}</p>}
    </Card>
  );
};


// --- Monitoring Mode Components ---

const DeviceCard = ({ deviceId, localIp }) => {
  const [deviceData, setDeviceData] = useState({ totalHoursRun: 0 });
  const [litersUsed, setLitersUsed] = useState(0);

  useEffect(() => {
    const dataDocRef = doc(db, 'device_data', deviceId);
    
    const unsubscribe = onSnapshot(dataDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDeviceData(data);
        const calculatedLiters = (data.totalHours || 0) * 15;
        setLitersUsed(calculatedLiters);
      } else {
        console.log(`No data document for device: ${deviceId}`);
      }
    }, (error) => {
      console.error(`Error listening to data for device ${deviceId}:`, error);
    });

    return () => unsubscribe();
  }, [deviceId]);

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <h3 className="text-lg font-bold text-gray-800 truncate">{deviceId}</h3>
        <p className="text-sm text-gray-500 mb-4">IP: {localIp}</p>
      </div>
      <div className="text-right">
        <p className="text-gray-600 text-sm">Total Liters Used</p>
        <p className="text-4xl font-bold text-blue-600">{litersUsed.toFixed(2)}</p>
      </div>
    </Card>
  );
};

const MonitoringMode = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    return <p className="text-center text-gray-500">Loading devices...</p>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Device Monitoring</h2>
      {devices.length === 0 ? (
        <p className="text-center text-gray-500">No online devices found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map(device => (
            <DeviceCard key={device.id} deviceId={device.deviceId} localIp={device.localIp} />
          ))}
        </div>
      )}
    </div>
  );
};


// --- Main App Component ---

export default function DeviceDashboardPage() {
  const [mode, setMode] = useState('config'); // 'config' or 'monitor'

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Device Dashboard</h1>
          <p className="text-lg text-gray-500">Provision new devices and monitor live data.</p>
        </header>

        <div className="flex justify-center mb-6 border-b border-gray-200">
            <button 
                onClick={() => setMode('config')}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${mode === 'config' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
                Device Configuration
            </button>
            <button 
                onClick={() => setMode('monitor')}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${mode === 'monitor' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
                Live Monitoring
            </button>
        </div>

        <main>
          {mode === 'config' ? <ConfigurationMode setMode={setMode} /> : <MonitoringMode />}
        </main>
      </div>
    </div>
  );
}
