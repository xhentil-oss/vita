import React, { useEffect, useMemo, useState } from "react";
import {
  getEmailJSConfig,
  saveEmailJSConfig,
  isEmailJSConfigured,
  sendInviteEmail,
} from "./emailService";
import { useQuery, useMutation } from "@/hooks/useFirestore";
import { useAuth } from "@/hooks/useFirebaseAuth";
import {
  AirplaneTakeoff,
  ArrowLeft,
  Bell,
  CalendarDots,
  Camera,
  CheckCircle,
  ChartBar,
  ClipboardText,
  ClockCounterClockwise,
  CurrencyDollar,
  CurrencyEur,
  FileText,
  Gear,
  IdentificationCard,
  ListBullets,
  MagnifyingGlass,
  MapPin,
  NotePencil,
  Phone,
  PlusCircle,
  Stethoscope,
  UploadSimple,
  UserCircle,
  Users,
  Warning,
  WhatsappLogo,
  X,
  SignIn,
  SignOut,
  Spinner,
  Tooth,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

// ─── Multi-Tenant Manager ────────────────────────────────────────────────────

interface TenantUser {
  email: string;
  role: UserRole;
  addedAt: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string;
  plan: "Starter" | "Growth" | "Enterprise";
  status: "Active" | "Suspended" | "Trial" | "Pending";
  primaryColor: string;
  logoUrl: string;
  contactEmail: string;
  ownerName: string;
  country: string;
  timezone: string;
  currency: string;
  services: string[];
  teamSize: string;
  registeredAt: string;
  notes: string;
  users?: TenantUser[];
}

const DEMO_TENANTS: Tenant[] = [
  {
    id: "t1",
    name: "Vita Tirana",
    slug: "vita-tirana",
    domain: "tirana.vitahealth.al",
    plan: "Enterprise",
    status: "Active",
    primaryColor: "#0ea5e9",
    logoUrl: "",
    contactEmail: "admin@vitahealth.al",
    ownerName: "Dr. Arjan Hoxha",
    country: "Albania",
    timezone: "Europe/Tirane",
    currency: "EUR",
    services: ["Dental Tourism", "Hair Transplant"],
    teamSize: "11-50",
    registeredAt: "2024-01-10",
    notes: "Flagship clinic. Full Enterprise plan.",
    users: [
      { email: "arjan@vitahealth.al", role: "Owner", addedAt: "2024-01-10" },
      { email: "sales1@vitahealth.al", role: "Sales", addedAt: "2024-02-01" },
      { email: "coordinator@vitahealth.al", role: "Coordinator", addedAt: "2024-02-15" },
    ],
  },
  {
    id: "t2",
    name: "Smile Prishtina",
    slug: "smile-prishtina",
    domain: "smile-prishtina.com",
    plan: "Growth",
    status: "Active",
    primaryColor: "#8b5cf6",
    logoUrl: "",
    contactEmail: "admin@smileprishtina.com",
    ownerName: "Dr. Blerim Krasniqi",
    country: "Kosovo",
    timezone: "Europe/Belgrade",
    currency: "EUR",
    services: ["Dental Tourism"],
    teamSize: "6-10",
    registeredAt: "2024-03-22",
    notes: "",
    users: [
      { email: "blerim@smileprishtina.com", role: "Owner", addedAt: "2024-03-22" },
    ],
  },
  {
    id: "t3",
    name: "Milano MedCenter",
    slug: "milano-medcenter",
    domain: "",
    plan: "Starter",
    status: "Trial",
    primaryColor: "#f59e0b",
    logoUrl: "",
    contactEmail: "info@milanomed.it",
    ownerName: "Marco Ferretti",
    country: "Italy",
    timezone: "Europe/Rome",
    currency: "EUR",
    services: ["Hair Transplant"],
    teamSize: "1-5",
    registeredAt: "2024-05-01",
    notes: "Trial ending in 7 days. Follow up.",
    users: [],
  },
  {
    id: "t4",
    name: "DentaCare Berlin",
    slug: "dentacare-berlin",
    domain: "",
    plan: "Starter",
    status: "Pending",
    primaryColor: "#06b6d4",
    logoUrl: "",
    contactEmail: "info@dentacare.de",
    ownerName: "Dr. Klaus Weber",
    country: "Germany",
    timezone: "Europe/Berlin",
    currency: "EUR",
    services: ["Dental Tourism"],
    teamSize: "1-5",
    registeredAt: "2024-06-15",
    notes: "Waiting for identity verification.",
    users: [],
  },
];

const PLAN_COLORS: Record<string, string> = {
  Starter: "bg-muted text-muted-foreground",
  Growth: "bg-blue-100 text-blue-800",
  Enterprise: "bg-purple-100 text-purple-800",
};

const TENANT_STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-100 text-green-800",
  Suspended: "bg-red-100 text-red-800",
  Trial: "bg-yellow-100 text-yellow-800",
  Pending: "bg-orange-100 text-orange-800",
};

const TENANT_STATUS_ICONS: Record<string, string> = {
  Active: "🟢",
  Suspended: "🔴",
  Trial: "🟡",
  Pending: "🟠",
};

// ── Clinic Registration Form (public-facing onboarding) ────────────────────
function ClinicRegistrationForm({ onClose, onRegistered }: {
  onClose: () => void;
  onRegistered: (tenant: Tenant) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    name: "",
    ownerName: "",
    contactEmail: "",
    phone: "",
    country: "",
    city: "",
    timezone: "Europe/Tirane",
    currency: "EUR",
    services: [] as string[],
    teamSize: "1-5",
    plan: "Starter" as Tenant["plan"],
    primaryColor: "#0ea5e9",
    domain: "",
    agreeTerms: false,
  });
  const [done, setDone] = useState(false);
  const [slug, setSlug] = useState("");

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "mb-1 block text-body-sm font-medium text-foreground";

  const handleNameChange = (name: string) => {
    set("name", name);
    setSlug(name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  };

  const toggleService = (svc: string) => {
    set("services", form.services.includes(svc) ? form.services.filter((s) => s !== svc) : [...form.services, svc]);
  };

  const handleFinish = () => {
    const newTenant: Tenant = {
      id: `t${Date.now()}`,
      name: form.name,
      slug,
      domain: form.domain,
      plan: form.plan,
      status: "Pending",
      primaryColor: form.primaryColor,
      logoUrl: "",
      contactEmail: form.contactEmail,
      ownerName: form.ownerName,
      country: form.country,
      timezone: form.timezone,
      currency: form.currency,
      services: form.services,
      teamSize: form.teamSize,
      registeredAt: new Date().toISOString().split("T")[0],
      notes: "",
    };
    setDone(true);
    onRegistered(newTenant);
  };

  const step1Valid = form.name.trim() && form.ownerName.trim() && form.contactEmail.trim() && form.country.trim();
  const step2Valid = form.services.length > 0 && form.teamSize;
  const step3Valid = form.agreeTerms;

  const PLAN_DETAILS = [
    {
      key: "Starter" as const,
      label: "Starter",
      price: "€49/mo",
      desc: "Up to 5 team members · 500 leads/mo · Basic reports",
      icon: "🌱",
    },
    {
      key: "Growth" as const,
      label: "Growth",
      price: "€149/mo",
      desc: "Up to 20 members · Unlimited leads · Advanced analytics · Custom domain",
      icon: "🚀",
    },
    {
      key: "Enterprise" as const,
      label: "Enterprise",
      price: "Custom",
      desc: "Unlimited team · White-label · SLA · Dedicated support",
      icon: "🏢",
    },
  ];

  if (done) {
    return (
      <div className="space-y-5 text-center py-6">
        <div className="flex h-18 w-18 items-center justify-center rounded-full bg-green-100 mx-auto" style={{ width: 72, height: 72 }}>
          <CheckCircle size={36} weight="fill" className="text-green-600" />
        </div>
        <div>
          <p className="font-heading text-h3 text-foreground">Registration submitted!</p>
          <p className="text-body-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            <strong>{form.name}</strong> has been registered and is pending review. You will receive an activation email at <span className="text-primary font-medium">{form.contactEmail}</span> within 24 hours.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-left space-y-2 max-w-sm mx-auto">
          <p className="text-body-sm font-medium text-foreground">Your clinic details:</p>
          <p className="text-caption text-muted-foreground">Slug: <span className="font-mono text-foreground">app.vitaplatform.com/<strong>{slug}</strong></span></p>
          <p className="text-caption text-muted-foreground">Plan: <span className="font-medium text-foreground">{form.plan}</span></p>
          <p className="text-caption text-muted-foreground">Services: <span className="text-foreground">{form.services.join(", ") || "—"}</span></p>
        </div>
        <button type="button" onClick={onClose} className="btn-primary mx-auto">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-caption text-muted-foreground">
          <span>Step {step} of 3</span>
          <span>{step === 1 ? "Clinic info" : step === 2 ? "Services & plan" : "Review & confirm"}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </div>

      {/* Step 1: Basic info */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <p className="font-heading text-h4 text-foreground">Tell us about your clinic</p>
            <p className="text-body-sm text-muted-foreground mt-1">This information will set up your private workspace on Vita.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Clinic / Business name *</label>
              <input value={form.name} onChange={(e) => handleNameChange(e.target.value)} className={inputClass} placeholder="e.g. DentaCare Berlin" />
              {form.name && (
                <p className="mt-1 text-caption text-muted-foreground">Your workspace URL: <span className="font-mono text-foreground">app.vita.com/<strong>{slug}</strong></span></p>
              )}
            </div>
            <div>
              <label className={labelClass}>Owner / Admin name *</label>
              <input value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} className={inputClass} placeholder="Dr. Jane Smith" />
            </div>
            <div>
              <label className={labelClass}>Contact email *</label>
              <input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} className={inputClass} placeholder="admin@yourclinic.com" />
            </div>
            <div>
              <label className={labelClass}>Country *</label>
              <input value={form.country} onChange={(e) => set("country", e.target.value)} className={inputClass} placeholder="e.g. Albania" />
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputClass} placeholder="e.g. Tirana" />
            </div>
            <div>
              <label className={labelClass}>Timezone</label>
              <select value={form.timezone} onChange={(e) => set("timezone", e.target.value)} className={inputClass}>
                {["Europe/Tirane", "Europe/Belgrade", "Europe/Rome", "Europe/Berlin", "Europe/London", "Europe/Istanbul", "Europe/Paris", "Europe/Madrid"].map((tz) => <option key={tz}>{tz}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Currency</label>
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={inputClass}>
                {["EUR", "GBP", "USD", "ALL", "MKD", "BAM", "CHF", "SEK"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Services & plan */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <p className="font-heading text-h4 text-foreground">Services &amp; subscription</p>
            <p className="text-body-sm text-muted-foreground mt-1">Select the services you offer and choose a plan that fits your team.</p>
          </div>
          {/* Services */}
          <div className="space-y-2">
            <label className={labelClass}>Services offered *</label>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { key: "Dental Tourism", icon: "🦷", desc: "Dental implants, veneers, crowns, full-arch" },
                { key: "Hair Transplant", icon: "💇", desc: "FUE, DHI, Sapphire — international patients" },
                { key: "Aesthetic Surgery", icon: "💆", desc: "Rhinoplasty, liposuction, facelifts" },
                { key: "Eye Surgery", icon: "👁", desc: "LASIK, cataract, refractive surgery" },
              ].map((svc) => {
                const active = form.services.includes(svc.key);
                return (
                  <button key={svc.key} type="button" onClick={() => toggleService(svc.key)} className={`rounded-xl border-2 p-4 text-left transition-all space-y-1 ${active ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/50"}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{svc.icon}</span>
                      <span className={`text-body-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{svc.key}</span>
                      {active && <span className="ml-auto text-primary text-[11px] font-bold">✓</span>}
                    </div>
                    <p className="text-caption text-muted-foreground">{svc.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Team size */}
          <div className="space-y-2">
            <label className={labelClass}>Team size</label>
            <div className="flex flex-wrap gap-2">
              {["1-5", "6-10", "11-50", "50+"].map((sz) => (
                <button key={sz} type="button" onClick={() => set("teamSize", sz)} className={`rounded-lg border px-4 py-2 text-body-sm font-medium transition-all ${form.teamSize === sz ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary"}`}>
                  {sz} people
                </button>
              ))}
            </div>
          </div>
          {/* Plan selection */}
          <div className="space-y-2">
            <label className={labelClass}>Choose your plan</label>
            <div className="space-y-3">
              {PLAN_DETAILS.map((pl) => (
                <button key={pl.key} type="button" onClick={() => set("plan", pl.key)} className={`w-full rounded-xl border-2 p-4 text-left transition-all flex items-center gap-4 ${form.plan === pl.key ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/50"}`}>
                  <span className="text-2xl shrink-0">{pl.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-body-sm font-bold ${form.plan === pl.key ? "text-primary" : "text-foreground"}`}>{pl.label}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${PLAN_COLORS[pl.key]}`}>{pl.price}</span>
                    </div>
                    <p className="text-caption text-muted-foreground mt-0.5">{pl.desc}</p>
                  </div>
                  {form.plan === pl.key && <span className="shrink-0 h-5 w-5 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-bold">✓</span>}
                </button>
              ))}
            </div>
          </div>
          {/* Brand color */}
          <div className="space-y-2">
            <label className={labelClass}>Brand color (optional)</label>
            <div className="flex gap-3 items-center">
              <input type="color" value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="h-10 w-14 rounded-lg border border-border cursor-pointer" />
              <div className="flex-1 rounded-lg p-2.5 text-white text-[12px] font-medium transition-all" style={{ backgroundColor: form.primaryColor }}>
                {form.name || "Your clinic name"} — preview
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review & confirm */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <p className="font-heading text-h4 text-foreground">Review &amp; confirm registration</p>
            <p className="text-body-sm text-muted-foreground mt-1">Check your details before submitting. You can change everything later from Settings.</p>
          </div>
          {/* Summary card */}
          <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: form.primaryColor }}>
                {form.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-[16px] text-foreground">{form.name}</p>
                <p className="text-caption text-muted-foreground font-mono">app.vita.com/{slug}</p>
              </div>
              <span className={`ml-auto inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${PLAN_COLORS[form.plan]}`}>{form.plan}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-body-sm">
              <div><p className="text-caption text-muted-foreground">Owner</p><p className="text-foreground mt-0.5">{form.ownerName}</p></div>
              <div><p className="text-caption text-muted-foreground">Email</p><p className="text-foreground mt-0.5 truncate">{form.contactEmail}</p></div>
              <div><p className="text-caption text-muted-foreground">Country</p><p className="text-foreground mt-0.5">{form.country}{form.city ? `, ${form.city}` : ""}</p></div>
              <div><p className="text-caption text-muted-foreground">Currency</p><p className="text-foreground mt-0.5">{form.currency}</p></div>
              <div className="sm:col-span-2"><p className="text-caption text-muted-foreground">Services</p><p className="text-foreground mt-0.5">{form.services.join(" · ") || "—"}</p></div>
            </div>
          </div>
          {/* Custom domain (optional) */}
          <div>
            <label className={labelClass}>Custom domain (optional — can be added later)</label>
            <input value={form.domain} onChange={(e) => set("domain", e.target.value)} className={inputClass} placeholder="e.g. crm.yourclinic.com" />
            <p className="mt-1 text-caption text-muted-foreground">Leave blank to use the default Vita subdomain.</p>
          </div>
          {/* Terms */}
          <button
            type="button"
            onClick={() => set("agreeTerms", !form.agreeTerms)}
            className={`w-full flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${form.agreeTerms ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/50"}`}
          >
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${form.agreeTerms ? "border-primary bg-primary text-white" : "border-border"}`}>
              {form.agreeTerms && <span className="text-[11px] font-bold">✓</span>}
            </span>
            <p className="text-body-sm text-foreground">I agree to the <span className="text-primary underline">Terms of Service</span> and <span className="text-primary underline">Privacy Policy</span>. I confirm I am authorized to register this clinic on the Vita platform.</p>
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
        <button type="button" onClick={step > 1 ? () => setStep((s) => (s - 1) as 1 | 2 | 3) : onClose} className="btn-outline">
          {step > 1 ? "← Back" : "Cancel"}
        </button>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-2 w-2 rounded-full transition-all ${step === n ? "bg-primary w-4" : step > n ? "bg-primary/40" : "bg-muted-foreground/30"}`} />
          ))}
        </div>
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
            disabled={step === 1 ? !step1Valid : !step2Valid}
            className="btn-primary"
          >
            Continue →
          </button>
        ) : (
          <button type="button" onClick={handleFinish} disabled={!step3Valid} className="btn-primary">
            <CheckCircle size={14} />
            Register Clinic
          </button>
        )}
      </div>
    </div>
  );
}

function MultiTenantManager({ isOwner = false }: { isOwner?: boolean }) {
  const [tenants, setTenants] = useState<Tenant[]>(DEMO_TENANTS);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [adminTab, setAdminTab] = useState<"all" | "active" | "trial" | "pending" | "suspended">("all");
  const [search, setSearch] = useState("");

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId) ?? null;
  const [form, setForm] = useState<Partial<Tenant>>({});

  const openEdit = (t: Tenant) => {
    setForm({ ...t });
    setSelectedTenantId(t.id);
    setEditMode(true);
    setShowNewForm(false);
    setShowRegistration(false);
  };

  const saveEdit = () => {
    if (!selectedTenantId) return;
    setTenants((prev) => prev.map((t) => t.id === selectedTenantId ? { ...t, ...form } as Tenant : t));
    setEditMode(false);
  };

  const toggleStatus = (id: string) => {
    setTenants((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      return { ...t, status: t.status === "Active" ? "Suspended" : "Active" };
    }));
  };

  const activateTenant = (id: string) => {
    setTenants((prev) => prev.map((t) => t.id === id ? { ...t, status: "Active" } : t));
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesTab = adminTab === "all" ? true : t.status.toLowerCase() === adminTab;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || [t.name, t.contactEmail, t.country, t.ownerName].join(" ").toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  // Stats
  const activeCount = tenants.filter((t) => t.status === "Active").length;
  const trialCount = tenants.filter((t) => t.status === "Trial").length;
  const pendingCount = tenants.filter((t) => t.status === "Pending").length;
  const suspendedCount = tenants.filter((t) => t.status === "Suspended").length;

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "mb-1 block text-body-sm font-medium text-foreground";

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Gear size={22} />
            </div>
            <div>
              <h3 className="font-heading text-h3 text-foreground">Multi-Tenant Manager</h3>
              <p className="text-body-sm text-muted-foreground">Each clinic gets its own isolated workspace, user accounts, data, and custom domain.</p>
            </div>
          </div>
          {!isOwner && (
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={() => { setShowRegistration(true); setShowNewForm(false); setEditMode(false); }} className="btn-outline flex items-center gap-1.5 text-[13px]">
                <PlusCircle size={14} />
                Clinic registers
              </button>
              <button type="button" onClick={() => { setShowNewForm(true); setShowRegistration(false); setEditMode(false); }} className="btn-primary">
                <PlusCircle size={14} />
                Add manually
              </button>
            </div>
          )}
        </div>

        {/* KPI chips */}
        <div className="mt-4 flex flex-wrap gap-3">
          {[
            { label: "Total tenants", value: tenants.length, cls: "bg-muted/30 text-foreground border border-border" },
            { label: "Active", value: activeCount, cls: "bg-green-50 text-green-800 border border-green-200" },
            { label: "Trial", value: trialCount, cls: "bg-yellow-50 text-yellow-800 border border-yellow-200" },
            { label: "Pending review", value: pendingCount, cls: pendingCount > 0 ? "bg-orange-50 text-orange-800 border border-orange-200 animate-pulse" : "bg-muted/30 text-muted-foreground border border-border" },
            { label: "Suspended", value: suspendedCount, cls: suspendedCount > 0 ? "bg-red-50 text-red-800 border border-red-200" : "bg-muted/30 text-muted-foreground border border-border" },
          ].map((chip) => (
            <div key={chip.label} className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium ${chip.cls}`}>
              <span className="font-bold text-[14px]">{chip.value}</span>
              <span>{chip.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Clinic Registration Modal ── */}
      {showRegistration && (
        <div className="rounded-xl border-2 border-primary/30 bg-background shadow-lg overflow-hidden">
          <div className="border-b border-border bg-primary/5 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏥</span>
              <div>
                <p className="font-heading text-h4 text-foreground">New Clinic Registration</p>
                <p className="text-caption text-muted-foreground">A clinic fills this form to join the Vita platform</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowRegistration(false)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-tertiary">
              <X size={14} />
            </button>
          </div>
          <div className="p-6">
            <ClinicRegistrationForm
              onClose={() => setShowRegistration(false)}
              onRegistered={(tenant) => {
                setTenants((prev) => [...prev, tenant]);
                setTimeout(() => setShowRegistration(false), 2500);
              }}
            />
          </div>
        </div>
      )}

      {/* ── Manual Add Form ── */}
      {showNewForm && (
        <div className="rounded-xl border border-primary/30 bg-background p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-heading text-h4 text-foreground">Add Tenant Manually</h4>
            <button type="button" onClick={() => setShowNewForm(false)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-tertiary">
              <X size={13} />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Clinic name *</label>
              <input value={form.name ?? ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }))} className={inputClass} placeholder="e.g. Vita Skopje" />
            </div>
            <div>
              <label className={labelClass}>Owner name</label>
              <input value={form.ownerName ?? ""} onChange={(e) => setForm((p) => ({ ...p, ownerName: e.target.value }))} className={inputClass} placeholder="Dr. John Doe" />
            </div>
            <div>
              <label className={labelClass}>Contact email</label>
              <input type="email" value={form.contactEmail ?? ""} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} className={inputClass} placeholder="admin@clinic.com" />
            </div>
            <div>
              <label className={labelClass}>Custom domain</label>
              <input value={form.domain ?? ""} onChange={(e) => setForm((p) => ({ ...p, domain: e.target.value }))} className={inputClass} placeholder="e.g. crm.clinic.com" />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input value={form.country ?? ""} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} className={inputClass} placeholder="e.g. Albania" />
            </div>
            <div>
              <label className={labelClass}>Plan</label>
              <select value={form.plan ?? "Starter"} onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value as Tenant["plan"] }))} className={inputClass}>
                {["Starter", "Growth", "Enterprise"].map((pl) => <option key={pl}>{pl}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={form.status ?? "Trial"} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as Tenant["status"] }))} className={inputClass}>
                {["Active", "Trial", "Pending", "Suspended"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Currency</label>
              <select value={form.currency ?? "EUR"} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} className={inputClass}>
                {["EUR", "GBP", "USD", "ALL", "MKD", "BAM"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                if (!form.name?.trim()) return;
                const t: Tenant = {
                  id: `t${Date.now()}`,
                  name: form.name ?? "",
                  slug: (form.name ?? "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
                  domain: form.domain ?? "",
                  plan: (form.plan as Tenant["plan"]) ?? "Starter",
                  status: (form.status as Tenant["status"]) ?? "Trial",
                  primaryColor: "#0ea5e9",
                  logoUrl: "",
                  contactEmail: form.contactEmail ?? "",
                  ownerName: form.ownerName ?? "",
                  country: form.country ?? "",
                  timezone: "Europe/Tirane",
                  currency: form.currency ?? "EUR",
                  services: [],
                  teamSize: "1-5",
                  registeredAt: new Date().toISOString().split("T")[0],
                  notes: form.notes ?? "",
                };
                setTenants((prev) => [...prev, t]);
                setShowNewForm(false);
                setSelectedTenantId(t.id);
              }}
              disabled={!form.name?.trim()}
              className="btn-primary"
            >
              <PlusCircle size={14} /> Add Tenant
            </button>
            <button type="button" onClick={() => setShowNewForm(false)} className="btn-outline">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Tenant list ── */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        {/* Filter tabs + search */}
        <div className="border-b border-border px-5 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 overflow-x-auto">
            {(["all", "active", "trial", "pending", "suspended"] as const).map((tab) => {
              const counts: Record<string, number> = {
                all: tenants.length,
                active: activeCount,
                trial: trialCount,
                pending: pendingCount,
                suspended: suspendedCount,
              };
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setAdminTab(tab)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all capitalize whitespace-nowrap ${adminTab === tab ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${adminTab === tab ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {counts[tab]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative min-w-[200px]">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clinic, owner, country…"
              className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Tenant rows */}
        {filteredTenants.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-body-sm text-muted-foreground">No tenants match the current filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTenants.map((t) => {
              const isSelected = selectedTenantId === t.id;
              return (
                <div key={t.id} className={`transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/20"}`}>
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-xl flex shrink-0 items-center justify-center text-white font-bold text-[15px] border border-border/50" style={{ backgroundColor: t.primaryColor }}>
                      {t.name.charAt(0)}
                    </div>
                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-body-sm text-foreground">{t.name}</p>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TENANT_STATUS_COLORS[t.status]}`}>
                          {TENANT_STATUS_ICONS[t.status]} {t.status}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${PLAN_COLORS[t.plan]}`}>{t.plan}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <p className="text-caption text-muted-foreground">👤 {t.ownerName || "—"}</p>
                        <p className="text-caption text-muted-foreground">📍 {t.country || "—"}</p>
                        <p className="text-caption text-muted-foreground">✉ {t.contactEmail || "—"}</p>
                        {t.domain && <p className="text-caption text-muted-foreground font-mono">🌐 {t.domain}</p>}
                        {!t.domain && <p className="text-caption font-mono text-muted-foreground/60">app.vita.com/{t.slug}</p>}
                      </div>
                      {t.services.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {t.services.map((svc) => (
                            <span key={svc} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{svc}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {t.status === "Pending" && (
                        <button
                          type="button"
                          onClick={() => activateTenant(t.id)}
                          className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-caption font-semibold text-green-700 hover:bg-green-100 transition-colors"
                        >
                          ✓ Approve
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(t)}
                        className="rounded-lg border border-border bg-background px-3 py-1.5 text-caption font-medium text-foreground hover:bg-tertiary transition-colors"
                      >
                        Configure
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(t.id)}
                        className={`rounded-lg border px-3 py-1.5 text-caption font-medium transition-colors ${
                          t.status === "Active"
                            ? "border-error/30 bg-error/5 text-error hover:bg-error/10"
                            : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        {t.status === "Active" ? "Suspend" : "Activate"}
                      </button>
                    </div>
                  </div>

                  {/* Expandable notes */}
                  {t.notes && isSelected && (
                    <div className="border-t border-border/50 px-5 py-3 bg-muted/20">
                      <p className="text-caption text-muted-foreground">📝 {t.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Configure Tenant Panel ── */}
      {editMode && selectedTenant && (
        <div className="rounded-xl border border-border bg-background p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-[15px]" style={{ backgroundColor: form.primaryColor ?? selectedTenant.primaryColor }}>
                {(form.name ?? selectedTenant.name).charAt(0)}
              </div>
              <div>
                <h4 className="font-heading text-h4 text-foreground">Configure: {selectedTenant.name}</h4>
                <p className="text-caption text-muted-foreground font-mono">app.vita.com/{selectedTenant.slug}</p>
              </div>
            </div>
            <button type="button" onClick={() => setEditMode(false)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-tertiary">
              <X size={13} />
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* General */}
            <div className="space-y-4">
              <h5 className="text-body-sm font-semibold text-foreground border-b border-border pb-2">General</h5>
              <div>
                <label className={labelClass}>Clinic name</label>
                <input value={form.name ?? ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Owner name</label>
                <input value={form.ownerName ?? ""} onChange={(e) => setForm((p) => ({ ...p, ownerName: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Contact email</label>
                <input type="email" value={form.contactEmail ?? ""} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input value={form.country ?? ""} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Timezone</label>
                <select value={form.timezone ?? ""} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))} className={inputClass}>
                  {["Europe/Tirane", "Europe/Belgrade", "Europe/Rome", "Europe/Berlin", "Europe/London", "Europe/Istanbul"].map((tz) => <option key={tz}>{tz}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Currency</label>
                <select value={form.currency ?? "EUR"} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} className={inputClass}>
                  {["EUR", "GBP", "USD", "ALL", "MKD", "BAM"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Internal notes</label>
                <textarea value={form.notes ?? ""} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} className={inputClass} placeholder="Follow-up context, special agreement..." />
              </div>
            </div>

            {/* Domain + branding + plan */}
            <div className="space-y-4">
              <h5 className="text-body-sm font-semibold text-foreground border-b border-border pb-2">Domain &amp; Branding</h5>
              <div>
                <label className={labelClass}>Custom domain</label>
                <input value={form.domain ?? ""} onChange={(e) => setForm((p) => ({ ...p, domain: e.target.value }))} className={inputClass} placeholder="e.g. crm.clinic.com" />
                <p className="mt-1 text-caption text-muted-foreground">Add a CNAME record pointing to <span className="font-mono bg-muted px-1 rounded">app.vitaplatform.com</span></p>
              </div>
              <div>
                <label className={labelClass}>Slug (URL key — read-only)</label>
                <input value={form.slug ?? ""} readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
              </div>
              <div>
                <label className={labelClass}>Brand color</label>
                <div className="flex gap-2">
                  <input type="color" value={form.primaryColor ?? "#0ea5e9"} onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))} className="h-10 w-14 rounded-lg border border-border cursor-pointer" />
                  <input value={form.primaryColor ?? "#0ea5e9"} onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))} className={`${inputClass} flex-1`} />
                </div>
                <div className="mt-2 rounded-lg p-3 text-white text-[12px] font-medium" style={{ backgroundColor: form.primaryColor ?? "#0ea5e9" }}>
                  {(form.name ?? selectedTenant.name)} — color preview
                </div>
              </div>
              <div>
                <label className={labelClass}>Plan</label>
                <select value={form.plan ?? "Starter"} onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value as Tenant["plan"] }))} className={inputClass}>
                  {["Starter", "Growth", "Enterprise"].map((pl) => <option key={pl}>{pl}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select value={form.status ?? "Active"} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as Tenant["status"] }))} className={inputClass}>
                  {["Active", "Trial", "Pending", "Suspended"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* DNS setup guide */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-body-sm font-semibold text-foreground">🌐 Custom domain DNS setup</p>
            <ol className="list-decimal ml-5 space-y-1 text-body-sm text-muted-foreground">
              <li>Login to your DNS provider (Cloudflare, GoDaddy, Namecheap, etc.)</li>
              <li>Create a <span className="font-mono bg-muted px-1 rounded text-foreground">CNAME</span> record: <span className="font-mono bg-muted px-1 rounded text-foreground">{form.slug ?? "slug"}</span> → <span className="font-mono bg-muted px-1 rounded text-foreground">app.vitaplatform.com</span></li>
              <li>Enter the domain in the field above and save</li>
              <li>DNS propagation can take up to 24h</li>
              <li>SSL certificate is provisioned automatically after verification</li>
            </ol>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={saveEdit} className="btn-primary">
              <CheckCircle size={14} /> Save Changes
            </button>
            <button type="button" onClick={() => setEditMode(false)} className="btn-outline">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Role-Based Access Control ───────────────────────────────────────────────

type UserRole = "Admin" | "Owner" | "Sales" | "Coordinator" | "Doctor" | "Finance" | "ReadOnly";

const ROLE_CONFIG: Record<UserRole, {
  label: string;
  color: string;
  modules: ModuleKey[];
  canCreateLead: boolean;
  canEditFinance: boolean;
  canApproveQuote: boolean;
  canSeeAllPatients: boolean;
  canDeleteRecords: boolean;
  canExportData: boolean;
}> = {
  Admin: {
    label: "Admin",
    color: "bg-red-100 text-red-800",
    modules: ["leads", "patients", "quotes", "payments", "appointments", "travel", "tasks", "reports", "settings"],
    canCreateLead: true,
    canEditFinance: true,
    canApproveQuote: true,
    canSeeAllPatients: true,
    canDeleteRecords: true,
    canExportData: true,
  },
  Owner: {
    label: "Clinic Owner",
    color: "bg-purple-100 text-purple-800",
    modules: ["leads", "patients", "quotes", "payments", "appointments", "travel", "tasks", "reports", "settings"],
    canCreateLead: true,
    canEditFinance: true,
    canApproveQuote: true,
    canSeeAllPatients: true,
    canDeleteRecords: false,
    canExportData: true,
  },
  Sales: {
    label: "Sales Agent",
    color: "bg-blue-100 text-blue-800",
    modules: ["leads", "patients", "quotes", "tasks", "appointments"],
    canCreateLead: true,
    canEditFinance: false,
    canApproveQuote: false,
    canSeeAllPatients: true,
    canDeleteRecords: false,
    canExportData: false,
  },
  Coordinator: {
    label: "Coordinator",
    color: "bg-green-100 text-green-800",
    modules: ["patients", "travel", "tasks", "appointments", "quotes"],
    canCreateLead: false,
    canEditFinance: false,
    canApproveQuote: false,
    canSeeAllPatients: true,
    canDeleteRecords: false,
    canExportData: false,
  },
  Doctor: {
    label: "Doctor",
    color: "bg-teal-100 text-teal-800",
    modules: ["patients", "appointments", "tasks"],
    canCreateLead: false,
    canEditFinance: false,
    canApproveQuote: true,
    canSeeAllPatients: false,
    canDeleteRecords: false,
    canExportData: false,
  },
  Finance: {
    label: "Finance Officer",
    color: "bg-yellow-100 text-yellow-800",
    modules: ["payments", "reports", "quotes"],
    canCreateLead: false,
    canEditFinance: true,
    canApproveQuote: false,
    canSeeAllPatients: false,
    canDeleteRecords: false,
    canExportData: true,
  },
  ReadOnly: {
    label: "Read Only",
    color: "bg-muted text-muted-foreground",
    modules: ["leads", "patients", "reports"],
    canCreateLead: false,
    canEditFinance: false,
    canApproveQuote: false,
    canSeeAllPatients: false,
    canDeleteRecords: false,
    canExportData: false,
  },
};

// ─── WHITELIST: emailet e regjistruara dhe rolet e tyre ───────────────────────
// ⚠️ Shto emailet reale këtu para se të shkoni live.
// Çdo email jashtë listës → ReadOnly (pa akses të ndjeshëm).
const INITIAL_ROLE_WHITELIST: Record<string, UserRole> = {
  // ── Super Admin (platform-level access) ─────────────────────────────────────
  "xhentil@fivo.al":          "Admin",

  // ── Clinic Owner (clinic-level access) ──────────────────────────────────────
  "vivirmed14@gmail.com":     "Owner",

  // ── Clinic team members ──────────────────────────────────────────────────────
  "biznesweb.al@gmail.com":   "Sales",
};

// ─── Persistent whitelist (survives page refresh) ───────────────────────────
const _WHITELIST_STORAGE_KEY = "vita_team_whitelist_v1";

function _loadPersistedWhitelist(): Record<string, UserRole> {
  try {
    const raw = localStorage.getItem(_WHITELIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string>;
      // Always merge on top of INITIAL so hardcoded accounts are never lost
      const merged: Record<string, UserRole> = {};
      Object.entries({ ...INITIAL_ROLE_WHITELIST, ...parsed }).forEach(([k, v]) => {
        const key = k.trim().toLowerCase();
        if (key && typeof v === "string") merged[key] = v as UserRole;
      });
      return merged;
    }
  } catch {
    // ignore JSON parse errors — fall back to initial
  }
  return { ...INITIAL_ROLE_WHITELIST };
}

// Runtime mutable whitelist — persisted in localStorage across page refreshes
let _runtimeWhitelist: Record<string, UserRole> = _loadPersistedWhitelist();

function isUserInWhitelist(email?: string | null): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  const normalized = Object.fromEntries(
    Object.entries(_runtimeWhitelist).map(([k, v]) => [k.trim().toLowerCase(), v])
  );
  return e in normalized;
}

function resolveUserRole(email?: string | null): UserRole {
  if (!email) return "ReadOnly";
  const e = email.trim().toLowerCase();
  // Normalize whitelist keys to lowercase for lookup
  const normalized = Object.fromEntries(
    Object.entries(_runtimeWhitelist).map(([k, v]) => [k.trim().toLowerCase(), v])
  );
  return normalized[e] ?? "ReadOnly";
}

function getRuntimeWhitelist(): Record<string, UserRole> {
  return { ..._runtimeWhitelist };
}

function setRuntimeWhitelist(next: Record<string, UserRole>) {
  // Always store emails as lowercase to prevent case-mismatch bugs
  const normalized: Record<string, UserRole> = {};
  Object.entries(next).forEach(([k, v]) => { normalized[k.trim().toLowerCase()] = v; });
  _runtimeWhitelist = normalized;
  // Persist to localStorage so team changes survive page refresh
  try { localStorage.setItem(_WHITELIST_STORAGE_KEY, JSON.stringify(normalized)); } catch { /* quota errors ignored */ }
}

// Role badge component
function RoleBadge({ role }: { role: UserRole }) {
  const { label, color } = ROLE_CONFIG[role];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

// Access gate hook
function useRoleAccess(userEmail?: string | null) {
  const role = resolveUserRole(userEmail);
  const config = ROLE_CONFIG[role];
  return { role, config };
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin, onRegisterClinic }: { onLogin: () => void; onRegisterClinic?: () => void }) {
  return (
    <div className="min-h-screen bg-[var(--color-sidebar)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
              <Stethoscope size={32} weight="bold" className="text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-white leading-tight">Vita</h1>
            <p className="text-[13px] text-[var(--color-sidebar-muted)] mt-1">Medical Tourism Platform</p>
          </div>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-hover)] p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-[17px] font-semibold text-white">Sign in to continue</h2>
            <p className="text-[12px] text-[var(--color-sidebar-muted)] mt-1.5">Secure access for clinic team members</p>
          </div>

          <button
            type="button"
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-[14px] font-semibold text-gray-800 transition-all hover:bg-gray-100 active:scale-[0.98] shadow-md border border-gray-200"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M47.532 24.5528C47.532 22.9214 47.3997 21.2811 47.1175 19.6761H24.48V28.9181H37.4434C36.9055 31.8988 35.177 34.5356 32.6461 36.2111V42.2078H40.3801C44.9217 38.0278 47.532 31.8547 47.532 24.5528Z" fill="#4285F4"/>
              <path d="M24.48 48.0016C30.9529 48.0016 36.4116 45.8764 40.3888 42.2078L32.6549 36.2111C30.5031 37.675 27.7252 38.5039 24.4888 38.5039C18.2275 38.5039 12.9187 34.2798 11.0139 28.6006H3.03296V34.7825C7.10718 42.8868 15.4056 48.0016 24.48 48.0016Z" fill="#34A853"/>
              <path d="M11.0051 28.6006C9.99973 25.6199 9.99973 22.3922 11.0051 19.4115V13.2296H3.03298C-0.371021 20.0112 -0.371021 28.0009 3.03298 34.7825L11.0051 28.6006Z" fill="#FBBC04"/>
              <path d="M24.48 9.49932C27.9016 9.44641 31.2086 10.7339 33.6866 13.0973L40.5387 6.24523C36.2 2.17101 30.4414 -0.068932 24.48 0.00161733C15.4055 0.00161733 7.10718 5.11644 3.03296 13.2296L11.005 19.4115C12.901 13.7235 18.2187 9.49932 24.48 9.49932Z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          {/* Role reference */}
          <div className="rounded-xl border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar)] p-4 space-y-3">
            <p className="text-[11px] font-semibold text-[var(--color-sidebar-muted)] uppercase tracking-wider">Available roles</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[var(--color-sidebar-muted)] leading-relaxed">
              Your role is assigned automatically based on your registered account email.
            </p>
          </div>
        </div>

        {/* ── Clinic Registration CTA ── */}
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Stethoscope size={20} weight="bold" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-white leading-none">Regjistro klinikën tënde</p>
              <p className="text-[11px] text-[var(--color-sidebar-muted)] mt-1">Fillo falas — pa kartë krediti</p>
            </div>
          </div>
          <p className="text-[12px] text-[var(--color-sidebar-muted)] leading-relaxed">
            Bashkohuni me klinakat që menaxhojnë pacientë ndërkombëtarë nga Dental Tourism deri te Hair Transplant.
          </p>
          <button
            type="button"
            onClick={onRegisterClinic}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-4 py-3 text-[14px] font-semibold text-white transition-all hover:bg-primary-hover active:scale-[0.98] shadow-md shadow-primary/20"
          >
            <PlusCircle size={16} weight="bold" />
            Regjistro klinikën tënde →
          </button>
        </div>

        <p className="text-center text-[11px] text-[var(--color-sidebar-muted)]">
          Vita Platform · GDPR-compliant · Encrypted
        </p>
      </div>
    </div>
  );
}

