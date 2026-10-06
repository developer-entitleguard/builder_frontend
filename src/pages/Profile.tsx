import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { USER_DATA_EVENT } from "@/hooks/useOrganization";
import { storeBuilderSession } from "@/lib/auth/storeSession";
import {
  useGetMyProfileQuery,
  useSendPasswordCodeMutation,
  useSetMyPasswordMutation,
  useUpdateMyProfileMutation,
} from "@/store/api";
import { Check, X } from "lucide-react";

/** Mirror of the backend PasswordPolicy. */
const PW_RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "A number", test: (p) => /[0-9]/.test(p) },
  { label: "A special character", test: (p) => /[^A-Za-z0-9\s]/.test(p) },
  { label: "No spaces", test: (p) => p.length > 0 && !/\s/.test(p) },
];

const errorMessage = (error: unknown, fallback: string): string => {
  const data = error && typeof error === "object" && "data" in error ? (error as { data?: unknown }).data : null;
  if (data && typeof data === "object" && "message" in data && typeof (data as { message?: unknown }).message === "string") {
    return (data as { message: string }).message;
  }
  return fallback;
};

/** Keep the header/role blob in step with a saved name (see useOrganization). */
function patchStoredUser(fields: Record<string, unknown>): void {
  try {
    const raw = localStorage.getItem("userData");
    if (!raw) return;
    localStorage.setItem("userData", JSON.stringify({ ...JSON.parse(raw), ...fields }));
    window.dispatchEvent(new Event(USER_DATA_EVENT));
  } catch {
    // A malformed blob is rebuilt on next sign-in; the profile itself is saved.
  }
}

const Profile = () => {
  const { toast } = useToast();
  const { data: profile, isLoading, isError, refetch } = useGetMyProfileQuery();
  const [updateProfile, { isLoading: isSaving }] = useUpdateMyProfileMutation();
  const [sendCode, { isLoading: isSendingCode }] = useSendPasswordCodeMutation();
  const [setPassword, { isLoading: isSettingPassword }] = useSetMyPasswordMutation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contact, setContact] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [useCode, setUseCode] = useState(false);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName ?? "");
      setContact(profile.contact ?? "");
    }
  }, [profile]);

  const detailsDirty =
    !!profile &&
    (firstName !== (profile.firstName ?? "") ||
      lastName !== (profile.lastName ?? "") ||
      contact !== (profile.contact ?? ""));

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast({ title: "First name is required", variant: "destructive" });
      return;
    }
    try {
      const saved = await updateProfile({ firstName, lastName, contact }).unwrap();
      patchStoredUser({ firstName: saved.firstName, lastName: saved.lastName, contact: saved.contact });
      toast({ title: "Profile saved" });
    } catch (error) {
      toast({ title: "Couldn't save", description: errorMessage(error, "Please try again."), variant: "destructive" });
    }
  };

  const hasPassword = profile?.hasPassword ?? false;
  const rulesMet = PW_RULES.every((r) => r.test(newPassword));
  const matches = newPassword.length > 0 && newPassword === confirmPassword;
  const proofGiven = !hasPassword || (useCode ? /^\d{6}$/.test(code) : currentPassword.length > 0);
  const canSubmitPassword = rulesMet && matches && proofGiven && !isSettingPassword;

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setCode("");
    setUseCode(false);
  };

  const handleSendCode = async () => {
    try {
      const res = await sendCode().unwrap();
      setUseCode(true);
      setCurrentPassword("");
      toast({ title: "Code sent", description: res.message });
    } catch (error) {
      toast({ title: "Couldn't send a code", description: errorMessage(error, "Please try again."), variant: "destructive" });
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitPassword) return;
    try {
      const res = await setPassword({
        newPassword,
        ...(hasPassword && useCode ? { code } : {}),
        ...(hasPassword && !useCode ? { currentPassword } : {}),
      }).unwrap();
      // Every session was revoked; this one carries on with the fresh pair.
      if (res.data?.jwt) {
        storeBuilderSession(res.data);
      }
      resetPasswordForm();
      toast({
        title: hasPassword ? "Password changed" : "Password set",
        description: "You've been signed out on your other devices.",
      });
    } catch (error) {
      toast({ title: "Couldn't update your password", description: errorMessage(error, "Please try again."), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground mt-1">
            Your details and password. These apply wherever you sign in to EntitleGuard.
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-6 space-y-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ) : isError || !profile ? (
          <Card>
            <CardContent className="py-6 flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">We couldn't load your profile.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Your details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveDetails} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="profile-first-name">First name</Label>
                      <Input
                        id="profile-first-name"
                        value={firstName}
                        maxLength={100}
                        autoComplete="given-name"
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-last-name">Last name</Label>
                      <Input
                        id="profile-last-name"
                        value={lastName}
                        maxLength={100}
                        autoComplete="family-name"
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-email">Email</Label>
                    <Input id="profile-email" value={profile.email} disabled readOnly />
                    <p className="text-xs text-muted-foreground">
                      This is how you sign in. To change it, contact support@entitleguard.com.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-contact">Mobile</Label>
                    <Input
                      id="profile-contact"
                      type="tel"
                      value={contact}
                      autoComplete="tel"
                      placeholder="0412 345 678"
                      onChange={(e) => setContact(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={!detailsDirty || isSaving}>
                      {isSaving ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{hasPassword ? "Change password" : "Set a password"}</CardTitle>
                <CardDescription>
                  {hasPassword
                    ? "Changing your password signs you out on your other devices."
                    : "You've been signing in with emailed codes. Set a password to sign in with it instead — codes will still work."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSetPassword} className="space-y-4">
                  {hasPassword && !useCode && (
                    <div className="space-y-2">
                      <Label htmlFor="profile-current-password">Current password</Label>
                      <Input
                        id="profile-current-password"
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline disabled:opacity-50"
                        disabled={isSendingCode}
                        onClick={() => void handleSendCode()}
                      >
                        {isSendingCode ? "Sending..." : "Forgot it? Email me a code instead"}
                      </button>
                    </div>
                  )}
                  {hasPassword && useCode && (
                    <div className="space-y-2">
                      <Label htmlFor="profile-code">Code from your email</Label>
                      <Input
                        id="profile-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      />
                      <div className="flex gap-4 text-xs">
                        <button
                          type="button"
                          className="text-primary hover:underline disabled:opacity-50"
                          disabled={isSendingCode}
                          onClick={() => void handleSendCode()}
                        >
                          {isSendingCode ? "Sending..." : "Resend code"}
                        </button>
                        <button
                          type="button"
                          className="text-muted-foreground hover:underline"
                          onClick={() => {
                            setUseCode(false);
                            setCode("");
                          }}
                        >
                          Use my current password
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="profile-new-password">New password</Label>
                    <Input
                      id="profile-new-password"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    {newPassword.length > 0 && (
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                        {PW_RULES.map((rule) => {
                          const ok = rule.test(newPassword);
                          return (
                            <li
                              key={rule.label}
                              className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-600" : "text-muted-foreground"}`}
                            >
                              {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                              {rule.label}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-confirm-password">Confirm new password</Label>
                    <Input
                      id="profile-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {confirmPassword.length > 0 && !matches && (
                      <p className="text-xs text-destructive">Passwords don't match.</p>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={!canSubmitPassword}>
                      {isSettingPassword ? "Saving..." : hasPassword ? "Change password" : "Set password"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Profile;
