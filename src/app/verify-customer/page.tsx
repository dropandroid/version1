
"use client";

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Fingerprint, KeyRound, Mail, ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { getCustomerByEmail } from '@/lib/dynamodb';

const formSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  pin: z.string().length(4, "PIN must be 4 digits"),
});

type VerificationFormValues = z.infer<typeof formSchema>;

const MAX_ATTEMPTS = 5;
const INITIAL_DELAY_MS = 2000;

export default function VerifyCustomerPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [delay, setDelay] = useState(0);
  const { user, loading, signOut, verifyCustomerPin } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: '',
      pin: '',
    },
  });

  useEffect(() => {
    if (user?.email) {
      setIsSuggesting(true);
      getCustomerByEmail(user.email)
        .then(customer => {
          if (customer?.generatedCustomerId) {
            form.setValue('customerId', customer.generatedCustomerId);
            toast({
              title: "Customer ID Found",
              description: "We've pre-filled your Customer ID based on your email.",
            });
          }
        })
        .catch(err => {
            console.error("Failed to suggest customer ID", err);
        })
        .finally(() => {
          setIsSuggesting(false);
        });
    }
  }, [user, form, toast]);

  useEffect(() => {
    if (delay > 0) {
      countdownInterval.current = setInterval(() => {
        setDelay(prev => prev - 1);
      }, 1000);
    } else if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
    }
    return () => {
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [delay]);

  const handleHybridSignOut = async () => {
    if (window.AndroidBridge && typeof window.AndroidBridge.triggerNativeSignOut === 'function') {
        window.AndroidBridge.triggerNativeSignOut();
    }
    await signOut(); 
  };

  const handleFailedAttempt = () => {
    const newAttemptCount = failedAttempts + 1;
    setFailedAttempts(newAttemptCount);
    
    if (newAttemptCount < MAX_ATTEMPTS) {
      const newDelay = Math.pow(2, newAttemptCount - 1) * (INITIAL_DELAY_MS / 1000);
      setDelay(Math.round(newDelay));
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: `Incorrect Customer ID or PIN. Please wait ${Math.round(newDelay)} seconds.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Too Many Failed Attempts',
        description: 'Please contact support for assistance.',
      });
    }
    setIsLoading(false);
  };

  const onSubmit = async (values: VerificationFormValues) => {
    setIsLoading(true);
    
    try {
      const customerData = await verifyCustomerPin(values.customerId, values.pin);

      if (customerData) {
        toast({
          title: 'Verification Successful!',
          description: 'Welcome to your AquaTrack dashboard.',
        });
        setFailedAttempts(0);
        router.push('/');
      } else {
        handleFailedAttempt();
      }
    } catch (error) {
      console.error("Verification request failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'Could not connect to the server. Please try again later.';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
      setIsLoading(false);
    }
  };

  const isLocked = failedAttempts >= MAX_ATTEMPTS;
  const isButtonDisabled = isLoading || isSuggesting || isLocked || delay > 0;

  if(loading || !user) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    )
  }

  const renderButtonContent = () => {
      if (isLoading) return <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying... </>;
      if (delay > 0) return `Try again in ${delay}s`;
      if (isLocked) return "Account Locked";
      return "Verify & Continue";
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Verify Your Account</CardTitle>
          <CardDescription>Enter your Customer ID and PIN to link your account.</CardDescription>
        </CardHeader>
        <CardContent>
           {isLocked && (
            <div className="mb-4 flex items-center p-3 bg-destructive/10 text-destructive rounded-lg">
              <ShieldAlert className="h-5 w-5 mr-3 shrink-0"/>
              <p className="text-sm font-medium">
                Too many incorrect attempts. For your security, access has been temporarily locked. Please contact support.
              </p>
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                        <Fingerprint className="mr-2 h-4 w-4" /> 
                        Customer ID
                        {isSuggesting && <Loader2 className="ml-2 h-3 w-3 animate-spin" />}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., JH09d01301" {...field} disabled={isLocked} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><KeyRound className="mr-2 h-4 w-4" /> PIN</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Last 4 digits of your mobile" maxLength={4} {...field} disabled={isLocked} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isButtonDisabled}>
                {renderButtonContent()}
              </Button>
            </form>
          </Form>
           <div className="text-xs text-muted-foreground mt-4 text-center flex items-center justify-center space-x-4">
            <div className="flex items-center">
              <Mail className="mr-2 h-3 w-3" /> {user.email}
            </div>
            <Button variant="link" size="sm" className="text-xs p-0 h-auto" onClick={handleHybridSignOut}>
              <LogOut className="mr-1 h-3 w-3" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
