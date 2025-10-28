
"use client";

import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  User,
  signOut as firebaseSignOut,
  Auth,
} from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { auth, app } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import type { CustomerData } from '@/lib/types';
import { getCustomerByEmail, saveFcmToken } from "@/lib/dynamodb";
import { useToast } from "@/hooks/use-toast";
import '@/lib/fcm-listener'; // Import to run the listener code

type CustomerVerificationStatus = 'unverified' | 'verified';
type SignInResult = 'success' | 'unregistered' | 'error';

interface AuthContextType {
  user: User | null;
  auth: Auth;
  loading: boolean;
  customerStatus: CustomerVerificationStatus;
  customerData: CustomerData | null;
  fcmToken: string | null; // New state for the token
  setCustomerStatus: (status: CustomerVerificationStatus) => void;
  setCustomerData: (data: CustomerData | null) => void;
  signInWithGoogle: () => Promise<SignInResult>;
  signOut: () => Promise<void>;
  requestNotificationPermission: () => Promise<NotificationPermission | 'unsupported'>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CUSTOMER_DATA_STORAGE_KEY = 'aquaTrackCustomerData';

// Extend window type for our native bridges
declare global {
  interface Window {
    signInFromAndroid?: (token: string) => void;
    signOutFromAndroid?: () => void;
    AndroidBridge?: {
        requestFCMToken: () => void;
        triggerGoogleSignIn: () => void;
        triggerNativeSignOut: () => void;
        onEmailNotFound: (email: string) => void;
        triggerPhoneCall: (phoneNumber: string) => void;
        openExternalUrl: (url: string) => void;
    };
  }
}

let pendingToken: string | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerStatus, setCustomerStatus] = useState<CustomerVerificationStatus>('unverified');
  const [customerData, setCustomerDataState] = useState<CustomerData | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null); // New state
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const handleAuthSuccess = async (user: User): Promise<SignInResult> => {
     const userEmail = user.email;
     if (!userEmail) {
       throw new Error("Could not retrieve email from the user.");
     }
     setUser(user);
     const customer = await getCustomerByEmail(userEmail);
     if (customer) {
       router.push('/verify-customer');
       return 'success';
     } else {
       return 'unregistered';
     }
  };

  const saveTokenToDb = async (token: string, customerId: string) => {
    console.log(`[Auth Hook] Calling API to save token for customer ${customerId}`);
    try {
      const response = await fetch('/api/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customerId, token: token })
      });
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      console.log("[Auth Hook] API call to save token finished successfully.");
    } catch (error) {
      console.error("[Auth Hook] Error calling /api/save-token:", error);
    }
  };
  

  useEffect(() => {
    if (typeof window !== 'undefined' && window.AndroidBridge && typeof window.AndroidBridge.requestFCMToken === 'function') {
      console.log("AuthProvider: Ready! Requesting FCM token from Android...");
      window.AndroidBridge.requestFCMToken();
    } else {
      console.log("AuthProvider: Not running in native Android app, skipping token request.");
    }
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out", error);
       toast({
          variant: "destructive",
          title: "Sign-Out Error",
          description: "Could not sign out properly. Please try again.",
      });
    }
  };

  const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications not supported in this browser.');
        return 'unsupported';
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      try {
        const messaging = getMessaging(app);
        const currentToken = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
        if (currentToken && customerData) {
          console.log('FCM Token:', currentToken);
          setFcmToken(currentToken); // Also set to state for display
          await saveFcmToken(customerData.generatedCustomerId, currentToken);
        } else {
          console.log('No registration token available or customer data not ready.');
        }
      } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
      }
    } else {
      console.log('Unable to get permission to notify.');
    }
    return permission;
  }
  
  useEffect(() => {
    const handleTokenReceived = (event: Event) => {
        const token = (event as CustomEvent<string>).detail;
        console.log("✅ [Step 2: The Catch] 'fcmTokenReceived' event caught in hook.");
        if (token) {
            setFcmToken(token); // Set the token to state for display
            if (customerData?.generatedCustomerId) {
                console.log(`[Auth Hook] Customer data is ready. Immediately saving token for ${customerData.generatedCustomerId}.`);
                saveTokenToDb(token, customerData.generatedCustomerId);
            } else {
                console.log("[Auth Hook] Customer data not yet available. Holding token.");
                pendingToken = token;
            }
        } else {
            console.warn("[Auth Hook] fcmTokenReceived event dispatched with a null or empty token.");
        }
    };
    window.addEventListener('fcmTokenReceived', handleTokenReceived);

    return () => {
        window.removeEventListener('fcmTokenReceived', handleTokenReceived);
    };
}, [customerData]);


  useEffect(() => {
    const signInFromAndroid = (googleIdToken: string) => {
      console.log("Attempting sign in from Android with token...");
      const credential = GoogleAuthProvider.credential(googleIdToken);
      
      signInWithCredential(auth, credential)
        .then(async (result) => {
          console.log("Signed in from Android!", result.user);
          const authResult = await handleAuthSuccess(result.user);
           if (authResult === 'unregistered' && window.AndroidBridge && typeof window.AndroidBridge.onEmailNotFound === 'function') {
                if (result.user.email) {
                    window.AndroidBridge.onEmailNotFound(result.user.email);
                }
            }
        })
        .catch((error) => {
          console.error("Android Sign-In Error", error);
          toast({
            variant: "destructive",
            title: "Android Sign-In Error",
            description: "Could not sign in using the provided token."
          });
        });
    };

    const signOutFromAndroid = () => {
        console.log("Signing out via Android bridge...");
        signOut();
    };

    window.signInFromAndroid = signInFromAndroid;
    window.signOutFromAndroid = signOutFromAndroid;

    return () => {
      delete window.signInFromAndroid;
      delete window.signOutFromAndroid;
    };
  }, [router, toast]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        try {
          const cachedData = localStorage.getItem(CUSTOMER_DATA_STORAGE_KEY);
          if (cachedData) {
            const parsedData: CustomerData = JSON.parse(cachedData);
            if (parsedData.emailId === user.email || parsedData.google_email === user.email) {
              setCustomerDataState(parsedData);
              setCustomerStatus('verified');
            } else {
              localStorage.removeItem(CUSTOMER_DATA_STORAGE_KEY);
            }
          }
        } catch (e) {
          console.error("Failed to parse customer data from localStorage", e);
          localStorage.removeItem(CUSTOMER_DATA_STORAGE_KEY);
        }
      } else {
        setUser(null);
        setCustomerStatus('unverified');
        setCustomerDataState(null);
        localStorage.removeItem(CUSTOMER_DATA_STORAGE_KEY);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
     if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then(function(registration) {
          console.log('Service Worker registered with scope:', registration.scope);
        }).catch(function(error) {
          console.log('Service Worker registration failed:', error);
        });
        
        const messaging = getMessaging(app);
        onMessage(messaging, (payload) => {
            console.log('Message received. ', payload);
            toast({
                title: payload.notification?.title,
                description: payload.notification?.body,
            });
        });
     }
  }, [toast]);


  const setCustomerData = (data: CustomerData | null) => {
    setCustomerDataState(data);
    if (data) {
        try {
            localStorage.setItem(CUSTOMER_DATA_STORAGE_KEY, JSON.stringify(data));
            console.log("[Auth Hook] Customer data set. Checking for pending token.");
            if (pendingToken && data.generatedCustomerId) {
                console.log(`[Auth Hook] Pending token found. Saving token now for ${data.generatedCustomerId}.`);
                saveTokenToDb(data.generatedCustomerId, pendingToken);
                pendingToken = null; // Important: Clear the token after use
            }
        } catch (e) {
            console.error("[Auth Hook] Failed to save customer data to localStorage", e);
        }
    } else {
        localStorage.removeItem(CUSTOMER_DATA_STORAGE_KEY);
    }
};


   useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login' || pathname === '/verify-customer';

    if (!user && !isAuthPage) {
      router.push('/login');
    } else if (user && pathname === '/login' && customerStatus !== 'unverified') {
        router.push('/');
    } else if (user && customerStatus === 'unverified' && pathname !== '/verify-customer' && pathname !== '/login') {
      router.push('/verify-customer');
    } else if (user && customerStatus === 'verified' && pathname === '/verify-customer') {
      router.push('/');
    }

  }, [user, loading, pathname, router, customerStatus]);

  const signInWithGoogle = async (): Promise<SignInResult> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      return await handleAuthSuccess(result.user);
    } catch (error) {
      console.error("Error during sign-in process:", error);
      if ((error as any).code !== 'auth/popup-closed-by-user') {
          toast({
              variant: "destructive",
              title: "Sign-In Error",
              description: "An unexpected error occurred. Please try again.",
          });
      }
      await firebaseSignOut(auth);
      setUser(null);
      return 'error';
    }
  };

  return (
    <AuthContext.Provider value={{ user, auth, loading, customerStatus, customerData, fcmToken, setCustomerStatus, setCustomerData, signInWithGoogle, signOut, requestNotificationPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

    