
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
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import type { CustomerData } from '@/lib/types';
import { getCustomerByEmail } from "@/lib/dynamodb";
import { useToast } from "@/hooks/use-toast";

type CustomerVerificationStatus = 'unverified' | 'verified';
type SignInResult = 'success' | 'unregistered' | 'error';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  customerStatus: CustomerVerificationStatus;
  customerData: CustomerData | null;
  setCustomerStatus: (status: CustomerVerificationStatus) => void;
  setCustomerData: (data: CustomerData | null) => void;
  signInWithGoogle: () => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CUSTOMER_DATA_STORAGE_KEY = 'aquaTrackCustomerData';

// Extend window type for our native bridges
declare global {
  interface Window {
    signInFromAndroid?: (token: string) => void;
    signOutFromAndroid?: () => void;
    AndroidBridge?: {
        triggerGoogleSignIn: () => void;
        triggerNativeSignOut: () => void;
        onEmailNotFound: (email: string) => void;
        triggerPhoneCall: (phoneNumber: string) => void;
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerStatus, setCustomerStatus] = useState<CustomerVerificationStatus>('unverified');
  const [customerData, setCustomerDataState] = useState<CustomerData | null>(null);
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

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // State updates will trigger through onAuthStateChanged, which handles state clearing.
      // Redirecting ensures a clean start.
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

  const setCustomerData = (data: CustomerData | null) => {
    setCustomerDataState(data);
    if (data) {
      try {
        localStorage.setItem(CUSTOMER_DATA_STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.error("Failed to save customer data to localStorage", e);
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
    <AuthContext.Provider value={{ user, loading, customerStatus, customerData, setCustomerStatus, setCustomerData, signInWithGoogle, signOut }}>
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
