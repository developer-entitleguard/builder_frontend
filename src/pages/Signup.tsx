import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { getApiBaseUrl } from "@/lib/config";

/** Mirror of the backend PasswordPolicy so users get instant feedback. */
const PW_RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "A number", test: (p) => /[0-9]/.test(p) },
  { label: "A special character", test: (p) => /[^A-Za-z0-9\s]/.test(p) },
  { label: "No spaces", test: (p) => p.length > 0 && !/\s/.test(p) },
];

/**
 * Self-serve signup for a Construction business. A construction org can operate
 * as a Builder and/or a Developer (at least one). Creates the organisation +
 * first admin via /unsecure/signup, then sends them to sign in.
 */
const Signup = () => {
  const navigate = useNavigate();
  const apiBaseUrl = getApiBaseUrl();

  const [isBuilder, setIsBuilder] = useState(true);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [abn, setAbn] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [termsContent, setTermsContent] = useState("");
  const [termsVersionId, setTermsVersionId] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [contactConsent, setContactConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`${apiBaseUrl}/api/terms/latest`)
      .then((r) => r.json())
      .then((b) => {
        if (active && b?.success && b.data) {
          setTermsContent(b.data.content ?? "");
          setTermsVersionId(b.data.id ?? null);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

  const pwOk = useMemo(() => PW_RULES.every((r) => r.test(password)), [password]);
  const canSubmit =
    (isBuilder || isDeveloper) &&
    orgName.trim().length > 0 &&
    adminFirstName.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim()) &&
    pwOk &&
    password === confirm &&
    acceptTerms &&
    contactConsent &&
    !submitting;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isBuilder && !isDeveloper) {
      setError("Select at least one of Builder or Developer");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    const roles: string[] = [];
    if (isBuilder) roles.push("BUILDER");
    if (isDeveloper) roles.push("DEVELOPER");

    setSubmitting(true);
    try {
      const res = await fetch(`${apiBaseUrl}/unsecure/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgKind: "CONSTRUCTION",
          constructionRoles: roles,
          orgName: orgName.trim(),
          abn: abn.trim() || null,
          contactPhone: contactPhone.trim() || null,
          adminFirstName: adminFirstName.trim(),
          adminLastName: adminLastName.trim() || null,
          adminEmail: adminEmail.trim(),
          password,
          acceptedTerms: acceptTerms,
          termsVersionId,
          contactConsent,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.message || "Signup failed. Please try again.");
        return;
      }
      navigate("/auth", { replace: true });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-6 py-10 bg-slate-50">
      <h1 className="text-2xl font-semibold text-foreground">EntitleGuard</h1>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your business account</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>This business operates as</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={isBuilder ? "default" : "outline"}
                  onClick={() => setIsBuilder((v) => !v)}
                >
                  Builder
                </Button>
                <Button
                  type="button"
                  variant={isDeveloper ? "default" : "outline"}
                  onClick={() => setIsDeveloper((v) => !v)}
                >
                  Developer
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Select one or both.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgName">Business name</Label>
              <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="abn">ABN (optional)</Label>
                <Input id="abn" value={abn} onChange={(e) => setAbn(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">Admin first name</Label>
                <Input id="firstName" value={adminFirstName} onChange={(e) => setAdminFirstName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" value={adminLastName} onChange={(e) => setAdminLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Admin email</Label>
              <Input id="email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <ul className="mt-1 space-y-0.5">
                {PW_RULES.map((r) => {
                  const ok = r.test(password);
                  return (
                    <li key={r.label} className={`text-xs flex items-center gap-1 ${ok ? "text-emerald-600" : "text-muted-foreground"}`}>
                      <Check className={`h-3 w-3 ${ok ? "opacity-100" : "opacity-30"}`} />
                      {r.label}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              {confirm.length > 0 && confirm !== password && (
                <p className="text-xs text-red-600">Passwords do not match</p>
              )}
            </div>

            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <strong>Free for your first 3 months.</strong> After that, pricing depends on the
              capabilities you use.
            </div>

            <div className="space-y-2">
              <Label>Terms &amp; Conditions</Label>
              <div className="max-h-40 overflow-auto rounded-md border p-3 text-xs whitespace-pre-wrap bg-muted/30 text-muted-foreground">
                {termsContent || "Loading terms…"}
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                />
                <span>I have read and accept the Terms &amp; Conditions.</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={contactConsent}
                  onChange={(e) => setContactConsent(e.target.checked)}
                />
                <span>
                  I agree that EntitleGuard may contact me about the product, pricing, a walkthrough
                  and onboarding.
                </span>
              </label>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {submitting ? "Creating account..." : "Create account"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link to="/auth" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
