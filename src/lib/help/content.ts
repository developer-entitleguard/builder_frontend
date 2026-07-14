import { BUILDER_ROLES, type BuilderRole } from "@/lib/roles";
import { COMPLIANCE_POINTS } from "@/lib/help/complianceCopy";

// Curated help content. Categories and articles are filtered by the signed-in
// user's role and the org's enabled modules, so people only see docs for
// features they actually have. No CMS — copy lives here and is easy to edit.

export type HelpBlock =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "ul"; items: string[] };

export interface HelpArticle {
  id: string;
  title: string;
  body: HelpBlock[];
}

export interface HelpCategory {
  id: string;
  label: string;
  /** "role" → shown under "For your role"; "topic" → shown under "Topics". */
  group: "role" | "topic";
  /** Show only if the org holds at least one of these modules. Omit = always. */
  modules?: string[];
  /** Show only if the org holds at least one of these capabilities (e.g. DEVELOP). */
  capabilities?: string[];
  /** Show only for these roles. Omit = all staff roles. */
  roles?: BuilderRole[];
  articles: HelpArticle[];
}

const complianceArticles: HelpArticle[] = [
  {
    id: "compliance-what-why",
    title: "What compliance means & why it matters",
    body: [
      { kind: "p", text: COMPLIANCE_POINTS[0].body },
      { kind: "p", text: COMPLIANCE_POINTS[2].body },
    ],
  },
  {
    id: "compliance-how",
    title: "How to run compliance on a registration",
    body: [
      { kind: "p", text: COMPLIANCE_POINTS[1].body },
      {
        kind: "ul",
        items: [
          "Open the registration and go to its Compliance tab.",
          "Review the generated checklist for the home's jurisdiction.",
          "Upload each required document; items tick off as they're satisfied.",
        ],
      },
    ],
  },
  {
    id: "compliance-handover-gate",
    title: "Uploading documents & the handover gate",
    body: [
      {
        kind: "p",
        text: "Handover is blocked until every required document is uploaded. This guarantees a homeowner never receives an incomplete entitlement.",
      },
      {
        kind: "p",
        text: "Once the checklist is complete, you can send the entitlement — the compliant package of documents, items and dates.",
      },
    ],
  },
  {
    id: "compliance-ai-checklist",
    title: "How the compliance checklist is generated",
    body: [
      {
        kind: "p",
        text: "EG BuildOS generates the checklist for the home's jurisdiction automatically, so you start from the right list rather than building it by hand.",
      },
    ],
  },
];

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "getting-started",
    label: "Getting started",
    group: "role",
    articles: [
      {
        id: "gs-orientation",
        title: "Find your way around EG BuildOS",
        body: [
          {
            kind: "p",
            text: "EG BuildOS helps you hand every homeowner a complete, compliant entitlement package — and prove it. Your dashboard is home base; the top menu adapts to what your organisation uses.",
          },
          {
            kind: "p",
            text: "You can re-open the welcome guide any time from Help → Getting started.",
          },
        ],
      },
      {
        id: "gs-first-steps",
        title: "The first things to set up",
        body: [
          {
            kind: "ul",
            items: [
              "Create your first project and attach homeowner registrations.",
              "Add the trades and suppliers you work with.",
              "Run compliance on a registration, then hand it over.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "projects",
    label: "Projects & registrations",
    group: "role",
    modules: ["REGISTRATIONS", "COMPLIANCE_DOCS"],
    roles: [BUILDER_ROLES.ADMINISTRATOR, BUILDER_ROLES.PROJECT_MANAGER],
    articles: [
      {
        id: "proj-create",
        title: "Create a project",
        body: [
          {
            kind: "p",
            text: "A project groups the homes you're delivering at one site. Give it a name, address and jurisdiction — the jurisdiction drives the compliance checklist.",
          },
        ],
      },
      {
        id: "proj-registrations",
        title: "Attach registrations",
        body: [
          {
            kind: "p",
            text: "A registration is one home plus its homeowner — the thing that receives the compliant entitlement at handover. Add each unit to the project; you can attach a unit before it's sold.",
          },
        ],
      },
      {
        id: "proj-bom",
        title: "Build a BOM against a registration",
        body: [
          {
            kind: "p",
            text: "A BOM (bill of materials) is the list of items installed in a home — appliances, fixtures, finishes — each carrying warranty and compliance information handed to the owner. Pick a registration, then add its items.",
          },
        ],
      },
    ],
  },
  {
    id: "compliance",
    label: "Compliance",
    group: "role",
    modules: ["COMPLIANCE_DOCS"],
    articles: complianceArticles,
  },
  {
    id: "developer",
    label: "Handing work to builders",
    group: "role",
    capabilities: ["DEVELOP"],
    roles: [BUILDER_ROLES.ADMINISTRATOR, BUILDER_ROLES.PROJECT_MANAGER],
    articles: [
      {
        id: "dev-assign",
        title: "Assign a project to a builder",
        body: [
          {
            kind: "p",
            text: "As a developer you own the project and its units, but hand construction to a builder. Create the project here, then use the Share button on the project to assign a builder organisation.",
          },
          {
            kind: "ul",
            items: [
              "Open the project and click Share.",
              "Search for the builder, or invite a new one by email.",
              "Choose whole-organisation or single-user access.",
              "The builder attaches registrations, builds BOMs and runs compliance — while you oversee handover.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "team",
    label: "Managing your team",
    group: "role",
    modules: ["USERS"],
    roles: [BUILDER_ROLES.ADMINISTRATOR],
    articles: [
      {
        id: "team-invite",
        title: "Invite team members & choose their role",
        body: [
          {
            kind: "p",
            text: "Add staff in Admin → User Management. Each person gets one role that controls what they can reach.",
          },
        ],
      },
      {
        id: "team-roles",
        title: "What each role can do",
        body: [
          {
            kind: "ul",
            items: [
              "Administrator — manages the whole organisation: projects, team, vendors, billing.",
              "Project Manager — creates and manages projects, registrations and BOMs.",
              "Customer Support — triages homeowner queries and tracks warranty tickets.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "support",
    label: "Queries & tickets",
    group: "role",
    modules: ["SUPPORT"],
    roles: [BUILDER_ROLES.CUSTOMER_SUPPORT, BUILDER_ROLES.ADMINISTRATOR],
    articles: [
      {
        id: "support-triage",
        title: "Triage a homeowner query",
        body: [
          {
            kind: "p",
            text: "Review incoming queries, respond, and assign a vendor to resolve each one. Track progress from your dashboard.",
          },
        ],
      },
    ],
  },
  {
    id: "vendors",
    label: "Vendors & suppliers",
    group: "topic",
    modules: ["VENDORS", "SUPPLIERS"],
    articles: [
      {
        id: "vendors-add",
        title: "Add trades & suppliers",
        body: [
          {
            kind: "p",
            text: "Trades are the vendors who carry out work on your builds; suppliers provide your materials and goods. Add them in Admin. Internal vendors get a login automatically; external vendors are records only.",
          },
        ],
      },
    ],
  },
  {
    id: "terms",
    label: "Terms & conditions",
    group: "topic",
    modules: ["TERMS"],
    articles: [
      {
        id: "terms-manage",
        title: "Managing your terms & conditions",
        body: [
          {
            kind: "p",
            text: "Homeowners accept your terms at handover. Manage versions under Catalog → Terms & Conditions.",
          },
        ],
      },
    ],
  },
  {
    id: "glossary",
    label: "Glossary",
    group: "topic",
    articles: [
      {
        id: "glossary-all",
        title: "Key terms explained",
        body: [
          { kind: "h", text: "Entitlement" },
          {
            kind: "p",
            text: "The compliance & warranty package a homeowner receives at handover — documents, items and dates.",
          },
          { kind: "h", text: "Registration" },
          {
            kind: "p",
            text: "One home plus its homeowner. It receives the entitlement at handover and moves Draft → Sent → Handed over.",
          },
          { kind: "h", text: "BOM (bill of materials)" },
          {
            kind: "p",
            text: "The list of items installed in a home, each with its warranty and compliance information.",
          },
          { kind: "h", text: "Handover" },
          {
            kind: "p",
            text: "The moment a completed, compliant home is passed to its owner — blocked until compliance is complete.",
          },
        ],
      },
    ],
  },
];