// ─── Unauthorized screen (user not in whitelist) ────────────────────────────

function UnauthorizedScreen({ user, onLogout }: { user: { email: string; name: string; profilePictureUrl?: string }; onLogout: () => void }) {
  const [showReg, setShowReg] = useState(false);
  const [showAccessReq, setShowAccessReq] = useState(false);
  const [accessMsg, setAccessMsg] = useState("");
  const [accessSent, setAccessSent] = useState(false);

  if (showReg) {
    return (
      <div className="min-h-screen bg-[var(--color-sidebar)] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <button
            type="button"
            onClick={() => setShowReg(false)}
            className="flex items-center gap-2 text-[13px] text-[var(--color-sidebar-muted)] hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Kthehu
          </button>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
              <Stethoscope size={20} weight="bold" className="text-white" />
            </div>
            <div>
              <p className="text-[16px] font-bold text-white">Vita</p>
              <p className="text-[11px] text-[var(--color-sidebar-muted)] mt-0.5">Regjistro klinikën tënde</p>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-hover)] p-8">
            <ClinicRegistrationForm
              onClose={() => setShowReg(false)}
              onRegistered={(_tenant) => {
                // Grant Owner access to the currently logged-in Google account
                const wl = getRuntimeWhitelist();
                const next: Record<string, UserRole> = { ...wl, [user.email.toLowerCase()]: "Owner" };
                setRuntimeWhitelist(next);
                // Small delay so localStorage is flushed, then reload to pass whitelist check
                setTimeout(() => window.location.reload(), 400);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-sidebar)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-warning/10 border-2 border-warning/30">
            <Warning size={40} weight="fill" className="text-warning" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-[22px] font-bold text-white">Akses i kufizuar</h1>
          <p className="text-[14px] text-[var(--color-sidebar-muted)] leading-relaxed">
            Llogaria juaj (<span className="text-white font-medium">{user.email}</span>) nuk është e regjistruar në këtë platformë.
          </p>
          <p className="text-[13px] text-[var(--color-sidebar-muted)]">
            Kontaktoni administratorin e klinikës suaj për të marrë ftesë.
          </p>
        </div>

        {/* Info card */}
        <div className="rounded-2xl border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-hover)] p-5 text-left space-y-3">
          <p className="text-[12px] font-semibold text-[var(--color-sidebar-muted)] uppercase tracking-wider">Çfarë duhet të bëni:</p>
          <div className="space-y-2">
            {[
              "Kontaktoni owner-in ose admin-in e klinikës suaj",
              "Kërkoni të shtojë email-in tuaj si anëtar ekipi",
              "Pasi shtoheni, kyçuni sërish me këtë llogari Google",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-[11px] font-bold mt-0.5">{i + 1}</span>
                <span className="text-[13px] text-[var(--color-sidebar-muted)]">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── TWO action CTAs ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Register clinic */}
          <button
            type="button"
            onClick={() => setShowReg(true)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-left hover:bg-primary/20 transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Stethoscope size={20} weight="bold" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white leading-snug">Regjistro klinikën</p>
              <p className="text-[11px] text-[var(--color-sidebar-muted)] mt-0.5">Fillo falas — pa kartë</p>
            </div>
          </button>

          {/* Request access */}
          <button
            type="button"
            onClick={() => setShowAccessReq((v) => !v)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-hover)] p-4 text-left hover:border-primary/50 transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40 text-[var(--color-sidebar-muted)]">
              <SignIn size={20} weight="bold" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white leading-snug">Kërko akses</p>
              <p className="text-[11px] text-[var(--color-sidebar-muted)] mt-0.5">Dërgo kërkesë admini</p>
            </div>
          </button>
        </div>

        {/* Access request mini-form */}
        {showAccessReq && (
          <div className="rounded-2xl border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-hover)] p-5 text-left space-y-3">
            {accessSent ? (
              <div className="text-center space-y-2 py-2">
                <CheckCircle size={32} weight="fill" className="text-green-500 mx-auto" />
                <p className="text-[14px] font-semibold text-white">Kërkesa u dërgua!</p>
                <p className="text-[12px] text-[var(--color-sidebar-muted)]">Adminët do të rishikojnë kërkesën tuaj dhe do t&#39;ju kontaktojnë.</p>
              </div>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-white">Dërgoni kërkesë për akses</p>
                <p className="text-[11px] text-[var(--color-sidebar-muted)]">Email-i juaj (<strong className="text-white">{user.email}</strong>) do të dërgohet te admini i platformës.</p>
                <textarea
                  value={accessMsg}
                  onChange={(e) => setAccessMsg(e.target.value)}
                  rows={3}
                  placeholder="Shpjegoni pse keni nevojë për akses (klinika, pozicioni, etj.)..."
                  className="w-full rounded-lg border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar)] px-3 py-2 text-[13px] text-white placeholder:text-[var(--color-sidebar-muted)] focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const subject = encodeURIComponent("Kerkese Aksesi - Vita Medical Platform");
                      const body = encodeURIComponent("Email: " + user.email + "\nEmri: " + user.name + "\n\nMesazhi:\n" + (accessMsg || "Kerkese per akses"));
                      const anchor = document.createElement("a");
                      anchor.href = "https://mail.google.com/mail/?view=cm&tf=1&to=xhentil%40fivo.al&su=" + subject + "&body=" + body;
                      anchor.target = "_blank";
                      anchor.rel = "noopener noreferrer";
                      document.body.appendChild(anchor);
                      anchor.click();
                      document.body.removeChild(anchor);
                      setAccessSent(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-primary-hover transition-colors"
                  >
                    <SignIn size={14} />
                    Dërgo kërkesën
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAccessReq(false)}
                    className="rounded-lg border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar)] px-4 py-2.5 text-[12px] text-[var(--color-sidebar-muted)] hover:text-white transition-colors"
                  >
                    Anulo
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Logged in as */}
        <div className="rounded-xl border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-hover)] p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[15px]">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[13px] font-medium text-white truncate">{user.name}</p>
            <p className="text-[11px] text-[var(--color-sidebar-muted)] truncate">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar)] px-3 py-2 text-[12px] font-medium text-[var(--color-sidebar-muted)] hover:text-white transition-colors"
          >
            <SignOut size={14} />
            Dil
          </button>
        </div>

        <p className="text-[11px] text-[var(--color-sidebar-muted)]">
          Vita Platform · Akses i kontrolluar · Ftohet vetëm nga adminët e klinikës
        </p>
      </div>
    </div>
  );
}

// ─── Access Denied screen ────────────────────────────────────────────────────

function AccessDenied({ moduleName, role, onNavigate }: { moduleName: string; role: UserRole; onNavigate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error/10 text-error">
        <Warning size={32} />
      </div>
      <div>
        <h2 className="font-heading text-h2 text-foreground">Access restricted</h2>
        <p className="text-body-sm text-muted-foreground mt-2 max-w-sm">
          Your role (<RoleBadge role={role} />) does not have permission to view <strong>{moduleName}</strong>.
        </p>
      </div>
      <button type="button" onClick={onNavigate} className="btn-primary">
        Go to dashboard
      </button>
    </div>
  );
}

// ─── Local-only UI types ────────────────────────────────────────────────────

type ModuleKey =
  | "leads"
  | "patients"
  | "quotes"
  | "payments"
  | "appointments"
  | "travel"
  | "tasks"
  | "reports"
  | "settings";

type ViewKey = "list" | "kanban" | "timeline" | "dashboard";

// ─── Lead Inbox constants ─────────────────────────────────────────────────────

const DENTAL_STAGES = [
  "New Lead",
  "Attempting Contact",
  "Contacted",
  "Qualified",
  "Photos Requested",
  "Photos Received",
  "Doctor Review Pending",
  "Treatment Plan Ready",
  "Quote Sent",
  "Negotiation / Follow-up",
  "Deposit Requested",
  "Deposit Paid",
  "Travel Planned",
  "Appointment Confirmed",
  "In Treatment",
  "Treatment Completed",
  "Follow-up Active",
  "Review Requested",
  "Referral",
  "Lost",
];

const HAIR_STAGES = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Photo Assessment Requested",
  "Photos Received",
  "Doctor Assessment Done",
  "Graft Estimate Sent",
  "Offer Sent",
  "Follow-up",
  "Deposit Paid",
  "Flight / Hotel Planned",
  "Surgery Scheduled",
  "Procedure Done",
  "10-Day Follow-up",
  "1-Month Follow-up",
  "3-Month Follow-up",
  "6-Month Follow-up",
  "12-Month Follow-up",
  "Review / Referral",
  "Lost",
];

const ALL_SOURCES = [
  "All Sources",
  "Website Form",
  "Facebook Lead Ad",
  "Instagram",
  "TikTok",
  "Google Ads",
  "WhatsApp",
  "Phone Call",
  "Referral",
  "Walk-in",
  "Partner Agency",
  "Manual Entry",
];

const ALL_SERVICES = ["All Services", "Dental Tourism", "Hair Transplant"];

const ALL_URGENCY = ["All Urgency", "High", "Medium", "Low"];

const ALL_STATUSES = ["All Status", "Active", "Lost", "Completed"];

const SOURCE_COLORS: Record<string, string> = {
  "Facebook Lead Ad": "bg-[#1877F2] text-white",
  Instagram: "bg-[#E1306C] text-white",
  TikTok: "bg-[#010101] text-white",
  "Google Ads": "bg-[#EA4335] text-white",
  WhatsApp: "bg-[#25D366] text-white",
  "Website Form": "bg-primary text-primary-foreground",
  "Phone Call": "bg-warning text-warning-foreground",
  Referral: "bg-accent text-accent-foreground",
  "Walk-in": "bg-secondary text-secondary-foreground",
  "Partner Agency": "bg-info text-info-foreground",
  "Manual Entry": "bg-muted text-muted-foreground",
};

const KANBAN_DENTAL_COLS = [
  "New Lead",
  "Attempting Contact",
  "Contacted",
  "Qualified",
  "Doctor Review Pending",
  "Quote Sent",
  "Deposit Paid",
  "Lost",
];

const KANBAN_HAIR_COLS = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Doctor Assessment Done",
  "Offer Sent",
  "Deposit Paid",
  "Surgery Scheduled",
  "Lost",
];

// ─── Static reference data (images, notifications, stats) ───────────────────

const SERVICE_IMAGES: Record<string, { src: string; alt: string }> = {
  dental: {
    src: "https://c.animaapp.com/mnywndlePh3yN0/img/ai_3.png",
    alt: "dentist performing dental treatment",
  },
  hair: {
    src: "https://c.animaapp.com/mnywndlePh3yN0/img/ai_4.png",
    alt: "hair transplant team in procedure",
  },
  default: {
    src: "https://c.animaapp.com/mnywndlePh3yN0/img/ai_2.png",
    alt: "doctor reviewing medical images",
  },
};

function serviceImage(service: string) {
  const s = service?.toLowerCase() ?? "";
  if (s.includes("hair") || s.includes("fue") || s.includes("dhi"))
    return SERVICE_IMAGES.hair;
  if (
    s.includes("dental") ||
    s.includes("implant") ||
    s.includes("veneer") ||
    s.includes("crown")
  )
    return SERVICE_IMAGES.dental;
  return SERVICE_IMAGES.default;
}

const NOTIFICATIONS = [
  {
    id: "NT-1",
    title: "Doctor review pending",
    detail: "New lead requires approval before quote is sent.",
    time: "4 min ago",
  },
  {
    id: "NT-2",
    title: "SLA breach risk",
    detail: "3 new leads have not received first response within 30 minutes.",
    time: "12 min ago",
  },
  {
    id: "NT-3",
    title: "Appointment updated",
    detail: "Airport transfer confirmed for latest patient.",
    time: "28 min ago",
  },
];

const moduleItems: { key: ModuleKey; label: string; icon: JSX.Element }[] = [
  { key: "leads", label: "Leads", icon: <Users size={20} weight="regular" /> },
  {
    key: "patients",
    label: "Patients",
    icon: <UserCircle size={20} weight="regular" />,
  },
  {
    key: "quotes",
    label: "Quotes",
    icon: <ClipboardText size={20} weight="regular" />,
  },
  {
    key: "payments",
    label: "Payments",
    icon: <CurrencyDollar size={20} weight="regular" />,
  },
  {
    key: "appointments",
    label: "Appointments",
    icon: <CalendarDots size={20} weight="regular" />,
  },
  {
    key: "travel",
    label: "Travel",
    icon: <AirplaneTakeoff size={20} weight="regular" />,
  },
  {
    key: "tasks",
    label: "Tasks",
    icon: <CheckCircle size={20} weight="regular" />,
  },
  {
    key: "reports",
    label: "Reports",
    icon: <ChartBar size={20} weight="regular" />,
  },
  {
    key: "settings",
    label: "Settings",
    icon: <Gear size={20} weight="regular" />,
  },
];

// ─── Source Badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const cls = SOURCE_COLORS[source] ?? "bg-muted text-muted-foreground";
  const icons: Record<string, string> = {
    "Facebook Lead Ad": "f",
    Instagram: "ig",
    TikTok: "tt",
    "Google Ads": "g",
    WhatsApp: "wa",
    "Website Form": "web",
    "Phone Call": "📞",
    Referral: "ref",
    "Walk-in": "🚶",
    "Partner Agency": "pa",
    "Manual Entry": "me",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${cls}`}
    >
      {icons[source] ? <span className="font-bold">{icons[source]}</span> : null}
      {source}
    </span>
  );
}

// ─── Stage Transition Dropdown ────────────────────────────────────────────────

function StageSelector({
  currentStage,
  service,
  leadId,
  onUpdated,
}: {
  currentStage: string;
  service: string;
  leadId: string;
  onUpdated: () => void;
}) {
  const { update, isPending } = useMutation("Lead");
  const stages = service === "Hair Transplant" ? HAIR_STAGES : DENTAL_STAGES;

  const handleChange = async (newStage: string) => {
    if (newStage === currentStage) return;
    try {
      await update(leadId, { stage: newStage, status: newStage === "Lost" ? "Lost" : "Active" });
      onUpdated();
    } catch (err) {
      console.error("Stage update failed:", err);
    }
  };

  return (
    <div className="relative">
      <select
        value={currentStage}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="w-full appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-8 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        aria-label="Change pipeline stage"
      >
        {stages.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {isPending && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2">
          <Spinner size={12} className="animate-spin text-muted-foreground" />
        </span>
      )}
      {!isPending && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
          ▾
        </span>
      )}
    </div>
  );
}

// ─── Import Leads (CSV) ───────────────────────────────────────────────────────

const CSV_COLUMN_MAP: Record<string, string> = {
  name: "name", "full name": "name", "lead name": "name",
  phone: "phone", "phone number": "phone", mobile: "phone",
  email: "email", "e-mail": "email",
  country: "country",
  city: "city",
  language: "language", lang: "language",
  source: "source", channel: "source",
  service: "service",
  "sub-service": "subService", subservice: "subService", treatment: "subService",
  stage: "stage",
  status: "status",
  urgency: "urgencyLevel", "urgency level": "urgencyLevel",
  budget: "budgetRange", "budget range": "budgetRange",
  "travel window": "travelWindow", travelwindow: "travelWindow",
  notes: "notes",
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseLeadsCSV(text: string): { leads: Record<string, string>[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { leads: [], errors: ["CSV duhet të ketë të paktën 1 rresht header + 1 rresht të dhënash."] };

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim().replace(/['"]/g, ""));
  const mappedHeaders = headers.map((h) => CSV_COLUMN_MAP[h] ?? null);

  const leads: Record<string, string>[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const lead: Record<string, string> = {
      name: "", phone: "", country: "", language: "English",
      source: "Manual Entry", service: "Dental Tourism",
      stage: "New Lead", status: "Active", urgencyLevel: "Medium",
    };
    headers.forEach((_, idx) => {
      const field = mappedHeaders[idx];
      if (field && cols[idx]) {
        lead[field] = cols[idx].replace(/^["']|["']$/g, "").trim();
      }
    });
    if (!lead.name) { errors.push(`Rreshti ${i + 1}: mungon emri (name).`); continue; }
    if (!lead.phone) { errors.push(`Rreshti ${i + 1}: mungon telefoni (phone).`); continue; }
    leads.push(lead);
  }
  return { leads, errors };
}

function ImportLeadsModal({ onClose }: { onClose: () => void }) {
  const { create, isPending } = useMutation("Lead");
  const { data: existingLeads } = useQuery("Lead", { limit: 500 });
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [csvText, setCsvText] = useState("");
  const [parsedLeads, setParsedLeads] = useState<Record<string, string>[]>([]);
  const [skippedDuplicates, setSkippedDuplicates] = useState<string[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      handleParse(text);
    };
    reader.readAsText(file);
  };

  const handleParse = (text: string) => {
    const { leads, errors } = parseLeadsCSV(text);
    // Deduplicate against existing DB phones
    const existingPhones = new Set(
      (existingLeads ?? []).map((l) => l.phone.replace(/\D/g, "").trim())
    );
    const dupes: string[] = [];
    const unique = leads.filter((lead) => {
      const phone = (lead.phone ?? "").replace(/\D/g, "").trim();
      if (phone && existingPhones.has(phone)) {
        dupes.push(lead.name ? `${lead.name} (${lead.phone})` : lead.phone);
        return false;
      }
      return true;
    });
    setParsedLeads(unique);
    setSkippedDuplicates(dupes);
    setParseErrors(errors);
    if (unique.length > 0 || dupes.length > 0) setStep("preview");
  };

  const handleImport = async () => {
    const errs: string[] = [];
    let count = 0;
    for (const lead of parsedLeads) {
      try {
        await create({
          name: lead.name,
          phone: lead.phone,
          email: lead.email || undefined,
          country: lead.country || "",
          city: lead.city || undefined,
          language: lead.language || "English",
          source: lead.source || "Manual Entry",
          service: lead.service || "Dental Tourism",
          subService: lead.subService || undefined,
          stage: lead.stage || "New Lead",
          status: lead.status || "Active",
          urgencyLevel: lead.urgencyLevel || "Medium",
          budgetRange: lead.budgetRange || undefined,
          travelWindow: lead.travelWindow || undefined,
          notes: lead.notes || undefined,
        });
        count++;
      } catch (err: any) {
        errs.push(`"${lead.name}": ${err?.message ?? "gabim i panjohur"}`);
      }
    }
    setImportedCount(count);
    setImportErrors(errs);
    setStep("done");
  };

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-5">
      {step === "upload" && (
        <div className="space-y-5">
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-10 text-center space-y-4">
            <UploadSimple size={40} className="mx-auto text-muted-foreground" />
            <div>
              <p className="text-body font-medium text-foreground">Ngarko skedarin CSV</p>
              <p className="text-body-sm text-muted-foreground mt-1">Kolona të pranuara: name, phone, email, country, source, service, stage, urgency, notes…</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-primary mx-auto">
              <UploadSimple size={15} />
              Zgjidh skedarin CSV
            </button>
          </div>

          {/* Template download hint */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-body-sm font-medium text-foreground">Shembull i formatit CSV:</p>
            <pre className="text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap">
{`name,phone,email,country,language,source,service,stage,urgency,notes
Ariana Kelmendi,+355691234567,ariana@email.com,Albania,Albanian,Instagram,Dental Tourism,New Lead,High,Interested in veneers
Marco Rossi,+393451234567,,Italy,Italian,Facebook Lead Ad,Hair Transplant,Contacted,Medium,`}
            </pre>
          </div>

          {/* Paste option */}
          <div className="space-y-2">
            <p className="text-body-sm font-medium text-foreground">Ose ngjit CSV direkt:</p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={5}
              className={inputClass}
              placeholder={"name,phone,country,...\nAriana,+355...,Albania,..."}
            />
            <button
              type="button"
              disabled={!csvText.trim()}
              onClick={() => handleParse(csvText)}
              className="btn-primary"
            >
              Parso CSV
            </button>
          </div>

          {parseErrors.length > 0 && (
            <div className="rounded-lg bg-error/10 border border-error/20 p-4 space-y-1">
              <p className="text-body-sm font-medium text-error">Gabime gjatë leximit:</p>
              {parseErrors.map((e, i) => <p key={i} className="text-caption text-error">{e}</p>)}
            </div>
          )}
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body font-medium text-foreground">{parsedLeads.length} lead{parsedLeads.length !== 1 ? "s" : ""} gati për import</p>
              {parseErrors.length > 0 && (
                <p className="text-caption text-warning mt-0.5">{parseErrors.length} rreshta u anashkaluan (shiko gabimet)</p>
              )}
            </div>
            <button type="button" onClick={() => setStep("upload")} className="text-caption text-primary hover:underline">← Ndrysho skedarin</button>
          </div>

          {skippedDuplicates.length > 0 && (
            <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 space-y-1">
              <p className="text-body-sm font-semibold text-warning">⚠ {skippedDuplicates.length} dublicate u anashkaluan (numër telefoni ekziston tashmë):</p>
              <div className="max-h-24 overflow-y-auto space-y-0.5">
                {skippedDuplicates.map((d, i) => <p key={i} className="text-caption text-warning">{d}</p>)}
              </div>
            </div>
          )}

          {parseErrors.length > 0 && (
            <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 space-y-1">
              {parseErrors.map((e, i) => <p key={i} className="text-caption text-warning">{e}</p>)}
            </div>
          )}

          {parsedLeads.length === 0 && skippedDuplicates.length > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
              <CheckCircle size={24} weight="fill" className="text-green-600 mx-auto mb-2" />
              <p className="text-body-sm font-medium text-green-800">Të gjitha leadt ekzistojnë tashmë — asnjë rekord i ri për import.</p>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-body-sm">
              <thead className="sticky top-0 bg-muted/90">
                <tr className="border-b border-border text-left">
                  <th className="px-3 py-2 text-muted-foreground font-medium">#</th>
                  <th className="px-3 py-2 text-muted-foreground font-medium">Emri</th>
                  <th className="px-3 py-2 text-muted-foreground font-medium">Telefon</th>
                  <th className="px-3 py-2 text-muted-foreground font-medium">Vendi</th>
                  <th className="px-3 py-2 text-muted-foreground font-medium">Burimi</th>
                  <th className="px-3 py-2 text-muted-foreground font-medium">Shërbimi</th>
                  <th className="px-3 py-2 text-muted-foreground font-medium">Faza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedLeads.map((lead, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-foreground">{lead.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{lead.phone}</td>
                    <td className="px-3 py-2 text-muted-foreground">{lead.country || "—"}</td>
                    <td className="px-3 py-2"><SourceBadge source={lead.source || "Manual Entry"} /></td>
                    <td className="px-3 py-2 text-muted-foreground">{lead.service || "Dental Tourism"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{lead.stage || "New Lead"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 pt-1">
            {parsedLeads.length > 0 && (
              <button
                type="button"
                onClick={handleImport}
                disabled={isPending}
                className="btn-primary"
              >
                {isPending ? <Spinner size={15} className="animate-spin" /> : <UploadSimple size={15} />}
                {isPending ? "Duke importuar…" : `Importo ${parsedLeads.length} lead${parsedLeads.length !== 1 ? "s" : ""}`}
              </button>
            )}
            <button type="button" onClick={onClose} className="btn-outline">
              Anulo
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-5 text-center py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto">
            <CheckCircle size={32} weight="fill" className="text-green-600" />
          </div>
          <div>
            <p className="text-body font-semibold text-foreground">{importedCount} lead{importedCount !== 1 ? "s" : ""} u importuan me sukses!</p>
            {importErrors.length > 0 && (
              <p className="text-caption text-warning mt-1">{importErrors.length} rekorde dështuan.</p>
            )}
          </div>
          {importErrors.length > 0 && (
            <div className="rounded-lg bg-error/10 border border-error/20 p-3 text-left space-y-1 max-h-32 overflow-y-auto">
              {importErrors.map((e, i) => <p key={i} className="text-caption text-error">{e}</p>)}
            </div>
          )}
          <button type="button" onClick={onClose} className="btn-primary mx-auto">
            Mbyll
          </button>
        </div>
      )}
    </div>
  );
}

// ─── New Lead Form ────────────────────────────────────────────────────────────

function NewLeadForm({ onClose }: { onClose: () => void }) {
  const { create, isPending, error } = useMutation("Lead");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    country: "",
    language: "English",
    source: "Website Form",
    service: "Dental Tourism",
    subService: "",
    stage: "New Lead",
    status: "Active",
    urgencyLevel: "Medium",
    notes: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    try {
      await create(form);
      onClose();
    } catch (err) {
      console.error("Failed to create lead:", err);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-body-sm text-foreground">
            Full name *
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className={inputClass}
            placeholder="Ariana Kelmendi"
          />
        </div>
        <div>
          <label className="mb-1 block text-body-sm text-foreground">
            Phone *
          </label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
            className={inputClass}
            placeholder="+39 345 000 0000"
          />
        </div>
        <div>
          <label className="mb-1 block text-body-sm text-foreground">
            Email
          </label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className={inputClass}
            placeholder="patient@email.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-body-sm text-foreground">
            Country
          </label>
          <input
            name="country"
            value={form.country}
            onChange={handleChange}
            className={inputClass}
            placeholder="Italy"
          />
        </div>
        <div>
          <label className="mb-1 block text-body-sm text-foreground">
            Source
          </label>
          <select
            name="source"
            value={form.source}
            onChange={handleChange}
            className={inputClass}
          >
            {[
              "Website Form",
              "Facebook Lead Ad",
              "Instagram",
              "TikTok",
              "Google Ads",
              "WhatsApp",
              "Phone Call",
              "Referral",
              "Walk-in",
              "Partner Agency",
              "Manual Entry",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-body-sm text-foreground">
            Service
          </label>
          <select
            name="service"
            value={form.service}
            onChange={handleChange}
            className={inputClass}
          >
            <option>Dental Tourism</option>
            <option>Hair Transplant</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-body-sm text-foreground">
            Sub-service
          </label>
          <select
            name="subService"
            value={form.subService}
            onChange={handleChange}
            className={inputClass}
          >
            {form.service === "Dental Tourism"
              ? [
                  "",
                  "Implants",
                  "All-on-4",
                  "All-on-6",
                  "Veneers",
                  "Crowns",
                  "Bridges",
                  "Whitening",
                  "Extraction",
                  "Restorative Package",
                ].map((s) => <option key={s}>{s}</option>)
              : [
                  "",
                  "FUE",
                  "DHI",
                  "Beard Transplant",
                  "Eyebrow Transplant",
                  "Hair Restoration Package",
                ].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-body-sm text-foreground">
            Urgency
          </label>
          <select
            name="urgencyLevel"
            value={form.urgencyLevel}
            onChange={handleChange}
            className={inputClass}
          >
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-body-sm text-foreground">Notes</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          className={inputClass}
          placeholder="Initial inquiry details, budget, travel window..."
        />
      </div>
      {error && (
        <p className="rounded-lg bg-error/10 px-3 py-2 text-body-sm text-error">
          Error: {error.message}
        </p>
      )}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-primary text-primary-foreground hover:bg-primary-hover"
        >
          {isPending ? (
            <Spinner size={16} className="animate-spin" />
          ) : (
            <NotePencil size={16} />
          )}
          {isPending ? "Saving..." : "Create Lead"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="border-border bg-background text-foreground hover:bg-tertiary"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── New Task Form ────────────────────────────────────────────────────────────

function NewTaskForm({ onClose }: { onClose: () => void }) {
  const { create, isPending, error } = useMutation("Task");
  const [form, setForm] = useState({
    title: "",
    dueDate: new Date(Date.now() + 86400000),
    priority: "Medium",
    isCompleted: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      await create(form);
      onClose();
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-body-sm text-foreground">
          Title *
        </label>
        <input
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          required
          className={inputClass}
          placeholder="Follow up with patient after quote"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-body-sm text-foreground">
            Due date
          </label>
          <input
            type="date"
            value={form.dueDate.toISOString().split("T")[0]}
            onChange={(e) =>
              setForm((p) => ({ ...p, dueDate: new Date(e.target.value) }))
            }
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-body-sm text-foreground">
            Priority
          </label>
          <select
            value={form.priority}
            onChange={(e) =>
              setForm((p) => ({ ...p, priority: e.target.value }))
            }
            className={inputClass}
          >
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>
      </div>
      {error && (
        <p className="rounded-lg bg-error/10 px-3 py-2 text-body-sm text-error">
          {error.message}
        </p>
      )}
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-primary text-primary-foreground hover:bg-primary-hover"
        >
          {isPending ? "Saving..." : "Create Task"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="border-border bg-background text-foreground hover:bg-tertiary"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Lead Inbox Filters Bar ───────────────────────────────────────────────────

function LeadInboxFilters({
  search,
  setSearch,
  filterSource,
  setFilterSource,
  filterService,
  setFilterService,
  filterUrgency,
  setFilterUrgency,
  filterStatus,
  setFilterStatus,
  total,
}: {
  search: string;
  setSearch: (v: string) => void;
  filterSource: string;
  setFilterSource: (v: string) => void;
  filterService: string;
  setFilterService: (v: string) => void;
  filterUrgency: string;
  setFilterUrgency: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  total: number;
}) {
  const selectClass =
    "rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  const hasFilter =
    filterSource !== "All Sources" ||
    filterService !== "All Services" ||
    filterUrgency !== "All Urgency" ||
    filterStatus !== "All Status" ||
    search.trim() !== "";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, country, service…"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className={selectClass}
          aria-label="Filter by source"
        >
          {ALL_SOURCES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterService}
          onChange={(e) => setFilterService(e.target.value)}
          className={selectClass}
          aria-label="Filter by service"
        >
          {ALL_SERVICES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value)}
          className={selectClass}
          aria-label="Filter by urgency"
        >
          {ALL_URGENCY.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={selectClass}
          aria-label="Filter by status"
        >
          {ALL_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {hasFilter && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilterSource("All Sources");
              setFilterService("All Services");
              setFilterUrgency("All Urgency");
              setFilterStatus("All Status");
            }}
            className="flex items-center gap-1 rounded-lg border border-error bg-error/10 px-3 py-2 text-body-sm text-error hover:bg-error/20"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>
      <p className="text-caption text-muted-foreground">
        {total} lead{total !== 1 ? "s" : ""} match current filters
      </p>
    </div>
  );
}

// ─── Live Lead List (Inbox) ───────────────────────────────────────────────────

function LiveLeadList({
  leads,
  onSelect,
  selectedId,
}: {
  leads: {
    id: string;
    name: string;
    phone: string;
    country?: string;
    source: string;
    service: string;
    stage: string;
    urgencyLevel?: string;
    status: string;
    createdAt: Date;
    language: string;
    subService?: string;
    whatsappNumber?: string;
    email?: string;
  }[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  return (
    <div className="space-y-3">
      {leads.map((lead) => {
        const img = serviceImage(lead.service);
        const isLost = lead.status === "Lost";
        const createdAgo = (() => {
          const now = Date.now();
          const diff = now - new Date(lead.createdAt).getTime();
          const mins = Math.floor(diff / 60000);
          if (mins < 60) return `${mins}m ago`;
          const hrs = Math.floor(mins / 60);
          if (hrs < 24) return `${hrs}h ago`;
          return `${Math.floor(hrs / 24)}d ago`;
        })();

        return (
          <button
            key={lead.id}
            type="button"
            onClick={() => onSelect(lead.id)}
            className={`group w-full rounded-xl border p-4 text-left transition-all ${
              selectedId === lead.id
                ? "border-primary bg-tertiary/20 shadow-sm"
                : isLost
                  ? "border-border bg-muted/40 opacity-70 hover:opacity-100 hover:border-primary"
                  : "border-border bg-background hover:border-primary hover:shadow-sm"
            }`}
            aria-label={`Open lead ${lead.name}`}
          >
            <div className="flex items-start gap-4">
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover"
              />
              <div className="min-w-0 flex-1 space-y-2">
                {/* Row 1: name + time */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="truncate font-medium text-body text-foreground">
                      {lead.name}
                    </p>
                    {lead.urgencyLevel === "High" && (
                      <span className="shrink-0 rounded-full bg-error px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
                        HOT
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-caption text-muted-foreground">
                    {createdAgo}
                  </span>
                </div>
                {/* Row 2: source + country + language */}
                <div className="flex flex-wrap items-center gap-2">
                  <SourceBadge source={lead.source} />
                  {lead.country && (
                    <span className="text-caption text-muted-foreground">
                      📍 {lead.country}
                    </span>
                  )}
                  <span className="text-caption text-muted-foreground">
                    🗣 {lead.language}
                  </span>
                </div>
                {/* Row 3: service + sub-service + stage */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={
                      lead.service === "Hair Transplant"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    }
                  >
                    {lead.service === "Hair Transplant" ? "💇 Hair" : "🦷 Dental"}
                    {lead.subService ? ` · ${lead.subService}` : ""}
                  </Badge>
                  <StatusBadge value={lead.stage} />
                  {isLost && (
                    <Badge className="bg-error/10 text-error">Lost</Badge>
                  )}
                </div>
                {/* Row 4: contact quick-actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={`https://wa.me/${(lead.whatsappNumber ?? lead.phone).replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 rounded-md bg-[#25D366] px-2 py-1 text-[11px] font-medium text-white hover:bg-[#1da851]"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={`tel:${lead.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground hover:bg-tertiary"
                  >
                    📞 Call
                  </a>
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground hover:bg-tertiary"
                    >
                      ✉ Email
                    </a>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Convert Lead to Patient Modal ──────────────────────────────────────────

function ConvertToPatientModal({
  lead,
  onClose,
  onConverted,
}: {
  lead: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    service: string;
    subService?: string;
  };
  onClose: () => void;
  onConverted: (patientId: string) => void;
}) {
  const { create: createPatient, isPending, error } = useMutation("Patient");
  const { update: updateLead } = useMutation("Lead");
  const [fullName, setFullName] = useState(lead.name);
  const [passportNumber, setPassportNumber] = useState("");
  const [allergies, setAllergies] = useState("");
  const [status, setStatus] = useState("In Treatment");
  const [done, setDone] = useState(false);
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null);

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "mb-1 block text-body-sm font-medium text-foreground";

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    try {
      const patient = await createPatient({
        leadId: lead.id,
        fullName: fullName.trim(),
        passportNumber: passportNumber.trim() || undefined,
        allergies: allergies.trim() || undefined,
        status,
      });
      // Update lead stage to "Deposit Paid" or keep current — just mark status
      await updateLead(lead.id, { stage: "Deposit Paid", status: "Active" });
      setCreatedPatientId(patient.id);
      setDone(true);
    } catch (err) {
      console.error("Failed to convert lead to patient:", err);
    }
  };

  if (done && createdPatientId) {
    return (
      <div className="space-y-5 text-center py-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto">
          <CheckCircle size={32} weight="fill" className="text-green-600" />
        </div>
        <div>
          <p className="text-body font-semibold text-foreground">{fullName} u konvertua me sukses si pacient!</p>
          <p className="text-body-sm text-muted-foreground mt-1">Lead-i u përditësua në fazën "Deposit Paid".</p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => onConverted(createdPatientId)}
            className="btn-primary"
          >
            <UserCircle size={15} />
            Shiko profilin e pacientit
          </button>
          <button type="button" onClick={onClose} className="btn-outline">
            Mbyll
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleConvert} className="space-y-5">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
          {lead.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-body-sm font-medium text-foreground">{lead.name}</p>
          <p className="text-caption text-muted-foreground">{lead.service}{lead.subService ? ` · ${lead.subService}` : ""}</p>
          {lead.phone && <p className="text-caption text-muted-foreground">{lead.phone}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Emri i plotë *</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className={inputClass}
            placeholder="Emri ligjor siç figuron në pasaportë"
          />
        </div>
        <div>
          <label className={labelClass}>Numri i pasaportës / ID</label>
          <input
            value={passportNumber}
            onChange={(e) => setPassportNumber(e.target.value)}
            className={inputClass}
            placeholder="e.g. AB1234567"
          />
        </div>
        <div>
          <label className={labelClass}>Statusi fillestar</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            {["In Treatment", "Pending", "Follow-up", "Completed"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Alergji / Shënime kritike mjekësore</label>
          <textarea
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            rows={2}
            className={inputClass}
            placeholder="e.g. Alergjik ndaj penicilinës, diabetik..."
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-error/10 px-3 py-2 text-body-sm text-error">{error.message}</p>
      )}

      <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
        <p className="text-caption text-warning font-medium">⚠ Ky veprim do të:</p>
        <ul className="mt-1 space-y-0.5 text-caption text-muted-foreground ml-3">
          <li>• Krijojë një rekord të ri pacienti të lidhur me këtë lead</li>
          <li>• Përditësojë fazën e lead-it në "Deposit Paid"</li>
          <li>• Hapë profilin 360° nga moduli i Pacientëve</li>
        </ul>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending || !fullName.trim()}
          className="btn-primary"
        >
          {isPending ? <Spinner size={15} className="animate-spin" /> : <UserCircle size={15} />}
          {isPending ? "Duke konvertuar..." : "Konverto si Pacient"}
        </button>
        <button type="button" onClick={onClose} className="btn-outline">
          Anulo
        </button>
      </div>
    </form>
  );
}

