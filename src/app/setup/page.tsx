
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Wifi, KeyRound, User, ChevronRight, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  ssid: z.string().min(1, "SSID is required"),
  password: z.string(),
  customerId: z.string().min(1, "Customer ID is required"),
});

type SetupFormValues = z.infer<typeof formSchema>;

export default function SetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [setupStatus, setSetupStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ssid: '',
      password: '',
      customerId: '',
    },
  });

  const onSubmit = async (values: SetupFormValues) => {
    setIsLoading(true);
    setSetupStatus('idle');
    setErrorMessage('');

    try {
      // The ESP8266 AP is on 192.168.4.1. We assume the user is connected to it.
      // The Next.js app is client-side, so it can make requests to this local IP.
      const response = await fetch('http://192.168.4.1/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error(`Device returned an error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        setSetupStatus('success');
        toast({
          title: 'Setup Successful!',
          description: 'Device is restarting. Connect your phone back to your home Wi-Fi and return to the app.',
        });
      } else {
        throw new Error(result.message || 'An unknown error occurred.');
      }
    } catch (error) {
      console.error('Setup failed:', error);
      setSetupStatus('error');
      let message = 'Failed to connect to device. Are you connected to the "AquaTrack-Setup" Wi-Fi?';
      if (error instanceof Error && error.message.includes('Device returned an error')) {
        message = 'The device rejected the configuration. Please check your inputs.';
      }
      setErrorMessage(message);
      toast({
        variant: 'destructive',
        title: 'Setup Failed',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-background min-h-screen font-body p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Device First-Time Setup</CardTitle>
          <CardDescription>Configure your AquaTrack device to connect to your home Wi-Fi.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-primary/10 p-4 rounded-lg space-y-3 mb-6">
            <h3 className="font-semibold text-primary">Instructions</h3>
            <ol className="text-sm text-primary/90 list-decimal list-inside space-y-2">
              <li>Power on your AquaTrack device.</li>
              <li>On your phone, go to Wi-Fi settings.</li>
              <li>Connect to the network named <strong>AquaTrack-Setup</strong>.</li>
              <li>Return to this page and fill out the form below.</li>
            </ol>
          </div>

          {setupStatus === 'success' ? (
            <div className="text-center p-6 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-green-700">Setup Complete!</h3>
                <p className="text-sm text-green-600/80 mt-2">
                    Your device is restarting. Please connect your phone back to your regular Wi-Fi network to use the app.
                </p>
                <Link href="/" passHref>
                    <Button className="mt-4">Go to Dashboard</Button>
                </Link>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="ssid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><Wifi className="mr-2 h-4 w-4" /> Wi-Fi Name (SSID)</FormLabel>
                      <FormControl>
                        <Input placeholder="YourHomeWiFi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><KeyRound className="mr-2 h-4 w-4" /> Wi-Fi Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><User className="mr-2 h-4 w-4" /> Customer ID</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., JH09d01301" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {setupStatus === 'error' && (
                    <div className="flex items-center p-3 bg-destructive/10 text-destructive rounded-lg">
                        <AlertTriangle className="h-5 w-5 mr-3 shrink-0"/>
                        <p className="text-sm font-medium">{errorMessage}</p>
                    </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Save Configuration <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
