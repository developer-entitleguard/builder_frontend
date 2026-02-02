import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Loader2, AlertCircle } from "lucide-react";

interface ApprovalData {
  id: string;
  title: string;
  description: string | null;
  approval_type: string;
  status: string;
  due_by: string | null;
  approver_name: string | null;
  decided_at: string | null;
  decision_comment: string | null;
  activity_name?: string;
  property_address?: string;
}

const ApprovalResponse = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [approval, setApproval] = useState<ApprovalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<"approved" | "rejected" | null>(null);

  useEffect(() => {
    if (token) {
      fetchApproval();
    } else {
      setError("Invalid approval link. No token provided.");
      setLoading(false);
    }
  }, [token]);

  const fetchApproval = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("approval_requests")
        .select(`
          id,
          title,
          description,
          approval_type,
          status,
          due_by,
          approver_name,
          decided_at,
          decision_comment,
          project_activities:activity_id (name),
          homeowner_registrations:registration_id (property_address, property_city, property_state)
        `)
        .eq("approval_token", token)
        .single();

      if (fetchError || !data) {
        setError("Approval request not found or the link has expired.");
        return;
      }

      const activityData = data.project_activities as any;
      const registrationData = data.homeowner_registrations as any;

      setApproval({
        id: data.id,
        title: data.title,
        description: data.description,
        approval_type: data.approval_type,
        status: data.status,
        due_by: data.due_by,
        approver_name: data.approver_name,
        decided_at: data.decided_at,
        decision_comment: data.decision_comment,
        activity_name: activityData?.name,
        property_address: registrationData 
          ? `${registrationData.property_address}, ${registrationData.property_city} ${registrationData.property_state}`
          : undefined,
      });
    } catch (err: any) {
      setError("Failed to load approval request.");
      console.error("Error fetching approval:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (status: "approved" | "rejected") => {
    if (!approval) return;

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("approval_requests")
        .update({
          status,
          decided_at: new Date().toISOString(),
          decision_comment: comment.trim() || null,
        })
        .eq("approval_token", token)
        .eq("status", "pending");

      if (updateError) {
        throw updateError;
      }

      setSubmitted(true);
      setSubmittedStatus(status);
    } catch (err: any) {
      setError("Failed to submit your response. Please try again.");
      console.error("Error submitting response:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading approval request...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {submittedStatus === "approved" ? (
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            )}
            <CardTitle>
              {submittedStatus === "approved" ? "Approved!" : "Rejected"}
            </CardTitle>
            <CardDescription>
              Your response has been recorded. You can close this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (approval?.status !== "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {approval?.status === "approved" ? (
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            ) : approval?.status === "rejected" ? (
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            ) : (
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            )}
            <CardTitle>Already Responded</CardTitle>
            <CardDescription>
              This approval request has already been {approval?.status}.
              {approval?.decided_at && (
                <span className="block mt-2 text-sm">
                  Responded on {new Date(approval.decided_at).toLocaleDateString()}
                </span>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{approval.approval_type}</Badge>
            <Badge className="bg-yellow-100 text-yellow-700">
              <Clock className="h-3 w-3 mr-1" />
              Pending
            </Badge>
          </div>
          <CardTitle>{approval.title}</CardTitle>
          {approval.description && (
            <CardDescription>{approval.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 text-sm">
            {approval.activity_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Activity:</span>
                <span className="font-medium">{approval.activity_name}</span>
              </div>
            )}
            {approval.property_address && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Property:</span>
                <span className="font-medium text-right">{approval.property_address}</span>
              </div>
            )}
            {approval.due_by && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due by:</span>
                <span className="font-medium">
                  {new Date(approval.due_by).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Comment (optional)
            </label>
            <Textarea
              placeholder="Add a comment with your response..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => handleResponse("rejected")}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => handleResponse("approved")}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Approve
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApprovalResponse;
