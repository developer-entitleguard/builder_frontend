import Header from "@/components/Header";
import { OrgTermsManagement } from "@/components/admin/OrgTermsManagement";

/**
 * Per PRD_Org_Terms_And_Conditions §10.2. Top-level builder page for
 * org-scoped customer-facing T&C versions. Reached via the
 * "Catalog → Terms & Conditions" header dropdown. Body is the same
 * component the Admin tab used to host; lifting it to its own route
 * makes the feature discoverable.
 */
export default function TermsVersions() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Terms &amp; Conditions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage the customer-facing T&amp;C versions attached to property handovers.
          </p>
        </div>
        <OrgTermsManagement />
      </div>
    </div>
  );
}
