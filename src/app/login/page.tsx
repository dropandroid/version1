
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Phone, LogOut } from "lucide-react";
import Link from "next/link";

const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6.02C43.97 37.63 46.98 31.76 46.98 24.55z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.82l-7.73-6.02c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
        <path fill="none" d="M0 0h48v48H0z"></path>
    </svg>
);


export default function LoginPage() {
    const { signInWithGoogle, loading, user, signOut } = useAuth();
    const [signInState, setSignInState] = useState<'default' | 'loading' | 'unregistered'>('default');

    const handleSignIn = async () => {
        // Check if the "AndroidBridge" we are about to create exists
        if (window.AndroidBridge && typeof window.AndroidBridge.triggerGoogleSignIn === 'function') {
            // If we are in the Android app, call the native code
            console.log("Calling AndroidBridge.triggerGoogleSignIn()");
            window.AndroidBridge.triggerGoogleSignIn();
        } else {
            // If we are in a normal browser, use the popup method
            console.log("Using standard web signInWithGoogle()");
            setSignInState('loading');
            const result = await signInWithGoogle();
            if (result === 'unregistered') {
                setSignInState('unregistered');
            } else if (result === 'error') {
                setSignInState('default'); // Reset on error
            }
            // On 'success', the auth hook will redirect automatically
        }
    };
    
    const handleCallSupport = () => {
        window.location.href = 'tel:7979784087';
    };

    const handleTryAgain = () => {
        signOut().then(() => {
            handleSignIn();
        });
    }

    const handleSignOut = () => {
        signOut().then(() => {
            setSignInState('default');
        });
    }

    const renderContent = () => {
        if (signInState === 'loading' || (loading && user && signInState !== 'unregistered')) {
            return (
                <div className="flex flex-col items-center justify-center">
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    <p className="mt-2 text-muted-foreground">Verifying your account...</p>
                </div>
            );
        }

        if (signInState === 'unregistered') {
             return (
                <div className="bg-card p-6 rounded-lg shadow-md border">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Email Not Registered</h3>
                    <p className="text-muted-foreground mb-4 text-sm">
                        The email <span className="font-semibold text-primary">{user?.email}</span> is not associated with an existing account.
                    </p>
                    <div className="space-y-3">
                        <Button size="lg" className="w-full" asChild>
                            <a href="https://droppurity.in" target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Buy Now
                            </a>
                        </Button>
                        <Button size="lg" variant="outline" className="w-full" onClick={handleCallSupport}>
                             <Phone className="mr-2 h-4 w-4" />
                            Already a customer? Call Support
                        </Button>
                        <div className="flex items-center justify-center space-x-4 pt-2">
                             <Button size="sm" variant="link" onClick={handleTryAgain}>
                                Try a different email
                            </Button>
                            <Button size="sm" variant="link" className="text-muted-foreground" onClick={handleSignOut}>
                                <LogOut className="mr-1 h-3 w-3" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                 <Button 
                    onClick={handleSignIn} 
                    size="lg" 
                    className="w-full"
                    disabled={signInState === 'loading'}
                >
                    <GoogleIcon />
                    Sign in with Google
                </Button>
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">New here?</p>
                    <Button size="lg" variant="outline" className="w-full mt-2" asChild>
                        <a href="https://droppurity.in" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Buy a new plan
                        </a>
                    </Button>
                </div>
            </div>
        );
    }


    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-md text-center">
                <h1 className="text-4xl font-bold text-primary mb-2">Droppurity</h1>
                <p className="text-muted-foreground mb-8">Monitor your water, effortlessly.</p>

                {renderContent()}
                
                <p className="text-xs text-muted-foreground mt-12">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    );
}
