
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Fingerprint, KeyRound } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  pin: z.string().length(4, "PIN must be 4 digits"),
});

type VerificationFormValues = z.infer<typeof formSchema>;

export default function VerifyCustomerPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { user, loading, setCustomerStatus } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: '',
      pin: '',
    },
  });

  const onSubmit = async (values: VerificationFormValues) => {
    setIsLoading(true);
    
    // This is the URL from your ESP8266 code. 
    // We will call this to verify the customer.
    const verifyUrl = 'https://fwtq5pp3tbhmasdvxphfzeyzuq0ukowc.lambda-url.eu-north-1.on.aws/';
    
    try {
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          google_email: user?.email,
          customerId: values.customerId,
          pin: values.pin,
        }),
      });

      if (response.ok) {
        // Assuming a 200 OK response means successful verification
        toast({
          title: 'Verification Successful!',
          description: 'Welcome to your AquaTrack dashboard.',
        });
        setCustomerStatus('verified');
        router.push('/');
      } else {
        // Handle non-200 responses (e.g., 401, 404) as failed verification
        const errorData = await response.json().catch(() => null);
        toast({
          variant: 'destructive',
          title: 'Verification Failed',
          description: errorData?.message || 'Invalid Customer ID or PIN. Please try again.',
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Verification request failed:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not connect to the server. Please try again later.',
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
                    <FormLabel className="flex items-center"><Fingerprint className="mr-2 h-4 w-4" /> Customer ID</FormLabel>
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
              <Button type="submit" className="w-full" disabled={isLoading}>
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
        </CardContent>
      </Card>
    </div>
  );
}
