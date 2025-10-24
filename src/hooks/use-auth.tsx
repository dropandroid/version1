
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
    AndroidBridge?: {
        triggerGoogleSignIn: () => void;
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

  useEffect(() => {
    // This function must be added to your web app's code
    const signInFromAndroid = (googleIdToken: string) => {
      console.log("Attempting sign in from Android with token...");
      // 1. Create a Firebase credential from the token
      const credential = GoogleAuthProvider.credential(googleIdToken);
      
      // 2. Sign in with that credential
      signInWithCredential(auth, credential)
        .then(async (result) => {
          // Sign-in successful!
          console.log("Signed in from Android!", result.user);
          await handleAuthSuccess(result.user);
        })
        .catch((error) => {
          // Handle errors
          console.error("Android Sign-In Error", error);
          toast({
            variant: "destructive",
            title: "Android Sign-In Error",
            description: "Could not sign in using the provided token."
          });
        });
    };
    
    // Expose the function to the window object for the WebView to call
    window.signInFromAndroid = signInFromAndroid;

    // Cleanup function to remove it when the component unmounts
    return () => {
      delete window.signInFromAndroid;
    };
  }, [router, toast]);


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
      // Sign out to clean up the state if sign-in fails partway through
      await firebaseSignOut(auth);
      setUser(null);
      return 'error';
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // State updates will trigger through onAuthStateChanged
      setCustomerData(null); // Explicitly clear local storage
      router.push('/login'); // Redirect to login for a fresh start
    } catch (error) {
      console.error("Error signing out", error);
       toast({
          variant: "destructive",
          title: "Sign-Out Error",
          description: "Could not sign out properly. Please try again.",
      });
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
