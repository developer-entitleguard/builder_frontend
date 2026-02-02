import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Home, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ConsentConfirmation = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'already_consented' | 'error'>('loading');
  const [registration, setRegistration] = useState<{ customer_name: string; property_address: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      confirmConsent();
    } else {
      setStatus('error');
      setError('Invalid consent link. Please contact your builder.');
    }
  }, [token]);

  const confirmConsent = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('consent-management', {
        body: {
          action: 'confirm_consent',
          token,
        },
      });

      if (error) throw error;

      if (data.message === 'Consent already recorded') {
        setStatus('already_consented');
      } else {
        setStatus('success');
      }
      setRegistration(data.registration);
    } catch (err: any) {
      console.error('Error confirming consent:', err);
      setStatus('error');
      setError(err.message || 'Failed to confirm consent. Please try again or contact your builder.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Home className="h-6 w-6" />
            Digital Handover Consent
          </CardTitle>
          <CardDescription>
            Warranty documentation digital delivery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'loading' && (
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Confirming your consent...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="rounded-full bg-green-100 p-4 w-fit mx-auto">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Consent Confirmed!</h3>
                <p className="text-muted-foreground mt-2">
                  Thank you{registration?.customer_name ? `, ${registration.customer_name}` : ''}! You have successfully provided consent to receive your warranty documentation digitally.
                </p>
              </div>
              {registration?.property_address && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Property</p>
                  <p className="font-medium">{registration.property_address}</p>
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <Mail className="h-5 w-5" />
                  <p className="font-medium">What happens next?</p>
                </div>
                <p className="text-sm text-blue-700 mt-2">
                  Your builder will now send your warranty documentation package to your email address.
                </p>
              </div>
            </div>
          )}

          {status === 'already_consented' && (
            <div className="text-center space-y-4">
              <div className="rounded-full bg-blue-100 p-4 w-fit mx-auto">
                <CheckCircle className="h-12 w-12 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Already Confirmed</h3>
                <p className="text-muted-foreground mt-2">
                  You have already provided consent to receive your warranty documentation digitally.
                </p>
              </div>
              {registration?.property_address && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Property</p>
                  <p className="font-medium">{registration.property_address}</p>
                </div>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="rounded-full bg-red-100 p-4 w-fit mx-auto">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Something went wrong</h3>
                <p className="text-muted-foreground mt-2">
                  {error}
                </p>
              </div>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsentConfirmation;
