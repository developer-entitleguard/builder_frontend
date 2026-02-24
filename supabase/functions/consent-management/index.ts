import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

// Trusted origins for CORS - restrict to known domains
const allowedOrigins = [
  "https://construction.entitleguard.com",
  "https://zhaxutljvjrlconjvuxp.supabase.co",
  "https://zhaxutljvjrlconjvuxp.lovableproject.com",
];

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  // Check if the origin is in our allowed list
  const allowedOrigin = origin && allowedOrigins.some(allowed => 
    origin === allowed || origin.endsWith('.lovableproject.com')
  ) ? origin : allowedOrigins[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

interface ConsentRequest {
  action: "request_consent" | "confirm_consent";
  registration_id?: string;
  token?: string;
}

const generateConsentToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const { action, registration_id, token }: ConsentRequest = await req.json();
    console.log(`Consent management action: ${action}`, { registration_id, token });

    if (action === "request_consent") {
      if (!registration_id) {
        throw new Error("registration_id is required for requesting consent");
      }

      // Get registration details
      const { data: registration, error: fetchError } = await supabase
        .from("homeowner_registrations")
        .select("*")
        .eq("id", registration_id)
        .single();

      if (fetchError || !registration) {
        console.error("Error fetching registration:", fetchError);
        throw new Error("Registration not found");
      }

      // Generate consent token
      const consentToken = generateConsentToken();

      // Update registration with consent token
      const { error: updateError } = await supabase
        .from("homeowner_registrations")
        .update({ consent_token: consentToken })
        .eq("id", registration_id);

      if (updateError) {
        console.error("Error updating consent token:", updateError);
        throw new Error("Failed to generate consent token");
      }

      // Build consent URL - use the published app URL
      const appUrl = Deno.env.get("APP_URL") || "https://construction.entitleguard.com";
      const consentUrl = `${appUrl}/consent?token=${consentToken}`;

      console.log(`Consent request for ${registration.customer_name}:`);
      console.log(`Email: ${registration.customer_email}`);
      console.log(`Phone: ${registration.customer_phone}`);
      console.log(`Consent URL: ${consentUrl}`);

      let emailSent = false;
      let emailError = null;

      // Send email via Resend
      if (resend && registration.customer_email) {
        try {
          const { data: emailData, error: emailErr } = await resend.emails.send({
            from: "Handover <noreply@entitleguard.com>",
            to: [registration.customer_email],
            subject: "Digital Handover - Please Confirm Your Consent",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">Digital Document Handover</h1>
                </div>
                
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                  <h2 style="color: #333; margin-top: 0;">Hello ${registration.customer_name},</h2>
                  
                  <p>Your builder would like to send you important warranty and documentation for your property at:</p>
                  
                  <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <strong style="color: #667eea;">${registration.property_address}</strong><br>
                    ${registration.property_city}, ${registration.property_state} ${registration.property_zip}
                  </div>
                  
                  <p>This package includes warranty documents, manuals, and important information about your new home.</p>
                  
                  <p>To receive these documents digitally via email, please confirm your consent by clicking the button below:</p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${consentUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                      Confirm & Receive Documents
                    </a>
                  </div>
                  
                  <p style="font-size: 14px; color: #666;">If you did not expect this email or have questions, please contact your builder directly.</p>
                  
                  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                  
                  <p style="font-size: 12px; color: #999; text-align: center;">
                    This email was sent by your builder through the Handover platform.<br>
                    If you have any concerns, please reply to this email.
                  </p>
                </div>
              </body>
              </html>
            `,
          });

          if (emailErr) {
            console.error("Resend email error:", emailErr);
            emailError = emailErr.message;
          } else {
            console.log("Email sent successfully:", emailData);
            emailSent = true;
          }
        } catch (error: any) {
          console.error("Error sending email:", error);
          emailError = error.message;
        }
      } else {
        console.log("Resend not configured or no customer email - skipping email send");
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: emailSent ? "Consent request sent via email" : "Consent link generated",
          consentUrl,
          emailSent,
          emailError,
          customerEmail: registration.customer_email,
          customerPhone: registration.customer_phone,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (action === "confirm_consent") {
      if (!token) {
        throw new Error("token is required for confirming consent");
      }

      // Find registration by consent token
      const { data: registration, error: fetchError } = await supabase
        .from("homeowner_registrations")
        .select("*")
        .eq("consent_token", token)
        .single();

      if (fetchError || !registration) {
        console.error("Error fetching registration by token:", fetchError);
        throw new Error("Invalid or expired consent token");
      }

      // Check if already consented
      if (registration.consent_received) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Consent already recorded",
            registration: {
              customer_name: registration.customer_name,
              property_address: registration.property_address,
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Update registration with consent
      const { error: updateError } = await supabase
        .from("homeowner_registrations")
        .update({
          consent_received: true,
          consent_received_at: new Date().toISOString(),
          consent_method: "customer_link",
        })
        .eq("id", registration.id);

      if (updateError) {
        console.error("Error updating consent:", updateError);
        throw new Error("Failed to record consent");
      }

      console.log(`Consent confirmed for registration: ${registration.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Consent confirmed successfully",
          registration: {
            customer_name: registration.customer_name,
            property_address: registration.property_address,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    console.error("Error in consent-management function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
