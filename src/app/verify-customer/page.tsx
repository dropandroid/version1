
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Fingerprint, KeyRound, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { verifyCustomerPin, getCustomerByEmail } from '@/lib/dynamodb';

const formSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  pin: z.string().length(4, "PIN must be 4 digits"),
});

type VerificationFormValues = z.infer<typeof formSchema>;

export default function VerifyCustomerPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(true);
  const { user, loading, setCustomerStatus, setCustomerData } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

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


  const onSubmit = async (values: VerificationFormValues) => {
    setIsLoading(true);
    
    if (!user?.email) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No user email found. Please sign in again.",
        });
        setIsLoading(false);
        return;
    }
    
    try {
      const customerData = await verifyCustomerPin(values.customerId, values.pin, user.email);

      if (customerData) {
        toast({
          title: 'Verification Successful!',
          description: 'Welcome to your AquaTrack dashboard.',
        });
        setCustomerData(customerData);
        setCustomerStatus('verified');
        router.push('/');
      } else {
        toast({
          variant: 'destructive',
          title: 'Verification Failed',
          description: 'Invalid Customer ID or PIN. Please try again.',
        });
        setIsLoading(false);
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

  if(loading || !user) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Verify Your Account</CardTitle>
          <CardDescription>Enter your Customer ID and PIN to link your account.</CardDescription>
        </CardHeader>
        <CardContent>
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
                      <Input placeholder="e.g., JH09d01301" {...field} />
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
                      <Input type="password" placeholder="Last 4 digits of your mobile" maxLength={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading || isSuggesting}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </Button>
            </form>
          </Form>
           <p className="text-xs text-muted-foreground mt-4 text-center flex items-center justify-center">
            <Mail className="mr-2 h-3 w-3" /> {user.email}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
