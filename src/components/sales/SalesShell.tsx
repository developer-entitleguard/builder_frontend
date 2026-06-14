import Header from "@/components/Header";

/**
 * Shared page chrome for the Sales section (Customers / Quotes / Invoices /
 * Payments). Matches the builder app layout: sticky Header + a centered main
 * column. Each Sales page renders its content inside this shell.
 */
export function SalesShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
