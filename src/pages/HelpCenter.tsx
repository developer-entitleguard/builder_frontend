import { useMemo, useState } from "react";
import { Search, ChevronRight, Lightbulb, LifeBuoy } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/hooks/useOrganization";
import { useEntitlements } from "@/hooks/useEntitlements";
import {
  readBuilderRoleFromStorage,
  BUILDER_ROLE_LABELS,
  hasAnyBuilderRole,
  type BuilderRole,
} from "@/lib/roles";
import { HELP_CATEGORIES, type HelpCategory, type HelpBlock } from "@/lib/help/content";

const matchesSearch = (cat: HelpCategory, q: string): boolean => {
  if (!q) return true;
  const hay = [
    cat.label,
    ...cat.articles.flatMap((a) => [
      a.title,
      ...a.body.map((b) => ("text" in b ? b.text : (b as { items: string[] }).items.join(" "))),
    ]),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
};

const Block = ({ block }: { block: HelpBlock }) => {
  if (block.kind === "h") return <h4 className="mt-4 font-semibold text-foreground">{block.text}</h4>;
  if (block.kind === "ul")
    return (
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {block.items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    );
  return <p className="mt-2 text-sm text-muted-foreground">{block.text}</p>;
};

/**
 * Role- and module-aware help center. Only shows categories relevant to the
 * signed-in user's role and the org's enabled modules, so people aren't handed
 * docs for features they don't have. Replaces the old dead "Getting started"
 * link; hosts the compliance explainer and glossary that inline hints point to.
 */
const HelpCenter = () => {
  const { builderRole } = useOrganization();
  const { hasModule, hasCapability, ready } = useEntitlements();
  const role: BuilderRole | null = builderRole ?? readBuilderRoleFromStorage();
  const roleLabel = role ? BUILDER_ROLE_LABELS[role] : "your team";

  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    return HELP_CATEGORIES.filter((cat) => {
      // Role gate
      if (cat.roles && !hasAnyBuilderRole(role, cat.roles)) return false;
      // Module gate — show if the org holds ANY listed module. During load
      // (`ready` false) hasModule fails open, so nothing flash-hides.
      if (cat.modules && ready && !cat.modules.some((m) => hasModule(m))) return false;
      // Capability gate (e.g. DEVELOP) — same fail-open-during-load behaviour.
      if (cat.capabilities && ready && !cat.capabilities.some((c) => hasCapability(c)))
        return false;
      return true;
    }).filter((cat) => matchesSearch(cat, query));
  }, [role, hasModule, hasCapability, ready, query]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = visible.find((c) => c.id === activeId) ?? visible[0] ?? null;

  const roleCats = visible.filter((c) => c.group === "role");
  const topicCats = visible.filter((c) => c.group === "topic");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Help center</h1>
          <p className="text-muted-foreground mt-1">
            Guides for {roleLabel}, tailored to what your organisation uses.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search help…"
                className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
                aria-label="Search help"
              />
            </div>

            {roleCats.length > 0 && (
              <Nav label="For your role" cats={roleCats} activeId={active?.id} onSelect={setActiveId} />
            )}
            {topicCats.length > 0 && (
              <Nav label="Topics" cats={topicCats} activeId={active?.id} onSelect={setActiveId} />
            )}

            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Still stuck?</p>
              <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                <a href="mailto:support@entitleguard.com">
                  <LifeBuoy className="mr-1.5 h-4 w-4" /> Contact support
                </a>
              </Button>
            </div>
          </aside>

          {/* Main */}
          <section>
            {!active ? (
              <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
                No help articles match “{query}”.
              </div>
            ) : (
              <div className="rounded-lg border bg-card p-6">
                <p className="text-xs text-muted-foreground">Help · {active.label}</p>
                <h2 className="mt-1 text-xl font-semibold text-foreground">{active.label}</h2>
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-primary/[0.06] px-3 py-2 text-sm text-primary">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    You're viewing help for <strong>{roleLabel}</strong>. Articles for
                    features your org doesn't use are hidden.
                  </span>
                </div>

                <div className="mt-6 space-y-6">
                  {active.articles.map((a) => (
                    <article key={a.id} className="border-t pt-5 first:border-t-0 first:pt-0">
                      <h3 className="flex items-center gap-2 font-medium text-foreground">
                        <ChevronRight className="h-4 w-4 text-primary" />
                        {a.title}
                      </h3>
                      <div className="pl-6">
                        {a.body.map((b, i) => (
                          <Block key={i} block={b} />
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

const Nav = ({
  label,
  cats,
  activeId,
  onSelect,
}: {
  label: string;
  cats: HelpCategory[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
}) => (
  <div>
    <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <ul className="space-y-0.5">
      {cats.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onSelect(c.id)}
            className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
              activeId === c.id
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {c.label}
          </button>
        </li>
      ))}
    </ul>
  </div>
);

export default HelpCenter;
