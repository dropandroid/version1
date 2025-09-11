
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerStatus, setCustomerStatus] = useState<CustomerVerificationStatus>('unverified');
  const [customerData, setCustomerDataState] = useState<CustomerData | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        // Check for cached customer data
        try {
          const cachedData = localStorage.getItem(CUSTOMER_DATA_STORAGE_KEY);
          if (cachedData) {
            const parsedData: CustomerData = JSON.parse(cachedData);
            // Ensure cached data belongs to the current user
            if (parsedData.emailId === user.email || parsedData.google_email === user.email) {
              setCustomerDataState(parsedData);
              setCustomerStatus('verified');
            } else {
              // Clear stale data if user is different
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
    try {
      const result = await signInWithPopup(auth, provider);
      const userEmail = result.user.email;

      if (!userEmail) {
        throw new Error("Could not retrieve email from Google Sign-In.");
      }
      
      setUser(result.user);
      const customer = await getCustomerByEmail(userEmail);

      if (customer) {
        router.push('/verify-customer');
        return 'success';
      } else {
        return 'unregistered';
      }
    } catch (error) {
      console.error("Error during sign-in process:", error);
      if ((error as any).code !== 'auth/popup-closed-by-user') {
          toast({
              variant: "destructive",
              title: "Sign-In Error",
              description: "An unexpected error occurred. Please try again.",
          });
      }
      // Sign out to clean up the state if sign-in fails partway through
      await firebaseSignOut(auth);
      setUser(null);
      return 'error';
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setCustomerStatus('unverified');
      setCustomerData(null);
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, customerStatus, customerData: customerData, setCustomerStatus, setCustomerData, signInWithGoogle, signOut }}>
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