// ─── Lead Inbox Detail Panel ──────────────────────────────────────────────────

function LeadInboxDetail({
  lead,
  onStageUpdated,
  onPatientCreated,
  onCreateQuote,
}: {
  lead: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    whatsappNumber?: string;
    country?: string;
    city?: string;
    language: string;
    source: string;
    service: string;
    subService?: string;
    stage: string;
    status: string;
    urgencyLevel?: string;
    budgetRange?: string;
    travelWindow?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
  };
  onStageUpdated: () => void;
  onPatientCreated?: (patientId: string) => void;
  onCreateQuote?: () => void;
}) {
  const img = serviceImage(lead.service);
  const { create: createTask, isPending: taskPending } = useMutation("Task");
  const [taskTitle, setTaskTitle] = useState("");
  const [showTaskInput, setShowTaskInput] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  // Check if lead is already converted (stage suggests conversion)
  const isConverted = ["Deposit Paid", "Travel Planned", "Appointment Confirmed", "In Treatment", "Treatment Completed", "Follow-up Active", "Review Requested", "Referral", "Surgery Scheduled", "Procedure Done", "10-Day Follow-up", "1-Month Follow-up"].includes(lead.stage);

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) return;
    try {
      await createTask({
        title: taskTitle,
        dueDate: new Date(Date.now() + 86400000),
        priority: lead.urgencyLevel === "High" ? "High" : "Medium",
        isCompleted: false,
        relatedEntityId: lead.id,
      });
      setTaskTitle("");
      setShowTaskInput(false);
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header image */}
      <img
        src={img.src}
        alt={img.alt}
        loading="lazy"
        className="h-40 w-full rounded-xl border border-border object-cover"
      />

      {/* Identity */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {lead.urgencyLevel && <UrgencyBadge value={lead.urgencyLevel} />}
          {lead.status === "Lost" && (
            <Badge className="bg-error/10 text-error">Lost</Badge>
          )}
        </div>
        <h2 className="font-heading text-h3 text-foreground">{lead.name}</h2>
        <p className="font-mono text-caption text-muted-foreground">#{lead.id.slice(0, 10)}</p>
        <div className="flex flex-wrap gap-2 text-body-sm text-muted-foreground">
          {lead.phone && <span>📞 {lead.phone}</span>}
          {lead.email && <span>✉ {lead.email}</span>}
        </div>
        <div className="flex flex-wrap gap-2 text-body-sm text-muted-foreground">
          {lead.country && <span>📍 {lead.country}{lead.city ? `, ${lead.city}` : ""}</span>}
          <span>🗣 {lead.language}</span>
        </div>
      </div>

      <Separator className="bg-border" />

      {/* Stage transition — primary CRM action */}
      <div className="space-y-2">
        <p className="text-body-sm font-medium text-foreground">Pipeline Stage</p>
        <div className="flex items-center gap-2">
          <SourceBadge source={lead.source} />
          <span className="text-caption text-muted-foreground">→</span>
          <StatusBadge value={lead.stage} />
        </div>
        <StageSelector
          currentStage={lead.stage}
          service={lead.service}
          leadId={lead.id}
          onUpdated={onStageUpdated}
        />
      </div>

      <Separator className="bg-border" />

      {/* Service details */}
      <div className="space-y-2">
        <p className="text-body-sm font-medium text-foreground">Service interest</p>
        <div className="flex flex-wrap gap-2">
          <Badge
            className={
              lead.service === "Hair Transplant"
                ? "bg-purple-100 text-purple-800"
                : "bg-blue-100 text-blue-800"
            }
          >
            {lead.service}
          </Badge>
          {lead.subService && (
            <Badge className="bg-muted text-muted-foreground">
              {lead.subService}
            </Badge>
          )}
        </div>
        {lead.budgetRange && (
          <p className="text-body-sm text-foreground">
            💰 Budget: {lead.budgetRange}
          </p>
        )}
        {lead.travelWindow && (
          <p className="text-body-sm text-foreground">
            ✈ Travel window: {lead.travelWindow}
          </p>
        )}
      </div>

      {/* Notes */}
      {lead.notes && (
        <>
          <Separator className="bg-border" />
          <div className="space-y-1">
            <p className="text-body-sm font-medium text-foreground">Notes</p>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-body-sm text-foreground">{lead.notes}</p>
            </div>
          </div>
        </>
      )}

      <Separator className="bg-border" />

      {/* Quick task creation */}
      <div className="space-y-2">
        <p className="text-body-sm font-medium text-foreground">Quick task</p>
        {showTaskInput ? (
          <div className="flex items-center gap-2">
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
              placeholder="e.g. Send quote follow-up"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-body-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              type="button"
              onClick={handleCreateTask}
              disabled={taskPending || !taskTitle.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              {taskPending ? <Spinner size={14} className="animate-spin" /> : "Add"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTaskInput(false)}
              className="border-border bg-background text-foreground hover:bg-tertiary"
            >
              <X size={14} />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowTaskInput(true)}
            className="w-full border-dashed border-primary text-primary hover:bg-tertiary"
          >
            <CheckCircle size={14} />
            + Add follow-up task
          </Button>
        )}
      </div>

      {/* Convert to Patient CTA */}
      <div className={`rounded-xl border p-4 text-center space-y-3 ${isConverted ? "border-green-200 bg-green-50/50" : "border-primary/20 bg-primary/5"}`}>
        {isConverted ? (
          <>
            <p className="text-body-sm font-medium text-green-700">✓ Lead konvertuar si Pacient</p>
            <p className="text-caption text-green-600">Ky lead ka arritur fazën e konvertimit.</p>
          </>
        ) : (
          <>
            <p className="text-body-sm font-medium text-foreground">Gati për konvertim?</p>
            <p className="text-caption text-muted-foreground">Krijo profilin 360° të pacientit dhe fillo koordinimin e trajtimit.</p>
            <button
              type="button"
              onClick={() => setConvertOpen(true)}
              className="btn-primary w-full justify-center"
            >
              <UserCircle size={15} />
              Konverto si Pacient
            </button>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button className="bg-primary text-primary-foreground hover:bg-primary-hover" onClick={onCreateQuote}>
          <ClipboardText size={14} />
          Create Quote
        </Button>
        <a
          href={`https://wa.me/${(lead.whatsappNumber ?? lead.phone).replace(/\D/g, "")}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-body-sm font-medium text-white hover:bg-[#1da851]"
        >
          WhatsApp
        </a>
      </div>

      {/* Convert Modal */}
      {convertOpen && (
        <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
          <DialogContent className="border-border bg-card sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading text-h3 text-foreground flex items-center gap-2">
                <UserCircle size={20} />
                Konverto Lead → Pacient
              </DialogTitle>
            </DialogHeader>
            <ConvertToPatientModal
              lead={lead}
              onClose={() => setConvertOpen(false)}
              onConverted={(patientId) => {
                setConvertOpen(false);
                onPatientCreated?.(patientId);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Meta */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
        <p className="text-caption text-muted-foreground">
          Created: {new Date(lead.createdAt).toLocaleString()}
        </p>
        <p className="text-caption text-muted-foreground">
          Updated: {new Date(lead.updatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// ─── Live Kanban Board ────────────────────────────────────────────────────────

function LiveKanban({
  leads,
  onSelect,
}: {
  leads: {
    id: string;
    name: string;
    service: string;
    stage: string;
    source: string;
    urgencyLevel?: string;
    status: string;
    createdAt: Date;
  }[];
  onSelect: (id: string) => void;
}) {
  const dentalCount = leads.filter((l) => l.service === "Dental Tourism").length;
  const hairCount = leads.filter((l) => l.service === "Hair Transplant").length;
  const cols = dentalCount >= hairCount ? KANBAN_DENTAL_COLS : KANBAN_HAIR_COLS;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {cols.map((col) => {
          const colLeads = leads.filter((l) => l.stage === col);
          const isLostCol = col === "Lost";
          return (
            <div
              key={col}
              className={`w-[220px] rounded-xl border p-3 ${
                isLostCol ? "border-error/30 bg-error/5" : "border-border bg-muted/50"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-body-sm font-medium text-foreground leading-tight">
                  {col}
                </h3>
                <Badge
                  className={
                    colLeads.length > 0
                      ? isLostCol
                        ? "bg-error text-error-foreground"
                        : "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground"
                  }
                >
                  {colLeads.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {colLeads.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-3 text-center text-caption text-muted-foreground">
                    Empty
                  </p>
                ) : (
                  colLeads.map((lead) => {
                    const img = serviceImage(lead.service);
                    const createdAgo = (() => {
                      const mins = Math.floor(
                        (Date.now() - new Date(lead.createdAt).getTime()) / 60000
                      );
                      if (mins < 60) return `${mins}m`;
                      if (mins < 1440) return `${Math.floor(mins / 60)}h`;
                      return `${Math.floor(mins / 1440)}d`;
                    })();
                    return (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => onSelect(lead.id)}
                        className="group w-full rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-primary hover:shadow-sm"
                      >
                        <img
                          src={img.src}
                          alt={img.alt}
                          loading="lazy"
                          className="mb-2 h-16 w-full rounded-md border border-border object-cover"
                        />
                        <p className="font-medium text-body-sm text-foreground truncate">
                          {lead.name}
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-1">
                          <SourceBadge source={lead.source} />
                          <span className="text-caption text-muted-foreground">
                            {createdAgo}
                          </span>
                        </div>
                        {lead.urgencyLevel === "High" && (
                          <span className="mt-1 inline-block rounded-full bg-error px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
                            HOT
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Patient Profile 360 ─────────────────────────────────────────────────────

function PatientProfile360({
  patientId,
  onBack,
  userId,
}: {
  patientId: string;
  onBack: () => void;
  userId: string | null;
}) {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: patient, isPending: patientLoading } = useQuery("Patient", patientId);
  const leadId = patient?.leadId && patient.leadId.trim() !== "" ? patient.leadId : null;
  const { data: lead, isPending: leadLoading } = useQuery(
    "Lead",
    leadId ?? (undefined as any),
  );
  // NOTE: For patient-scoped records (tasks, quotes, payments, travel, media),
  // we filter ONLY by the relatedEntityId/patientId — NOT by createdByUserId.
  // This prevents data from disappearing when a record was created by a different
  // team member (e.g. admin creates payment, coordinator views it on the profile).
  const { data: tasks, isPending: tasksLoading } = useQuery("Task", {
    where: { relatedEntityId: patientId },
    orderBy: { dueDate: "asc" },
  });
  const { data: quotes, isPending: quotesLoading } = useQuery("Quote", {
    where: { patientId },
    orderBy: { createdAt: "desc" },
  });
  const { data: payments, isPending: paymentsLoading } = useQuery("Payment", {
    where: { patientId },
    orderBy: { transactionDate: "desc" },
  });
  const { data: travelRecords, isPending: travelLoading } = useQuery("TravelRecord", {
    where: { patientId },
    orderBy: { arrivalDate: "asc" },
  });
  const { data: mediaFiles, isPending: mediaLoading } = useQuery("MediaFile", {
    where: { relatedEntityId: patientId },
    orderBy: { createdAt: "desc" },
  });

  const { create: createTask, isPending: taskCreating } = useMutation("Task");
  const { update: updateTask } = useMutation("Task");
  const { update: updatePatient } = useMutation("Patient");

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showTaskInput, setShowTaskInput] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState("");

  useEffect(() => {
    if (patient?.allergies) setNoteValue(patient.allergies);
  }, [patient?.allergies]);

  if (patientLoading) {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <LoadingSpinner label="Loading patient profile..." />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-body text-muted-foreground">Patient not found.</p>
        <Button onClick={onBack} variant="outline" className="border-border bg-background text-foreground hover:bg-tertiary">
          <ArrowLeft size={16} /> Back
        </Button>
      </div>
    );
  }

  const totalPaid = (payments ?? []).reduce((s, p) => s + p.amount, 0);
  const depositPaid = (payments ?? []).filter((p) => p.type === "Deposit").reduce((s, p) => s + p.amount, 0);
  const finalPaid = (payments ?? []).filter((p) => p.type === "Final Balance").reduce((s, p) => s + p.amount, 0);
  const approvedQuote = (quotes ?? []).find((q) => q.status === "Approved");
  const outstanding = approvedQuote ? approvedQuote.totalPrice - totalPaid : null;

  const travel = travelRecords?.[0];

  // Appointments for a patient — scope by patientId only, not createdByUserId
  const { data: patientAppointments, isPending: patientApptsLoading } = useQuery("Appointment", {
    where: { patientId },
    orderBy: { appointmentTime: "asc" },
  });

  const TABS = [
    { key: "overview", label: "Overview", icon: <IdentificationCard size={15} /> },
    { key: "timeline", label: "Timeline", icon: <ClockCounterClockwise size={15} /> },
    { key: "tasks", label: "Tasks", icon: <CheckCircle size={15} /> },
    { key: "quotes", label: "Quotes", icon: <ClipboardText size={15} /> },
    { key: "payments", label: "Payments", icon: <CurrencyEur size={15} /> },
    { key: "appointments", label: "Appointments", icon: <CalendarDots size={15} /> },
    { key: "travel", label: "Travel", icon: <AirplaneTakeoff size={15} /> },
    { key: "media", label: "Media", icon: <Camera size={15} /> },
    { key: "consent", label: "Consent", icon: <FileText size={15} /> },
  ];

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-0">
      {/* ── Back bar ── */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-border bg-background text-foreground hover:bg-tertiary"
        >
          <ArrowLeft size={16} />
          Back to Patients
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-body-sm text-foreground font-medium">{patient.fullName}</span>
      </div>

      {/* ── Profile hero ── */}
      <Card className="border-border bg-card overflow-hidden mb-6">
        <div className="grid lg:grid-cols-[1fr_320px]">
          {/* Left: identity */}
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-tertiary text-tertiary-foreground text-2xl font-bold border border-border">
                {patient.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading text-h2 text-foreground">{patient.fullName}</h1>
                  <PatientStatusBadge status={patient.status} />
                </div>
                <p className="font-mono text-caption text-muted-foreground">#{patient.id.slice(0, 12)}</p>
              </div>
            </div>

            {/* Contact row */}
            <div className="flex flex-wrap gap-4">
              {lead && (
                <>
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-body-sm text-foreground hover:text-primary">
                      <Phone size={14} className="text-muted-foreground" />
                      {lead.phone}
                    </a>
                  )}
                  {(lead.whatsappNumber ?? lead.phone) && (
                    <a
                      href={`https://wa.me/${(lead.whatsappNumber ?? lead.phone).replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-body-sm text-[#25D366] hover:underline"
                    >
                      <WhatsappLogo size={14} />
                      WhatsApp
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-body-sm text-foreground hover:text-primary">
                      ✉ {lead.email}
                    </a>
                  )}
                  {lead.country && (
                    <span className="flex items-center gap-1 text-body-sm text-muted-foreground">
                      <MapPin size={13} />
                      {lead.country}{lead.city ? `, ${lead.city}` : ""}
                    </span>
                  )}
                  {lead.language && (
                    <span className="text-body-sm text-muted-foreground">🗣 {lead.language}</span>
                  )}
                </>
              )}
              {leadLoading && <span className="text-caption text-muted-foreground">Loading contact…</span>}
            </div>

            {/* Source + service */}
            {lead && (
              <div className="flex flex-wrap items-center gap-2">
                <SourceBadge source={lead.source} />
                <Badge className={lead.service === "Hair Transplant" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}>
                  {lead.service === "Hair Transplant" ? "💇 Hair" : "🦷 Dental"}
                  {lead.subService ? ` · ${lead.subService}` : ""}
                </Badge>
                {lead.stage && <StatusBadge value={lead.stage} />}
                {lead.urgencyLevel === "High" && (
                  <span className="rounded-full bg-error px-2 py-0.5 text-[10px] font-bold text-white uppercase">HOT</span>
                )}
              </div>
            )}

            {/* Allergies / critical notes */}
            <div className="rounded-lg border border-warning/40 bg-warning/5 p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="flex items-center gap-1 text-body-sm font-medium text-warning">
                  <Warning size={14} /> Critical / Allergies
                </p>
                <button
                  type="button"
                  onClick={() => setEditingNote((v) => !v)}
                  className="text-caption text-muted-foreground hover:text-foreground"
                >
                  {editingNote ? "Cancel" : "Edit"}
                </button>
              </div>
              {editingNote ? (
                <div className="flex gap-2 mt-1">
                  <input
                    value={noteValue}
                    onChange={(e) => setNoteValue(e.target.value)}
                    className={`${inputClass} flex-1`}
                    placeholder="e.g. Penicillin allergy, diabetic"
                  />
                  <Button
                    type="button"
                    className="bg-primary text-primary-foreground hover:bg-primary-hover"
                    onClick={async () => {
                      await updatePatient(patient.id, { allergies: noteValue });
                      setEditingNote(false);
                    }}
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <p className="text-body-sm text-foreground">
                  {patient.allergies || <span className="text-muted-foreground italic">None recorded</span>}
                </p>
              )}
            </div>
          </div>

          {/* Right: financial snapshot */}
          <div className="border-t border-border lg:border-l lg:border-t-0 p-6 space-y-4 bg-muted/30">
            <h3 className="text-body-sm font-medium text-foreground">Financial snapshot</h3>
            <div className="space-y-3">
              {approvedQuote ? (
                <>
                  <FinancialRow label="Treatment total" value={`${approvedQuote.currency} ${approvedQuote.totalPrice.toLocaleString()}`} />
                  {approvedQuote.discountedPrice && approvedQuote.discountedPrice < approvedQuote.totalPrice && (
                    <FinancialRow label="After discount" value={`${approvedQuote.currency} ${approvedQuote.discountedPrice.toLocaleString()}`} highlight />
                  )}
                  <FinancialRow label="Deposit required" value={`${approvedQuote.currency} ${approvedQuote.depositAmount.toLocaleString()}`} />
                  <FinancialRow label="Deposit paid" value={`${approvedQuote.currency} ${depositPaid.toLocaleString()}`} />
                  <FinancialRow label="Final paid" value={`${approvedQuote.currency} ${finalPaid.toLocaleString()}`} />
                  <Separator className="bg-border" />
                  <FinancialRow
                    label="Outstanding balance"
                    value={outstanding !== null ? `${approvedQuote.currency} ${Math.max(0, outstanding).toLocaleString()}` : "—"}
                    highlight={outstanding !== null && outstanding > 0}
                    danger={outstanding !== null && outstanding > 0}
                  />
                </>
              ) : (
                <p className="text-body-sm text-muted-foreground italic">No approved quote yet.</p>
              )}
            </div>
            {travel && (
              <>
                <Separator className="bg-border" />
                <div className="space-y-2">
                  <h3 className="text-body-sm font-medium text-foreground">Travel summary</h3>
                  {travel.arrivalDate && (
                    <p className="text-body-sm text-foreground">✈ Arrival: {new Date(travel.arrivalDate).toLocaleDateString()}</p>
                  )}
                  {travel.departureDate && (
                    <p className="text-body-sm text-foreground">🛬 Departure: {new Date(travel.departureDate).toLocaleDateString()}</p>
                  )}
                  {travel.hotelName && (
                    <p className="text-body-sm text-foreground">🏨 {travel.hotelName}</p>
                  )}
                  <TravelStatusBadge status={travel.pickupStatus ?? "Pending"} />
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* ── Tabs ── */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 border-b border-border mb-6 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-body-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Identity details */}
          <Card className="border-border bg-card p-6 space-y-4">
            <h3 className="font-heading text-h4 text-foreground">Identity &amp; Contact</h3>
            {leadLoading ? (
              <LoadingSpinner label="Loading source data..." />
            ) : lead ? (
              <div className="space-y-3">
                {lead.phone && (
                  <DetailRow icon={<Phone size={14} />} label="Phone" value={<a href={`tel:${lead.phone}`} className="text-primary hover:underline">{lead.phone}</a>} />
                )}
                {lead.email && (
                  <DetailRow icon={<span>✉</span>} label="Email" value={<a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a>} />
                )}
                {lead.country && (
                  <DetailRow icon={<MapPin size={14} />} label="Location" value={`${lead.country}${lead.city ? `, ${lead.city}` : ""}`} />
                )}
                {lead.language && (
                  <DetailRow icon={<span>🗣</span>} label="Language" value={lead.language} />
                )}
                <DetailRow icon={<span>📡</span>} label="Source" value={<SourceBadge source={lead.source} />} />
                <DetailRow icon={<span>🎯</span>} label="Service" value={`${lead.service}${lead.subService ? ` · ${lead.subService}` : ""}`} />
                {lead.budgetRange && (
                  <DetailRow icon={<span>💰</span>} label="Budget" value={lead.budgetRange} />
                )}
                {lead.travelWindow && (
                  <DetailRow icon={<AirplaneTakeoff size={14} />} label="Travel window" value={lead.travelWindow} />
                )}
              </div>
            ) : (
              <p className="text-body-sm text-muted-foreground italic">No lead source linked.</p>
            )}
          </Card>

          {/* Recent tasks */}
          <Card className="border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-h4 text-foreground">Open Tasks</h3>
              <button
                type="button"
                onClick={() => setActiveTab("tasks")}
                className="text-caption text-primary hover:underline"
              >
                View all →
              </button>
            </div>
            {tasksLoading ? (
              <LoadingSpinner label="Loading tasks..." />
            ) : (tasks ?? []).filter((t) => !t.isCompleted).length === 0 ? (
              <p className="text-body-sm text-muted-foreground italic">No open tasks.</p>
            ) : (
              <div className="space-y-2">
                {(tasks ?? []).filter((t) => !t.isCompleted).slice(0, 3).map((task) => {
                  const isOverdue = new Date(task.dueDate) < new Date();
                  return (
                    <div key={task.id} className={`rounded-lg border p-3 ${isOverdue ? "border-error/40 bg-error/5" : "border-border bg-background"}`}>
                      <p className="text-body-sm font-medium text-foreground">{task.title}</p>
                      <p className={`text-caption mt-1 ${isOverdue ? "text-error" : "text-muted-foreground"}`}>
                        Due: {new Date(task.dueDate).toLocaleDateString()}{isOverdue ? " · OVERDUE" : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Recent payments */}
          <Card className="border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-h4 text-foreground">Payments</h3>
              <button
                type="button"
                onClick={() => setActiveTab("payments")}
                className="text-caption text-primary hover:underline"
              >
                View all →
              </button>
            </div>
            {paymentsLoading ? (
              <LoadingSpinner label="Loading payments..." />
            ) : (payments ?? []).length === 0 ? (
              <p className="text-body-sm text-muted-foreground italic">No payments recorded.</p>
            ) : (
              <div className="space-y-2">
                {(payments ?? []).slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <div>
                      <p className="text-body-sm font-medium text-foreground">{p.type}</p>
                      <p className="text-caption text-muted-foreground">{new Date(p.transactionDate).toLocaleDateString()} · {p.paymentMethod ?? "—"}</p>
                    </div>
                    <span className="font-medium text-body-sm text-foreground">{p.currency} {p.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "timeline" && (
        <Card className="border-border bg-card p-6 space-y-4">
          <h3 className="font-heading text-h4 text-foreground">Patient Journey Timeline</h3>
          {leadLoading || patientLoading ? (
            <LoadingSpinner label="Building timeline..." />
          ) : (
            <div className="relative space-y-0 pl-6">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
              {[
                lead && {
                  title: "Lead captured",
                  time: new Date(lead.createdAt).toLocaleString(),
                  detail: `Via ${lead.source}${lead.subService ? ` · ${lead.subService}` : ""}`,
                  color: "bg-primary",
                },
                lead && lead.stage !== "New Lead" && {
                  title: `Stage: ${lead.stage}`,
                  time: new Date(lead.updatedAt).toLocaleString(),
                  detail: "Current pipeline position",
                  color: "bg-accent",
                },
                {
                  title: "Converted to Patient",
                  time: new Date(patient.createdAt).toLocaleString(),
                  detail: `Status: ${patient.status}`,
                  color: "bg-[#25D366]",
                },
                ...(quotes ?? []).map((q) => ({
                  title: `Quote ${q.status === "Approved" ? "approved" : q.status === "Sent" ? "sent" : "drafted"}`,
                  time: new Date(q.createdAt).toLocaleString(),
                  detail: `${q.currency} ${q.totalPrice.toLocaleString()} · ${q.service}`,
                  color: q.status === "Approved" ? "bg-accent" : "bg-warning",
                })),
                ...(payments ?? []).map((p) => ({
                  title: `Payment: ${p.type}`,
                  time: new Date(p.transactionDate).toLocaleString(),
                  detail: `${p.currency} ${p.amount.toLocaleString()} via ${p.paymentMethod ?? "unknown"}`,
                  color: "bg-primary",
                })),
                travel?.arrivalDate && {
                  title: "Arrival in Albania",
                  time: new Date(travel.arrivalDate).toLocaleDateString(),
                  detail: `${travel.airport ?? "Airport TBC"} · Hotel: ${travel.hotelName ?? "TBC"}`,
                  color: "bg-purple-500",
                },
                travel?.departureDate && {
                  title: "Departure",
                  time: new Date(travel.departureDate).toLocaleDateString(),
                  detail: `${travel.companionCount ? `${travel.companionCount} companion(s)` : "Solo travel"}`,
                  color: "bg-muted-foreground",
                },
              ]
                .filter(Boolean)
                .sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime())
                .map((event: any, i: number) => (
                  <div key={i} className="relative flex gap-4 pb-5">
                    <span className={`absolute -left-4 mt-1.5 h-3 w-3 rounded-full border-2 border-background ${event.color}`} />
                    <div className="min-w-0 flex-1 rounded-lg border border-border bg-background p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-body-sm font-medium text-foreground">{event.title}</p>
                        <span className="shrink-0 text-caption text-muted-foreground">{event.time}</span>
                      </div>
                      <p className="mt-1 text-caption text-muted-foreground">{event.detail}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "tasks" && (
        <Card className="border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-h4 text-foreground">Tasks</h3>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTaskInput(true)}
              className="border-dashed border-primary text-primary hover:bg-tertiary"
            >
              <CheckCircle size={14} /> + Add task
            </Button>
          </div>
          {showTaskInput && (
            <div className="flex items-center gap-2">
              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && newTaskTitle.trim()) {
                    try {
                      await createTask({ title: newTaskTitle, dueDate: new Date(Date.now() + 86400000), priority: "Medium", isCompleted: false, relatedEntityId: patientId });
                      setNewTaskTitle("");
                      setShowTaskInput(false);
                    } catch (err) {
                      console.error("Failed to create task:", err);
                    }
                  }
                }}
                placeholder="Task description…"
                className={`${inputClass} flex-1`}
              />
              <Button
                type="button"
                disabled={taskCreating || !newTaskTitle.trim()}
                onClick={async () => {
                  if (!newTaskTitle.trim()) return;
                  await createTask({ title: newTaskTitle, dueDate: new Date(Date.now() + 86400000), priority: "Medium", isCompleted: false, relatedEntityId: patientId });
                  setNewTaskTitle("");
                  setShowTaskInput(false);
                }}
                className="bg-primary text-primary-foreground hover:bg-primary-hover"
              >
                {taskCreating ? <Spinner size={14} className="animate-spin" /> : "Add"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowTaskInput(false)} className="border-border bg-background text-foreground hover:bg-tertiary">
                <X size={14} />
              </Button>
            </div>
          )}
          {tasksLoading ? (
            <LoadingSpinner label="Loading tasks..." />
          ) : (tasks ?? []).length === 0 ? (
            <EmptyState message="No tasks for this patient yet." />
          ) : (
            <div className="space-y-3">
              {(tasks ?? []).map((task) => {
                const isOverdue = !task.isCompleted && new Date(task.dueDate) < new Date();
                return (
                  <div key={task.id} className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${isOverdue ? "border-error/40 bg-error/5" : task.isCompleted ? "border-border bg-muted/30 opacity-60" : "border-border bg-background"}`}>
                    <div className="min-w-0">
                      <p className={`text-body-sm font-medium ${task.isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
                      <p className={`text-caption mt-0.5 ${isOverdue ? "text-error" : "text-muted-foreground"}`}>
                        Due: {new Date(task.dueDate).toLocaleDateString()}{isOverdue ? " · OVERDUE" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <UrgencyBadge value={task.priority} />
                      <button
                        type="button"
                        onClick={() => updateTask(task.id, { isCompleted: !task.isCompleted })}
                        className={`rounded-lg border px-3 py-1.5 text-caption transition-colors ${task.isCompleted ? "border-border bg-background text-muted-foreground hover:bg-tertiary" : "border-primary bg-primary/10 text-primary hover:bg-primary/20"}`}
                      >
                        {task.isCompleted ? "Reopen" : "Done ✓"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {activeTab === "quotes" && (
        <Card className="border-border bg-card p-6 space-y-4">
          <h3 className="font-heading text-h4 text-foreground">Quote History</h3>
          {quotesLoading ? (
            <LoadingSpinner label="Loading quotes..." />
          ) : (quotes ?? []).length === 0 ? (
            <EmptyState message="No quotes created yet for this patient." />
          ) : (
            <div className="space-y-4">
              {(quotes ?? []).map((quote) => {
                const img = serviceImage(quote.service);
                return (
                  <div key={quote.id} className="rounded-lg border border-border bg-background overflow-hidden">
                    <img src={img.src} alt={img.alt} loading="lazy" className="h-28 w-full object-cover border-b border-border" />
                    <div className="p-4 grid sm:grid-cols-3 gap-4">
                      <div>
                        <p className="font-mono text-caption text-muted-foreground">#{quote.id.slice(0, 8)}</p>
                        <p className="text-body font-medium text-foreground mt-1">{quote.service}</p>
                        <QuoteStatusBadge status={quote.status} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-body-sm text-foreground">Total: <span className="font-medium">{quote.currency} {quote.totalPrice.toLocaleString()}</span></p>
                        {quote.discountedPrice && <p className="text-body-sm text-foreground">Discounted: {quote.currency} {quote.discountedPrice.toLocaleString()}</p>}
                        <p className="text-body-sm text-foreground">Deposit: {quote.currency} {quote.depositAmount.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-body-sm text-muted-foreground">Valid until</p>
                        <p className="text-body-sm text-foreground">{new Date(quote.validityDate).toLocaleDateString()}</p>
                        <p className="text-caption text-muted-foreground">Created {new Date(quote.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {activeTab === "payments" && (
        <Card className="border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-h4 text-foreground">Payment Ledger</h3>
          </div>
          {/* Summary row */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-background p-4 text-center">
              <p className="text-caption text-muted-foreground">Total paid</p>
              <p className="font-heading text-h3 text-foreground mt-1">{(payments?.[0]?.currency ?? "EUR")} {totalPaid.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4 text-center">
              <p className="text-caption text-muted-foreground">Deposit paid</p>
              <p className="font-heading text-h3 text-foreground mt-1">{(payments?.[0]?.currency ?? "EUR")} {depositPaid.toLocaleString()}</p>
            </div>
            <div className={`rounded-lg border p-4 text-center ${outstanding !== null && outstanding > 0 ? "border-error/40 bg-error/5" : "border-border bg-background"}`}>
              <p className="text-caption text-muted-foreground">Outstanding</p>
              <p className={`font-heading text-h3 mt-1 ${outstanding !== null && outstanding > 0 ? "text-error" : "text-foreground"}`}>
                {outstanding !== null ? `${approvedQuote?.currency ?? "EUR"} ${Math.max(0, outstanding).toLocaleString()}` : "—"}
              </p>
            </div>
          </div>
          {paymentsLoading ? (
            <LoadingSpinner label="Loading payments..." />
          ) : (payments ?? []).length === 0 ? (
            <EmptyState message="No payments recorded yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 text-muted-foreground font-medium">Date</th>
                    <th className="pb-3 text-muted-foreground font-medium">Type</th>
                    <th className="pb-3 text-muted-foreground font-medium">Method</th>
                    <th className="pb-3 text-muted-foreground font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(payments ?? []).map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 text-foreground">{new Date(p.transactionDate).toLocaleDateString()}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-0.5 text-caption font-medium ${p.type === "Deposit" ? "bg-primary/10 text-primary" : p.type === "Refund" ? "bg-error/10 text-error" : "bg-accent/10 text-accent-foreground"}`}>{p.type}</span>
                      </td>
                      <td className="py-3 text-muted-foreground">{p.paymentMethod ?? "—"}</td>
                      <td className={`py-3 text-right font-medium ${p.type === "Refund" ? "text-error" : "text-foreground"}`}>{p.type === "Refund" ? "-" : ""}{p.currency} {p.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === "appointments" && (
        <Card className="border-border bg-card p-6 space-y-4">
          <h3 className="font-heading text-h4 text-foreground">Appointments</h3>
          {patientApptsLoading ? (
            <LoadingSpinner label="Duke ngarkuar takimet..." />
          ) : (patientAppointments ?? []).length === 0 ? (
            <EmptyState message="Asnjë takim i planifikuar për këtë pacient." />
          ) : (
            <div className="space-y-3">
              {(patientAppointments ?? [])
                .sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime())
                .map((appt) => {
                  const isUpcoming = new Date(appt.appointmentTime) >= new Date();
                  return (
                    <div key={appt.id} className={`rounded-xl border p-4 ${isUpcoming ? "border-primary/20 bg-primary/5" : "border-border bg-background opacity-75"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="font-semibold text-body-sm text-foreground">📅 {new Date(appt.appointmentTime).toLocaleString()}</p>
                          <p className="text-caption text-muted-foreground">📍 {appt.location}</p>
                          {appt.notes && <p className="text-caption text-muted-foreground italic">"{appt.notes}"</p>}
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isUpcoming ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{appt.type}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      )}

      {activeTab === "travel" && (
        <Card className="border-border bg-card p-6 space-y-4">
          <h3 className="font-heading text-h4 text-foreground">Travel Coordination</h3>
          {travelLoading ? (
            <LoadingSpinner label="Loading travel records..." />
          ) : (travelRecords ?? []).length === 0 ? (
            <EmptyState message="No travel record created yet." />
          ) : (
            (travelRecords ?? []).map((tr) => (
              <div key={tr.id} className="rounded-lg border border-border bg-background p-5 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {tr.arrivalDate && (
                    <DetailRow icon={<AirplaneTakeoff size={14} />} label="Arrival" value={new Date(tr.arrivalDate).toLocaleDateString()} />
                  )}
                  {tr.departureDate && (
                    <DetailRow icon={<AirplaneTakeoff size={14} />} label="Departure" value={new Date(tr.departureDate).toLocaleDateString()} />
                  )}
                  {tr.airport && (
                    <DetailRow icon={<MapPin size={14} />} label="Airport" value={tr.airport} />
                  )}
                  {tr.hotelName && (
                    <DetailRow icon={<MapPin size={14} />} label="Hotel" value={tr.hotelName} />
                  )}
                  {tr.companionCount !== undefined && tr.companionCount !== null && (
                    <DetailRow icon={<Users size={14} />} label="Companions" value={String(tr.companionCount)} />
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-caption text-muted-foreground w-28 shrink-0">Pickup status</span>
                    <TravelStatusBadge status={tr.pickupStatus ?? "Pending"} />
                  </div>
                </div>
                {/* Coordinator checklist */}
                <Separator className="bg-border" />
                <div>
                  <p className="text-body-sm font-medium text-foreground mb-3">Coordinator Checklist</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {[
                      { label: "Flight details confirmed", done: !!tr.airport },
                      { label: "Hotel booked", done: !!tr.hotelName },
                      { label: "Airport pickup arranged", done: tr.pickupStatus === "Confirmed" },
                      { label: "Travel dates set", done: !!tr.arrivalDate && !!tr.departureDate },
                      { label: "Companion info collected", done: (tr.companionCount ?? 0) >= 0 },
                      { label: "Emergency contact saved", done: false },
                    ].map((item) => (
                      <div key={item.label} className={`flex items-center gap-2 rounded-lg border p-3 ${item.done ? "border-accent/40 bg-accent/5" : "border-border bg-background"}`}>
                        <span className={`text-body-sm ${item.done ? "text-accent-foreground" : "text-muted-foreground"}`}>
                          {item.done ? "✓" : "○"}
                        </span>
                        <span className={`text-body-sm ${item.done ? "text-foreground" : "text-muted-foreground"}`}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>
      )}

      {activeTab === "media" && (
        <Card className="border-border bg-card p-6 space-y-4">
          <h3 className="font-heading text-h4 text-foreground">Media &amp; Documents</h3>
          {mediaLoading ? (
            <LoadingSpinner label="Loading media files..." />
          ) : (mediaFiles ?? []).length === 0 ? (
            <EmptyState message="No files uploaded yet. Upload X-rays, photos, or consent documents." />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(mediaFiles ?? []).map((file) => (
                <div key={file.id} className="rounded-lg border border-border bg-background overflow-hidden">
                  {["Photo", "X-ray", "Before/After"].includes(file.fileType) ? (
                    <img
                      src={file.fileUrl}
                      alt={file.label ?? file.fileType}
                      loading="lazy"
                      className="h-40 w-full object-cover border-b border-border"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = SERVICE_IMAGES.default.src;
                      }}
                    />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center border-b border-border bg-muted/30">
                      <FileText size={40} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-body-sm font-medium text-foreground truncate">{file.label ?? "Untitled"}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-caption text-muted-foreground">{file.fileType}</span>
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-caption text-primary hover:underline"
                      >
                        Open ↗
                      </a>
                    </div>
                    <p className="text-caption text-muted-foreground mt-1">{new Date(file.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "consent" && (
        <Card className="border-border bg-card p-6 space-y-4">
          <h3 className="font-heading text-h4 text-foreground">Consent &amp; Legal</h3>
          <div className="space-y-3">
            {[
              { label: "Treatment consent form", status: "Pending" },
              { label: "GDPR / data processing consent", status: "Pending" },
              { label: "Photography consent (before/after)", status: "Pending" },
              { label: "Anesthesia consent (if applicable)", status: "Pending" },
              { label: "Financial agreement signed", status: approvedQuote ? "Available" : "Awaiting quote" },
            ].map((item) => (
              <div key={item.label} className={`flex items-center justify-between rounded-lg border p-4 ${item.status === "Signed" ? "border-accent/40 bg-accent/5" : "border-border bg-background"}`}>
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-muted-foreground shrink-0" />
                  <p className="text-body-sm text-foreground">{item.label}</p>
                </div>
                <span className={`text-caption font-medium rounded-full px-2 py-0.5 ${item.status === "Signed" ? "bg-accent/10 text-accent-foreground" : item.status === "Available" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
            <FileText size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-body-sm text-muted-foreground">Upload signed consent documents via the Media tab or request e-signature in Phase 2.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Patient Profile helper sub-components ────────────────────────────────────

function PatientStatusBadge({ status }: { status: string }) {
  const cls =
    status === "In Treatment"
      ? "bg-primary/10 text-primary"
      : status === "Completed"
        ? "bg-accent/10 text-accent-foreground"
        : status === "Follow-up"
          ? "bg-warning/10 text-warning"
          : "bg-muted text-muted-foreground";
  return <Badge className={cls}>{status}</Badge>;
}

function TravelStatusBadge({ status }: { status: string }) {
  const cls =
    status === "Confirmed"
      ? "bg-accent/10 text-accent-foreground"
      : status === "Pending"
        ? "bg-warning/10 text-warning"
        : "bg-muted text-muted-foreground";
  return <Badge className={cls}>{status}</Badge>;
}

function FinancialRow({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-body-sm text-muted-foreground">{label}</span>
      <span className={`text-body-sm font-medium ${danger ? "text-error" : highlight ? "text-foreground" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
      <span className="text-caption text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-body-sm text-foreground min-w-0 flex-1">{value}</span>
    </div>
  );
}

// ─── Payment & Deposit Tracker ───────────────────────────────────────────────

function PaymentTypeBadge({ type }: { type: string }) {
  const map: Record<string, { cls: string; icon: string }> = {
    "Deposit":         { cls: "bg-blue-100 text-blue-800",   icon: "⬇" },
    "Final Balance":   { cls: "bg-green-100 text-green-800", icon: "✓" },
    "Partial Payment": { cls: "bg-yellow-100 text-yellow-800", icon: "◑" },
    "Refund":          { cls: "bg-red-100 text-red-800",     icon: "↩" },
    "Adjustment":      { cls: "bg-purple-100 text-purple-800", icon: "~" },
  };
  const { cls, icon } = map[type] ?? { cls: "bg-muted text-muted-foreground", icon: "·" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      <span>{icon}</span>{type}
    </span>
  );
}

function RefundStatusBadge({ status }: { status?: string }) {
  if (!status || status === "None") return null;
  const cls =
    status === "Processed"
      ? "bg-green-100 text-green-800"
      : "bg-yellow-100 text-yellow-800";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      Refund: {status}
    </span>
  );
}

function DepositStatusPill({ depositPaid, depositRequired, currency: _currency }: { depositPaid: number; depositRequired: number; currency: string }) {
  if (depositRequired === 0) return <span className="text-xs text-muted-foreground">No deposit required</span>;
  if (depositPaid >= depositRequired) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">&#10003; Deposit paid</span>;
  }
  if (depositPaid > 0) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">&#9888; Partial deposit</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">&#10007; Deposit unpaid</span>;
}

function NewPaymentForm({
  patients,
  initialPatientId,
  onClose,
}: {
  patients: { id: string; fullName: string }[];
  initialPatientId?: string;
  onClose: () => void;
}) {
  const { create, isPending, error } = useMutation("Payment");
  const [form, setForm] = useState({
    patientId: initialPatientId ?? (patients[0]?.id ?? ""),
    amount: "",
    currency: "EUR",
    paymentMethod: "Card",
    type: "Deposit",
    transactionDate: new Date().toISOString().split("T")[0],
    refundStatus: "None",
    notes: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "mb-1 block text-body-sm font-medium text-foreground";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.amount) return;
    try {
      await create({
        patientId: form.patientId,
        amount: parseFloat(form.amount),
        currency: form.currency,
        paymentMethod: form.paymentMethod,
        type: form.type,
        transactionDate: new Date(form.transactionDate),
        refundStatus: form.refundStatus,
        notes: form.notes || undefined,
      });
      onClose();
    } catch (err) {
      console.error("Failed to record payment:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Patient</label>
          <select value={form.patientId} onChange={(e) => set("patientId", e.target.value)} className={inputClass} required>
            {patients.length === 0 && <option value="">No patients yet</option>}
            {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Amount *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            required
            className={inputClass}
            placeholder="e.g. 500"
          />
        </div>
        <div>
          <label className={labelClass}>Currency</label>
          <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={inputClass}>
            {["EUR", "GBP", "USD", "ALL"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Payment type</label>
          <select value={form.type} onChange={(e) => set("type", e.target.value)} className={inputClass}>
            {["Deposit", "Final Balance", "Partial Payment", "Refund", "Adjustment"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Payment method</label>
          <select value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)} className={inputClass}>
            {["Card", "Cash", "Bank Transfer", "Wise", "PayPal", "Crypto"].map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Transaction date</label>
          <input
            type="date"
            value={form.transactionDate}
            onChange={(e) => set("transactionDate", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Refund status</label>
          <select value={form.refundStatus} onChange={(e) => set("refundStatus", e.target.value)} className={inputClass}>
            {["None", "Requested", "Processed"].map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          className={inputClass}
          placeholder="Reference number, coordinator name, special conditions..."
        />
      </div>
      {error && (
        <p className="rounded-lg bg-error/10 px-3 py-2 text-body-sm text-error">{error.message}</p>
      )}
      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={isPending || !form.amount} className="bg-primary text-primary-foreground hover:bg-primary-hover">
          {isPending ? <Spinner size={16} className="animate-spin" /> : <CurrencyEur size={16} />}
          {isPending ? "Recording..." : "Record Payment"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} className="border-border bg-background text-foreground hover:bg-tertiary">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function PaymentsModule({
  payments,
  patients,
  quotes,
  paymentsLoading,
  patientsLoading,
  quotesLoading,
  onOpenPatientProfile,
}: {
  payments: { id: string; patientId: string; amount: number; currency: string; paymentMethod?: string; type: string; transactionDate: Date; refundStatus?: string; notes?: string; createdAt: Date }[];
  patients: { id: string; fullName: string }[];
  quotes: { id: string; patientId: string; totalPrice: number; discountedPrice?: number; depositAmount: number; currency: string; status: string }[];
  paymentsLoading: boolean;
  patientsLoading: boolean;
  quotesLoading: boolean;
  onOpenPatientProfile?: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("All");
  const [filterMethod, setFilterMethod] = useState("All");
  const [filterRange, setFilterRange] = useState<"all" | "30d" | "7d">("all");
  const [search, setSearch] = useState("");

  const patientMap = useMemo(() => {
    const m: Record<string, string> = {};
    patients.forEach((p) => { m[p.id] = p.fullName; });
    return m;
  }, [patients]);

  const patientFinancials = useMemo(() => {
    const result: Record<string, { quoteTotal: number; depositRequired: number; totalPaid: number; depositPaid: number; outstanding: number; currency: string }> = {};
    patients.forEach((p) => {
      const approvedQuote = quotes.find((q) => q.patientId === p.id && q.status === "Approved");
      const patPmts = payments.filter((pm) => pm.patientId === p.id);
      const totalPaid = patPmts.filter((pm) => pm.type !== "Refund").reduce((s, pm) => s + pm.amount, 0);
      const depositPaid = patPmts.filter((pm) => pm.type === "Deposit").reduce((s, pm) => s + pm.amount, 0);
      const quoteTotal = approvedQuote?.discountedPrice ?? approvedQuote?.totalPrice ?? 0;
      const depositRequired = approvedQuote?.depositAmount ?? 0;
      const outstanding = quoteTotal > 0 ? Math.max(0, quoteTotal - totalPaid) : 0;
      result[p.id] = { quoteTotal, depositRequired, totalPaid, depositPaid, outstanding, currency: approvedQuote?.currency ?? patPmts[0]?.currency ?? "EUR" };
    });
    return result;
  }, [patients, quotes, payments]);

  // ── Range filter ──────────────────────────────────────────────────────────
  const rangeMs = filterRange === "7d" ? 7 * 86400000 : filterRange === "30d" ? 30 * 86400000 : Infinity;
  const rangePayments = useMemo(() => payments.filter((p) => {
    if (rangeMs === Infinity) return true;
    return Date.now() - new Date(p.transactionDate).getTime() <= rangeMs;
  }), [payments, rangeMs]);

  // ── KPI aggregates (use rangePayments for date-aware cards) ──────────────
  const allDepositsTotal = useMemo(() => rangePayments.filter((p) => p.type === "Deposit").reduce((s, p) => s + p.amount, 0), [rangePayments]);
  const allRevenueTotal  = useMemo(() => rangePayments.filter((p) => p.type !== "Refund").reduce((s, p) => s + p.amount, 0), [rangePayments]);
  const allRefundsTotal  = useMemo(() => rangePayments.filter((p) => p.type === "Refund").reduce((s, p) => s + p.amount, 0), [rangePayments]);
  const netRevenue       = allRevenueTotal - allRefundsTotal;

  const overduePatients = useMemo(() => patients.filter((p) => {
    const f = patientFinancials[p.id];
    return f && f.depositRequired > 0 && f.depositPaid < f.depositRequired;
  }), [patients, patientFinancials]);

  // ── Revenue by month (last 6) for mini bar chart ──────────────────────────
  const revenueByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    payments.filter((p) => p.type !== "Refund").forEach((p) => {
      const d = new Date(p.transactionDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] ?? 0) + p.amount;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  }, [payments]);
  const maxMonthRevenue = Math.max(...revenueByMonth.map((r) => r[1]), 1);

  // ── Filtered ledger ───────────────────────────────────────────────────────
  const filteredPayments = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rangePayments.filter((p) => {
      if (filterType !== "All" && p.type !== filterType) return false;
      if (filterMethod !== "All" && p.paymentMethod !== filterMethod) return false;
      if (selectedPatientId && p.patientId !== selectedPatientId) return false;
      if (q) {
        const name = patientMap[p.patientId] ?? "";
        if (![name, p.type, p.paymentMethod ?? "", p.currency, p.notes ?? ""].join(" ").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rangePayments, filterType, filterMethod, selectedPatientId, search, patientMap]);

  const selectedPayment = useMemo(() => payments.find((p) => p.id === selectedPaymentId) ?? null, [payments, selectedPaymentId]);

  const METHOD_ICONS: Record<string, string> = {
    "Card": "💳", "Cash": "💵", "Bank Transfer": "🏦",
    "Wise": "🟢", "PayPal": "🔵", "Crypto": "₿",
  };

  const selectClass = "rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">

      {/* ── Overdue deposit alert banner ── */}
      {overduePatients.length > 0 && (
        <div className="rounded-xl border border-error/30 bg-error/5 px-5 py-4 flex items-center gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
            <Warning size={18} weight="fill" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body-sm font-semibold text-error">{overduePatients.length} patient{overduePatients.length !== 1 ? "s" : ""} with unpaid deposit</p>
            <p className="text-caption text-error/80 mt-0.5 truncate">
              {overduePatients.slice(0, 3).map((p) => p.fullName).join(", ")}{overduePatients.length > 3 ? ` +${overduePatients.length - 3} more` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilterType("All");
              setSelectedPatientId(overduePatients[0]?.id ?? null);
            }}
            className="shrink-0 rounded-lg bg-error/10 border border-error/30 px-3 py-1.5 text-caption font-medium text-error hover:bg-error/20 transition-colors"
          >
            View first
          </button>
        </div>
      )}

      {/* ── KPI row (5 cards) ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {/* Total collected */}
        <div className="kpi-card xl:col-span-1">
          <div className="kpi-card-accent bg-primary" />
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Total collected</p>
          <p className="mt-1.5 font-heading text-[26px] text-foreground leading-tight">&#8364;{allRevenueTotal.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{rangePayments.filter((p) => p.type !== "Refund").length} transactions</p>
        </div>
        {/* Net revenue */}
        <div className="kpi-card xl:col-span-1">
          <div className="kpi-card-accent bg-green-500" />
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Net revenue</p>
          <p className="mt-1.5 font-heading text-[26px] text-foreground leading-tight">&#8364;{netRevenue.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">after refunds</p>
        </div>
        {/* Deposits */}
        <div className="kpi-card xl:col-span-1">
          <div className="kpi-card-accent bg-blue-500" />
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Deposits</p>
          <p className="mt-1.5 font-heading text-[26px] text-foreground leading-tight">&#8364;{allDepositsTotal.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{rangePayments.filter((p) => p.type === "Deposit").length} deposits</p>
        </div>
        {/* Overdue */}
        <div className={`kpi-card xl:col-span-1 ${overduePatients.length > 0 ? "border-error/30 bg-error/5" : ""}`}>
          <div className={`kpi-card-accent ${overduePatients.length > 0 ? "bg-error" : "bg-muted-foreground"}`} />
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Overdue deposits</p>
          <p className={`mt-1.5 font-heading text-[26px] leading-tight ${overduePatients.length > 0 ? "text-error" : "text-foreground"}`}>{overduePatients.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">patients awaiting payment</p>
        </div>
        {/* Refunds */}
        <div className={`kpi-card xl:col-span-1 ${allRefundsTotal > 0 ? "border-error/20 bg-error/5" : ""}`}>
          <div className={`kpi-card-accent ${allRefundsTotal > 0 ? "bg-error" : "bg-muted-foreground"}`} />
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Refunded</p>
          <p className={`mt-1.5 font-heading text-[26px] leading-tight ${allRefundsTotal > 0 ? "text-error" : "text-foreground"}`}>&#8364;{allRefundsTotal.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{rangePayments.filter((p) => p.type === "Refund").length} refunds</p>
        </div>
      </div>

      {/* ── Revenue trend mini chart ── */}
      {revenueByMonth.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-body-sm font-semibold text-foreground">Revenue trend</p>
              <p className="text-caption text-muted-foreground">Last {revenueByMonth.length} months of collected payments</p>
            </div>
            <p className="text-body-sm font-bold text-foreground">&#8364;{allRevenueTotal.toLocaleString()} total</p>
          </div>
          <div className="flex items-end gap-2 h-28">
            {revenueByMonth.map(([month, amt]) => {
              const heightPct = Math.max(8, Math.round((amt / maxMonthRevenue) * 100));
              return (
                <div key={month} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">{amt >= 1000 ? `€${Math.round(amt / 1000)}k` : `€${amt}`}</span>
                  <div className="w-full rounded-t-md bg-primary transition-all hover:bg-primary-hover" style={{ height: `${heightPct}%` }} />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{month.slice(5)}/{month.slice(2, 4)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* ── Left: transaction ledger ── */}
        <div className="space-y-5">
          <Card className="border-border bg-card p-6 space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-heading text-h3 text-foreground">Transaction Ledger</h2>
                <p className="text-body-sm text-muted-foreground mt-1">All payments · deposits · refunds · outstanding balances</p>
              </div>
              <Button className="bg-primary text-primary-foreground hover:bg-primary-hover" onClick={() => { setShowForm(true); setSelectedPaymentId(null); }}>
                <PlusCircle size={16} />
                Record Payment
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search patient, method, notes..."
                  className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <select value={filterRange} onChange={(e) => setFilterRange(e.target.value as "all" | "30d" | "7d")} className={selectClass}>
                <option value="all">All time</option>
                <option value="30d">Last 30d</option>
                <option value="7d">Last 7d</option>
              </select>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selectClass}>
                {["All", "Deposit", "Final Balance", "Partial Payment", "Refund", "Adjustment"].map((t) => <option key={t}>{t}</option>)}
              </select>
              <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className={selectClass}>
                {["All", "Card", "Cash", "Bank Transfer", "Wise", "PayPal", "Crypto"].map((m) => <option key={m}>{m}</option>)}
              </select>
              {(selectedPatientId || search || filterType !== "All" || filterMethod !== "All" || filterRange !== "all") && (
                <button
                  type="button"
                  onClick={() => { setSelectedPatientId(null); setSearch(""); setFilterType("All"); setFilterMethod("All"); setFilterRange("all"); }}
                  className="flex items-center gap-1 rounded-lg border border-error bg-error/10 px-3 py-2 text-body-sm text-error hover:bg-error/20"
                >
                  <X size={13} /> Clear
                </button>
              )}
              <p className="text-xs text-muted-foreground ml-auto">{filteredPayments.length} transaction{filteredPayments.length !== 1 ? "s" : ""}</p>
            </div>

            {/* Inline new payment form */}
            {showForm && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading text-h4 text-foreground">New Payment Record</h3>
                  <button type="button" onClick={() => setShowForm(false)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-tertiary">
                    <X size={13} />
                  </button>
                </div>
                <NewPaymentForm
                  patients={patients}
                  initialPatientId={selectedPatientId ?? undefined}
                  onClose={() => setShowForm(false)}
                />
              </div>
            )}

            {/* Payment detail flyout */}
            {!showForm && selectedPayment && (
              <div className="rounded-xl border border-border bg-background overflow-hidden">
                <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
                  <p className="text-body-sm font-semibold text-foreground">Transaction detail</p>
                  <button type="button" onClick={() => setSelectedPaymentId(null)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-tertiary">
                    <X size={13} />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  {/* Receipt-style header */}
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-[15px] text-foreground">{patientMap[selectedPayment.patientId] ?? "Unknown patient"}</p>
                        <p className="font-mono text-[11px] text-muted-foreground mt-0.5">TXN-{selectedPayment.id.slice(0, 10).toUpperCase()}</p>
                      </div>
                      <PaymentTypeBadge type={selectedPayment.type} />
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <p className="text-caption text-muted-foreground">Amount</p>
                        <p className={`font-heading text-[28px] leading-none ${selectedPayment.type === "Refund" ? "text-error" : "text-foreground"}`}>
                          {selectedPayment.type === "Refund" ? "−" : "+"}{selectedPayment.currency} {selectedPayment.amount.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-caption text-muted-foreground">Date</p>
                        <p className="text-body-sm font-medium text-foreground">{new Date(selectedPayment.transactionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
                      </div>
                    </div>
                  </div>
                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-3 text-body-sm">
                    <div className="rounded-lg border border-border bg-background p-3">
                      <p className="text-caption text-muted-foreground mb-1">Method</p>
                      <p className="font-medium text-foreground flex items-center gap-1.5">
                        {selectedPayment.paymentMethod ? (
                          <><span>{METHOD_ICONS[selectedPayment.paymentMethod] ?? "💰"}</span>{selectedPayment.paymentMethod}</>
                        ) : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3">
                      <p className="text-caption text-muted-foreground mb-1">Currency</p>
                      <p className="font-medium text-foreground">{selectedPayment.currency}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3">
                      <p className="text-caption text-muted-foreground mb-1">Refund status</p>
                      <p className="font-medium text-foreground">{selectedPayment.refundStatus && selectedPayment.refundStatus !== "None" ? selectedPayment.refundStatus : "None"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3">
                      <p className="text-caption text-muted-foreground mb-1">Recorded at</p>
                      <p className="font-medium text-foreground">{new Date(selectedPayment.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {selectedPayment.notes && (
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <p className="text-caption text-muted-foreground mb-1">Notes</p>
                      <p className="text-body-sm text-foreground">{selectedPayment.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ledger table */}
            {paymentsLoading ? (
              <LoadingSpinner label="Loading transactions..." />
            ) : filteredPayments.length === 0 ? (
              <EmptyState
                message="No payments match the current filters."
                action="Record Payment"
                onAction={() => setShowForm(true)}
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-body-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left">
                      <th className="px-4 py-3 text-muted-foreground font-medium">Date</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium">Patient</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium">Type</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium">Method</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium">Refund</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPayments.map((p) => {
                      const isSelected = selectedPaymentId === p.id;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => {
                            setSelectedPaymentId(isSelected ? null : p.id);
                            setShowForm(false);
                          }}
                          className={`transition-colors cursor-pointer ${isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : "hover:bg-muted/20"} ${selectedPatientId === p.patientId && !isSelected ? "bg-tertiary/10" : ""}`}
                        >
                          <td className="px-4 py-3 text-foreground whitespace-nowrap">
                            {new Date(p.transactionDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="font-medium text-foreground truncate max-w-[130px] text-left hover:text-primary transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenPatientProfile) {
                                  onOpenPatientProfile(p.patientId);
                                } else {
                                  setSelectedPatientId(selectedPatientId === p.patientId ? null : p.patientId);
                                }
                              }}
                            >
                              {patientMap[p.patientId] ?? <span className="italic text-muted-foreground">Unknown</span>}
                            </button>
                            {p.notes && (
                              <p className="text-xs text-muted-foreground truncate max-w-[130px]">{p.notes}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <PaymentTypeBadge type={p.type} />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {p.paymentMethod ? (
                              <span className="flex items-center gap-1.5">
                                <span>{METHOD_ICONS[p.paymentMethod] ?? "💰"}</span>
                                {p.paymentMethod}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {p.refundStatus && p.refundStatus !== "None"
                              ? <RefundStatusBadge status={p.refundStatus} />
                              : <span className="text-xs text-muted-foreground">—</span>
                            }
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums ${p.type === "Refund" ? "text-error" : "text-foreground"}`}>
                            {p.type === "Refund" ? "−" : "+"}{p.currency} {p.amount.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/40">
                      <td colSpan={5} className="px-4 py-3 text-body-sm font-semibold text-foreground">
                        Net ({filteredPayments.length} rows)
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
                        {(() => {
                          const net = filteredPayments.reduce((s, p) => s + (p.type === "Refund" ? -p.amount : p.amount), 0);
                          return `${net < 0 ? "−" : "+"}EUR ${Math.abs(net).toLocaleString()}`;
                        })()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* ── Right sidebar ── */}
        <aside className="space-y-5">
          {/* Patient Deposit Status */}
          <Card className="border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-heading text-h4 text-foreground">Patient Deposits</h2>
              {selectedPatientId && (
                <button type="button" onClick={() => setSelectedPatientId(null)} className="text-caption text-error hover:underline">Clear</button>
              )}
            </div>
            <p className="text-body-sm text-muted-foreground -mt-2">Click a patient to filter the ledger. Click again to record a payment.</p>
            {patientsLoading || quotesLoading ? (
              <LoadingSpinner label="Loading patient data..." />
            ) : patients.length === 0 ? (
              <EmptyState message="No patients yet." />
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {/* Sort: overdue first */}
                {[...patients].sort((a, b) => {
                  const fa = patientFinancials[a.id];
                  const fb = patientFinancials[b.id];
                  const aOverdue = fa && fa.depositRequired > 0 && fa.depositPaid < fa.depositRequired;
                  const bOverdue = fb && fb.depositRequired > 0 && fb.depositPaid < fb.depositRequired;
                  return (bOverdue ? 1 : 0) - (aOverdue ? 1 : 0);
                }).map((patient) => {
                  const fin = patientFinancials[patient.id] ?? { quoteTotal: 0, depositRequired: 0, totalPaid: 0, depositPaid: 0, outstanding: 0, currency: "EUR" };
                  const isSelected = selectedPatientId === patient.id;
                  const pctPaid = fin.quoteTotal > 0 ? Math.min(100, Math.round((fin.totalPaid / fin.quoteTotal) * 100)) : 0;
                  const isOverdue = fin.depositRequired > 0 && fin.depositPaid < fin.depositRequired;
                  return (
                    <div key={patient.id} className={`w-full rounded-xl border p-4 transition-all ${
                      isSelected
                        ? "border-primary bg-tertiary/20 shadow-sm"
                        : isOverdue
                          ? "border-error/30 bg-error/5"
                          : "border-border bg-background hover:border-primary hover:shadow-sm"
                    }`}>
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setSelectedPatientId(isSelected ? null : patient.id)}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="font-medium text-body-sm text-foreground truncate">{patient.fullName}</p>
                          <DepositStatusPill depositPaid={fin.depositPaid} depositRequired={fin.depositRequired} currency={fin.currency} />
                        </div>
                        {fin.quoteTotal > 0 ? (
                          <>
                            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                              <span>Paid: {fin.currency} {fin.totalPaid.toLocaleString()}</span>
                              <span>Total: {fin.currency} {fin.quoteTotal.toLocaleString()}</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all ${pctPaid >= 100 ? "bg-green-500" : pctPaid > 0 ? "bg-primary" : "bg-muted-foreground/30"}`}
                                style={{ width: `${pctPaid}%` }}
                              />
                            </div>
                            {fin.outstanding > 0 && (
                              <p className="mt-1.5 text-xs text-error font-medium">
                                Outstanding: {fin.currency} {fin.outstanding.toLocaleString()}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No approved quote yet</p>
                        )}
                      </button>
                      {/* Quick record button (shows when patient is selected) */}
                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setShowForm(true); }}
                          className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-caption font-semibold text-primary hover:bg-primary/20 transition-colors"
                        >
                          <PlusCircle size={13} />
                          Record payment for {patient.fullName.split(" ")[0]}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Revenue breakdown */}
          <Card className="border-border bg-card p-6 space-y-4">
            <h2 className="font-heading text-h4 text-foreground">Revenue Breakdown</h2>
            {paymentsLoading ? <LoadingSpinner label="Calculating..." /> : (() => {
              const byType: Record<string, number> = {};
              rangePayments.forEach((p) => {
                if (p.type !== "Refund") byType[p.type] = (byType[p.type] ?? 0) + p.amount;
              });
              const totalNonRefund = Object.values(byType).reduce((s, v) => s + v, 0) || 1;
              const colors: Record<string, string> = {
                "Deposit": "bg-blue-500",
                "Final Balance": "bg-green-500",
                "Partial Payment": "bg-yellow-500",
                "Adjustment": "bg-purple-400",
              };
              return (
                <div className="space-y-3">
                  {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, amt]) => {
                    const pct = Math.round((amt / totalNonRefund) * 100);
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-body-sm text-foreground">{type}</span>
                          <span className="text-body-sm text-muted-foreground">&#8364;{amt.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-2 rounded-full transition-all ${colors[type] ?? "bg-primary"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(byType).length === 0 && <p className="text-body-sm text-muted-foreground italic">No revenue data yet.</p>}
                  {allRefundsTotal > 0 && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                      <span className="text-body-sm text-error">Refunded</span>
                      <span className="text-body-sm font-medium text-error">&#8722;&#8364;{allRefundsTotal.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-body-sm font-semibold text-foreground">Net revenue</span>
                      <span className="text-[16px] font-bold text-foreground">&#8364;{netRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </Card>
        </aside>
      </div>
    </div>
  );
}

// ─── Quotes Module ────────────────────────────────────────────────────────────

function QuotesModule({
  quotes,
  patients,
  quotesLoading,
  patientsLoading,
  initialOpenPatientId,
  onBuilderOpened,
  userId,
}: {
  userId?: string | null;
  quotes: {
    id: string;
    patientId: string;
    service: string;
    totalPrice: number;
    discountedPrice?: number;
    depositAmount: number;
    currency: string;
    validityDate: Date;
    status: string;
    createdAt: Date;
  }[];
  patients: { id: string; fullName: string }[];
  quotesLoading: boolean;
  patientsLoading: boolean;
  initialOpenPatientId?: string | null;
  onBuilderOpened?: () => void;
}) {
  const { update: updateQuote, isPending: quoteUpdating } = useMutation("Quote");
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus_] = useState("All");
  const [filterService, setFilterService_] = useState("All");
  const [search, setSearch] = useState("");
  const [builderSaved, setBuilderSaved] = useState(false);

  useEffect(() => {
    if (initialOpenPatientId) {
      setSelectedPatientId(initialOpenPatientId);
      setSelectedQuoteId(null);
      setShowBuilder(true);
      onBuilderOpened?.();
    }
  }, [initialOpenPatientId]);

  const patientMap = useMemo(() => {
    const m: Record<string, string> = {};
    patients.forEach((p) => { m[p.id] = p.fullName; });
    return m;
  }, [patients]);

  const selectedQuote = useMemo(() => quotes.find((q) => q.id === selectedQuoteId) ?? null, [quotes, selectedQuoteId]);
  const patientQuotes = useMemo(() => {
    if (!selectedPatientId) return [];
    return quotes.filter((q) => q.patientId === selectedPatientId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [quotes, selectedPatientId]);

  const now = new Date();
  const filteredQuotes = useMemo(() => {
    const q = search.toLowerCase().trim();
    return quotes.filter((quote) => {
      if (filterStatus !== "All" && quote.status !== filterStatus) return false;
      const svcKey = quote.service.toLowerCase();
      if (filterService === "Dental" && !svcKey.includes("dental")) return false;
      if (filterService === "Hair" && !svcKey.includes("hair")) return false;
      if (q) {
        const name = patientMap[quote.patientId] ?? "";
        if (![name, quote.service, quote.status, quote.currency].join(" ").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [quotes, filterStatus, filterService, search, patientMap]);

  // ── KPI stats ──
  const approvedQuotes = quotes.filter((q) => q.status === "Approved");
  const sentQuotes = quotes.filter((q) => q.status === "Sent");
  const expiredQuotes = quotes.filter((q) => q.status !== "Approved" && new Date(q.validityDate) < now);
  const totalApprovedRevenue = approvedQuotes.reduce((s, q) => s + (q.discountedPrice ?? q.totalPrice), 0);
  const avgQuoteValue = quotes.length > 0 ? Math.round(quotes.reduce((s, q) => s + q.totalPrice, 0) / quotes.length) : 0;

  const selectClass = "rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    try {
      await updateQuote(quoteId, { status: newStatus });
    } catch (err) {
      console.error("Failed to update quote status:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── KPI row ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total quotes", value: String(quotes.length), color: "bg-primary" },
          { label: "Approved", value: String(approvedQuotes.length), color: "bg-green-500" },
          { label: "Pending (Sent)", value: String(sentQuotes.length), color: "bg-blue-500" },
          { label: "Expired", value: String(expiredQuotes.length), color: expiredQuotes.length > 0 ? "bg-error" : "bg-muted-foreground" },
          { label: "Avg quote value", value: `€${avgQuoteValue.toLocaleString()}`, color: "bg-purple-500" },
        ].map((s) => (
          <div key={s.label} className="kpi-card">
            <div className={`kpi-card-accent ${s.color}`} />
            <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className="mt-2 font-heading text-[26px] text-foreground leading-tight">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Approved revenue banner ── */}
      {totalApprovedRevenue > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50/50 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700">
              <CheckCircle size={18} weight="fill" />
            </div>
            <div>
              <p className="text-body-sm font-semibold text-green-800">Approved pipeline value</p>
              <p className="text-caption text-green-600">{approvedQuotes.length} approved quote{approvedQuotes.length !== 1 ? "s" : ""} · ready to invoice</p>
            </div>
          </div>
          <p className="font-heading text-[22px] text-green-800 font-bold shrink-0">€{totalApprovedRevenue.toLocaleString()}</p>
        </div>
      )}

      {/* ── Mobile/tablet: builder inline ── */}
      {showBuilder && (
        <div className="xl:hidden rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-4 flex items-center justify-between">
            <h2 className="font-heading text-h4 text-foreground">Treatment Plan Builder</h2>
            <button type="button" onClick={() => setShowBuilder(false)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-tertiary" aria-label="Close builder">
              <X size={15} />
            </button>
          </div>
          <div className="p-5">
            <QuoteBuilderForm patients={patients} initialPatientId={selectedPatientId ?? undefined} onSaved={() => { setShowBuilder(false); setBuilderSaved(true); setTimeout(() => setBuilderSaved(false), 3000); }} onCancel={() => setShowBuilder(false)} />
          </div>
        </div>
      )}

      {/* ── Mobile: quote detail inline ── */}
      {!showBuilder && selectedQuoteId && (
        <div className="xl:hidden rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-4 flex items-center justify-between">
            <p className="font-medium text-body-sm text-foreground">Quote Detail</p>
            <button type="button" onClick={() => setSelectedQuoteId(null)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-tertiary">
              <X size={15} />
            </button>
          </div>
          <div className="p-5">
            {selectedQuote && (
              <QuoteDetailPanel quote={selectedQuote} patientName={patientMap[selectedQuote.patientId]} onStatusChange={handleStatusChange} onNewVersion={() => { setSelectedPatientId(selectedQuote.patientId); setShowBuilder(true); setSelectedQuoteId(null); }} />
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* ── Left: quote list ── */}
        <Card className="border-border bg-card p-6 space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-heading text-h3 text-foreground">Treatment Quotes</h2>
              <p className="text-body-sm text-muted-foreground mt-1">Dental &amp; Hair plans · multi-currency · version history</p>
            </div>
            <Button className="bg-primary text-primary-foreground hover:bg-primary-hover" onClick={() => { setSelectedPatientId(null); setSelectedQuoteId(null); setShowBuilder(true); }}>
              <PlusCircle size={16} />
              New Quote
            </Button>
          </div>

          {/* Filters + Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kërko pacient, shërbim…" className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus_(e.target.value)} className={selectClass}>
              {["All", "Draft", "Sent", "Approved"].map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={filterService} onChange={(e) => setFilterService_(e.target.value)} className={selectClass}>
              {["All", "Dental", "Hair"].map((s) => <option key={s}>{s}</option>)}
            </select>
            {(search || filterStatus !== "All" || filterService !== "All") && (
              <button type="button" onClick={() => { setSearch(""); setFilterStatus_("All"); setFilterService_("All"); }} className="flex items-center gap-1 rounded-lg border border-error bg-error/10 px-3 py-2 text-body-sm text-error hover:bg-error/20">
                <X size={13} /> Clear
              </button>
            )}
            <p className="text-caption text-muted-foreground ml-auto">{filteredQuotes.length} quote{filteredQuotes.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Success toast */}
          {builderSaved && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <CheckCircle size={16} weight="fill" className="text-green-600 shrink-0" />
              <p className="text-body-sm font-medium text-green-800">Quote saved successfully!</p>
            </div>
          )}

          {quotesLoading ? (
            <LoadingSpinner label="Loading quotes..." />
          ) : filteredQuotes.length === 0 ? (
            <EmptyState message="No quotes match the current filters." action="New Quote" onAction={() => setShowBuilder(true)} />
          ) : (
            <div className="space-y-3">
              {filteredQuotes.map((quote) => {
                const img = serviceImage(quote.service);
                const isSelected = selectedQuoteId === quote.id;
                const isDental = quote.service.toLowerCase().includes("dental");
                const isExpired = quote.status !== "Approved" && new Date(quote.validityDate) < now;
                const daysUntilExpiry = Math.ceil((new Date(quote.validityDate).getTime() - now.getTime()) / 86400000);
                const expiringSoon = !isExpired && daysUntilExpiry <= 5 && quote.status !== "Approved";
                return (
                  <button
                    key={quote.id}
                    type="button"
                    onClick={() => { setSelectedQuoteId(quote.id); setSelectedPatientId(quote.patientId); setShowBuilder(false); }}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      isSelected ? "border-primary bg-tertiary/20 shadow-sm" :
                      isExpired ? "border-error/30 bg-error/5 opacity-75 hover:opacity-100 hover:border-error/60" :
                      "border-border bg-background hover:border-primary hover:shadow-sm"
                    }`}
                  >
                    <div className="flex gap-4">
                      <img src={img.src} alt={img.alt} loading="lazy" className="h-20 w-24 shrink-0 rounded-lg border border-border object-cover" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="font-semibold text-body text-foreground truncate">{patientMap[quote.patientId] ?? "Unknown patient"}</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isExpired && <span className="rounded-full bg-error/10 text-error px-2 py-0.5 text-[10px] font-bold uppercase">Expired</span>}
                            {expiringSoon && <span className="rounded-full bg-warning/10 text-warning px-2 py-0.5 text-[10px] font-bold uppercase">Expiring soon</span>}
                            <QuoteStatusBadge status={quote.status} />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <Badge className={isDental ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}>
                            {isDental ? "🦷 Dental" : "💇 Hair"}
                          </Badge>
                          <span className="text-caption text-muted-foreground font-mono">#{quote.id.slice(0, 8)}</span>
                          <span className="text-caption text-muted-foreground ml-auto">
                            {isExpired ? `Expired ${new Date(quote.validityDate).toLocaleDateString()}` : `Valid until ${new Date(quote.validityDate).toLocaleDateString()}`}
                          </span>
                        </div>
                        {quote.service.includes(" — ") && (
                          <p className="text-caption text-muted-foreground truncate">{quote.service.split(" — ")[1]}</p>
                        )}
                        <div className="flex items-center gap-4 text-body-sm pt-0.5">
                          <span className="font-bold text-foreground text-[15px]">{quote.currency} {(quote.discountedPrice ?? quote.totalPrice).toLocaleString()}</span>
                          {quote.discountedPrice && quote.discountedPrice < quote.totalPrice && (
                            <span className="line-through text-muted-foreground text-[12px]">{quote.currency} {quote.totalPrice.toLocaleString()}</span>
                          )}
                          <span className="text-muted-foreground text-[12px]">· Deposit: {quote.currency} {quote.depositAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── Right panel (desktop only): detail or builder ── */}
        <aside className="hidden xl:block rounded-xl border border-border bg-card overflow-hidden self-start sticky top-[112px]">
          <div className="border-b border-border bg-muted/30 px-6 py-4 flex items-center justify-between">
            <h2 className="font-heading text-h4 text-foreground">
              {showBuilder ? "Treatment Plan Builder" : selectedQuoteId ? "Quote Detail" : "Quote Details"}
            </h2>
            {selectedQuoteId && !showBuilder && (
              <Button className="bg-primary text-primary-foreground hover:bg-primary-hover" onClick={() => { setShowBuilder(true); }}>
                <PlusCircle size={14} />
                New Version
              </Button>
            )}
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
            {showBuilder ? (
              <div className="p-6">
                <QuoteBuilderForm
              patients={patients}
              initialPatientId={selectedPatientId ?? undefined}
              userId={userId ?? undefined}
              onSaved={() => { setShowBuilder(false); setBuilderSaved(true); setTimeout(() => setBuilderSaved(false), 3000); }}
              onCancel={() => setShowBuilder(false)}
            />
              </div>
            ) : selectedQuoteId && selectedQuote ? (
              <div className="divide-y divide-border">
                <QuoteDetailPanel
                  quote={selectedQuote}
                  patientName={patientMap[selectedQuote.patientId]}
                  onStatusChange={handleStatusChange}
                  onNewVersion={() => { setSelectedPatientId(selectedQuote.patientId); setShowBuilder(true); setSelectedQuoteId(null); }}
                />
                {/* Version history for this patient */}
                {patientQuotes.length > 1 && (
                  <div className="p-6 space-y-3">
                    <p className="text-body-sm font-semibold text-foreground">All versions for this patient</p>
                    <QuoteVersionHistory quotes={patientQuotes} />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center p-6">
                <ClipboardText size={48} className="text-muted-foreground/50" />
                <div>
                  <p className="text-body-sm font-medium text-foreground">Select a quote</p>
                  <p className="text-caption text-muted-foreground mt-1">Click any quote from the list to see full details, change status, or create a new version.</p>
                </div>
                <Button className="bg-primary text-primary-foreground hover:bg-primary-hover mt-2" onClick={() => setShowBuilder(true)}>
                  <PlusCircle size={16} />
                  Build First Quote
                </Button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Quote Detail Panel ───────────────────────────────────────────────────────

function QuoteDetailPanel({
  quote,
  patientName,
  onStatusChange,
  onNewVersion,
}: {
  quote: {
    id: string;
    patientId: string;
    service: string;
    totalPrice: number;
    discountedPrice?: number;
    depositAmount: number;
    currency: string;
    validityDate: Date;
    status: string;
    createdAt: Date;
  };
  patientName?: string;
  onStatusChange: (id: string, status: string) => void;
  onNewVersion: () => void;
}) {
  const img = serviceImage(quote.service);
  const isDental = quote.service.toLowerCase().includes("dental");
  const now = new Date();
  const isExpired = quote.status !== "Approved" && new Date(quote.validityDate) < now;
  const daysLeft = Math.ceil((new Date(quote.validityDate).getTime() - now.getTime()) / 86400000);
  const discountAmt = quote.discountedPrice ? quote.totalPrice - quote.discountedPrice : 0;
  const discountPct = quote.totalPrice > 0 && discountAmt > 0 ? Math.round((discountAmt / quote.totalPrice) * 100) : 0;
  const finalPrice = quote.discountedPrice ?? quote.totalPrice;

  return (
    <div className="space-y-0">
      {/* Hero image */}
      <div className="relative">
        <img src={img.src} alt={img.alt} loading="lazy" className="h-44 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
          <div>
            <p className="text-white font-bold text-[18px] leading-tight">{patientName ?? "Unknown patient"}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={isDental ? "bg-blue-500/90 text-white border-0" : "bg-purple-500/90 text-white border-0"}>
                {isDental ? "🦷 Dental" : "💇 Hair"}
              </Badge>
              <span className="text-white/80 text-[11px] font-mono">#{quote.id.slice(0, 8)}</span>
            </div>
          </div>
          <QuoteStatusBadge status={quote.status} />
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Service description */}
        <div className="space-y-1">
          <p className="text-caption text-muted-foreground uppercase tracking-wider font-medium">Treatment</p>
          <p className="text-body-sm text-foreground font-medium leading-relaxed">
            {quote.service.includes(" — ") ? quote.service.split(" — ")[1] : quote.service}
          </p>
        </div>

        {/* Pricing breakdown */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <p className="text-caption text-muted-foreground uppercase tracking-wider font-medium">Pricing</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-body-sm text-muted-foreground">Base price</span>
              <span className="text-body-sm text-foreground">{quote.currency} {quote.totalPrice.toLocaleString()}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-body-sm text-muted-foreground">Discount ({discountPct}%)</span>
                <span className="text-body-sm text-error font-medium">−{quote.currency} {discountAmt.toLocaleString()}</span>
              </div>
            )}
            <Separator className="bg-border" />
            <div className="flex justify-between items-center">
              <span className="text-body font-semibold text-foreground">Total</span>
              <span className="text-[18px] font-bold text-foreground">{quote.currency} {finalPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-body-sm text-muted-foreground">Deposit required</span>
              <span className="text-body-sm font-semibold text-primary">{quote.currency} {quote.depositAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Validity */}
        <div className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${isExpired ? "border-error/40 bg-error/5" : daysLeft <= 5 ? "border-warning/40 bg-warning/5" : "border-border bg-background"}`}>
          <div>
            <p className="text-caption text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Validity</p>
            <p className="text-body-sm font-medium text-foreground">{new Date(quote.validityDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          {isExpired ? (
            <span className="rounded-full bg-error/10 text-error px-3 py-1 text-[11px] font-bold">Expired</span>
          ) : (
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${daysLeft <= 5 ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>
              {daysLeft > 0 ? `${daysLeft}d left` : "Expires today"}
            </span>
          )}
        </div>

        {/* Status changer */}
        <div className="space-y-2">
          <p className="text-caption text-muted-foreground uppercase tracking-wider font-medium">Change status</p>
          <div className="grid grid-cols-3 gap-2">
            {(["Draft", "Sent", "Approved"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onStatusChange(quote.id, s)}
                className={`rounded-lg border px-3 py-2 text-[12px] font-semibold transition-all ${
                  quote.status === s
                    ? s === "Approved" ? "border-green-500 bg-green-100 text-green-800" :
                      s === "Sent" ? "border-blue-500 bg-blue-100 text-blue-800" :
                      "border-border bg-muted text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground"
                }`}
              >
                {s === "Approved" ? "✓ " : s === "Sent" ? "→ " : "⊘ "}{s}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onNewVersion}
            className="btn-primary w-full justify-center"
          >
            <PlusCircle size={15} />
            Create new version
          </button>
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-body-sm font-medium text-foreground hover:bg-tertiary transition-colors"
          >
            <WhatsappLogo size={15} className="text-[#25D366]" />
            Send via WhatsApp
          </button>
        </div>

        {/* Meta */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
          <p className="text-caption text-muted-foreground">Created: {new Date(quote.createdAt).toLocaleString()}</p>
          <p className="text-caption text-muted-foreground font-mono">ID: {quote.id}</p>
        </div>
      </div>
    </div>
  );
}

// ─── New Patient Form ─────────────────────────────────────────────────────────

function NewPatientForm({ onClose }: { onClose: () => void }) {
  const { create, isPending, error } = useMutation("Patient");
  const [form, setForm] = useState({
    fullName: "",
    passportNumber: "",
    allergies: "",
    status: "In Treatment",
  });
  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "mb-1 block text-body-sm font-medium text-foreground";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) return;
    try {
      await create({
        fullName: form.fullName.trim(),
        passportNumber: form.passportNumber.trim() || undefined,
        allergies: form.allergies.trim() || undefined,
        status: form.status,
      });
      onClose();
    } catch (err) {
      console.error("Failed to create patient:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Emri i plotë *</label>
          <input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} required className={inputClass} placeholder="Emri ligjor siç figuron në pasaportë" />
        </div>
        <div>
          <label className={labelClass}>Pasaportë / ID</label>
          <input value={form.passportNumber} onChange={(e) => setForm((p) => ({ ...p, passportNumber: e.target.value }))} className={inputClass} placeholder="e.g. AB1234567" />
        </div>
        <div>
          <label className={labelClass}>Statusi</label>
          <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className={inputClass}>
            {["In Treatment", "Pending", "Follow-up", "Completed"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Alergji / Shënime kritike</label>
          <textarea value={form.allergies} onChange={(e) => setForm((p) => ({ ...p, allergies: e.target.value }))} rows={2} className={inputClass} placeholder="e.g. Alergjik ndaj penicilinës, diabetik..." />
        </div>
      </div>
      {error && <p className="rounded-lg bg-error/10 px-3 py-2 text-body-sm text-error">{error.message}</p>}
      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={isPending || !form.fullName.trim()} className="bg-primary text-primary-foreground hover:bg-primary-hover">
          {isPending ? <Spinner size={16} className="animate-spin" /> : <UserCircle size={16} />}
          {isPending ? "Duke ruajtur..." : "Krijo Pacientin"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} className="border-border bg-background text-foreground hover:bg-tertiary">Anulo</Button>
      </div>
    </form>
  );
}

// ─── Patients Module ───────────────────────────────────────────────────────────

function PatientsModule({
  patients,
  leads,
  patientsLoading,
  leadsLoading,
  onOpenProfile,
  onGoToLead,
}: {
  patients: { id: string; fullName: string; status: string; leadId?: string; allergies?: string; createdAt: Date }[];
  leads: { id: string; name: string; service: string; subService?: string; country?: string; city?: string; phone: string; stage: string; status: string }[];
  patientsLoading: boolean;
  leadsLoading: boolean;
  onOpenProfile: (id: string) => void;
  onGoToLead: (leadId: string) => void;
}) {
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus_] = useState("All");

  const convertedLeadIds = new Set(patients.map((p) => p.leadId).filter(Boolean));
  const CONVERTED_STAGES = [
    "Deposit Paid", "Travel Planned", "Appointment Confirmed",
    "In Treatment", "Treatment Completed", "Follow-up Active",
    "Review Requested", "Referral", "Surgery Scheduled",
    "Procedure Done", "10-Day Follow-up", "1-Month Follow-up",
    "3-Month Follow-up", "6-Month Follow-up", "12-Month Follow-up",
  ];
  const convertedLeadsWithoutPatient = leads.filter(
    (l) => CONVERTED_STAGES.includes(l.stage) && !convertedLeadIds.has(l.id)
  );

  // KPI counts
  const totalCount = patients.length;
  const inTreatmentCount = patients.filter((p) => p.status === "In Treatment").length;
  const completedCount = patients.filter((p) => p.status === "Completed").length;
  const followUpCount = patients.filter((p) => p.status === "Follow-up").length;

  // Filtered patients
  const filteredPatients = useMemo(() => {
    const q = search.toLowerCase().trim();
    return patients.filter((p) => {
      if (filterStatus !== "All" && p.status !== filterStatus) return false;
      if (q) {
        const linked = leads.find((l) => l.id === p.leadId);
        const haystack = [p.fullName, p.status, p.allergies ?? "", linked?.country ?? "", linked?.service ?? ""].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [patients, leads, search, filterStatus]);

  const selectClass = "rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">
      {/* ── KPI Row ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Patients", value: totalCount, color: "bg-primary" },
          { label: "In Treatment", value: inTreatmentCount, color: "bg-blue-500" },
          { label: "Completed", value: completedCount, color: "bg-green-500" },
          { label: "Follow-up", value: followUpCount, color: "bg-warning" },
        ].map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className={`kpi-card-accent ${kpi.color}`} />
            <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
            <p className="mt-2 font-heading text-[30px] leading-tight text-foreground font-semibold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kërko emër, vend, shërbim…"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus_(e.target.value)} className={selectClass}>
            {["All", "In Treatment", "Pending", "Follow-up", "Completed"].map((s) => <option key={s}>{s}</option>)}
          </select>
          {(search || filterStatus !== "All") && (
            <button type="button" onClick={() => { setSearch(""); setFilterStatus_("All"); }} className="flex items-center gap-1 rounded-lg border border-error bg-error/10 px-3 py-2 text-body-sm text-error hover:bg-error/20">
              <X size={13} /> Clear
            </button>
          )}
          <p className="text-[11px] text-muted-foreground ml-auto">{filteredPatients.length} pacientë</p>
        </div>
        <button type="button" onClick={() => setNewPatientOpen(true)} className="btn-primary shrink-0">
          <UserCircle size={15} weight="bold" />
          New Patient
        </button>
      </div>

      {patientsLoading || leadsLoading ? (
        <LoadingSpinner label="Duke ngarkuar pacientët..." />
      ) : (
        <>
          {/* ── Registered patients ── */}
          {filteredPatients.length === 0 && search === "" && filterStatus === "All" && convertedLeadsWithoutPatient.length === 0 ? (
            <EmptyState message="Asnjë pacient ende. Pacientët shtohen kur lead-et konvertohen ose me butonin 'New Patient'." action="New Patient" onAction={() => setNewPatientOpen(true)} />
          ) : filteredPatients.length === 0 ? (
            <EmptyState message="Asnjë pacient nuk përputhet me filtrat aktualë." />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-h4 text-foreground">Pacientët</h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{filteredPatients.length}</span>
              </div>
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {filteredPatients.map((patient) => {
                  const linkedLead = leads.find((l) => l.id === patient.leadId);
                  return (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => onOpenProfile(patient.id)}
                      className="w-full text-left e-card p-5 group"
                      aria-label={`Open profile for ${patient.fullName}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[18px] font-bold border border-primary/20 group-hover:bg-primary group-hover:text-white transition-colors">
                          {patient.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <p className="font-semibold text-[14px] text-foreground group-hover:text-primary transition-colors truncate">{patient.fullName}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <PatientStatusBadge status={patient.status} />
                            {linkedLead && (
                              <Badge className={linkedLead.service === "Hair Transplant" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}>
                                {linkedLead.service === "Hair Transplant" ? "💇 Hair" : "🦷 Dental"}
                              </Badge>
                            )}
                          </div>
                          {linkedLead?.country && (
                            <p className="text-[12px] text-muted-foreground">📍 {linkedLead.country}{linkedLead.city ? `, ${linkedLead.city}` : ""}</p>
                          )}
                          {patient.allergies && (
                            <p className="text-[12px] text-error flex items-center gap-1">
                              <Warning size={11} /> {patient.allergies}
                            </p>
                          )}
                          <p className="font-mono text-[11px] text-muted-foreground">#{patient.id.slice(0, 10)}</p>
                          <p className="text-[12px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">View 360 Profile →</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Converted leads without patient record ── */}
          {convertedLeadsWithoutPatient.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-h4 text-foreground">Converted Leads</h2>
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">{convertedLeadsWithoutPatient.length}</span>
                <span className="text-[11px] text-muted-foreground italic">— profil ende i pa-krijuar</span>
              </div>
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {convertedLeadsWithoutPatient.map((lead) => {
                  const img = serviceImage(lead.service);
                  return (
                    <div key={lead.id} className="e-card p-5 border-warning/30 bg-warning/5">
                      <div className="flex items-start gap-4">
                        <img src={img.src} alt={img.alt} loading="lazy" className="h-12 w-12 shrink-0 rounded-full border border-border object-cover" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <p className="font-semibold text-[14px] text-foreground truncate">{lead.name}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge value={lead.stage} />
                            <Badge className={lead.service === "Hair Transplant" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}>
                              {lead.service === "Hair Transplant" ? "💇 Hair" : "🦷 Dental"}
                            </Badge>
                          </div>
                          {lead.country && <p className="text-[12px] text-muted-foreground">📍 {lead.country}</p>}
                          {lead.phone && <p className="text-[12px] text-muted-foreground">📞 {lead.phone}</p>}
                          <p className="text-[11px] text-warning font-medium mt-1">⚠ Patient profile mungon</p>
                          <button type="button" onClick={() => onGoToLead(lead.id)} className="mt-1 text-[11px] text-primary hover:underline font-medium">
                            Convert in Lead Inbox →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* New Patient Dialog */}
      <Dialog open={newPatientOpen} onOpenChange={setNewPatientOpen}>
        <DialogContent className="border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-h3 text-foreground flex items-center gap-2">
              <UserCircle size={20} />
              New Patient
            </DialogTitle>
          </DialogHeader>
          <NewPatientForm onClose={() => setNewPatientOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Appointment type config ──────────────────────────────────────────────────

const APPT_TYPE_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  "Consultation":  { color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200",  icon: "🩺" },
  "Surgery":       { color: "text-rose-700",   bg: "bg-rose-50",   border: "border-rose-200",  icon: "🔬" },
  "Follow-up":     { color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200", icon: "📋" },
  "Assessment":    { color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200", icon: "📝" },
  "Check-up":      { color: "text-teal-700",   bg: "bg-teal-50",   border: "border-teal-200",  icon: "✅" },
};
const APPT_DEFAULT_CFG = { color: "text-muted-foreground", bg: "bg-muted/30", border: "border-border", icon: "📅" };

function AppointmentTypeBadge({ type }: { type: string }) {
  const cfg = APPT_TYPE_CONFIG[type] ?? APPT_DEFAULT_CFG;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
      {cfg.icon} {type}
    </span>
  );
}

// ─── Appointments Module ──────────────────────────────────────────────────────

function AppointmentsModule({
  appointments,
  patients,
  appointmentsLoading,
  patientsLoading,
  onOpenPatientProfile,
}: {
  appointments: { id: string; patientId: string; doctorId?: string; appointmentTime: Date; location: string; type: string; notes?: string; createdAt: Date }[];
  patients: { id: string; fullName: string }[];
  appointmentsLoading: boolean;
  patientsLoading: boolean;
  onOpenPatientProfile?: (id: string) => void;
}) {
  const { create, isPending, error } = useMutation("Appointment");
  const [showForm, setShowForm] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterRange, setFilterRange] = useState<"all" | "upcoming" | "today" | "week" | "past">("all");
  const [form, setForm] = useState({
    patientId: "",
    appointmentTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    location: "Vita Clinic",
    type: "Consultation",
    notes: "",
    doctorName: "",
  });

  const patientMap = useMemo(() => {
    const m: Record<string, string> = {};
    patients.forEach((p) => { m[p.id] = p.fullName; });
    return m;
  }, [patients]);

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) return;
    try {
      await create({
        patientId: form.patientId,
        doctorId: form.doctorName.trim() || undefined,
        appointmentTime: new Date(form.appointmentTime),
        location: form.location,
        type: form.type,
        notes: form.notes || undefined,
      });
      setShowForm(false);
      setForm({ patientId: "", appointmentTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16), location: "Tirana Medical Hub", type: "Consultation", notes: "", doctorName: "" });
    } catch (err) {
      console.error("Failed to create appointment:", err);
    }
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const weekEnd = new Date(todayStart.getTime() + 7 * 86400000);

  const todayAppts = appointments.filter((a) => {
    const t = new Date(a.appointmentTime);
    return t >= todayStart && t < todayEnd;
  });
  const upcomingAppts = appointments.filter((a) => new Date(a.appointmentTime) >= now);
  const thisWeekAppts = appointments.filter((a) => {
    const t = new Date(a.appointmentTime);
    return t >= now && t < weekEnd;
  });
  const pastAppts = appointments.filter((a) => new Date(a.appointmentTime) < now);

  // ── Next appointment (earliest upcoming) ──
  const nextAppt = [...upcomingAppts].sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime())[0] ?? null;

  // ── Type breakdown ──
  const typeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    appointments.forEach((a) => { map[a.type] = (map[a.type] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [appointments]);

  // ── Filtered list ──
  const filteredAppts = useMemo(() => {
    let list = appointments;
    if (filterRange === "today") list = list.filter((a) => { const t = new Date(a.appointmentTime); return t >= todayStart && t < todayEnd; });
    else if (filterRange === "upcoming") list = list.filter((a) => new Date(a.appointmentTime) >= now);
    else if (filterRange === "week") list = list.filter((a) => { const t = new Date(a.appointmentTime); return t >= now && t < weekEnd; });
    else if (filterRange === "past") list = list.filter((a) => new Date(a.appointmentTime) < now);
    if (filterType !== "All") list = list.filter((a) => a.type === filterType);
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((a) => {
      const name = patientMap[a.patientId] ?? "";
      return [name, a.type, a.location, a.notes ?? ""].join(" ").toLowerCase().includes(q);
    });
    return list.sort((a, b) => {
      if (filterRange === "past") return new Date(b.appointmentTime).getTime() - new Date(a.appointmentTime).getTime();
      return new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime();
    });
  }, [appointments, filterRange, filterType, search, patientMap]);

  const selectedAppt = useMemo(() => appointments.find((a) => a.id === selectedApptId) ?? null, [appointments, selectedApptId]);
  const hasFilters = search || filterType !== "All" || filterRange !== "all";
  const selectClass = "rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">

      {/* ── 5-card KPI row ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total", value: appointments.length, color: "bg-primary", sub: "all time" },
          { label: "Upcoming", value: upcomingAppts.length, color: "bg-blue-500", sub: "scheduled ahead" },
          { label: "Today", value: todayAppts.length, color: todayAppts.length > 0 ? "bg-rose-500" : "bg-muted-foreground", sub: new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) },
          { label: "This week", value: thisWeekAppts.length, color: "bg-amber-500", sub: "next 7 days" },
          { label: "Past", value: pastAppts.length, color: "bg-muted-foreground", sub: "completed" },
        ].map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className={`kpi-card-accent ${kpi.color}`} />
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
            <p className="mt-1.5 font-heading text-[26px] text-foreground leading-tight">{kpi.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Next appointment banner ── */}
      {nextAppt && (
        <div className={`rounded-xl border p-5 flex items-center gap-5 ${
          new Date(nextAppt.appointmentTime) < todayEnd
            ? "border-rose-200 bg-rose-50/60"
            : "border-primary/20 bg-primary/5"
        }`}>
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
            new Date(nextAppt.appointmentTime) < todayEnd ? "bg-rose-100" : "bg-primary/10"
          }`}>
            {(APPT_TYPE_CONFIG[nextAppt.type] ?? APPT_DEFAULT_CFG).icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${
                new Date(nextAppt.appointmentTime) < todayEnd ? "text-rose-600" : "text-primary"
              }`}>
                {new Date(nextAppt.appointmentTime) < todayEnd ? "🔴 TODAY" : "⏭ Next appointment"}
              </p>
              <AppointmentTypeBadge type={nextAppt.type} />
            </div>
            <p className="font-semibold text-[15px] text-foreground mt-0.5">{patientMap[nextAppt.patientId] ?? "Unknown patient"}</p>
            <p className="text-body-sm text-muted-foreground">
              📅 {new Date(nextAppt.appointmentTime).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              &nbsp;·&nbsp;📍 {nextAppt.location}
            </p>
            {nextAppt.notes && <p className="text-caption text-muted-foreground italic mt-0.5">"{nextAppt.notes}"</p>}
          </div>
          <button
            type="button"
            onClick={() => setSelectedApptId(nextAppt.id)}
            className="shrink-0 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-caption font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            View detail
          </button>
        </div>
      )}

      {/* ── Type breakdown chips ── */}
      {typeBreakdown.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption text-muted-foreground font-medium">Types:</span>
          {typeBreakdown.map(([type, count]) => {
            const cfg = APPT_TYPE_CONFIG[type] ?? APPT_DEFAULT_CFG;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(filterType === type ? "All" : type)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${
                  filterType === type
                    ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-1 ring-inset ring-current`
                    : "border-border bg-background text-muted-foreground hover:border-primary"
                }`}
              >
                {cfg.icon} {type} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* ── Left: appointment list + form ── */}
        <Card className="border-border bg-card p-6 space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-heading text-h3 text-foreground">Appointments</h2>
              <p className="text-body-sm text-muted-foreground mt-1">Consultations, surgeries &amp; follow-up sessions</p>
            </div>
            <Button className="bg-primary text-primary-foreground hover:bg-primary-hover" onClick={() => { setShowForm(true); setSelectedApptId(null); }}>
              <CalendarDots size={16} />
              New Appointment
            </Button>
          </div>

          {/* ── Filters ── */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient, type, location…"
                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select value={filterRange} onChange={(e) => setFilterRange(e.target.value as any)} className={selectClass}>
              <option value="all">All dates</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selectClass}>
              {["All", "Consultation", "Surgery", "Follow-up", "Assessment", "Check-up"].map((t) => <option key={t}>{t}</option>)}
            </select>
            {hasFilters && (
              <button
                type="button"
                onClick={() => { setSearch(""); setFilterType("All"); setFilterRange("all"); }}
                className="flex items-center gap-1 rounded-lg border border-error bg-error/10 px-3 py-2 text-body-sm text-error hover:bg-error/20"
              >
                <X size={13} /> Clear
              </button>
            )}
            <p className="text-xs text-muted-foreground ml-auto">{filteredAppts.length} appointment{filteredAppts.length !== 1 ? "s" : ""}</p>
          </div>

          {/* ── Inline new appointment form ── */}
          {showForm && (
            <form onSubmit={handleSubmit} className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-heading text-h4 text-foreground">New Appointment</h3>
                <button type="button" onClick={() => setShowForm(false)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-tertiary">
                  <X size={13} />
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-body-sm font-medium text-foreground">Patient *</label>
                  <select value={form.patientId} onChange={(e) => setForm((p) => ({ ...p, patientId: e.target.value }))} className={inputClass} required>
                    <option value="">Select patient…</option>
                    {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-body-sm font-medium text-foreground">Date &amp; Time *</label>
                  <input type="datetime-local" value={form.appointmentTime} onChange={(e) => setForm((p) => ({ ...p, appointmentTime: e.target.value }))} className={inputClass} required />
                </div>
                <div>
                  <label className="mb-1 block text-body-sm font-medium text-foreground">Type</label>
                  <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className={inputClass}>
                    {["Consultation", "Surgery", "Follow-up", "Assessment", "Check-up"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-body-sm font-medium text-foreground">Location</label>
                  <input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} className={inputClass} placeholder="e.g. Vita Clinic, Tirana" />
                </div>
                <div>
                  <label className="mb-1 block text-body-sm font-medium text-foreground">Doctor / Clinician</label>
                  <input value={form.doctorName} onChange={(e) => setForm((p) => ({ ...p, doctorName: e.target.value }))} className={inputClass} placeholder="e.g. Dr. Hoxha" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-body-sm font-medium text-foreground">Notes / Instructions</label>
                  <input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className={inputClass} placeholder="Pre-appointment instructions, prep notes…" />
                </div>
              </div>
              {error && <p className="rounded-lg bg-error/10 px-3 py-2 text-body-sm text-error">{error.message}</p>}
              <div className="flex gap-3">
                <Button type="submit" disabled={isPending || !form.patientId} className="bg-primary text-primary-foreground hover:bg-primary-hover">
                  {isPending ? <Spinner size={14} className="animate-spin" /> : <CalendarDots size={14} />}
                  {isPending ? "Saving…" : "Save Appointment"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-border bg-background text-foreground hover:bg-tertiary">Cancel</Button>
              </div>
            </form>
          )}

          {/* ── Appointment list ── */}
          {appointmentsLoading || patientsLoading ? (
            <LoadingSpinner label="Loading appointments..." />
          ) : filteredAppts.length === 0 ? (
            <EmptyState
              message={appointments.length === 0 ? "No appointments yet. Create the first one above." : "No appointments match the current filters."}
              action={appointments.length === 0 ? "New Appointment" : undefined}
              onAction={appointments.length === 0 ? () => setShowForm(true) : undefined}
            />
          ) : (
            <div className="space-y-3">
              {/* Group: today at top if range is "all" or "upcoming" */}
              {(filterRange === "all" || filterRange === "upcoming") && todayAppts.length > 0 && filterType === "All" && !search && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-1 mb-1">
                  <p className="px-3 py-2 text-[11px] font-bold text-rose-600 uppercase tracking-wider">🔴 Today · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
                  {todayAppts.sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime()).map((appt) => (
                    <AppointmentCard key={appt.id} appt={appt} patientName={patientMap[appt.patientId]} isSelected={selectedApptId === appt.id} isToday onSelect={setSelectedApptId} />
                  ))}
                </div>
              )}
              {filteredAppts
                .filter((a) => {
                  // skip today items if already shown in today block above
                  if ((filterRange === "all" || filterRange === "upcoming") && filterType === "All" && !search) {
                    const t = new Date(a.appointmentTime);
                    return !(t >= todayStart && t < todayEnd);
                  }
                  return true;
                })
                .map((appt) => (
                  <AppointmentCard key={appt.id} appt={appt} patientName={patientMap[appt.patientId]} isSelected={selectedApptId === appt.id} onSelect={setSelectedApptId} />
                ))}
            </div>
          )}
        </Card>

        {/* ── Right panel: appointment detail ── */}
        <aside className="space-y-5">
          {selectedAppt ? (
            <Card className="border-border bg-card overflow-hidden">
              {/* Type-coloured header */}
              {(() => {
                const cfg = APPT_TYPE_CONFIG[selectedAppt.type] ?? APPT_DEFAULT_CFG;
                const isUpcoming = new Date(selectedAppt.appointmentTime) >= now;
                const isToday2 = new Date(selectedAppt.appointmentTime) >= todayStart && new Date(selectedAppt.appointmentTime) < todayEnd;
                return (
                  <>
                    <div className={`px-5 py-4 flex items-center justify-between gap-3 ${cfg.bg} border-b ${cfg.border}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cfg.icon}</span>
                        <div>
                          <p className={`text-[12px] font-bold uppercase tracking-wider ${cfg.color}`}>{selectedAppt.type}</p>
                          {isToday2 && <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 mt-0.5">TODAY</span>}
                          {!isToday2 && isUpcoming && <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary mt-0.5">UPCOMING</span>}
                          {!isUpcoming && <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground mt-0.5">PAST</span>}
                        </div>
                      </div>
                      <button type="button" onClick={() => setSelectedApptId(null)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-tertiary">
                        <X size={13} />
                      </button>
                    </div>
                    <div className="p-5 space-y-5">
                      {/* Patient */}
                      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-1">
                        <p className="text-caption text-muted-foreground uppercase tracking-wider font-medium">Patient</p>
                        <p className="font-bold text-[16px] text-foreground">{patientMap[selectedAppt.patientId] ?? "Unknown patient"}</p>
                        {onOpenPatientProfile && (
                          <button
                            type="button"
                            onClick={() => onOpenPatientProfile(selectedAppt.patientId)}
                            className="text-caption text-primary font-medium hover:underline flex items-center gap-1 mt-1"
                          >
                            <UserCircle size={12} /> View 360° Profile →
                          </button>
                        )}
                      </div>
                      {/* Date + time */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-border bg-background p-3">
                          <p className="text-caption text-muted-foreground mb-1">Date</p>
                          <p className="text-body-sm font-semibold text-foreground">{new Date(selectedAppt.appointmentTime).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-background p-3">
                          <p className="text-caption text-muted-foreground mb-1">Time</p>
                          <p className="text-body-sm font-semibold text-foreground">{new Date(selectedAppt.appointmentTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                      {/* Location */}
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-caption text-muted-foreground mb-1">Location</p>
                        <p className="text-body-sm font-medium text-foreground flex items-center gap-1.5"><MapPin size={13} className="text-muted-foreground" />{selectedAppt.location}</p>
                      </div>
                      {/* Doctor */}
                      {selectedAppt.doctorId && (
                        <div className="rounded-lg border border-border bg-background p-3">
                          <p className="text-caption text-muted-foreground mb-1">Doctor / Clinician</p>
                          <p className="text-body-sm font-medium text-foreground flex items-center gap-1.5"><Stethoscope size={13} className="text-muted-foreground" />{selectedAppt.doctorId}</p>
                        </div>
                      )}
                      {/* Notes */}
                      {selectedAppt.notes && (
                        <div className="rounded-lg border border-border bg-muted/30 p-3">
                          <p className="text-caption text-muted-foreground mb-1">Notes</p>
                          <p className="text-body-sm text-foreground">{selectedAppt.notes}</p>
                        </div>
                      )}
                      {/* Meta */}
                      <p className="text-caption text-muted-foreground font-mono">ID: {selectedAppt.id.slice(0, 12)}</p>
                    </div>
                  </>
                );
              })()}
            </Card>
          ) : (
            <Card className="border-border bg-card p-8 text-center space-y-3">
              <CalendarDots size={40} className="mx-auto text-muted-foreground/40" />
              <div>
                <p className="text-body-sm font-medium text-foreground">Select an appointment</p>
                <p className="text-caption text-muted-foreground mt-1">Click any appointment card to see full details, patient link, and session notes.</p>
              </div>
              <button type="button" onClick={() => setShowForm(true)} className="btn-primary mx-auto mt-2">
                <PlusCircle size={14} /> New Appointment
              </button>
            </Card>
          )}

          {/* Type breakdown mini panel */}
          {typeBreakdown.length > 0 && (
            <Card className="border-border bg-card p-5 space-y-4">
              <h3 className="font-heading text-h4 text-foreground">Type breakdown</h3>
              <div className="space-y-3">
                {typeBreakdown.map(([type, count]) => {
                  const cfg = APPT_TYPE_CONFIG[type] ?? APPT_DEFAULT_CFG;
                  const pct = appointments.length > 0 ? Math.round((count / appointments.length) * 100) : 0;
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-body-sm font-medium flex items-center gap-1.5 ${cfg.color}`}>{cfg.icon} {type}</span>
                        <span className="text-body-sm text-muted-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-2 rounded-full transition-all ${
                          type === "Consultation" ? "bg-blue-400" :
                          type === "Surgery" ? "bg-rose-400" :
                          type === "Follow-up" ? "bg-green-400" :
                          type === "Assessment" ? "bg-amber-400" :
                          type === "Check-up" ? "bg-teal-400" :
                          "bg-muted-foreground"
                        }`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function AppointmentCard({
  appt,
  patientName,
  isSelected,
  isToday,
  onSelect,
}: {
  appt: { id: string; patientId: string; appointmentTime: Date; location: string; type: string; notes?: string; doctorId?: string };
  patientName?: string;
  isSelected: boolean;
  isToday?: boolean;
  onSelect: (id: string) => void;
}) {
  const cfg = APPT_TYPE_CONFIG[appt.type] ?? APPT_DEFAULT_CFG;
  const isUpcoming = new Date(appt.appointmentTime) >= new Date();
  return (
    <button
      type="button"
      onClick={() => onSelect(isSelected ? "" : appt.id)}
      className={`w-full rounded-xl border p-4 text-left transition-all group ${
        isSelected ? "border-primary bg-tertiary/20 shadow-sm" :
        isToday ? `border-rose-200 bg-rose-50/30 hover:border-rose-400` :
        isUpcoming ? `${cfg.border} ${cfg.bg}/30 hover:border-primary hover:shadow-sm` :
        "border-border bg-background opacity-70 hover:opacity-100 hover:border-primary"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Left accent */}
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${cfg.bg} border ${cfg.border}`}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-semibold text-body-sm text-foreground truncate">{patientName ?? "Unknown patient"}</p>
            <AppointmentTypeBadge type={appt.type} />
          </div>
          <p className="text-caption text-muted-foreground">
            📅 {new Date(appt.appointmentTime).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-caption text-muted-foreground">📍 {appt.location}</p>
          {appt.doctorId && <p className="text-caption text-muted-foreground">👨‍⚕️ {appt.doctorId}</p>}
          {appt.notes && <p className="text-caption text-muted-foreground italic truncate">"{appt.notes}"</p>}
        </div>
      </div>
    </button>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function RoleGate({ role, allowed, children, fallback }: {
  role: UserRole;
  allowed: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  if (!allowed.includes(role)) {
    return <>{fallback ?? null}</>;
  }
  return <>{children}</>;
}

// Finance-field wrapper — hides monetary values from non-finance roles
function FinanceField({ children, role, placeholder }: {
  children: React.ReactNode;
  role: UserRole;
  placeholder?: React.ReactNode;
}) {
  if (!ROLE_CONFIG[role].canEditFinance && role !== "Owner" && role !== "Admin") {
    return <>{placeholder ?? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground italic"><Warning size={11} /> Restricted</span>}</>;
  }
  return <>{children}</>;
}

// ─── Role Switcher Panel ──────────────────────────────────────────────────────

function RoleSwitcher({
  currentRole,
  realRole,
  onSwitch,
  onClose,
}: {
  currentRole: UserRole;
  realRole: UserRole;
  onSwitch: (role: UserRole | null) => void;
  onClose: () => void;
}) {
  const ALL_ROLES: UserRole[] = ["Admin", "Owner", "Sales", "Coordinator", "Doctor", "Finance", "ReadOnly"];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar)] p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-white">Role Switcher</h3>
            <p className="text-[11px] text-[var(--color-sidebar-muted)] mt-0.5">Simula çdo rol pa re-login</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-sidebar-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-2">
          {ALL_ROLES.map((r) => {
            const cfg = ROLE_CONFIG[r];
            const isActive = currentRole === r;
            const isReal = realRole === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => { onSwitch(r === realRole ? null : r); onClose(); }}
                className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-hover)] hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <RoleBadge role={r} />
                  {isReal && (
                    <span className="text-[10px] text-[var(--color-sidebar-muted)] font-medium">(i juaj i vërtetë)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--color-sidebar-muted)]">{cfg.modules.length} module</span>
                  {isActive && <span className="h-2 w-2 rounded-full bg-primary" />}
                </div>
              </button>
            );
          })}
        </div>
        {currentRole !== realRole && (
          <button
            type="button"
            onClick={() => { onSwitch(null); onClose(); }}
            className="w-full rounded-xl border border-error/40 bg-error/10 py-2.5 text-[13px] font-medium text-error hover:bg-error/20 transition-colors"
          >
            ↩ Kthehu te roli i vërtetë ({ROLE_CONFIG[realRole].label})
          </button>
        )}
      </div>
    </div>
  );
}

function App() {
  const { user, isPending: authPending, isAnonymous, login, logout } = useAuth({ requireAuth: false });
  const realRole = resolveUserRole(user?.email);
  const [activeRoleOverride, setActiveRoleOverride] = useState<UserRole | null>(null);
  const role: UserRole = activeRoleOverride ?? realRole;
  const roleConfig = ROLE_CONFIG[role];
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [showClinicReg, setShowClinicReg] = useState(false);
  const [clinicRegDone, setClinicRegDone] = useState(false);

  const [activeModule, setActiveModule] = useState<ModuleKey>("leads");
  const [activeView, setActiveView] = useState<ViewKey>("list");
  const [leftNavOpen, setLeftNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [_drawerOpen, _setDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [importLeadsOpen, setImportLeadsOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [search, setSearch] = useState("");

  // ── SDK data queries — scoped to the current user (tenant isolation) ────────
  const userId = user?.id ?? null;

  // ── NOTE: Queries are NOT filtered by createdByUserId. ─────────────────────
  // Within a clinic tenant all team members share the same data workspace.
  // Per-user isolation was the wrong model — it siloed each team member from
  // seeing records created by their colleagues.  Between-clinic data separation
  // will be handled via a tenantId field once multi-tenancy is implemented at
  // the DB level.  For now, the single-clinic model is correct: shared pool.
  const {
    data: leads,
    isPending: leadsLoading,
    error: leadsError,
  } = useQuery("Lead", {
    orderBy: { createdAt: "desc" },
    limit: 500,
  });

  const {
    data: patients,
    isPending: patientsLoading,
  } = useQuery("Patient", {
    orderBy: { createdAt: "desc" },
    limit: 50,
  });

  const {
    data: quotes,
    isPending: quotesLoading,
  } = useQuery("Quote", {
    orderBy: { createdAt: "desc" },
    limit: 50,
  });

  const {
    data: appointments,
    isPending: appointmentsLoading,
  } = useQuery("Appointment", {
    orderBy: { appointmentTime: "asc" },
    limit: 50,
  });

  const {
    data: tasks,
    isPending: tasksLoading,
  } = useQuery("Task", {
    where: { isCompleted: false },
    orderBy: { dueDate: "asc" },
    limit: 50,
  });

  const {
    data: payments,
    isPending: paymentsLoading,
  } = useQuery("Payment", {
    orderBy: { transactionDate: "desc" },
    limit: 100,
  });

  const { update: updateTask } = useMutation("Task");

  // ── Derived state ───────────────────────────────────────────────────────────
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [mobileLeadSheetOpen, setMobileLeadSheetOpen] = useState(false);
  const [patientProfileId, setPatientProfileId] = useState<string | null>(null);
  const [openQuoteForPatientId, setOpenQuoteForPatientId] = useState<string | null>(null);
  const selectedLead = useMemo(
    () => (leads ?? []).find((l) => l.id === selectedLeadId) ?? null,
    [leads, selectedLeadId]
  );

  // ── Inbox filter state ───────────────────────────────────────────────────────
  const [filterSource, setFilterSource] = useState("All Sources");
  const [filterService, setFilterService] = useState("All Services");
  const [filterUrgency, setFilterUrgency] = useState("All Urgency");
  const [filterStatus, setFilterStatus] = useState("All Status");

  // ── De-duplicate leads by phone number (keep newest per phone) ──────────────
  // Duplicates appear when the same CSV is imported twice, or two agents add
  // the same contact. We deduplicate client-side to avoid showing the same
  // person twice while preserving all real unique records.
  type LeadItem = NonNullable<typeof leads>[0];
  const deduplicatedLeads = useMemo(() => {
    const seen = new Map<string, LeadItem>();
    for (const lead of (leads ?? [])) {
      const key = lead.phone.replace(/\D/g, "").trim();
      if (!key) {
        // no phone — keep it (we can't deduplicate without a key)
        seen.set(lead.id, lead);
        continue;
      }
      const existing = seen.get(key);
      if (!existing || new Date(lead.createdAt) > new Date(existing.createdAt)) {
        seen.set(key, lead);
      }
    }
    return Array.from(seen.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const q = search.toLowerCase().trim();
    return deduplicatedLeads.filter((lead) => {
      if (filterSource !== "All Sources" && lead.source !== filterSource) return false;
      if (filterService !== "All Services" && lead.service !== filterService) return false;
      if (filterUrgency !== "All Urgency" && lead.urgencyLevel !== filterUrgency) return false;
      if (filterStatus !== "All Status" && lead.status !== filterStatus) return false;
      if (q && ![ lead.name, lead.phone, lead.country ?? "", lead.source, lead.service, lead.stage, lead.subService ?? "", lead.language ].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [deduplicatedLeads, search, filterSource, filterService, filterUrgency, filterStatus]);

  // Restrict activeModule to allowed modules for this role
  useEffect(() => {
    if (!isAnonymous && user !== undefined && !roleConfig.modules.includes(activeModule)) {
      const fallback = roleConfig.modules[0] ?? "leads";
      setActiveModule(fallback);
    }
  }, [role, isAnonymous, user]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeModule]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((prev) => !prev);
      }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (activeModule === "reports") setActiveView("dashboard");
    else if (activeModule === "appointments") setActiveView("timeline");
    else setActiveView("list");
  }, [activeModule]);

  // ── Role Switcher floating banner (shown when overriding role) ──────────────
  const RoleOverrideBanner = () => {
    if (!activeRoleOverride) return null;
    return (
      <div className="fixed bottom-[72px] lg:bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full border border-warning/50 bg-[var(--color-sidebar)] shadow-xl px-4 py-2.5 text-[12px] text-white">
        <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
        <span>Viewing as <strong>{ROLE_CONFIG[activeRoleOverride].label}</strong></span>
        <button
          type="button"
          onClick={() => setActiveRoleOverride(null)}
          className="flex items-center gap-1 rounded-full bg-warning/20 border border-warning/40 px-3 py-1 text-warning font-medium hover:bg-warning/30 transition-colors"
        >
          ↩ Back to {ROLE_CONFIG[realRole].label}
        </button>
      </div>
    );
  };

  // ── Stats derived from real data (use deduplicated leads for display) ───────
  const stats = [
    {
      label: "Open leads",
      value: leadsLoading ? "…" : String(deduplicatedLeads.filter((l) => l.status === "Active").length),
      detail: "Active pipeline",
    },
    {
      label: "Quotes sent",
      value: quotesLoading ? "…" : String((quotes ?? []).filter((q) => q.status === "Sent").length),
      detail: "Awaiting reply",
    },
    {
      label: "Appointments",
      value: appointmentsLoading ? "…" : String((appointments ?? []).length),
      detail: "Scheduled",
    },
    {
      label: "Open tasks",
      value: tasksLoading ? "…" : String((tasks ?? []).length),
      detail: "Pending actions",
    },
  ];

  // ── Module content renderer ──────────────────────────────────────────────────
  const renderModuleContent = () => {
    switch (activeModule) {
      case "leads":
        return (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="space-y-5">
              <MetricsGrid stats={stats} />
              <div className="e-card overflow-hidden">
                {/* ── Toolbar ── */}
                <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="font-heading text-[16px] font-semibold text-foreground">Lead Inbox</h2>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Omnichannel · Dental &amp; Hair Transplant pipelines</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn-primary" onClick={() => setNewLeadOpen(true)}>
                      <NotePencil size={14} weight="bold" />
                      New Lead
                    </button>
                    <button type="button" className="btn-outline flex items-center gap-1.5 text-[13px]" onClick={() => setImportLeadsOpen(true)}>
                      <UploadSimple size={14} weight="bold" />
                      Import
                    </button>
                  </div>
                </div>

                {/* ── Filters ── */}
                <div className="border-b border-border px-5 py-4">
                  <LeadInboxFilters
                    search={search}
                    setSearch={setSearch}
                    filterSource={filterSource}
                    setFilterSource={setFilterSource}
                    filterService={filterService}
                    setFilterService={setFilterService}
                    filterUrgency={filterUrgency}
                    setFilterUrgency={setFilterUrgency}
                    filterStatus={filterStatus}
                    setFilterStatus={setFilterStatus}
                    total={filteredLeads.length}
                  />
                </div>

                {/* ── View tabs ── */}
                <div className="p-5">
                  {leadsError ? (
                    <p className="text-body-sm text-error">
                      Error loading leads: {leadsError.message}
                    </p>
                  ) : leadsLoading ? (
                    <LoadingSpinner label="Loading leads..." />
                  ) : (
                    <Tabs
                      value={activeView}
                      onValueChange={(v) => setActiveView(v as ViewKey)}
                    >
                      <TabsList className="mb-5 grid w-full max-w-[320px] grid-cols-3 bg-muted rounded-lg p-1 h-9">
                        <TabsTrigger value="list" className="text-[12.5px] font-medium rounded-md">Inbox</TabsTrigger>
                        <TabsTrigger value="kanban" className="text-[12.5px] font-medium rounded-md">Pipeline</TabsTrigger>
                        <TabsTrigger value="timeline" className="text-[12.5px] font-medium rounded-md">Timeline</TabsTrigger>
                      </TabsList>
                      <TabsContent value="list" className="mt-0">
                        {filteredLeads.length === 0 ? (
                          <EmptyState
                            message="No leads match the current filters."
                            action="New Lead"
                            onAction={() => setNewLeadOpen(true)}
                          />
                        ) : (
                          <LiveLeadList
                            leads={filteredLeads}
                            onSelect={(id) => {
                              setSelectedLeadId(id);
                              setActiveView("list");
                              setMobileLeadSheetOpen(true);
                            }}
                            selectedId={selectedLeadId}
                          />
                        )}
                      </TabsContent>
                      <TabsContent value="kanban" className="mt-0">
                        {filteredLeads.length === 0 ? (
                          <EmptyState
                            message="No leads to display in pipeline."
                            action="New Lead"
                            onAction={() => setNewLeadOpen(true)}
                          />
                        ) : (
                          <LiveKanban
                            leads={filteredLeads}
                            onSelect={(id) => {
                              setSelectedLeadId(id);
                              setActiveView("list");
                              setMobileLeadSheetOpen(true);
                            }}
                          />
                        )}
                      </TabsContent>
                      <TabsContent value="timeline" className="mt-0">
                        <ActivityTimeline userId={userId} />
                      </TabsContent>
                    </Tabs>
                  )}
                </div>
              </div>
            </div>

            {/* ── Detail panel ── */}
            <aside className="e-card overflow-hidden self-start sticky top-[112px]">
              <div className="border-b border-border px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-foreground">{selectedLead ? selectedLead.name : "Lead details"}</p>
                  {selectedLead && <p className="text-[11px] text-muted-foreground mt-0.5">{selectedLead.service}</p>}
                </div>
                {selectedLead && (
                  <button type="button" onClick={() => setSelectedLeadId(null)} className="btn-ghost p-1.5 rounded-lg">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="p-5 overflow-y-auto max-h-[calc(100vh-180px)]">
                {selectedLead ? (
                  <LeadInboxDetail
                    lead={selectedLead}
                    onStageUpdated={() => {}}
                    onPatientCreated={(patientId) => {
                      setActiveModule("patients");
                      setPatientProfileId(patientId);
                    }}
                    onCreateQuote={() => {
                      const linkedPatient = (patients ?? []).find((p) => p.leadId === selectedLead.id);
                      if (linkedPatient) {
                        setOpenQuoteForPatientId(linkedPatient.id);
                      }
                      setActiveModule("quotes");
                    }}
                  />
                ) : (
                  <div className="py-12 text-center">
                    <Users size={32} className="mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-[13px] text-muted-foreground">Select a lead to view details</p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        );

      case "patients": {
        if (patientProfileId) {
        return (
          <PatientProfile360
              patientId={patientProfileId}
              onBack={() => setPatientProfileId(null)}
              userId={userId}
            />
          );
        }
        return (
          <PatientsModule
            patients={patients ?? []}
            leads={leads ?? []}
            patientsLoading={patientsLoading}
            leadsLoading={leadsLoading}
            onOpenProfile={(id) => setPatientProfileId(id)}
            onGoToLead={(leadId) => {
              setSelectedLeadId(leadId);
              setActiveModule("leads");
              setActiveView("list");
            }}
          />
        );
      }

      case "quotes":
        return (
          <QuotesModule
            quotes={quotes ?? []}
            patients={patients ?? []}
            quotesLoading={quotesLoading}
            patientsLoading={patientsLoading}
            initialOpenPatientId={openQuoteForPatientId}
            onBuilderOpened={() => setOpenQuoteForPatientId(null)}
            userId={userId}
          />
        );

      case "payments":
        if (!roleConfig.canEditFinance) {
          return (
            <AccessDenied
              moduleName="Payments"
              role={role}
              onNavigate={() => setActiveModule(roleConfig.modules[0] ?? "leads")}
            />
          );
        }
        return (
          <PaymentsModule
            payments={payments ?? []}
            patients={patients ?? []}
            quotes={quotes ?? []}
            paymentsLoading={paymentsLoading}
            patientsLoading={patientsLoading}
            quotesLoading={quotesLoading}
            onOpenPatientProfile={(id) => {
              setPatientProfileId(id);
              setActiveModule("patients");
            }}
          />
        );

      case "appointments":
        return <AppointmentsModule
          appointments={appointments ?? []}
          patients={patients ?? []}
          appointmentsLoading={appointmentsLoading}
          patientsLoading={patientsLoading}
          onOpenPatientProfile={(id) => {
            setPatientProfileId(id);
            setActiveModule("patients");
          }}
        />;

      case "tasks":
        return (
          <Card className="border-border bg-card p-6">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <h2 className="font-heading text-h3 text-foreground">
                  Task board
                </h2>
                <p className="text-body-sm text-muted-foreground">
                  Coordinator checklists, reminders, and pending actions.
                </p>
              </div>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary-hover"
                onClick={() => setNewTaskOpen(true)}
              >
                <CheckCircle size={16} weight="regular" />
                New Task
              </Button>
            </div>
            {tasksLoading ? (
              <LoadingSpinner label="Loading tasks..." />
            ) : (tasks ?? []).length === 0 ? (
              <EmptyState
                message="All caught up! No open tasks."
                action="New Task"
                onAction={() => setNewTaskOpen(true)}
              />
            ) : (
              <div className="space-y-4">
                {(tasks ?? []).map((task) => {
                  const isOverdue =
                    !task.isCompleted && new Date(task.dueDate) < new Date();
                  // Resolve entity name from relatedEntityId
                  const relatedLead = task.relatedEntityId
                    ? (leads ?? []).find((l) => l.id === task.relatedEntityId)
                    : null;
                  const relatedPatient = !relatedLead && task.relatedEntityId
                    ? (patients ?? []).find((p) => p.id === task.relatedEntityId)
                    : null;
                  const entityName = relatedLead?.name ?? relatedPatient?.fullName ?? null;
                  return (
                    <div
                      key={task.id}
                      className={`flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between ${
                        isOverdue
                          ? "border-error bg-error/5"
                          : "border-border bg-background"
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="font-mono text-caption text-muted-foreground">
                          {task.id.slice(0, 8)}
                        </p>
                        <h3 className="text-body font-medium text-foreground">
                          {task.title}
                        </h3>
                        {entityName && (
                          <button
                            type="button"
                            onClick={() => {
                              if (relatedPatient) {
                                setPatientProfileId(relatedPatient.id);
                                setActiveModule("patients");
                              } else if (relatedLead) {
                                setSelectedLeadId(relatedLead.id);
                                setActiveModule("leads");
                              }
                            }}
                            className="flex items-center gap-1 text-body-sm text-primary hover:underline"
                          >
                            <UserCircle size={12} />
                            {entityName}
                          </button>
                        )}
                        <p className="text-body-sm text-muted-foreground">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                          {isOverdue && (
                            <span className="ml-2 text-error">— OVERDUE</span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <UrgencyBadge value={task.priority} />
                        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
                          <span className="text-body-sm text-foreground">
                            Done
                          </span>
                          <Switch
                            checked={task.isCompleted}
                            onCheckedChange={async (checked) => {
                              try {
                                await updateTask(task.id, {
                                  isCompleted: checked,
                                });
                              } catch (err) {
                                console.error("Failed to update task:", err);
                              }
                            }}
                            aria-label={`Mark ${task.title} as done`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );

      case "reports":
        return (
          <ReportsDashboard
            leads={leads ?? []}
            patients={patients ?? []}
            quotes={quotes ?? []}
            payments={payments ?? []}
            tasks={tasks ?? []}
            leadsLoading={leadsLoading}
            quotesLoading={quotesLoading}
            paymentsLoading={paymentsLoading}
            role={role}
          />
        );

      case "travel":
        return (
          <TravelModule
            patients={patients ?? []}
            patientsLoading={patientsLoading}
            userId={userId}
          />
        );

      case "settings":
        if (role !== "Admin" && role !== "Owner") {
          return (
            <AccessDenied
              moduleName="Settings"
              role={role}
              onNavigate={() => setActiveModule(roleConfig.modules[0] ?? "leads")}
            />
          );
        }
        return (
          <div className="space-y-6">
            {/* ── Multi-Tenant Manager — visible ONLY for Admin, not Owner ── */}
            {realRole === "Admin" && <MultiTenantManager isOwner={false} />}

            {/* ── Email Invite Config ── */}
            <EmailJSConfigCard />

            {/* ── Team Management ── */}
            <TeamManagementSection currentUserEmail={user?.email ?? ""} currentUserRole={realRole} />

            {/* Role matrix banner */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserCircle size={20} />
                </div>
                <div>
                  <h3 className="font-heading text-h4 text-foreground">Role &amp; Permissions Matrix</h3>
                  <p className="text-body-sm text-muted-foreground">Active roles and their access configuration.</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-body-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left">
                      <th className="px-4 py-3 text-muted-foreground font-medium">Role</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium text-center">Create Lead</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium text-center">Finance</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium text-center">Approve Quote</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium text-center">All Patients</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium text-center">Delete</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium text-center">Export</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium">Modules</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(([key, cfg]) => (
                      <tr key={key} className={`hover:bg-muted/20 ${key === role ? "bg-primary/5" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <RoleBadge role={key} />
                            {key === role && <span className="text-[10px] text-primary font-bold">(you)</span>}
                          </div>
                        </td>
                        {[cfg.canCreateLead, cfg.canEditFinance, cfg.canApproveQuote, cfg.canSeeAllPatients, cfg.canDeleteRecords, cfg.canExportData].map((val, i) => (
                          <td key={i} className="px-4 py-3 text-center">
                            <span className={`text-[13px] font-bold ${val ? "text-green-500" : "text-error"}`}>{val ? "✓" : "✗"}</span>
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {cfg.modules.map((mod) => (
                              <span key={mod} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground capitalize">{mod}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <SettingsCard
                title="Pipeline configuration"
                description="Create, rename, and order stages for dental and hair workflows."
              />
              <SettingsCard
                title="User and role manager"
                description="Define coordinator, doctor, admin, and finance access policies."
              />
              <SettingsCard
                title="Template library"
                description="Store quote templates, WhatsApp scripts, and email follow-up sequences."
              />
              <SettingsCard
                title="Automation rule builder"
                description="Configure if-then rules for assignments, reminders, and escalations."
              />
              <SettingsCard
                title="Clinic setup"
                description="Control timezone, currency, branding, and language preferences."
              />
              <SettingsCard
                title="Localization"
                description="Albanian and English packs with RTL-safe layout support."
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Loading state while auth resolves ────────────────────────────────────────
  if (authPending || user === undefined) {
    return (
      <div className="min-h-screen bg-[var(--color-sidebar)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Stethoscope size={28} weight="bold" className="text-white" />
          </div>
          <div className="flex items-center gap-2 text-[var(--color-sidebar-muted)]">
            <Spinner size={16} className="animate-spin" />
            <span className="text-[13px]">Authenticating…</span>
          </div>
        </div>
      </div>
    );
  }

  // ── User logged in but NOT in whitelist → show unauthorized screen ───────────
  if (!isAnonymous && user && !isUserInWhitelist(user.email)) {
    return <UnauthorizedScreen user={user} onLogout={logout} />;
  }

  // ── Anonymous / logged-out → show login screen ────────────────────────────────
  if (isAnonymous || user === null) {
    if (showClinicReg) {
      return (
        <div className="min-h-screen bg-[var(--color-sidebar)] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => { setShowClinicReg(false); setClinicRegDone(false); }}
                className="flex items-center gap-2 text-[13px] text-[var(--color-sidebar-muted)] hover:text-white transition-colors"
              >
                <ArrowLeft size={16} />
                Back to sign in
              </button>
            </div>
            {/* Brand */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
                <Stethoscope size={20} weight="bold" className="text-white" />
              </div>
              <div>
                <p className="text-[16px] font-bold text-white leading-none">Vita</p>
                <p className="text-[11px] text-[var(--color-sidebar-muted)] mt-0.5">Register your clinic</p>
              </div>
            </div>
            {/* Card */}
            <div className="rounded-2xl border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-hover)] p-8">
              <ClinicRegistrationForm
                onClose={() => { setShowClinicReg(false); setClinicRegDone(false); }}
                onRegistered={(tenant) => {
                  setClinicRegDone(true);
                }}
              />
            </div>
            <p className="text-center text-[11px] text-[var(--color-sidebar-muted)] mt-4">
              Vita Platform · GDPR-compliant · Encrypted · By registering, you agree to our Terms of Service
            </p>
          </div>
        </div>
      );
    }
    return <LoginScreen onLogin={login} onRegisterClinic={() => setShowClinicReg(true)} />;
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--color-sidebar)] text-foreground flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-3 focus:text-foreground"
      >
        Skip to main content
      </a>

      {/* ── Header ── */}
      <header className="app-header px-4 md:px-6 gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={() => setLeftNavOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-sidebar-foreground)] hover:bg-[var(--color-sidebar-hover)] lg:hidden transition-colors"
          aria-label="Open navigation menu"
        >
          <ListBullets size={18} weight="regular" />
        </button>

        {/* Brand / Clinic */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Stethoscope size={16} weight="bold" className="text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-[13px] font-semibold text-white leading-none">Vita</p>
            <p className="text-[11px] text-[var(--color-sidebar-muted)] mt-0.5 leading-none">Medical Platform</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Search */}
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="hidden md:flex h-9 min-w-[220px] items-center justify-between rounded-lg border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-hover)] px-3 text-left transition-colors hover:border-[var(--color-primary)]"
            aria-label="Open command palette"
          >
            <span className="flex items-center gap-2 text-[13px] text-[var(--color-sidebar-muted)]">
              <MagnifyingGlass size={14} weight="regular" />
              Search…
            </span>
            <span className="rounded border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar)] px-1.5 py-0.5 text-[11px] text-[var(--color-sidebar-muted)]">
              ⌘K
            </span>
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-sidebar-foreground)] hover:bg-[var(--color-sidebar-hover)] transition-colors"
            aria-label="Open notifications"
          >
            <Bell size={18} weight="regular" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-error border-2 border-[var(--color-sidebar)]" />
          </button>

          {/* Auth */}
          {authPending ? (
            <div className="inline-flex h-9 w-9 items-center justify-center">
              <Spinner size={16} className="animate-spin text-[var(--color-sidebar-muted)]" />
            </div>
          ) : isAnonymous ? (
            <button
              type="button"
              onClick={() => login()}
              className="flex h-9 items-center gap-2 rounded-lg border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-hover)] px-3 text-[13px] font-medium text-white transition-colors hover:bg-primary"
              aria-label="Log in"
            >
              <SignIn size={16} weight="regular" />
              <span className="hidden sm:inline">Log in</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {/* Role badge — always shows; Switch Role button for Admin/Owner */}
              <RoleBadge role={role} />
              {activeRoleOverride && (
                <span className="h-2 w-2 inline-block rounded-full bg-warning animate-pulse" />
              )}
              {(realRole === "Admin" || realRole === "Owner") && (
                <button
                  type="button"
                  onClick={() => setRoleSwitcherOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-hover)] px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-primary transition-colors"
                  title="Switch role"
                  aria-label="Switch role"
                >
                  <UserCircle size={14} />
                  Switch Role
                </button>
              )}
              <button
                type="button"
                onClick={() => logout()}
                className="flex h-9 items-center gap-2 rounded-lg border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-hover)] px-3 text-[13px] text-[var(--color-sidebar-foreground)] transition-colors hover:bg-[var(--color-sidebar-hover)] hover:text-white"
                aria-label={`Log out ${user?.name ?? ""}`}
                title={user?.email}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                  {(user?.name ?? "A").charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[90px] truncate">{user?.name ?? "Account"}</span>
                <SignOut size={14} weight="regular" className="text-[var(--color-sidebar-muted)]" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── App shell ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Role override banner ── */}
      <RoleOverrideBanner />

      {/* ── Role Switcher Panel ── */}
      {roleSwitcherOpen && (
        <RoleSwitcher
          currentRole={role}
          realRole={realRole}
          onSwitch={(r) => setActiveRoleOverride(r)}
          onClose={() => setRoleSwitcherOpen(false)}
        />
      )}

      {/* ── Dark sidebar ── */}
        <aside className="sidebar hidden lg:flex flex-col w-[220px] xl:w-[240px] flex-shrink-0 min-h-[calc(100vh-60px)] sticky top-[60px] overflow-y-auto">
          <div className="flex-1 px-3 py-4 space-y-6">
            {/* New Lead CTA — only for roles that can create leads */}
            {roleConfig.canCreateLead && (
              <button
                type="button"
                onClick={() => setNewLeadOpen(true)}
                className="btn-primary w-full justify-center text-[13px]"
              >
                <NotePencil size={15} weight="bold" />
                New Lead
              </button>
            )}

            {/* Main nav — filtered by role */}
            <div>
              <div className="sidebar-section-label">Workspace</div>
              <div className="space-y-0.5 mt-1">
                {moduleItems.slice(0, 7).filter((item) => roleConfig.modules.includes(item.key)).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveModule(item.key)}
                    className={`sidebar-item w-full ${activeModule === item.key ? "active" : ""}`}
                  >
                    {item.icon}
                    {item.label}
                    {item.key === "tasks" && (tasks ?? []).length > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white px-1">
                        {(tasks ?? []).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="sidebar-section-label">Analytics</div>
              <div className="space-y-0.5 mt-1">
                {moduleItems.slice(7).filter((item) => roleConfig.modules.includes(item.key)).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveModule(item.key)}
                    className={`sidebar-item w-full ${activeModule === item.key ? "active" : ""}`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick stats */}
            <div className="rounded-xl border border-[var(--color-sidebar-border)] p-3 space-y-2">
              <div className="sidebar-section-label" style={{ padding: "0 0 4px" }}>Quick stats</div>
              {[
                { label: "Open leads", value: leadsLoading ? "…" : String(deduplicatedLeads.filter((l) => l.status === "Active").length), color: "bg-primary" },
                { label: "Quotes sent", value: quotesLoading ? "…" : String((quotes ?? []).filter((q) => q.status === "Sent").length), color: "bg-purple-500" },
                { label: "Open tasks", value: tasksLoading ? "…" : String((tasks ?? []).length), color: "bg-warning" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${s.color}`} />
                    <span className="text-[12px] text-[var(--color-sidebar-muted)]">{s.label}</span>
                  </div>
                  <span className="text-[13px] font-semibold text-[var(--color-sidebar-foreground)]">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: user + role switcher */}
          <div className="border-t border-[var(--color-sidebar-border)] p-3 space-y-1">
            {(realRole === "Admin" || realRole === "Owner") && (
              <button
                type="button"
                onClick={() => setRoleSwitcherOpen(true)}
                className="sidebar-item w-full text-warning hover:text-white"
              >
                <UserCircle size={16} />
                Switch Role
                {activeRoleOverride && (
                  <span className="ml-auto flex h-2 w-2 rounded-full bg-warning animate-pulse" />
                )}
              </button>
            )}
            <button
              type="button"
              className="sidebar-item w-full"
              onClick={() => setActiveModule("settings")}
            >
              <Gear size={16} />
              Settings
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main id="main-content" className="flex-1 min-w-0 overflow-y-auto bg-background rounded-tl-none">
          {/* Module header bar */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-3 flex items-center gap-3">
            <div>
              <h1 className="font-heading text-[17px] font-semibold text-foreground leading-none">
                {moduleItems.find((m) => m.key === activeModule)?.label ?? "Workspace"}
              </h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {activeModule === "leads" && "Omnichannel · Dental & Hair Transplant pipelines"}
                {activeModule === "patients" && "360° patient profiles with full history"}
                {activeModule === "quotes" && "Treatment plans · Multi-currency · Version history"}
                {activeModule === "payments" && "Deposits, balances, refunds & revenue"}
                {activeModule === "appointments" && "Doctor schedules & travel coordination"}
                {activeModule === "travel" && "Arrival, hotels, transfers & coordinator checklist"}
                {activeModule === "tasks" && "Team reminders, SLA tracking & follow-ups"}
                {activeModule === "reports" && "Live KPIs from SDK · Funnel, revenue, sources, agents"}
                {activeModule === "settings" && "Pipelines, roles, templates & automations"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2 text-[12px] text-muted-foreground">
              <span className="hidden sm:inline">Vita</span>
              <span>·</span>
              <span className="text-primary font-medium">Live</span>
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>

          <div className="p-5 md:p-7 space-y-6 animate-fade-in">
            {renderModuleContent()}
          </div>
        </main>
      </div>

      {/* ── Mobile nav ── */}
      <Sheet open={leftNavOpen} onOpenChange={setLeftNavOpen}>
        <SheetContent side="left" className="w-[280px] p-0" style={{ background: "var(--color-sidebar)", borderRight: "1px solid var(--color-sidebar-border)" }}>
          <SheetHeader className="p-4 border-b border-[var(--color-sidebar-border)]">
            <SheetTitle className="text-white text-[15px] font-semibold flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Stethoscope size={14} weight="bold" className="text-white" />
              </div>
              Vita
            </SheetTitle>
          </SheetHeader>
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <RoleBadge role={role} />
              {activeRoleOverride && (
                <span className="text-[10px] text-warning font-medium">(override)</span>
              )}
            </div>
            <p className="text-[10px] text-[var(--color-sidebar-muted)] mt-1">{user?.email}</p>
          </div>
          {(realRole === "Admin" || realRole === "Owner") && (
            <div className="px-3 pb-1">
              <button
                type="button"
                onClick={() => { setRoleSwitcherOpen(true); setLeftNavOpen(false); }}
                className="sidebar-item w-full text-warning hover:text-white"
              >
                <UserCircle size={16} />
                Switch Role
              </button>
            </div>
          )}
          <div className="p-3 space-y-0.5">
            {/* Only show modules the current role has access to */}
            {moduleItems.filter((item) => roleConfig.modules.includes(item.key)).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => { setActiveModule(item.key); setLeftNavOpen(false); }}
                className={`sidebar-item w-full ${activeModule === item.key ? "active" : ""}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-[var(--color-sidebar-border)] mt-2">
            <button
              type="button"
              onClick={() => { logout(); setLeftNavOpen(false); }}
              className="sidebar-item w-full text-error hover:text-white"
            >
              <SignOut size={16} />
              Sign out
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Command palette ── */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="border-border bg-card sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-h3 text-foreground">
              Command Palette
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center gap-3">
                <MagnifyingGlass size={16} weight="regular" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search leads, quotes, tasks, or actions"
                  className="border-0 bg-transparent text-foreground focus-visible:ring-0"
                />
              </div>
            </div>
            <ScrollArea className="h-[320px] rounded-lg border border-border bg-background">
              <div className="p-3">
                {leadsLoading ? (
                  <LoadingSpinner label="Searching..." />
                ) : filteredLeads.length === 0 ? (
                  <p className="p-4 text-body-sm text-muted-foreground">
                    No results for &quot;{search}&quot;
                  </p>
                ) : (
                  filteredLeads.map((lead) => {
                    const img = serviceImage(lead.service);
                    return (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => {
                          setSelectedLeadId(lead.id);
                          setActiveModule("leads");
                          setActiveView("list");
                          setCommandOpen(false);
                        }}
                        className="mb-2 flex w-full items-center gap-4 rounded-lg border border-transparent bg-card p-4 text-left transition-colors hover:border-primary"
                      >
                        <img
                          src={img.src}
                          alt={img.alt}
                          loading="lazy"
                          className="h-14 w-14 rounded-lg border border-border object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-body font-medium text-foreground">
                            {lead.name}
                          </p>
                          <p className="text-body-sm text-muted-foreground">
                            {lead.service} · {lead.country ?? "Unknown"}
                          </p>
                        </div>
                        <StatusBadge value={lead.stage} />
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Notifications ── */}
      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent side="right" className="w-[360px] border-border bg-card p-0">
          <SheetHeader className="border-b border-border p-6">
            <SheetTitle className="font-heading text-h4 text-foreground">
              Notification Center
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-85px)]">
            <div className="space-y-3 p-6">
              {NOTIFICATIONS.map((item) => (
                <Card key={item.id} className="border-border bg-background p-4">
                  <h3 className="text-body font-medium text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-body-sm text-foreground">
                    {item.detail}
                  </p>
                  <p className="mt-2 text-caption text-muted-foreground">
                    {item.time}
                  </p>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ── Import Leads Dialog ── */}
      <Dialog open={importLeadsOpen} onOpenChange={setImportLeadsOpen}>
        <DialogContent className="border-border bg-card sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-h3 text-foreground flex items-center gap-2">
              <UploadSimple size={20} />
              Import Leads nga CSV
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            <div className="p-1">
              <ImportLeadsModal onClose={() => setImportLeadsOpen(false)} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── New Lead Dialog ── */}
      <Dialog open={newLeadOpen} onOpenChange={setNewLeadOpen}>
        <DialogContent className="border-border bg-card sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-h3 text-foreground">
              New Lead
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            <div className="p-1">
              <NewLeadForm onClose={() => setNewLeadOpen(false)} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── New Task Dialog ── */}
      <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
        <DialogContent className="border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-h3 text-foreground">
              New Task
            </DialogTitle>
          </DialogHeader>
          <NewTaskForm onClose={() => setNewTaskOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* ── Mobile Lead Detail Sheet ── */}
      <Sheet open={mobileLeadSheetOpen} onOpenChange={setMobileLeadSheetOpen}>
        <SheetContent
          side="bottom"
          className="lg:hidden p-0 border-t border-border bg-card rounded-t-2xl"
          style={{ maxHeight: "92dvh", display: "flex", flexDirection: "column" }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          {/* Sheet header */}
          <SheetHeader className="px-5 pb-3 border-b border-border shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="text-[15px] font-semibold text-foreground truncate">
                  {selectedLead ? selectedLead.name : "Lead Details"}
                </SheetTitle>
                {selectedLead && (
                  <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{selectedLead.service}{selectedLead.subService ? ` · ${selectedLead.subService}` : ""}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMobileLeadSheetOpen(false)}
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-tertiary"
                aria-label="Close lead details"
              >
                <X size={15} />
              </button>
            </div>
          </SheetHeader>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {selectedLead ? (
              <LeadInboxDetail
                lead={selectedLead}
                onStageUpdated={() => {}}
                onPatientCreated={(patientId) => {
                  setMobileLeadSheetOpen(false);
                  setActiveModule("patients");
                  setPatientProfileId(patientId);
                }}
                onCreateQuote={() => {
                  const linkedPatient = (patients ?? []).find((p) => p.leadId === selectedLead.id);
                  if (linkedPatient) {
                    setOpenQuoteForPatientId(linkedPatient.id);
                  }
                  setActiveModule("quotes");
                  setMobileLeadSheetOpen(false);
                }}
              />
            ) : (
              <div className="py-12 text-center">
                <Users size={32} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-[13px] text-muted-foreground">Asnjë lead i zgjedhur</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Mobile bottom nav ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden border-t border-border bg-card/95 backdrop-blur-sm" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around px-2 py-1">
          {(
            [
              { key: "leads" as ModuleKey, label: "Leads", icon: <Users size={20} /> },
              { key: "quotes" as ModuleKey, label: "Quotes", icon: <ClipboardText size={20} /> },
              { key: "payments" as ModuleKey, label: "Pay", icon: <CurrencyDollar size={20} /> },
              { key: "tasks" as ModuleKey, label: "Tasks", icon: <CheckCircle size={20} /> },
              { key: "reports" as ModuleKey, label: "Reports", icon: <ChartBar size={20} /> },
            ] as const
          ).filter((item) => {
            if (item.key === "payments" && !roleConfig.canEditFinance) return false;
            return roleConfig.modules.includes(item.key);
          }).map((item) => {
            const active = activeModule === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveModule(item.key)}
                className={`flex flex-col items-center justify-center min-w-[52px] py-2 gap-0.5 rounded-lg transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label={item.label}
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && <span className="h-0.5 w-4 rounded-full bg-primary" />}
              </button>
            );
          })}
          {/* FAB: only show if role can create leads */}
          {roleConfig.canCreateLead && (
            <button
              type="button"
              onClick={() => setNewLeadOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-primary transition-all hover:bg-primary-hover active:scale-95"
              aria-label="Create new lead"
            >
              <NotePencil size={20} weight="bold" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared display components ────────────────────────────────────────────────

function MetricsGrid({
  stats,
}: {
  stats: { label: string; value: string; detail: string }[];
}) {
  const colors = ["bg-primary", "bg-purple-500", "bg-[var(--color-accent)]", "bg-warning"];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, i) => (
        <div key={stat.label} className="kpi-card">
          <div className={`kpi-card-accent ${colors[i % colors.length]}`} />
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
          <p className="mt-2 font-heading text-[30px] leading-tight text-foreground font-semibold">
            {stat.value}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">{stat.detail}</p>
        </div>
      ))}
    </div>
  );
}

function ReportMetric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix: string;
}) {
  return (
    <Card className="border-border bg-background p-4">
      <p className="text-body-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-[28px] leading-tight text-foreground">
        {value}
      </p>
      <p className="text-caption text-muted-foreground">{suffix}</p>
    </Card>
  );
}

// ─── Live Reports Dashboard ──────────────────────────────────────────────────

function ReportsDashboard({
  leads,
  patients,
  quotes,
  payments,
  tasks,
  leadsLoading,
  quotesLoading,
  paymentsLoading,
  role,
}: {
  leads: { id: string; source: string; service: string; stage: string; status: string; urgencyLevel?: string; createdAt: Date; updatedAt: Date; assignedAgentId?: string }[];
  patients: { id: string; status: string }[];
  quotes: { id: string; patientId: string; service: string; totalPrice: number; discountedPrice?: number; depositAmount: number; currency: string; status: string; createdAt: Date }[];
  payments: { id: string; patientId: string; amount: number; currency: string; type: string; transactionDate: Date; paymentMethod?: string; refundStatus?: string }[];
  tasks: { id: string; isCompleted: boolean; dueDate: Date }[];
  leadsLoading: boolean;
  quotesLoading: boolean;
  paymentsLoading: boolean;
  role: UserRole;
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [reportRange, setReportRange] = useState<"all" | "30d" | "7d">("all");

  const rangeMs = reportRange === "7d" ? 7 * 86400000 : reportRange === "30d" ? 30 * 86400000 : Infinity;

  const filteredLeads = useMemo(() => {
    const cutoff = Date.now();
    return leads.filter((l) => cutoff - new Date(l.createdAt).getTime() <= rangeMs);
  }, [leads, rangeMs]);
  const filteredQuotes = useMemo(() => {
    const cutoff = Date.now();
    return quotes.filter((q) => cutoff - new Date(q.createdAt).getTime() <= rangeMs);
  }, [quotes, rangeMs]);
  const filteredPayments = useMemo(() => {
    const cutoff = Date.now();
    return payments.filter((p) => cutoff - new Date(p.transactionDate).getTime() <= rangeMs);
  }, [payments, rangeMs]);

  // ── Core metrics ──────────────────────────────────────────────────────────
  const totalLeads = filteredLeads.length;
  const qualifiedLeads = filteredLeads.filter((l) => !["New Lead", "Attempting Contact"].includes(l.stage)).length;
  const quotedLeads = filteredLeads.filter((l) =>
    ["Quote Sent", "Deposit Requested", "Deposit Paid", "Negotiation / Follow-up", "Offer Sent", "Follow-up"].includes(l.stage)
  ).length;
  const depositPaidLeads = filteredLeads.filter((l) =>
    ["Deposit Paid"].includes(l.stage) || ["Deposit Paid", "Surgery Scheduled", "In Treatment", "Treatment Completed", "Procedure Done"].includes(l.stage)
  ).length;
  const completedLeads = filteredLeads.filter((l) =>
    ["Treatment Completed", "Procedure Done", "Follow-up Active", "Review Requested"].includes(l.stage)
  ).length;
  const lostLeads = filteredLeads.filter((l) => l.status === "Lost").length;

  const qualificationRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;
  const quoteRate = totalLeads > 0 ? Math.round((quotedLeads / totalLeads) * 100) : 0;
  const depositRate = totalLeads > 0 ? Math.round((depositPaidLeads / totalLeads) * 100) : 0;
  const showRate = (depositPaidLeads + completedLeads) > 0
    ? Math.round((completedLeads / (depositPaidLeads + completedLeads)) * 100) : 0;
  const lostRate = totalLeads > 0 ? Math.round((lostLeads / totalLeads) * 100) : 0;

  // ── Response time proxy: leads updated within 30 min of creation ─────────
  const respondedWithin30 = filteredLeads.filter((l) => {
    const diff = new Date(l.updatedAt).getTime() - new Date(l.createdAt).getTime();
    return diff > 0 && diff <= 1800000;
  }).length;
  const responseRate = totalLeads > 0 ? Math.round((respondedWithin30 / totalLeads) * 100) : 0;

  // ── Revenue ───────────────────────────────────────────────────────────────
  const totalCollected = filteredPayments.filter((p) => p.type !== "Refund").reduce((s, p) => s + p.amount, 0);
  const totalRefunded = filteredPayments.filter((p) => p.type === "Refund").reduce((s, p) => s + p.amount, 0);
  const netRevenue = totalCollected - totalRefunded;
  const depositsCollected = filteredPayments.filter((p) => p.type === "Deposit").reduce((s, p) => s + p.amount, 0);
  const approvedQuoteValue = filteredQuotes.filter((q) => q.status === "Approved").reduce((s, q) => s + (q.discountedPrice ?? q.totalPrice), 0);

  // ── Revenue by service ────────────────────────────────────────────────────
  const revenueByService = useMemo(() => {
    const map: Record<string, number> = {};
    filteredQuotes.filter((q) => q.status === "Approved").forEach((q) => {
      const key = q.service.toLowerCase().includes("hair") ? "Hair Transplant" : "Dental Tourism";
      map[key] = (map[key] ?? 0) + (q.discountedPrice ?? q.totalPrice);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredQuotes]);

  // ── Revenue by payment method ─────────────────────────────────────────────
  const revenueByMethod = useMemo(() => {
    const map: Record<string, number> = {};
    filteredPayments.filter((p) => p.type !== "Refund").forEach((p) => {
      const key = p.paymentMethod ?? "Unknown";
      map[key] = (map[key] ?? 0) + p.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredPayments]);

  // ── Leads by source ───────────────────────────────────────────────────────
  const leadsBySource = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLeads.forEach((l) => { map[l.source] = (map[l.source] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredLeads]);

  // ── Leads by service ──────────────────────────────────────────────────────
  const leadsByService = useMemo(() => {
    const dental = filteredLeads.filter((l) => l.service === "Dental Tourism").length;
    const hair = filteredLeads.filter((l) => l.service === "Hair Transplant").length;
    return [["Dental Tourism", dental], ["Hair Transplant", hair]] as [string, number][];
  }, [filteredLeads]);

  // ── Funnel stages ─────────────────────────────────────────────────────────
  const funnelStages = useMemo(() => [
    { label: "Total leads", count: totalLeads, color: "bg-blue-500" },
    { label: "Contacted / Qualified", count: qualifiedLeads, color: "bg-primary" },
    { label: "Quote sent", count: quotedLeads, color: "bg-purple-500" },
    { label: "Deposit paid", count: depositPaidLeads, color: "bg-green-500" },
    { label: "Treatment completed", count: completedLeads, color: "bg-accent" },
    { label: "Lost", count: lostLeads, color: "bg-error" },
  ], [totalLeads, qualifiedLeads, quotedLeads, depositPaidLeads, completedLeads, lostLeads]);

  // ── Revenue over time (monthly buckets) ───────────────────────────────────
  const revenueByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    payments.filter((p) => p.type !== "Refund").forEach((p) => {
      const d = new Date(p.transactionDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] ?? 0) + p.amount;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  }, [payments]);

  const maxMonthRevenue = Math.max(...revenueByMonth.map((r) => r[1]), 1);

  // ── Agent performance ─────────────────────────────────────────────────────
  const agentPerf = useMemo(() => {
    const map: Record<string, { leads: number; deposits: number; lost: number }> = {};
    filteredLeads.forEach((l) => {
      const key = l.assignedAgentId ?? "Unassigned";
      if (!map[key]) map[key] = { leads: 0, deposits: 0, lost: 0 };
      map[key].leads++;
      if (l.stage === "Deposit Paid") map[key].deposits++;
      if (l.status === "Lost") map[key].lost++;
    });
    return Object.entries(map)
      .map(([agent, v]) => ({ agent: agent === "Unassigned" ? "Unassigned" : `Agent …${agent.slice(-6)}`, ...v, rate: v.leads > 0 ? Math.round((v.deposits / v.leads) * 100) : 0 }))
      .sort((a, b) => b.leads - a.leads);
  }, [filteredLeads]);

  const TABS = ["overview", "funnel", "revenue", "sources", "agents"] as const;
  const TAB_LABELS: Record<string, string> = { overview: "Overview", funnel: "Funnel", revenue: "Revenue", sources: "Sources", agents: "Agents" };

  const selectClass = "rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-heading text-h2 text-foreground">Live Reports Dashboard</h2>
          <p className="text-body-sm text-muted-foreground mt-1">Real-time metrics from SDK — leads, revenue, funnel, sources, agents.</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={reportRange} onChange={(e) => setReportRange(e.target.value as "all" | "30d" | "7d")} className={selectClass}>
            <option value="all">All time</option>
            <option value="30d">Last 30 days</option>
            <option value="7d">Last 7 days</option>
          </select>
        </div>
      </div>

      {/* ── KPI summary row ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportKpiCard label="Total leads" value={leadsLoading ? "…" : String(totalLeads)} sub={`${lostRate}% lost`} color="bg-blue-500" />
        <ReportKpiCard label="Qualification rate" value={leadsLoading ? "…" : `${qualificationRate}%`} sub={`${qualifiedLeads} of ${totalLeads} leads`} color="bg-primary" />
        <ReportKpiCard label="Deposit rate" value={leadsLoading ? "…" : `${depositRate}%`} sub={`${depositPaidLeads} deposits from leads`} color="bg-green-500" />
        <ReportKpiCard
        label="Net revenue"
        value={paymentsLoading ? "…" : (ROLE_CONFIG[role].canEditFinance || role === "Admin" || role === "Owner") ? `€${netRevenue.toLocaleString()}` : "Restricted"}
        sub={(ROLE_CONFIG[role].canEditFinance || role === "Admin" || role === "Owner") ? `€${depositsCollected.toLocaleString()} deposits` : "Finance access required"}
        color="bg-accent"
      />
      </div>

      {/* ── Second KPI row ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportKpiCard label="Quote rate" value={leadsLoading ? "…" : `${quoteRate}%`} sub={`${quotedLeads} leads quoted`} color="bg-purple-500" />
        <ReportKpiCard label="Show rate" value={leadsLoading ? "…" : `${showRate}%`} sub={`${completedLeads} completed treatments`} color="bg-yellow-500" />
        <ReportKpiCard label="Response ≤30min" value={leadsLoading ? "…" : `${responseRate}%`} sub={`${respondedWithin30} of ${totalLeads} leads`} color="bg-orange-500" />
        <ReportKpiCard
          label="Approved quote value"
          value={quotesLoading ? "…" : (ROLE_CONFIG[role].canEditFinance || role === "Admin" || role === "Owner" || role === "Sales") ? `€${approvedQuoteValue.toLocaleString()}` : "Restricted"}
          sub={(ROLE_CONFIG[role].canEditFinance || role === "Admin" || role === "Owner" || role === "Sales") ? `${filteredQuotes.filter((q) => q.status === "Approved").length} approved quotes` : "Finance access required"}
          color="bg-teal-500"
        />
      </div>

      {/* ── Tabs ── */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 border-b border-border min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-body-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview tab ── */}
      {activeTab === "overview" && (
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Leads by service */}
          <Card className="border-border bg-card p-6 space-y-4">
            <h3 className="font-heading text-h4 text-foreground">Leads by service</h3>
            {leadsLoading ? <LoadingSpinner label="Loading…" /> : (
              <div className="space-y-4">
                {leadsByService.map(([svc, count]) => {
                  const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
                  const isDental = svc === "Dental Tourism";
                  return (
                    <div key={svc}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg`}>{isDental ? "🦷" : "💇"}</span>
                          <span className="text-body-sm font-medium text-foreground">{svc}</span>
                        </div>
                        <span className="text-body-sm text-muted-foreground">{count} leads · {pct}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div className={`h-3 rounded-full transition-all ${isDental ? "bg-blue-500" : "bg-purple-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Monthly revenue trend */}
          <Card className="border-border bg-card p-6 space-y-4">
            <h3 className="font-heading text-h4 text-foreground">Revenue trend (last 6 months)</h3>
            {paymentsLoading ? <LoadingSpinner label="Loading…" /> : revenueByMonth.length === 0 ? (
              <EmptyState message="No payment data yet." />
            ) : (
              <div className="flex items-end gap-3 h-40">
                {revenueByMonth.map(([month, amt]) => {
                  const heightPct = Math.round((amt / maxMonthRevenue) * 100);
                  return (
                    <div key={month} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-caption text-muted-foreground">€{amt >= 1000 ? `${Math.round(amt / 1000)}k` : amt}</span>
                      <div className="w-full rounded-t-md bg-primary transition-all" style={{ height: `${Math.max(8, heightPct)}%`, minHeight: "8px" }} />
                      <span className="text-caption text-muted-foreground">{month.slice(5)}/{month.slice(2, 4)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Patients by status */}
          <Card className="border-border bg-card p-6 space-y-4">
            <h3 className="font-heading text-h4 text-foreground">Patient status breakdown</h3>
            {(() => {
              const statusMap: Record<string, number> = {};
              patients.forEach((p) => { statusMap[p.status] = (statusMap[p.status] ?? 0) + 1; });
              const total = patients.length || 1;
              const statusColors: Record<string, string> = {
                "In Treatment": "bg-primary",
                "Completed": "bg-green-500",
                "Follow-up": "bg-yellow-500",
                "Pending": "bg-orange-400",
              };
              return Object.entries(statusMap).length === 0 ? (
                <EmptyState message="No patients yet." />
              ) : (
                <div className="space-y-3">
                  {Object.entries(statusMap).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-body-sm text-foreground">{status}</span>
                          <span className="text-body-sm text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-2 rounded-full transition-all ${statusColors[status] ?? "bg-accent"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Card>

          {/* Quote status */}
          <Card className="border-border bg-card p-6 space-y-4">
            <h3 className="font-heading text-h4 text-foreground">Quote pipeline</h3>
            {quotesLoading ? <LoadingSpinner label="Loading…" /> : (() => {
              const qMap: Record<string, number> = {};
              filteredQuotes.forEach((q) => { qMap[q.status] = (qMap[q.status] ?? 0) + 1; });
              const total = filteredQuotes.length || 1;
              const statusColors: Record<string, string> = {
                "Approved": "bg-green-500",
                "Sent": "bg-primary",
                "Draft": "bg-muted-foreground",
              };
              return Object.entries(qMap).length === 0 ? (
                <EmptyState message="No quotes yet." />
              ) : (
                <div className="space-y-3">
                  {Object.entries(qMap).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-body-sm text-foreground">{status}</span>
                          <span className="text-body-sm text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-2 rounded-full transition-all ${statusColors[status] ?? "bg-accent"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Card>
        </div>
      )}

      {/* ── Funnel tab ── */}
      {activeTab === "funnel" && (
        <div className="space-y-6">
          <Card className="border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="font-heading text-h3 text-foreground">Conversion funnel</h3>
              <p className="text-body-sm text-muted-foreground mt-1">Stage-by-stage drop-off from first contact to completed treatment.</p>
            </div>
            {leadsLoading ? <LoadingSpinner label="Loading funnel…" /> : (
              <div className="space-y-4">
                {funnelStages.map((stage, i) => {
                  const pct = totalLeads > 0 ? Math.round((stage.count / totalLeads) * 100) : 0;
                  const prevCount = i > 0 ? funnelStages[i - 1].count : stage.count;
                  const dropOff = prevCount > 0 && i > 0 ? Math.round(((prevCount - stage.count) / prevCount) * 100) : null;
                  return (
                    <div key={stage.label} className="rounded-xl border border-border bg-background p-5">
                      <div className="flex items-center justify-between mb-3 gap-4">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-white text-xs font-bold ${stage.color}`}>{i + 1}</span>
                          <span className="text-body-sm font-medium text-foreground">{stage.label}</span>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <span className="font-heading text-h3 text-foreground">{stage.count}</span>
                          <span className="text-body-sm text-muted-foreground w-12">{pct}%</span>
                          {dropOff !== null && dropOff > 0 && (
                            <span className="text-caption text-error">−{dropOff}%</span>
                          )}
                        </div>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div className={`h-3 rounded-full transition-all ${stage.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Rates summary */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Qualification rate", value: `${qualificationRate}%`, sub: "Leads → Qualified", color: "text-primary" },
              { label: "Quote rate", value: `${quoteRate}%`, sub: "Leads → Quote sent", color: "text-purple-600" },
              { label: "Deposit rate", value: `${depositRate}%`, sub: "Leads → Deposit paid", color: "text-green-600" },
              { label: "Show rate", value: `${showRate}%`, sub: "Deposits → Completed", color: "text-accent-foreground" },
            ].map((m) => (
              <Card key={m.label} className="border-border bg-card p-5 text-center">
                <p className="text-body-sm text-muted-foreground">{m.label}</p>
                <p className={`mt-2 font-heading text-[32px] leading-tight ${m.color}`}>{m.value}</p>
                <p className="text-caption text-muted-foreground mt-1">{m.sub}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Revenue tab ── */}
      {activeTab === "revenue" && (
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Revenue KPIs */}
          <div className="xl:col-span-2 grid gap-4 sm:grid-cols-4">
            <Card className="border-border bg-card p-5">
              <p className="text-body-sm text-muted-foreground">Total collected</p>
              <p className="mt-2 font-heading text-[26px] text-foreground">€{totalCollected.toLocaleString()}</p>
            </Card>
            <Card className="border-border bg-card p-5">
              <p className="text-body-sm text-muted-foreground">Net revenue</p>
              <p className="mt-2 font-heading text-[26px] text-foreground">€{netRevenue.toLocaleString()}</p>
            </Card>
            <Card className="border-border bg-card p-5">
              <p className="text-body-sm text-muted-foreground">Deposits collected</p>
              <p className="mt-2 font-heading text-[26px] text-foreground">€{depositsCollected.toLocaleString()}</p>
            </Card>
            <Card className={`border p-5 ${totalRefunded > 0 ? "border-error/30 bg-error/5" : "border-border bg-card"}`}>
              <p className="text-body-sm text-muted-foreground">Total refunded</p>
              <p className={`mt-2 font-heading text-[26px] ${totalRefunded > 0 ? "text-error" : "text-foreground"}`}>€{totalRefunded.toLocaleString()}</p>
            </Card>
          </div>

          {/* Revenue by service */}
          <Card className="border-border bg-card p-6 space-y-4">
            <h3 className="font-heading text-h4 text-foreground">Revenue by service</h3>
            {quotesLoading ? <LoadingSpinner label="Loading…" /> : revenueByService.length === 0 ? (
              <EmptyState message="No approved quotes yet." />
            ) : (
              <div className="space-y-4">
                {revenueByService.map(([svc, amt]) => {
                  const total = revenueByService.reduce((s, r) => s + r[1], 0) || 1;
                  const pct = Math.round((amt / total) * 100);
                  return (
                    <div key={svc}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-body-sm font-medium text-foreground">{svc}</span>
                        <span className="text-body-sm text-muted-foreground">€{amt.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div className={`h-3 rounded-full transition-all ${svc.includes("Hair") ? "bg-purple-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Revenue by payment method */}
          <Card className="border-border bg-card p-6 space-y-4">
            <h3 className="font-heading text-h4 text-foreground">Revenue by payment method</h3>
            {paymentsLoading ? <LoadingSpinner label="Loading…" /> : revenueByMethod.length === 0 ? (
              <EmptyState message="No payment data yet." />
            ) : (
              <div className="space-y-4">
                {revenueByMethod.map(([method, amt]) => {
                  const total = revenueByMethod.reduce((s, r) => s + r[1], 0) || 1;
                  const pct = Math.round((amt / total) * 100);
                  const methodColors: Record<string, string> = {
                    "Card": "bg-blue-500",
                    "Cash": "bg-green-500",
                    "Bank Transfer": "bg-primary",
                    "Wise": "bg-teal-500",
                    "PayPal": "bg-yellow-500",
                    "Crypto": "bg-orange-500",
                  };
                  return (
                    <div key={method}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-body-sm font-medium text-foreground">{method}</span>
                        <span className="text-body-sm text-muted-foreground">€{amt.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div className={`h-3 rounded-full transition-all ${methodColors[method] ?? "bg-accent"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Monthly breakdown table */}
          <Card className="border-border bg-card p-6 space-y-4 xl:col-span-2">
            <h3 className="font-heading text-h4 text-foreground">Monthly revenue breakdown</h3>
            {paymentsLoading ? <LoadingSpinner label="Loading…" /> : revenueByMonth.length === 0 ? (
              <EmptyState message="No payment history yet." />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-body-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left">
                      <th className="px-4 py-3 text-muted-foreground font-medium">Month</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium text-right">Revenue</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium">Bar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {revenueByMonth.map(([month, amt]) => {
                      const pct = Math.round((amt / maxMonthRevenue) * 100);
                      return (
                        <tr key={month} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium text-foreground">{month}</td>
                          <td className="px-4 py-3 text-right font-medium text-foreground">€{amt.toLocaleString()}</td>
                          <td className="px-4 py-3 w-48">
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Sources tab ── */}
      {activeTab === "sources" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="border-border bg-card p-6 space-y-5 xl:col-span-2">
            <div>
              <h3 className="font-heading text-h3 text-foreground">Leads by source</h3>
              <p className="text-body-sm text-muted-foreground mt-1">Which channels are driving the most enquiries.</p>
            </div>
            {leadsLoading ? <LoadingSpinner label="Loading…" /> : leadsBySource.length === 0 ? (
              <EmptyState message="No lead source data yet." />
            ) : (
              <div className="space-y-4">
                {leadsBySource.map(([source, count]) => {
                  const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
                  return (
                    <div key={source} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <SourceBadge source={source} />
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-heading text-h4 text-foreground">{count}</span>
                          <span className="text-body-sm text-muted-foreground w-10 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Source conversion proxy */}
          <Card className="border-border bg-card p-6 space-y-4">
            <h3 className="font-heading text-h4 text-foreground">Deposit rate by source</h3>
            <p className="text-body-sm text-muted-foreground">Leads from each source that reached Deposit Paid stage.</p>
            {leadsLoading ? <LoadingSpinner label="Loading…" /> : (
              <div className="space-y-3">
                {leadsBySource.slice(0, 6).map(([source, total]) => {
                  const deposited = filteredLeads.filter((l) => l.source === source && l.stage === "Deposit Paid").length;
                  const rate = total > 0 ? Math.round((deposited / total) * 100) : 0;
                  return (
                    <div key={source}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-body-sm text-foreground truncate max-w-[160px]">{source}</span>
                        <span className="text-body-sm text-muted-foreground">{deposited}/{total} · {rate}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${rate}%` }} />
                      </div>
                    </div>
                  );
                })}
                {leadsBySource.length === 0 && <p className="text-body-sm text-muted-foreground italic">No data.</p>}
              </div>
            )}
          </Card>

          {/* HOT leads by source */}
          <Card className="border-border bg-card p-6 space-y-4">
            <h3 className="font-heading text-h4 text-foreground">High-urgency leads by source</h3>
            <p className="text-body-sm text-muted-foreground">HOT urgency distribution across channels.</p>
            {leadsLoading ? <LoadingSpinner label="Loading…" /> : (() => {
              const hotBySource: Record<string, number> = {};
              filteredLeads.filter((l) => l.urgencyLevel === "High").forEach((l) => {
                hotBySource[l.source] = (hotBySource[l.source] ?? 0) + 1;
              });
              const sorted = Object.entries(hotBySource).sort((a, b) => b[1] - a[1]);
              const maxHot = sorted[0]?.[1] || 1;
              return sorted.length === 0 ? (
                <p className="text-body-sm text-muted-foreground italic">No high-urgency leads.</p>
              ) : (
                <div className="space-y-3">
                  {sorted.map(([source, count]) => {
                    const pct = Math.round((count / maxHot) * 100);
                    return (
                      <div key={source}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-body-sm text-foreground truncate max-w-[160px]">{source}</span>
                          <span className="text-body-sm font-medium text-error">{count} HOT</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-2 rounded-full bg-error transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Card>
        </div>
      )}

      {/* ── Agents tab ── */}
      {activeTab === "agents" && (
        <div className="space-y-6">
          <Card className="border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="font-heading text-h3 text-foreground">Agent performance</h3>
              <p className="text-body-sm text-muted-foreground mt-1">Lead volume, deposit conversion, and lost rate per assigned agent.</p>
            </div>
            {leadsLoading ? <LoadingSpinner label="Loading…" /> : agentPerf.length === 0 ? (
              <EmptyState message="No agent assignment data yet. Assign leads to agents to see metrics." />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-body-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left">
                      <th className="px-4 py-3 text-muted-foreground font-medium">Agent</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium text-center">Leads</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium text-center">Deposits</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium text-center">Lost</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium text-center">Deposit rate</th>
                      <th className="px-4 py-3 text-muted-foreground font-medium">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {agentPerf.map((row) => (
                      <tr key={row.agent} className="hover:bg-muted/20">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-tertiary text-sm font-bold text-tertiary-foreground border border-border">
                              {row.agent.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-foreground">{row.agent}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center font-medium text-foreground">{row.leads}</td>
                        <td className="px-4 py-4 text-center font-medium text-green-600">{row.deposits}</td>
                        <td className="px-4 py-4 text-center font-medium text-error">{row.lost}</td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                            row.rate >= 50 ? "bg-green-100 text-green-800" :
                            row.rate >= 25 ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }`}>{row.rate}%</span>
                        </td>
                        <td className="px-4 py-4 w-36">
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-2 rounded-full transition-all ${row.rate >= 50 ? "bg-green-500" : row.rate >= 25 ? "bg-yellow-500" : "bg-error"}`} style={{ width: `${Math.min(100, row.rate * 2)}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Lost rate context */}
          <Card className="border-border bg-card p-6 space-y-4">
            <h3 className="font-heading text-h4 text-foreground">Pipeline health</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Active leads", value: filteredLeads.filter((l) => l.status === "Active").length, color: "text-primary" },
                { label: "Lost leads", value: lostLeads, color: "text-error" },
                { label: "Loss rate", value: `${lostRate}%`, color: lostRate > 30 ? "text-error" : "text-foreground" },
              ].map((m) => (
                <div key={m.label} className="rounded-lg border border-border bg-background p-4 text-center">
                  <p className="text-body-sm text-muted-foreground">{m.label}</p>
                  <p className={`mt-2 font-heading text-[28px] leading-tight ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function ReportKpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="kpi-card">
      <div className={`kpi-card-accent ${color}`} />
      <p className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-1.5 font-heading text-[26px] leading-tight text-foreground font-semibold">{value}</p>
      <p className="text-[11.5px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function LeadList({
  leads,
  onSelect,
  selectedId,
}: {
  leads: { id: string; name: string; country?: string; source: string; service: string; stage: string; urgencyLevel?: string }[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  return (
    <div className="space-y-4">
      {leads.map((lead) => {
        const img = serviceImage(lead.service);
        return (
          <button
            key={lead.id}
            type="button"
            onClick={() => onSelect(lead.id)}
            className={`w-full rounded-lg border p-4 text-left transition-colors ${
              selectedId === lead.id
                ? "border-primary bg-tertiary/30"
                : "border-border bg-background hover:border-primary"
            }`}
            aria-label={`Open lead ${lead.name}`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className="h-20 w-full rounded-lg border border-border object-cover lg:w-28"
              />
              <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-4">
                <div>
                  <p className="font-mono text-caption text-muted-foreground">
                    {lead.id.slice(0, 8)}
                  </p>
                  <p className="text-body font-medium text-foreground">
                    {lead.name}
                  </p>
                </div>
                <div>
                  <p className="text-body-sm text-foreground">
                    {lead.country ?? "—"}
                  </p>
                  <p className="text-body-sm text-muted-foreground">
                    {lead.source}
                  </p>
                </div>
                <div>
                  <p className="text-body-sm text-foreground">{lead.service}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={lead.stage} />
                  {lead.urgencyLevel && (
                    <UrgencyBadge value={lead.urgencyLevel} />
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function LeadKanban({
  leads,
  onSelect,
}: {
  leads: { id: string; name: string; service: string; stage: string; urgencyLevel?: string }[];
  onSelect: (id: string) => void;
}) {
  const columns = ["New Lead", "Qualified", "Doctor Review", "Quote Sent", "Deposit Paid"];
  return (
    <div className="grid gap-4 xl:grid-cols-5">
      {columns.map((col) => {
        const colLeads = leads.filter((l) => l.stage === col);
        return (
          <div key={col} className="rounded-lg border border-border bg-muted p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-body font-medium text-foreground">{col}</h3>
              <Badge className="bg-background text-foreground">
                {colLeads.length}
              </Badge>
            </div>
            <div className="space-y-3">
              {colLeads.length === 0 ? (
                <p className="text-caption text-muted-foreground">
                  No leads in this stage
                </p>
              ) : (
                colLeads.map((lead) => {
                  const img = serviceImage(lead.service);
                  return (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => onSelect(lead.id)}
                      className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary"
                    >
                      <img
                        src={img.src}
                        alt={img.alt}
                        loading="lazy"
                        className="mb-3 h-24 w-full rounded-lg border border-border object-cover"
                      />
                      <p className="text-body font-medium text-foreground">
                        {lead.name}
                      </p>
                      <p className="mt-1 text-body-sm text-muted-foreground">
                        {lead.service}
                      </p>
                      {lead.urgencyLevel && (
                        <div className="mt-2">
                          <UrgencyBadge value={lead.urgencyLevel} />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeadDetails({ lead }: { lead: { id: string; name: string; service: string; source: string; country?: string; stage: string; urgencyLevel?: string; notes?: string; budgetRange?: string; travelWindow?: string } }) {
  const img = serviceImage(lead.service);
  return (
    <div className="space-y-6">
      <img
        src={img.src}
        alt={img.alt}
        loading="lazy"
        className="h-44 w-full rounded-lg border border-border object-cover"
      />
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={lead.stage} />
          {lead.urgencyLevel && <UrgencyBadge value={lead.urgencyLevel} />}
        </div>
        <p className="font-mono text-caption text-muted-foreground">
          ID: {lead.id.slice(0, 8)}
        </p>
        <p className="text-body-sm text-foreground">Service: {lead.service}</p>
        <p className="text-body-sm text-foreground">Source: {lead.source}</p>
        {lead.country && (
          <p className="text-body-sm text-foreground">Country: {lead.country}</p>
        )}
        {lead.budgetRange && (
          <p className="text-body-sm text-foreground">
            Budget: {lead.budgetRange}
          </p>
        )}
        {lead.travelWindow && (
          <p className="text-body-sm text-foreground">
            Travel window: {lead.travelWindow}
          </p>
        )}
        {lead.notes && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-body-sm text-foreground">{lead.notes}</p>
          </div>
        )}
      </div>
      <Separator className="bg-border" />
      <div className="space-y-4">
        <h3 className="font-heading text-h4 text-foreground">Activity timeline</h3>
        <TimelineItem
          title="Lead created"
          time="Origin"
          description={`Captured via ${lead.source}`}
        />
        <TimelineItem
          title="Stage: " 
          time="Current"
          description={lead.stage}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button className="bg-primary text-primary-foreground hover:bg-primary-hover">
          <ClipboardText size={16} weight="regular" />
          Create Quote
        </Button>
        <Button
          variant="outline"
          className="border-primary bg-background text-primary hover:bg-tertiary hover:text-primary"
        >
          <CheckCircle size={16} weight="regular" />
          Add Task
        </Button>
      </div>
    </div>
  );
}

// ─── Quote / Treatment Plan Builder ──────────────────────────────────────────

const CURRENCIES = ["EUR", "GBP", "USD", "ALL"] as const;
type Currency = (typeof CURRENCIES)[number];

const CROWN_TYPES = ["Zirconia", "E-max", "PFM (Porcelain-Fused-Metal)", "Full Metal", "Temporary"];
const HAIR_TECHNIQUES = ["FUE", "DHI", "Sapphire FUE", "Unshaven FUE"];
const DENTAL_BASE_PRICES: Record<string, number> = {
  implant: 800,
  crown: 350,
  veneer: 450,
};
const HAIR_BASE_PRICES: Record<string, number> = {
  graftFUE: 1.5,
  graftDHI: 2.0,
};

const HAIR_PACKAGES = [
  { id: "hotel", label: "Hotel (3 nights)", price: 180 },
  { id: "transfer", label: "Airport transfer", price: 40 },
  { id: "prp", label: "PRP treatment", price: 150 },
  { id: "vitamins", label: "Hair vitamin kit", price: 60 },
  { id: "cap", label: "Post-op care cap", price: 25 },
];

const DENTAL_PACKAGES = [
  { id: "hotel", label: "Hotel (3 nights)", price: 180 },
  { id: "transfer", label: "Airport transfer", price: 40 },
  { id: "xray", label: "OPG X-ray", price: 50 },
  { id: "whitening", label: "Whitening top-up", price: 120 },
  { id: "nightguard", label: "Night guard", price: 80 },
];

type QuoteService = "Dental" | "Hair" | "Other";

interface QuoteFormState {
  patientId: string;
  service: QuoteService;
  customServiceName: string;
  currency: Currency;
  // dental fields
  implantCount: number;
  crownType: string;
  crownCount: number;
  veneerCount: number;
  // hair fields
  graftMin: number;
  graftMax: number;
  technique: string;
  // other service fields
  customDescription: string;
  customBasePrice: number;
  // shared add-ons
  includedPackages: string[];
  // pricing
  basePrice: number;
  discountPct: number;
  depositPct: number;
  validityDays: number;
  notes: string;
  status: string;
}

function calcDentalBase(form: QuoteFormState): number {
  return (
    form.implantCount * DENTAL_BASE_PRICES.implant +
    form.crownCount * DENTAL_BASE_PRICES.crown +
    form.veneerCount * DENTAL_BASE_PRICES.veneer
  );
}

function calcHairBase(form: QuoteFormState): number {
  const pricePerGraft =
    form.technique === "DHI" ? HAIR_BASE_PRICES.graftDHI : HAIR_BASE_PRICES.graftFUE;
  const avgGrafts = Math.round((form.graftMin + form.graftMax) / 2);
  return avgGrafts * pricePerGraft;
}

function calcPackageTotal(form: QuoteFormState): number {
  const pkgs = form.service === "Hair" ? HAIR_PACKAGES : DENTAL_PACKAGES;
  return pkgs
    .filter((p) => form.includedPackages.includes(p.id))
    .reduce((s, p) => s + p.price, 0);
}

function calcTotals(form: QuoteFormState) {
  const procedureBase =
    form.service === "Dental"
      ? calcDentalBase(form)
      : form.service === "Hair"
        ? calcHairBase(form)
        : form.customBasePrice;
  const packageTotal = calcPackageTotal(form);
  const subtotal = procedureBase + packageTotal;
  const discountAmt = Math.round(subtotal * (form.discountPct / 100));
  const discountedPrice = subtotal - discountAmt;
  const depositAmount = Math.round(discountedPrice * (form.depositPct / 100));
  return { procedureBase, packageTotal, subtotal, discountAmt, discountedPrice, depositAmount };
}

const CURRENCY_RATES: Record<Currency, number> = { EUR: 1, GBP: 0.86, USD: 1.09, ALL: 107 };
function convertCurrency(eurAmount: number, currency: Currency): number {
  return Math.round(eurAmount * CURRENCY_RATES[currency]);
}

function QuoteBuilderForm({
  patients,
  initialPatientId,
  onSaved,
  onCancel,
  userId,
}: {
  patients: { id: string; fullName: string }[];
  initialPatientId?: string;
  onSaved: () => void;
  onCancel: () => void;
  userId?: string | null;
}) {
  const { create, isPending, error } = useMutation("Quote");
  const { create: createService } = useMutation("Service");
  const { data: existingServices } = useQuery("Service", {
    where: userId ? { createdByUserId: userId } : undefined,
  });
  const [form, setForm] = useState<QuoteFormState>({
    patientId: initialPatientId ?? (patients[0]?.id ?? ""),
    service: "Dental",
    customServiceName: "",
    currency: "EUR",
    implantCount: 0,
    crownType: CROWN_TYPES[0],
    crownCount: 0,
    veneerCount: 0,
    graftMin: 2000,
    graftMax: 3000,
    technique: "FUE",
    customDescription: "",
    customBasePrice: 0,
    includedPackages: ["hotel", "transfer"],
    basePrice: 0,
    discountPct: 0,
    depositPct: 30,
    validityDays: 30,
    notes: "",
    status: "Draft",
  });

  const set = <K extends keyof QuoteFormState>(k: K, v: QuoteFormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const totals = calcTotals(form);
  const displayPrice = (eurAmt: number) => convertCurrency(eurAmt, form.currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) return;
    const { discountedPrice, depositAmount } = totals;
    const totalEur = totals.subtotal;
    try {
      const serviceLabel =
        form.service === "Dental"
          ? `Dental Tourism — ${form.implantCount} implants, ${form.crownCount} crowns (${form.crownType}), ${form.veneerCount} veneers`
          : form.service === "Hair"
            ? `Hair Transplant — ${form.graftMin}–${form.graftMax} grafts · ${form.technique}`
            : `${form.customServiceName || "Other Service"}${form.customDescription ? ` — ${form.customDescription}` : ""}`;

      // ── Save new "Other" service to DB if it doesn&#39;t already exist ──
      if (form.service === "Other" && form.customServiceName.trim()) {
        const alreadyExists = (existingServices ?? []).some(
          (s) => s.name.trim().toLowerCase() === form.customServiceName.trim().toLowerCase()
        );
        if (!alreadyExists) {
          try {
            await createService({
              name: form.customServiceName.trim(),
              description: form.customDescription.trim() || undefined,
              icon: "➕",
              color: "teal",
              isActive: true,
              pipelineType: "custom",
            });
          } catch (svcErr) {
            console.error("Failed to save custom service:", svcErr);
          }
        }
      }

      await create({
        patientId: form.patientId,
        service: serviceLabel,
        totalPrice: displayPrice(totalEur),
        discountedPrice: displayPrice(discountedPrice),
        depositAmount: displayPrice(depositAmount),
        currency: form.currency,
        validityDate: new Date(Date.now() + form.validityDays * 86400000),
        status: form.status,
      });
      onSaved();
    } catch (err) {
      console.error("Failed to create quote:", err);
    }
  };

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "mb-1 block text-body-sm font-medium text-foreground";
  const pkgs = form.service === "Hair" ? HAIR_PACKAGES : DENTAL_PACKAGES;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Patient + Service selector ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Patient</label>
          <select
            value={form.patientId}
            onChange={(e) => set("patientId", e.target.value)}
            className={inputClass}
            required
          >
            {patients.length === 0 && <option value="">No patients yet</option>}
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.fullName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Currency</label>
          <select
            value={form.currency}
            onChange={(e) => set("currency", e.target.value as Currency)}
            className={inputClass}
          >
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* ── Service type toggle ── */}
      <div>
        <label className={labelClass}>Treatment type</label>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => set("service", "Dental")}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 font-medium text-body-sm transition-all ${
              form.service === "Dental"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-border bg-background text-muted-foreground hover:border-primary"
            }`}
          >
            <Tooth size={18} />
            <span className="truncate">Dental</span>
          </button>
          <button
            type="button"
            onClick={() => set("service", "Hair")}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 font-medium text-body-sm transition-all ${
              form.service === "Hair"
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-border bg-background text-muted-foreground hover:border-primary"
            }`}
          >
            <UserCircle size={18} />
            <span className="truncate">Hair</span>
          </button>
          <button
            type="button"
            onClick={() => set("service", "Other")}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 font-medium text-body-sm transition-all ${
              form.service === "Other"
                ? "border-teal-500 bg-teal-50 text-teal-700"
                : "border-dashed border-border bg-background text-muted-foreground hover:border-primary"
            }`}
          >
            <PlusCircle size={18} />
            <span className="truncate">Other</span>
          </button>
        </div>
      </div>

      {/* ── Dental fields ── */}
      {form.service === "Dental" && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 space-y-4">
          <h3 className="flex items-center gap-2 font-heading text-h4 text-blue-800">
            <Tooth size={16} /> Dental Treatment Plan
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Implants</label>
              <input
                type="number"
                min={0}
                max={32}
                value={form.implantCount}
                onChange={(e) => set("implantCount", Number(e.target.value))}
                className={inputClass}
              />
              <p className="mt-1 text-caption text-muted-foreground">€{DENTAL_BASE_PRICES.implant} / implant</p>
            </div>
            <div>
              <label className={labelClass}>Veneers</label>
              <input
                type="number"
                min={0}
                max={20}
                value={form.veneerCount}
                onChange={(e) => set("veneerCount", Number(e.target.value))}
                className={inputClass}
              />
              <p className="mt-1 text-caption text-muted-foreground">€{DENTAL_BASE_PRICES.veneer} / veneer</p>
            </div>
            <div>
              <label className={labelClass}>Crowns</label>
              <input
                type="number"
                min={0}
                max={32}
                value={form.crownCount}
                onChange={(e) => set("crownCount", Number(e.target.value))}
                className={inputClass}
              />
              <p className="mt-1 text-caption text-muted-foreground">€{DENTAL_BASE_PRICES.crown} / crown</p>
            </div>
          </div>
          <div>
            <label className={labelClass}>Crown type</label>
            <select
              value={form.crownType}
              onChange={(e) => set("crownType", e.target.value)}
              className={inputClass}
            >
              {CROWN_TYPES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── Other / Custom service fields ── */}
      {form.service === "Other" && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-5 space-y-4">
          <h3 className="flex items-center gap-2 font-heading text-h4 text-teal-800">
            <PlusCircle size={16} /> Custom Service Plan
          </h3>
          <div>
            <label className={labelClass}>Service name *</label>
            <input
              value={form.customServiceName}
              onChange={(e) => set("customServiceName", e.target.value)}
              className={inputClass}
              placeholder="e.g. Rhinoplasty, Liposuction, Eye Surgery…"
              required={form.service === "Other"}
            />
          </div>
          <div>
            <label className={labelClass}>Treatment description</label>
            <textarea
              value={form.customDescription}
              onChange={(e) => set("customDescription", e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="Describe the procedure, technique, or specific details…"
            />
          </div>
          <div>
            <label className={labelClass}>Base price ({form.currency})</label>
            <input
              type="number"
              min={0}
              step={50}
              value={form.customBasePrice}
              onChange={(e) => set("customBasePrice", Number(e.target.value))}
              className={inputClass}
              placeholder="e.g. 2500"
            />
            <p className="mt-1 text-caption text-muted-foreground">Enter the total procedure price before any add-ons or discounts.</p>
          </div>
        </div>
      )}

      {/* ── Hair fields ── */}
      {form.service === "Hair" && (
        <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-5 space-y-4">
          <h3 className="flex items-center gap-2 font-heading text-h4 text-purple-800">
            <UserCircle size={16} /> Hair Transplant Plan
          </h3>
          <div>
            <label className={labelClass}>Technique</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {HAIR_TECHNIQUES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("technique", t)}
                  className={`rounded-full border px-3 py-1.5 text-body-sm transition-all ${
                    form.technique === t
                      ? "border-purple-500 bg-purple-100 text-purple-700 font-medium"
                      : "border-border bg-background text-muted-foreground hover:border-primary"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Graft range — min</label>
              <input
                type="number"
                min={500}
                max={8000}
                step={100}
                value={form.graftMin}
                onChange={(e) => set("graftMin", Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Graft range — max</label>
              <input
                type="number"
                min={500}
                max={8000}
                step={100}
                value={form.graftMax}
                onChange={(e) => set("graftMax", Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>
          <p className="text-caption text-muted-foreground">
            Rate: €{form.technique === "DHI" ? HAIR_BASE_PRICES.graftDHI : HAIR_BASE_PRICES.graftFUE}/graft ·
            Avg grafts: {Math.round((form.graftMin + form.graftMax) / 2).toLocaleString()}
          </p>
        </div>
      )}

      {/* ── Package inclusions ── */}
      <div>
        <label className={labelClass}>Package inclusions</label>
        <div className="grid gap-2 sm:grid-cols-2 mt-1">
          {pkgs.map((pkg) => {
            const checked = form.includedPackages.includes(pkg.id);
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() =>
                  set(
                    "includedPackages",
                    checked
                      ? form.includedPackages.filter((x) => x !== pkg.id)
                      : [...form.includedPackages, pkg.id]
                  )
                }
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-body-sm transition-all ${
                  checked
                    ? "border-primary/40 bg-primary/5 text-foreground font-medium"
                    : "border-border bg-background text-muted-foreground hover:border-primary"
                }`}
              >
                <span>{pkg.label}</span>
                <span className={checked ? "text-primary font-medium" : "text-muted-foreground"}>
                  +€{pkg.price}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Pricing controls ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Discount %</label>
          <input
            type="number"
            min={0}
            max={50}
            value={form.discountPct}
            onChange={(e) => set("discountPct", Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Deposit %</label>
          <input
            type="number"
            min={10}
            max={100}
            value={form.depositPct}
            onChange={(e) => set("depositPct", Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Valid for (days)</label>
          <input
            type="number"
            min={1}
            max={90}
            value={form.validityDays}
            onChange={(e) => set("validityDays", Number(e.target.value))}
            className={inputClass}
          />
        </div>
      </div>

      {/* ── Live price summary ── */}
      <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-3">
        <h3 className="font-heading text-h4 text-foreground">Live price summary</h3>
        <div className="space-y-2">
          <PriceLine label="Procedure base" value={displayPrice(totals.procedureBase)} currency={form.currency} muted />
          <PriceLine label="Package add-ons" value={displayPrice(totals.packageTotal)} currency={form.currency} muted />
          <div className="border-t border-border pt-2">
            <PriceLine label="Subtotal" value={displayPrice(totals.subtotal)} currency={form.currency} />
          </div>
          {form.discountPct > 0 && (
            <PriceLine label={`Discount (${form.discountPct}%)`} value={-displayPrice(totals.discountAmt)} currency={form.currency} danger />
          )}
          <div className="border-t border-border pt-2">
            <PriceLine label="Total after discount" value={displayPrice(totals.discountedPrice)} currency={form.currency} bold />
          </div>
          <PriceLine label={`Deposit required (${form.depositPct}%)`} value={displayPrice(totals.depositAmount)} currency={form.currency} highlight />
        </div>
        <p className="text-caption text-muted-foreground">
          ⏱ Valid until {new Date(Date.now() + form.validityDays * 86400000).toLocaleDateString()} · {form.currency}
          {form.currency !== "EUR" && <span className="ml-1">(base rates in EUR)</span>}
        </p>
      </div>

      {/* ── Notes ── */}
      <div>
        <label className={labelClass}>Internal notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Doctor recommendations, negotiation notes, special inclusions..."
        />
      </div>

      {/* ── Status + submit ── */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-body-sm text-foreground">Status:</label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option>Draft</option>
            <option>Sent</option>
            <option>Approved</option>
          </select>
        </div>
        <div className="flex gap-3 flex-1 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-border bg-background text-foreground hover:bg-tertiary"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending || !form.patientId || (form.service !== "Other" && totals.subtotal === 0) || (form.service === "Other" && (!form.customServiceName.trim() || form.customBasePrice <= 0))}
            className="bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            {isPending ? <Spinner size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            {isPending ? "Saving..." : `Save Quote · ${form.currency} ${displayPrice(totals.discountedPrice).toLocaleString()}`}
          </Button>
        </div>
      </div>
      {error && (
        <p className="rounded-lg bg-error/10 px-3 py-2 text-body-sm text-error">{error.message}</p>
      )}
    </form>
  );
}

function PriceLine({
  label,
  value,
  currency,
  muted,
  bold,
  highlight,
  danger,
}: {
  label: string;
  value: number;
  currency: string;
  muted?: boolean;
  bold?: boolean;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`text-body-sm ${muted ? "text-muted-foreground" : "text-foreground"}`}>{label}</span>
      <span className={`text-body-sm font-medium ${danger ? "text-error" : highlight ? "text-primary" : bold ? "text-foreground" : "text-foreground"} ${bold ? "text-base font-bold" : ""}`}>
        {value < 0 ? `-${currency} ${Math.abs(value).toLocaleString()}` : `${currency} ${value.toLocaleString()}`}
      </span>
    </div>
  );
}

function QuoteVersionHistory({
  quotes,
}: {
  quotes: {
    id: string;
    service: string;
    totalPrice: number;
    discountedPrice?: number;
    depositAmount: number;
    currency: string;
    status: string;
    validityDate: Date;
    createdAt: Date;
  }[];
}) {
  if (quotes.length === 0) {
    return <p className="text-body-sm text-muted-foreground italic">No previous versions for this patient.</p>;
  }
  return (
    <div className="space-y-3">
      {quotes.map((q, idx) => (
        <div key={q.id} className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="text-body-sm font-medium text-foreground">
                v{quotes.length - idx} · {q.service.split(" — ")[0]}
              </p>
              <p className="text-caption text-muted-foreground font-mono">#{q.id.slice(0, 8)}</p>
              {q.service.includes(" — ") && (
                <p className="text-caption text-muted-foreground">{q.service.split(" — ")[1]}</p>
              )}
            </div>
            <QuoteStatusBadge status={q.status} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-body-sm">
            <div>
              <p className="text-caption text-muted-foreground">Total</p>
              <p className="text-foreground font-medium">{q.currency} {q.totalPrice.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-caption text-muted-foreground">Deposit</p>
              <p className="text-foreground">{q.currency} {q.depositAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-caption text-muted-foreground">Valid until</p>
              <p className="text-foreground">{new Date(q.validityDate).toLocaleDateString()}</p>
            </div>
          </div>
          <p className="mt-2 text-caption text-muted-foreground">
            Created {new Date(q.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

function QuoteDrawer() {
  return (
    <div className="space-y-4 text-center py-8">
      <ClipboardText size={40} className="mx-auto text-muted-foreground" />
      <p className="text-body-sm text-muted-foreground">Select a patient from the quotes list to view the builder, or click &ldquo;New Quote&rdquo; above.</p>
    </div>
  );
}

// ─── Travel Module ────────────────────────────────────────────────────────────

function TravelModule({
  patients,
  patientsLoading,
  userId,
}: {
  patients: { id: string; fullName: string; status: string }[];
  patientsLoading: boolean;
  userId: string | null;
}) {
  const { data: travelRecords, isPending: travelLoading } = useQuery("TravelRecord", {
    where: userId ? { createdByUserId: userId } : undefined,
    orderBy: { arrivalDate: "asc" },
    limit: 100,
  });
  const { create, update, isPending: mutating } = useMutation("TravelRecord");

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const patientMap = useMemo(() => {
    const m: Record<string, string> = {};
    patients.forEach((p) => { m[p.id] = p.fullName; });
    return m;
  }, [patients]);

  const [form, setForm] = useState({
    patientId: "",
    arrivalDate: "",
    departureDate: "",
    airport: "",
    pickupStatus: "Pending",
    hotelName: "",
    companionCount: 0,
  });

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) return;
    try {
      await create({
        patientId: form.patientId,
        arrivalDate: form.arrivalDate ? new Date(form.arrivalDate) : undefined,
        departureDate: form.departureDate ? new Date(form.departureDate) : undefined,
        airport: form.airport || undefined,
        pickupStatus: form.pickupStatus,
        hotelName: form.hotelName || undefined,
        companionCount: form.companionCount,
      });
      setShowForm(false);
      setForm({ patientId: "", arrivalDate: "", departureDate: "", airport: "", pickupStatus: "Pending", hotelName: "", companionCount: 0 });
    } catch (err) {
      console.error("Failed to create travel record:", err);
    }
  };

  const upcoming = (travelRecords ?? []).filter((r) => r.arrivalDate && new Date(r.arrivalDate) >= new Date());
  const past = (travelRecords ?? []).filter((r) => r.arrivalDate && new Date(r.arrivalDate) < new Date());

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border bg-card p-5">
          <p className="text-body-sm text-muted-foreground">Total travel records</p>
          <p className="mt-2 font-heading text-[26px] text-foreground">{(travelRecords ?? []).length}</p>
        </Card>
        <Card className="border-border bg-card p-5">
          <p className="text-body-sm text-muted-foreground">Upcoming arrivals</p>
          <p className="mt-2 font-heading text-[26px] text-primary">{upcoming.length}</p>
        </Card>
        <Card className="border-border bg-card p-5">
          <p className="text-body-sm text-muted-foreground">Pickup confirmed</p>
          <p className="mt-2 font-heading text-[26px] text-foreground">
            {(travelRecords ?? []).filter((r) => r.pickupStatus === "Confirmed").length}
          </p>
        </Card>
        <Card className="border-border bg-card p-5">
          <p className="text-body-sm text-muted-foreground">Pickup pending</p>
          <p className="mt-2 font-heading text-[26px] text-warning">
            {(travelRecords ?? []).filter((r) => r.pickupStatus === "Pending").length}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left: travel records list */}
        <Card className="border-border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-h3 text-foreground">Travel Coordination</h2>
              <p className="text-body-sm text-muted-foreground mt-1">Arrivals, hotels, pickups &amp; companion info.</p>
            </div>
            <Button className="bg-primary text-primary-foreground hover:bg-primary-hover" onClick={() => setShowForm(true)}>
              <AirplaneTakeoff size={16} />
              Add Travel Record
            </Button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
              <h3 className="font-heading text-h4 text-foreground">New Travel Record</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-body-sm font-medium text-foreground">Patient *</label>
                  <select value={form.patientId} onChange={(e) => setForm((p) => ({ ...p, patientId: e.target.value }))} className={inputClass} required>
                    <option value="">Select patient…</option>
                    {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-body-sm font-medium text-foreground">Arrival date</label>
                  <input type="date" value={form.arrivalDate} onChange={(e) => setForm((p) => ({ ...p, arrivalDate: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-body-sm font-medium text-foreground">Departure date</label>
                  <input type="date" value={form.departureDate} onChange={(e) => setForm((p) => ({ ...p, departureDate: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-body-sm font-medium text-foreground">Airport</label>
                  <input value={form.airport} onChange={(e) => setForm((p) => ({ ...p, airport: e.target.value }))} className={inputClass} placeholder="e.g. TIA - Tirana" />
                </div>
                <div>
                  <label className="mb-1 block text-body-sm font-medium text-foreground">Pickup status</label>
                  <select value={form.pickupStatus} onChange={(e) => setForm((p) => ({ ...p, pickupStatus: e.target.value }))} className={inputClass}>
                    {["Pending", "Confirmed", "Completed", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-body-sm font-medium text-foreground">Hotel name</label>
                  <input value={form.hotelName} onChange={(e) => setForm((p) => ({ ...p, hotelName: e.target.value }))} className={inputClass} placeholder="e.g. Tirana International" />
                </div>
                <div>
                  <label className="mb-1 block text-body-sm font-medium text-foreground">Companions</label>
                  <input type="number" min={0} value={form.companionCount} onChange={(e) => setForm((p) => ({ ...p, companionCount: Number(e.target.value) }))} className={inputClass} />
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={mutating || !form.patientId} className="bg-primary text-primary-foreground hover:bg-primary-hover">
                  {mutating ? <Spinner size={14} className="animate-spin" /> : <AirplaneTakeoff size={14} />}
                  Save Record
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-border bg-background text-foreground hover:bg-tertiary">Cancel</Button>
              </div>
            </form>
          )}

          {travelLoading || patientsLoading ? (
            <LoadingSpinner label="Loading travel records..." />
          ) : (travelRecords ?? []).length === 0 ? (
            <EmptyState message="No travel records yet. Add the first one above." action="Add Travel Record" onAction={() => setShowForm(true)} />
          ) : (
            <div className="space-y-4">
              {upcoming.length > 0 && (
                <>
                  <p className="text-body-sm font-semibold text-primary uppercase tracking-wide">Upcoming arrivals</p>
                  {upcoming.map((tr) => (
                    <TravelRecordCard key={tr.id} tr={tr} patientMap={patientMap} onSelect={setSelectedPatientId} selected={selectedPatientId === tr.patientId} onUpdatePickup={(id, status) => update(id, { pickupStatus: status })} />
                  ))}
                </>
              )}
              {past.length > 0 && (
                <>
                  <p className="text-body-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">Past travel</p>
                  {past.map((tr) => (
                    <TravelRecordCard key={tr.id} tr={tr} patientMap={patientMap} onSelect={setSelectedPatientId} selected={selectedPatientId === tr.patientId} onUpdatePickup={(id, status) => update(id, { pickupStatus: status })} />
                  ))}
                </>
              )}
            </div>
          )}
        </Card>

        {/* Right: coordinator checklist */}
        <aside className="space-y-5">
          <Card className="border-border bg-card p-6 space-y-4">
            <h2 className="font-heading text-h4 text-foreground">Coordinator Checklist</h2>
            {selectedPatientId ? (() => {
              const tr = (travelRecords ?? []).find((r) => r.patientId === selectedPatientId);
              if (!tr) return <p className="text-body-sm text-muted-foreground italic">No travel record for this patient.</p>;
              const checklist = [
                { label: "Flight details confirmed", done: !!tr.airport },
                { label: "Hotel booked", done: !!tr.hotelName },
                { label: "Airport pickup arranged", done: tr.pickupStatus === "Confirmed" || tr.pickupStatus === "Completed" },
                { label: "Arrival date set", done: !!tr.arrivalDate },
                { label: "Departure date set", done: !!tr.departureDate },
                { label: "Companion count recorded", done: (tr.companionCount ?? 0) > 0 },
              ];
              const doneCount = checklist.filter((c) => c.done).length;
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-body-sm text-foreground font-medium">{patientMap[selectedPatientId] ?? "Patient"}</span>
                    <span className="text-body-sm text-muted-foreground">{doneCount}/{checklist.length} done</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${Math.round((doneCount / checklist.length) * 100)}%` }} />
                  </div>
                  <div className="space-y-2">
                    {checklist.map((item) => (
                      <div key={item.label} className={`flex items-center gap-3 rounded-lg border p-3 ${item.done ? "border-accent/30 bg-accent/5" : "border-border bg-background"}`}>
                        <span className={`text-body-sm font-bold ${item.done ? "text-green-500" : "text-muted-foreground"}`}>{item.done ? "✓" : "○"}</span>
                        <span className={`text-body-sm ${item.done ? "text-foreground" : "text-muted-foreground"}`}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })() : (
              <p className="text-body-sm text-muted-foreground italic">Select a patient from the list to view their checklist.</p>
            )}
          </Card>

          <Card className="border-border bg-card p-6 space-y-3">
            <h2 className="font-heading text-h4 text-foreground">Pending Pickups</h2>
            {(travelRecords ?? []).filter((r) => r.pickupStatus === "Pending").length === 0 ? (
              <p className="text-body-sm text-muted-foreground italic">No pending pickups.</p>
            ) : (
              <div className="space-y-3">
                {(travelRecords ?? []).filter((r) => r.pickupStatus === "Pending").map((tr) => (
                  <div key={tr.id} className="rounded-lg border border-warning/40 bg-warning/5 p-3">
                    <p className="text-body-sm font-medium text-foreground">{patientMap[tr.patientId] ?? "Unknown patient"}</p>
                    {tr.arrivalDate && (
                      <p className="text-caption text-muted-foreground">✈ {new Date(tr.arrivalDate).toLocaleDateString()} · {tr.airport ?? "Airport TBC"}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => update(tr.id, { pickupStatus: "Confirmed" })}
                      className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-caption font-medium text-white hover:bg-primary-hover transition-colors"
                    >
                      Confirm Pickup
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function TravelRecordCard({
  tr,
  patientMap,
  onSelect,
  selected,
  onUpdatePickup,
}: {
  tr: { id: string; patientId: string; arrivalDate?: Date; departureDate?: Date; airport?: string; pickupStatus?: string; hotelName?: string; companionCount?: number };
  patientMap: Record<string, string>;
  onSelect: (id: string) => void;
  selected: boolean;
  onUpdatePickup: (id: string, status: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tr.patientId)}
      className={`w-full rounded-xl border p-4 text-left transition-all ${selected ? "border-primary bg-tertiary/20 shadow-sm" : "border-border bg-background hover:border-primary hover:shadow-sm"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="font-semibold text-body-sm text-foreground">{patientMap[tr.patientId] ?? "Unknown patient"}</p>
          {tr.arrivalDate && (
            <p className="text-caption text-muted-foreground">✈ Arrival: {new Date(tr.arrivalDate).toLocaleDateString()}</p>
          )}
          {tr.departureDate && (
            <p className="text-caption text-muted-foreground">🛬 Departure: {new Date(tr.departureDate).toLocaleDateString()}</p>
          )}
          {tr.airport && <p className="text-caption text-muted-foreground">📍 {tr.airport}</p>}
          {tr.hotelName && <p className="text-caption text-muted-foreground">🏨 {tr.hotelName}</p>}
          {(tr.companionCount ?? 0) > 0 && (
            <p className="text-caption text-muted-foreground">👥 {tr.companionCount} companion(s)</p>
          )}
        </div>
        <TravelStatusBadge status={tr.pickupStatus ?? "Pending"} />
      </div>
    </button>
  );
}

function TravelDrawer() {
  return (
    <div className="space-y-4">
      <TimelineItem
        title="Flight tracking pending"
        time="Action needed"
        description="Patient itinerary expected by end of day."
      />
      <TimelineItem
        title="Hotel booking confirmed"
        time="Complete"
        description="Three-night stay reserved near clinic with breakfast."
      />
      <TimelineItem
        title="Transfer checklist ready"
        time="Prepared"
        description="Driver, pickup time, and emergency contact shared."
      />
      <Button className="w-full bg-primary text-primary-foreground hover:bg-primary-hover">
        <CheckCircle size={16} weight="regular" />
        Confirm Travel Plan
      </Button>
    </div>
  );
}

function ActivityTimeline({ userId }: { userId: string | null }) {
  const { data: leads, isPending: leadsLoading } = useQuery("Lead", {
    where: userId ? { createdByUserId: userId } : undefined,
    orderBy: { updatedAt: "desc" },
    limit: 20,
  });

  if (leadsLoading) return <LoadingSpinner label="Loading activity..." />;

  const events = (leads ?? []).flatMap((lead) => {
    const items = [];
    const createdAgo = (() => {
      const mins = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 60000);
      if (mins < 60) return `${mins}m ago`;
      if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
      return `${Math.floor(mins / 1440)}d ago`;
    })();
    items.push({
      id: lead.id + "-created",
      title: `New lead: ${lead.name}`,
      time: createdAgo,
      description: `Via ${lead.source} · ${lead.service}${lead.country ? ` · ${lead.country}` : ""}`,
      color: "bg-primary",
    });
    const updatedDiff = new Date(lead.updatedAt).getTime() - new Date(lead.createdAt).getTime();
    if (updatedDiff > 60000) {
      const updatedAgo = (() => {
        const mins = Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / 60000);
        if (mins < 60) return `${mins}m ago`;
        if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
        return `${Math.floor(mins / 1440)}d ago`;
      })();
      items.push({
        id: lead.id + "-updated",
        title: `Stage updated: ${lead.name}`,
        time: updatedAgo,
        description: `Now at: ${lead.stage}${lead.status === "Lost" ? " · Lost" : ""}`,
        color: lead.status === "Lost" ? "bg-error" : "bg-accent",
      });
    }
    return items;
  });

  events.sort((a, b) => {
    const parseAgo = (t: string) => {
      const n = parseInt(t);
      if (t.includes("m")) return n;
      if (t.includes("h")) return n * 60;
      return n * 1440;
    };
    return parseAgo(a.time) - parseAgo(b.time);
  });

  if (events.length === 0) return <EmptyState message="No activity yet. Add leads to see the timeline." />;

  return (
    <div className="relative space-y-0 pl-6">
      <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
      {events.slice(0, 30).map((event) => (
        <div key={event.id} className="relative flex gap-4 pb-4">
          <span className={`absolute -left-4 mt-1.5 h-3 w-3 rounded-full border-2 border-background ${event.color}`} />
          <div className="min-w-0 flex-1 rounded-lg border border-border bg-background p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-body-sm font-medium text-foreground">{event.title}</p>
              <span className="shrink-0 text-caption text-muted-foreground">{event.time}</span>
            </div>
            <p className="mt-0.5 text-caption text-muted-foreground">{event.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineItem({
  title,
  time,
  description,
}: {
  title: string;
  time: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-body font-medium text-foreground">{title}</h4>
        <span className="text-caption text-muted-foreground">{time}</span>
      </div>
      <p className="mt-2 text-body-sm text-foreground">{description}</p>
    </div>
  );
}


// ─── Team Management Section ──────────────────────────────────────────────────

function TeamManagementSection({
  currentUserEmail,
  currentUserRole,
}: {
  currentUserEmail: string;
  currentUserRole: UserRole;
}) {
  const [whitelist, setWhitelist] = useState<Record<string, UserRole>>(getRuntimeWhitelist());
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("Sales");
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole>("Sales");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const PROTECTED_EMAILS = ["xhentil@fivo.al"];

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleAdd = async () => {
    setError("");
    const email = newEmail.trim().toLowerCase();
    if (!email) { setError("Email nuk mund të jetë bosh."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Email-i nuk është valid."); return; }
    const existingKeys = Object.keys(whitelist).map((k) => k.toLowerCase());
    if (existingKeys.includes(email)) { setError("Ky email ekziston tashmë në listë."); return; }

    const next = { ...whitelist, [email]: newRole };
    setWhitelist(next);
    setRuntimeWhitelist(next);

    const roleName = ROLE_CONFIG[newRole].label;
    const platformUrl = "https://throbbing-butterfly-8724.dev.animaapp.io";

    if (isEmailJSConfigured()) {
      // ── Dërgim automatik përmes EmailJS ─────────────────────────────────
      const result = await sendInviteEmail({ toEmail: email, roleName, platformUrl });
      if (result.ok) {
        flash(`✅ Invite u dërgua automatikisht te ${email} (${roleName})`);
      } else {
        // EmailJS configured por dërgimi dështoi — fallback Gmail
        const subject = encodeURIComponent("Ftese: Bashkohu ne platformen Vita Medical");
        const bodyText = "Pershendetje,\n\nJeni ftuar te bashkoheni ne platformen Vita Medical CRM me rolin: " + roleName + ".\n\nHapni platformen dhe hyni me Google account tuaj (" + email + "):\n" + platformUrl + "\n\nMe respekt,\nEkipi i Vita Medical";
        const anchor = document.createElement("a");
        anchor.href = "https://mail.google.com/mail/?view=cm&tf=1&to=" + encodeURIComponent(email) + "&su=" + subject + "&body=" + encodeURIComponent(bodyText);
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        flash(`⚠ EmailJS dështoi (${result.error}) — Gmail u hap si alternativë`);
      }
    } else {
      // ── EmailJS i pa-konfiguruar — hap Gmail ────────────────────────────
      const subject = encodeURIComponent("Ftese: Bashkohu ne platformen Vita Medical");
      const bodyText = "Pershendetje,\n\nJeni ftuar te bashkoheni ne platformen Vita Medical CRM me rolin: " + roleName + ".\n\nHapni platformen dhe hyni me Google account tuaj (" + email + "):\n" + platformUrl + "\n\nMe respekt,\nEkipi i Vita Medical";
      const anchor = document.createElement("a");
      anchor.href = "https://mail.google.com/mail/?view=cm&tf=1&to=" + encodeURIComponent(email) + "&su=" + subject + "&body=" + encodeURIComponent(bodyText);
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      flash(`📧 Gmail u hap për ${email} — konfiguro EmailJS për dërgim automatik`);
    }

    setNewEmail("");
    setNewRole("Sales");
    setShowForm(false);
  };

  const handleRemove = (email: string) => {
    if (PROTECTED_EMAILS.includes(email.toLowerCase())) return;
    if (email.toLowerCase() === currentUserEmail.toLowerCase()) return;
    const next = { ...whitelist };
    delete next[email];
    setWhitelist(next);
    setRuntimeWhitelist(next);
    flash(`${email} u hoq nga lista.`);
  };

  const handleSaveEdit = () => {
    if (!editingEmail) return;
    const next = { ...whitelist, [editingEmail]: editingRole };
    setWhitelist(next);
    setRuntimeWhitelist(next);
    setEditingEmail(null);
    flash(`Roli i ${editingEmail} u ndryshua në ${ROLE_CONFIG[editingRole].label}`);
  };

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  // Owner cannot assign "Owner" or "Admin" roles — privilege escalation prevention
  const ASSIGNABLE_ROLES: UserRole[] = currentUserRole === "Admin"
    ? ["Admin", "Owner", "Sales", "Coordinator", "Doctor", "Finance", "ReadOnly"]
    : ["Sales", "Coordinator", "Doctor", "Finance", "ReadOnly"];

  // Owner sees only clinic team members (hides platform-level Admins from their view)
  // Admin sees everyone
  const entries = (Object.entries(whitelist) as [string, UserRole][]).filter(
    ([, r]) => currentUserRole === "Admin" || r !== "Admin"
  );

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-muted/30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users size={18} />
          </div>
          <div>
            <h3 className="font-heading text-h4 text-foreground">Team &amp; User Management</h3>
            <p className="text-caption text-muted-foreground">Menaxho anëtarët e ekipit dhe rolet e tyre.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(true); setError(""); }}
          className="btn-primary"
        >
          <PlusCircle size={14} />
          Shto anëtar
        </button>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="flex items-center gap-2 border-b border-green-200 bg-green-50 px-6 py-3">
          <CheckCircle size={15} weight="fill" className="text-green-600 shrink-0" />
          <p className="text-body-sm font-medium text-green-800">{successMsg}</p>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="border-b border-border bg-primary/5 px-6 py-5 space-y-4">
          <p className="text-body-sm font-semibold text-foreground">Shto anëtar të ri</p>
          <div className="grid gap-4 sm:grid-cols-[1fr_180px_auto]">
            <div>
              <label className="mb-1 block text-caption font-medium text-foreground">Email (Google account)</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => { setNewEmail(e.target.value); setError(""); }}
                className={inputClass}
                placeholder="agent@klinika.com"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div>
              <label className="mb-1 block text-caption font-medium text-foreground">Roli</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)} className={inputClass}>
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button type="button" onClick={handleAdd} className="btn-primary whitespace-nowrap">
                <CheckCircle size={14} /> Shto
              </button>
              <button type="button" onClick={() => { setShowForm(false); setError(""); }} className="btn-outline whitespace-nowrap">
                Anulo
              </button>
            </div>
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-body-sm text-error">
              <Warning size={13} /> {error}
            </p>
          )}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-caption text-muted-foreground">
              <strong className="text-foreground">Si funksionon:</strong> Personi duhet të hyjë me Google account që ka këtë email. Sistemi do t&#39;i japë automatikisht rolin e caktuar.
            </p>
          </div>
        </div>
      )}

      {/* Member list */}
      <div className="divide-y divide-border">
        {entries.map(([email, role]) => {
          const isProtected = PROTECTED_EMAILS.includes(email.toLowerCase());
          const isCurrentUser = email.toLowerCase() === currentUserEmail.toLowerCase();
          const isEditing = editingEmail === email;
          return (
            <div key={email} className={`flex items-center gap-4 px-6 py-4 ${isCurrentUser ? "bg-primary/5" : "hover:bg-muted/20"} transition-colors`}>
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tertiary text-tertiary-foreground font-bold text-[15px] border border-border uppercase">
                {email.charAt(0)}
              </div>
              {/* Email + status */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-body-sm font-medium text-foreground truncate">{email}</p>
                  {isCurrentUser && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">TY</span>
                  )}
                  {isProtected && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">🔒 Platform Admin</span>
                  )}
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-2">
                    <select
                      value={editingRole}
                      onChange={(e) => setEditingRole(e.target.value as UserRole)}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                      ))}
                    </select>
                    <button type="button" onClick={handleSaveEdit} className="rounded-lg bg-primary px-3 py-1 text-caption font-semibold text-white hover:bg-primary-hover">
                      Ruaj
                    </button>
                    <button type="button" onClick={() => setEditingEmail(null)} className="rounded-lg border border-border px-3 py-1 text-caption text-muted-foreground hover:bg-muted">
                      Anulo
                    </button>
                  </div>
                ) : (
                  <div className="mt-1">
                    <RoleBadge role={role} />
                  </div>
                )}
              </div>
              {/* Actions */}
              {!isEditing && !isProtected && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setEditingEmail(email); setEditingRole(role); }}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-caption font-medium text-foreground hover:bg-tertiary transition-colors"
                  >
                    Ndrysho rolin
                  </button>
                  {!isCurrentUser && (
                    <button
                      type="button"
                      onClick={() => handleRemove(email)}
                      className="rounded-lg border border-error/30 bg-error/5 px-3 py-1.5 text-caption font-medium text-error hover:bg-error/10 transition-colors"
                    >
                      Largo
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="border-t border-border bg-muted/20 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-caption text-muted-foreground">
          {entries.length} anëtar{entries.length !== 1 ? "ë" : ""} aktiv{entries.length !== 1 ? "ë" : ""} · Çdo email jashtë listës merr automatikisht rolin <strong>Read Only</strong>.
        </p>
        <div className="flex items-center gap-2">
          {isEmailJSConfigured() ? (
            <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-[11px] font-semibold text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Invite automatik aktiv
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-[11px] font-semibold text-yellow-700">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
              EmailJS i pa-konfiguruar — shih Settings
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EmailJS Config Card ──────────────────────────────────────────────────────

function EmailJSConfigCard() {
  const [cfg, setCfg] = useState(getEmailJSConfig());
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono";
  const labelClass = "mb-1 block text-body-sm font-medium text-foreground";
  const configured = !!(cfg.serviceId && cfg.templateId && cfg.publicKey);

  const handleSave = () => {
    saveEmailJSConfig(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTest = async () => {
    if (!testEmail.trim() || !configured) return;
    setTesting(true);
    setTestResult(null);
    const result = await sendInviteEmail({
      toEmail: testEmail.trim(),
      roleName: "Sales Agent",
      platformUrl: "https://throbbing-butterfly-8724.dev.animaapp.io",
      fromName: "Vita Medical (Test)",
    });
    setTesting(false);
    setTestResult(result.ok ? "✅ Email u dërgua me sukses!" : "❌ Dërgimi dështoi: " + result.error);
  };

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-muted/30 px-6 py-4 flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${configured ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
          <Bell size={18} />
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-h4 text-foreground">Konfiguro Email Automatik (EmailJS)</h3>
          <p className="text-caption text-muted-foreground">Invite-t dërgohen automatikisht kur shtoni anëtar të ri të ekipit.</p>
        </div>
        {configured && (
          <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-[11px] font-bold text-green-700">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Aktiv
          </span>
        )}
      </div>

      <div className="p-6 space-y-5">
        {/* Setup guide */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <p className="text-body-sm font-semibold text-foreground">📋 Si ta konfigurosh EmailJS (5 minuta):</p>
          <ol className="list-decimal ml-5 space-y-1.5 text-body-sm text-muted-foreground">
            <li>Krijo llogari falas te <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" className="text-primary underline hover:text-primary-hover">emailjs.com</a></li>
            <li>Shko te <strong>Email Services</strong> → Add Service (Gmail, Outlook, etj.) → kopjo <strong>Service ID</strong></li>
            <li>Shko te <strong>Email Templates</strong> → Create Template → vendos variablat: <span className="font-mono bg-muted px-1 rounded text-[11px]">{"{{to_email}}"}</span>, <span className="font-mono bg-muted px-1 rounded text-[11px]">{"{{role_name}}"}</span>, <span className="font-mono bg-muted px-1 rounded text-[11px]">{"{{platform_url}}"}</span> → kopjo <strong>Template ID</strong></li>
            <li>Shko te <strong>Account → API Keys</strong> → kopjo <strong>Public Key</strong></li>
          </ol>
        </div>

        {/* Fields */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Service ID</label>
            <input
              value={cfg.serviceId}
              onChange={(e) => setCfg((p) => ({ ...p, serviceId: e.target.value }))}
              className={inputClass}
              placeholder="service_xxxxxxx"
            />
          </div>
          <div>
            <label className={labelClass}>Template ID</label>
            <input
              value={cfg.templateId}
              onChange={(e) => setCfg((p) => ({ ...p, templateId: e.target.value }))}
              className={inputClass}
              placeholder="template_xxxxxxx"
            />
          </div>
          <div>
            <label className={labelClass}>Public Key</label>
            <input
              value={cfg.publicKey}
              onChange={(e) => setCfg((p) => ({ ...p, publicKey: e.target.value }))}
              className={inputClass}
              placeholder="xxxxxxxxxxxxxxxxxxxx"
            />
          </div>
        </div>

        {/* Template variables reference */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
          <p className="text-body-sm font-semibold text-foreground">Variablat e disponueshme për template-in:</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { v: "{{to_email}}", desc: "Email-i i të ftuarit" },
              { v: "{{to_name}}", desc: "Emri (para @)" },
              { v: "{{role_name}}", desc: "Emri i rolit (p.sh. Sales Agent)" },
              { v: "{{platform_url}}", desc: "Linku i platformës" },
              { v: "{{from_name}}", desc: "Emri i dërguesit" },
            ].map((item) => (
              <div key={item.v} className="flex items-center gap-2">
                <span className="font-mono text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded">{item.v}</span>
                <span className="text-caption text-muted-foreground">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Save + test */}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleSave} className="btn-primary">
            <CheckCircle size={14} /> Ruaj konfigurimin
          </button>
          {saved && (
            <span className="text-body-sm font-medium text-green-600">✓ U ruajt!</span>
          )}
        </div>

        {/* Test send */}
        {configured && (
          <div className="rounded-xl border border-border bg-background p-4 space-y-3">
            <p className="text-body-sm font-semibold text-foreground">🧪 Testo dërgimin e email-it</p>
            <div className="flex items-center gap-3">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@email.com"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !testEmail.trim()}
                className="btn-outline whitespace-nowrap"
              >
                {testing ? <Spinner size={14} className="animate-spin" /> : "Dërgo test"}
              </button>
            </div>
            {testResult && (
              <p className="text-body-sm font-medium" style={{ color: testResult.startsWith("✅") ? "#16a34a" : "#dc2626" }}>
                {testResult}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-border bg-card p-6">
      <h3 className="font-heading text-h4 text-foreground">{title}</h3>
      <p className="mt-3 text-body-sm text-foreground">{description}</p>
      <Button
        variant="outline"
        className="mt-6 border-primary bg-background text-primary hover:bg-tertiary hover:text-primary"
      >
        <Gear size={16} weight="regular" />
        Configure
      </Button>
    </Card>
  );
}

function ContextDrawer({
  open,
  setOpen,
  title,
  children,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-6">
        <h2 className="font-heading text-h4 text-foreground">{title}</h2>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-tertiary"
          aria-label={open ? "Collapse panel" : "Expand panel"}
        >
          <X size={18} weight="regular" />
        </button>
      </div>
      {open ? (
        <div className="p-6">{children}</div>
      ) : (
        <div className="p-6">
          <p className="text-body-sm text-muted-foreground">
            Panel collapsed. Reopen to view details.
          </p>
        </div>
      )}
    </aside>
  );
}

function EmptyDrawer() {
  return (
    <p className="text-body-sm text-muted-foreground">
      Select a record to view its details, timeline, and actions.
    </p>
  );
}

function EmptyState({
  message,
  action,
  onAction,
}: {
  message: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
      <p className="text-[13.5px] text-muted-foreground">{message}</p>
      {action && onAction && (
        <button type="button" onClick={onAction} className="btn-primary mt-4">
          {action}
        </button>
      )}
    </div>
  );
}

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10">
      <Spinner size={18} className="animate-spin text-primary" />
      <span className="text-[13px] text-muted-foreground">{label}</span>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className="badge badge-blue">{value}</span>
  );
}

function QuoteStatusBadge({ status }: { status: string }) {
  const cls =
    status === "Approved" ? "badge-green" :
    status === "Sent"     ? "badge-blue" :
                            "badge-gray";
  return <span className={`badge ${cls}`}>{status}</span>;
}

function UrgencyBadge({ value }: { value: string }) {
  const cls =
    value === "High"   ? "badge-red" :
    value === "Medium" ? "badge-yellow" :
                         "badge-green";
  return <span className={`badge ${cls}`}>{value}</span>;
}

function getContextItems(module: ModuleKey) {
  switch (module) {
    case "leads":
      return ["All leads", "Pipeline board", "Doctor review queue", "Communication timeline", "Bulk actions"];
    case "patients":
      return ["Profiles", "Treatment readiness", "Documents", "Follow-up plans", "Medical notes"];
    case "quotes":
      return ["Quote table", "Drafts", "Approvals", "Version history", "Templates"];
    case "payments":
      return ["All transactions", "Deposits", "Outstanding balances", "Refunds", "Revenue report"];
    case "appointments":
      return ["Calendar", "Weekly timeline", "Travel coordination", "Transfers", "Hotels"];
    case "tasks":
      return ["My tasks", "Team tasks", "Reminders", "Escalations", "Completed"];
    case "reports":
      return ["Overview", "Funnel", "Revenue", "Lead sources", "SLA"];
    case "settings":
      return ["Pipelines", "Users and roles", "Templates", "Automations", "Clinic setup"];
    default:
      return [];
  }
}

export default App;
