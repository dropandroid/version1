
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

// Add a new state for customer verification
type CustomerVerificationStatus = 'unverified' | 'verified';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  customerStatus: CustomerVerificationStatus;
  setCustomerStatus: (status: CustomerVerificationStatus) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerStatus, setCustomerStatus] = useState<CustomerVerificationStatus>('unverified');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        // Reset verification status on logout
        setCustomerStatus('unverified');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

   useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login' || pathname === '/verify-customer';

    if (!user && !isAuthPage) {
      router.push('/login');
    } else if (user && pathname === '/login') {
      router.push(customerStatus === 'verified' ? '/' : '/verify-customer');
    } else if (user && customerStatus === 'unverified' && pathname !== '/verify-customer') {
      router.push('/verify-customer');
    } else if (user && customerStatus === 'verified' && pathname === '/verify-customer') {
      router.push('/');
    }

  }, [user, loading, pathname, router, customerStatus]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // On successful Google sign-in, redirect to the verification page
      router.push('/verify-customer');
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, customerStatus, setCustomerStatus, signInWithGoogle, signOut }}>
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
