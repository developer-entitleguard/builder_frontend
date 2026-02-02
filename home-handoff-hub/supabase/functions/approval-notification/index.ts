import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const allowedOrigins = [
  "https://construction.entitleguard.com",
  "https://zhaxutljvjrlconjvuxp.supabase.co",
  "https://zhaxutljvjrlconjvuxp.lovableproject.com",
];

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const allowedOrigin = origin && allowedOrigins.some(allowed => 
    origin === allowed || origin.endsWith('.lovableproject.com')
  ) ? origin : allowedOrigins[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

interface ApprovalNotificationRequest {
  action: "request_approval" | "approval_decided";
  approval_id: string;
  approval_token?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const { action, approval_id, approval_token }: ApprovalNotificationRequest = await req.json();
    console.log(`Approval notification action: ${action}`, { approval_id });

    // Fetch approval details
    const { data: approval, error: fetchError } = await supabase
      .from("approval_requests")
      .select(`
        *,
        homeowner_registrations:registration_id (
          customer_name,
          customer_email,
          property_address,
          property_city,
          property_state
        )
      `)
      .eq("id", approval_id)
      .single();

    if (fetchError || !approval) {
      console.error("Error fetching approval:", fetchError);
      throw new Error("Approval not found");
    }

    // Fetch activity name
    const { data: activity } = await supabase
      .from("project_activities")
      .select("name")
      .eq("id", approval.activity_id)
      .single();

    const registration = approval.homeowner_registrations;
    const approverEmail = approval.approver_email || registration?.customer_email;
    const approverName = approval.approver_name || registration?.customer_name || "Homeowner";

    if (!approverEmail) {
      console.log("No approver email available - skipping email send");
      return new Response(
        JSON.stringify({ success: true, message: "No email to send to" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!resend) {
      console.log("Resend not configured - skipping email send");
      return new Response(
        JSON.stringify({ success: true, message: "Email service not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const appUrl = Deno.env.get("APP_URL") || "https://construction.entitleguard.com";
    
    if (action === "request_approval") {
      // Build approval URL with token for email-based approval
      const approvalUrl = `${appUrl}/approval-response?token=${approval.approval_token}`;

      const { data: emailData, error: emailError } = await resend.emails.send({
        from: "Handover <noreply@entitleguard.com>",
        to: [approverEmail],
        subject: `Approval Required: ${approval.title}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Approval Required</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Hello ${approverName},</h2>
              
              <p>Your approval is required for the following:</p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Type:</strong> ${approval.approval_type}</p>
                <p style="margin: 0 0 10px 0;"><strong>Title:</strong> ${approval.title}</p>
                ${approval.description ? `<p style="margin: 0 0 10px 0;"><strong>Description:</strong> ${approval.description}</p>` : ''}
                ${activity ? `<p style="margin: 0 0 10px 0;"><strong>Activity:</strong> ${activity.name}</p>` : ''}
                ${approval.due_by ? `<p style="margin: 0;"><strong>Due by:</strong> ${new Date(approval.due_by).toLocaleDateString()}</p>` : ''}
              </div>
              
              ${registration ? `
              <p>Property: <strong>${registration.property_address}, ${registration.property_city} ${registration.property_state}</strong></p>
              ` : ''}
              
              <p>Please review and respond to this approval request:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${approvalUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Review & Respond
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #999; text-align: center;">
                This email was sent through the Handover platform.<br>
                If you have any concerns, please contact your builder directly.
              </p>
            </div>
          </body>
          </html>
        `,
      });

      if (emailError) {
        console.error("Error sending approval request email:", emailError);
        throw new Error(`Failed to send email: ${emailError.message}`);
      }

      console.log("Approval request email sent successfully:", emailData);
      
      return new Response(
        JSON.stringify({ success: true, message: "Approval notification sent", emailId: emailData?.id }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "approval_decided") {
      const statusText = approval.status === 'approved' ? 'Approved' : 
                         approval.status === 'rejected' ? 'Rejected' : 'Cancelled';
      const statusColor = approval.status === 'approved' ? '#22c55e' : 
                          approval.status === 'rejected' ? '#ef4444' : '#6b7280';

      const { data: emailData, error: emailError } = await resend.emails.send({
        from: "Handover <noreply@entitleguard.com>",
        to: [approverEmail],
        subject: `Approval ${statusText}: ${approval.title}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: ${statusColor}; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Approval ${statusText}</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Hello ${approverName},</h2>
              
              <p>The following approval request has been <strong>${statusText.toLowerCase()}</strong>:</p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Type:</strong> ${approval.approval_type}</p>
                <p style="margin: 0 0 10px 0;"><strong>Title:</strong> ${approval.title}</p>
                ${approval.decision_comment ? `<p style="margin: 0;"><strong>Comment:</strong> ${approval.decision_comment}</p>` : ''}
              </div>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #999; text-align: center;">
                This email was sent through the Handover platform.
              </p>
            </div>
          </body>
          </html>
        `,
      });

      if (emailError) {
        console.error("Error sending approval decision email:", emailError);
        throw new Error(`Failed to send email: ${emailError.message}`);
      }

      console.log("Approval decision email sent successfully:", emailData);
      
      return new Response(
        JSON.stringify({ success: true, message: "Decision notification sent", emailId: emailData?.id }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    console.error("Error in approval-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
