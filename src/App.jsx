import React, { useState, useMemo, useEffect } from "react";

// ============================================================================
// MOCK DATA
// ============================================================================

const INSURANCE_PLANS = {
  "BCBS-PPO": {
    name: "BCBS PPO Silver", provider: "BCBS", type: "PPO",
    deductible: 1500, pcpCopay: 25, specialistCopay: 45, requiresReferral: true,
    nutritionist: { covered: true, visits: 3, cost: 0 },
    medications: { metformin: { covered: true, cost: 4, tier: "generic" } },
    warnings: ["Specialist visits require PCP referral first"],
  },
  "Aetna-HMO": {
    name: "Aetna HMO Bronze", provider: "Aetna", type: "HMO",
    deductible: 3000, pcpCopay: 30, specialistCopay: 60, requiresReferral: true,
    nutritionist: { covered: false, visits: 0, cost: null },
    medications: { metformin: { covered: true, cost: 10, tier: "generic" } },
    warnings: [
      "HMO requires referral for all specialist visits",
      "Out-of-network care not covered except emergencies",
    ],
  },
  "United-EPO": {
    name: "United EPO Gold", provider: "United", type: "EPO",
    deductible: 500, pcpCopay: 20, specialistCopay: 35, requiresReferral: false,
    nutritionist: { covered: true, visits: 6, cost: 0 },
    medications: { metformin: { covered: true, cost: 4, tier: "generic" } },
    warnings: ["Must stay in-network — out-of-network not covered"],
  },
};

const DOCTORS_78701 = {
  endocrinologist: [
    { name: "Dr. Sarah Chen", distance: 0.8, accepting: true, address: "1201 W 38th St, Austin" },
    { name: "Dr. Marcus Webb", distance: 1.2, accepting: false, address: "800 W 34th St, Austin" },
    { name: "Dr. Priya Nair", distance: 2.1, accepting: true, address: "3810 Medical Pkwy, Austin" },
  ],
  pcp: [
    { name: "Dr. James Oduya", distance: 0.6, accepting: true, address: "1111 W 6th St, Austin" },
    { name: "Dr. Emily Foster", distance: 1.4, accepting: true, address: "2500 W Cesar Chavez, Austin" },
    { name: "Dr. Ravi Patel", distance: 2.3, accepting: false, address: "4301 S Congress Ave, Austin" },
  ],
  cardiologist: [
    { name: "Dr. Helen Park", distance: 0.9, accepting: true, address: "1401 W 12th St, Austin" },
    { name: "Dr. Thomas Reid", distance: 1.7, accepting: true, address: "3000 N Lamar, Austin" },
    { name: "Dr. Lisa Ahmadi", distance: 2.5, accepting: false, address: "4900 Mueller Blvd, Austin" },
  ],
};

const PHARMACIES = [
  { name: "HEB Pharmacy", price: 4, note: null },
  { name: "Costco Pharmacy", price: 4, note: "Membership required ($60/yr)" },
  { name: "CVS", price: 9, note: "GoodRx coupon brings to $4" },
  { name: "Walgreens", price: 9, note: null },
];

// ============================================================================
// ICONS
// ============================================================================

const Icon = ({ path, size = 20, className = "", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    {path}
  </svg>
);

const icons = {
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
  user: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  arrowRight: <><path d="M5 12h14M13 5l7 7-7 7"/></>,
  arrowLeft: <><path d="M19 12H5M11 19l-7-7 7-7"/></>,
  check: <><path d="M20 6L9 17l-5-5"/></>,
  alert: <><path d="M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></>,
  x: <><path d="M18 6L6 18M6 6l12 12"/></>,
  pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>,
  pill: <><path d="M10.5 20.5a7.07 7.07 0 01-10-10l10-10a7.07 7.07 0 0110 10l-10 10z"/><path d="M8.5 8.5l7 7"/></>,
  leaf: <><path d="M11 20A7 7 0 014 13V5a2 2 0 012-2h5a7 7 0 017 7v8a2 2 0 01-2 2h-5z"/><path d="M4 13s4-1 7 2 7 2 7 2"/></>,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>,
  refresh: <><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></>,
  stethoscope: <><path d="M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 006 6v0a6 6 0 006-6V4a2 2 0 00-2-2h-1a.2.2 0 10.2.3"/><path d="M8 15v1a6 6 0 006 6v0a6 6 0 006-6v-4"/><circle cx="20" cy="10" r="2"/></>,
  beaker: <><path d="M4.5 3h15M6 3v16a2 2 0 002 2h8a2 2 0 002-2V3M6 14h12"/></>,
  sparkle: <><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z"/></>,
  home: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></>,
  clipboard: <><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/></>,
  compass: <><circle cx="12" cy="12" r="10"/><path d="M16 8l-2 6-6 2 2-6 6-2z"/></>,
  map: <><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16M16 6v16"/></>,
  menu: <><path d="M3 12h18M3 6h18M3 18h18"/></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
};

// ============================================================================
// DIAGNOSIS HEURISTIC + AI CALL
// ============================================================================

function inferConditionOffline(text) {
  const t = text.toLowerCase();
  if (/diabet|a1c|blood sugar|glucose|insulin|metformin|type 2|type ii/.test(t)) {
    return {
      condition_name: "Type 2 Diabetes",
      plain_english_summary: "Your body isn't using insulin effectively, which lets blood sugar run high. It's a manageable condition — most people keep it under control with medication, a few lifestyle adjustments, and regular check-ins with a care team.",
      required_specialists: ["Endocrinologist", "Registered Dietitian", "Ophthalmologist (annual eye exam)"],
      required_labs: ["HbA1c (every 3 months at first)", "Fasting glucose panel", "Lipid panel", "Kidney function (eGFR, urine microalbumin)"],
      typical_medications: ["Metformin (first-line)", "GLP-1 agonist (if needed)", "Statin (if cholesterol high)"],
      visit_frequency: "Endocrinologist every 3 months until stable, then every 6 months",
      lifestyle_note: "Walk 30 minutes most days, cut added sugar and refined carbs, and aim for 7+ hours of sleep. Small steady changes beat big short-lived ones.",
    };
  }
  if (/thyroid|hashimoto|hypothyroid|hyperthyroid|tsh/.test(t)) {
    return {
      condition_name: "Thyroid Disorder",
      plain_english_summary: "Your thyroid gland is over- or under-producing hormones that regulate your metabolism. This is very common and highly treatable — most people feel significantly better within weeks of starting the right medication.",
      required_specialists: ["Endocrinologist"],
      required_labs: ["TSH", "Free T4", "Free T3", "Thyroid antibodies (TPO, TgAb)"],
      typical_medications: ["Levothyroxine (for hypothyroid)", "Methimazole (for hyperthyroid)"],
      visit_frequency: "Every 6–8 weeks until dose is stable, then every 6–12 months",
      lifestyle_note: "Take medication on an empty stomach, wait 30–60 minutes before eating or drinking anything but water, and separate from calcium or iron supplements by 4 hours.",
    };
  }
  if (/blood pressure|hypertension|htn/.test(t)) {
    return {
      condition_name: "Hypertension",
      plain_english_summary: "Your blood pressure is consistently above the healthy range, which over time can strain your heart and blood vessels. The good news: it responds well to lifestyle changes and medication, and many people bring it down within a few months.",
      required_specialists: ["Cardiologist", "Registered Dietitian"],
      required_labs: ["Basic metabolic panel", "Lipid panel", "Urinalysis", "EKG"],
      typical_medications: ["Lisinopril", "Amlodipine", "Hydrochlorothiazide"],
      visit_frequency: "Every 4 weeks until controlled, then every 3–6 months",
      lifestyle_note: "Cut sodium to under 2,300 mg/day, move daily, limit alcohol, and monitor at home with a cuff — morning and evening readings for two weeks give your doctor real data.",
    };
  }
  return {
    condition_name: "Clinical Evaluation Needed",
    plain_english_summary: "Based on what you described, a clinician should evaluate you in person to confirm what's going on and rule out anything that needs faster attention. This is a starting plan — your doctor may adjust it.",
    required_specialists: ["Primary Care Physician"],
    required_labs: ["Complete Blood Count (CBC)", "Comprehensive Metabolic Panel (CMP)"],
    typical_medications: [],
    visit_frequency: "Initial visit within 1–2 weeks",
    lifestyle_note: "Write down when symptoms started, how often they happen, and what makes them better or worse. That history is the single most useful thing you can bring to an appointment.",
  };
}

async function callAnthropicAPI(userInput, conditionStatus) {
  const systemPrompt = `You are a clinical care navigator. The user has given you a diagnosis or symptoms. Return ONLY a JSON object with these fields: condition_name (string), plain_english_summary (2-3 sentences, no jargon), required_specialists (array of strings), required_labs (array of strings), typical_medications (array of strings), visit_frequency (string), lifestyle_note (string). Return nothing except valid JSON.`;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt,
        messages: [{ role: "user", content: `Patient input: "${userInput}"\nStatus: ${conditionStatus}\n\nReturn ONLY the JSON object, no markdown, no code fences.` }],
      }),
    });
    if (!response.ok) throw new Error("API error");
    const data = await response.json();
    const textBlock = data.content.find((b) => b.type === "text");
    if (!textBlock) throw new Error("No text in response");
    return JSON.parse(textBlock.text.replace(/```json|```/g, "").trim());
  } catch (err) {
    console.warn("Falling back to offline inference:", err);
    return inferConditionOffline(userInput);
  }
}

// ============================================================================
// PRIMITIVES
// ============================================================================

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-stone-200/80 ${className}`}
       style={{ boxShadow: "0 1px 2px rgba(27,43,75,0.04), 0 8px 24px -12px rgba(27,43,75,0.08)" }}>
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <div className="text-[11px] uppercase tracking-[0.14em] font-semibold"
       style={{ color: "#5A6B8C", fontFamily: "'Inter', system-ui, sans-serif" }}>
    {children}
  </div>
);

const Heading = ({ level = 2, children, className = "" }) => {
  const sizes = {
    1: "text-[28px] leading-[1.15] md:text-[34px]",
    2: "text-[22px] leading-[1.2] md:text-[26px]",
    3: "text-[17px] leading-[1.3] md:text-[18px]",
  };
  const Tag = `h${level}`;
  return (
    <Tag className={`${sizes[level]} ${className}`}
         style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#1B2B4B", fontWeight: 500, letterSpacing: "-0.01em" }}>
      {children}
    </Tag>
  );
};

const Button = ({ children, onClick, variant = "primary", disabled, className = "", type = "button" }) => {
  const base = "inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium text-[15px] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed";
  const styles = {
    primary: "text-white hover:brightness-110 active:brightness-95",
    secondary: "bg-white border border-stone-300 text-[#1B2B4B] hover:bg-stone-50",
    ghost: "text-[#1B2B4B] hover:bg-stone-100",
  };
  const inline = variant === "primary" ? { backgroundColor: "#0D9488" } : {};
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`} style={inline}>
      {children}
    </button>
  );
};

const Field = ({ label, children, hint }) => (
  <label className="block">
    <div className="mb-2"><SectionLabel>{label}</SectionLabel></div>
    {children}
    {hint && <div className="mt-1.5 text-[13px] text-stone-500">{hint}</div>}
  </label>
);

const Input = ({ ...props }) => (
  <input {...props} className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white text-[15px] text-[#1B2B4B] placeholder:text-stone-400 focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/15 transition" />
);

const Select = ({ children, ...props }) => (
  <div className="relative">
    <select {...props} className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border border-stone-300 bg-white text-[15px] text-[#1B2B4B] focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/15 transition">
      {children}
    </select>
    <svg className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B2B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  </div>
);

const Textarea = ({ ...props }) => (
  <textarea {...props} className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white text-[15px] text-[#1B2B4B] placeholder:text-stone-400 focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/15 transition resize-none" />
);

const Banner = ({ tone = "info", title, children, icon }) => {
  const palettes = {
    warn: { bg: "#FEF7E7", border: "#F59E0B", text: "#7A4A00", icon: "#B37400" },
    error: { bg: "#FEF1F1", border: "#EF4444", text: "#7A1515", icon: "#C32525" },
    ok: { bg: "#ECFDF5", border: "#0D9488", text: "#064E3B", icon: "#0D9488" },
    info: { bg: "#F1F5FA", border: "#5A6B8C", text: "#1B2B4B", icon: "#1B2B4B" },
  };
  const p = palettes[tone];
  return (
    <div className="flex gap-3 p-4 rounded-xl border-l-4" style={{ backgroundColor: p.bg, borderLeftColor: p.border }}>
      {icon && <div style={{ color: p.icon, flexShrink: 0 }} className="pt-0.5">{icon}</div>}
      <div>
        {title && <div className="font-semibold text-[14px] mb-0.5" style={{ color: p.text }}>{title}</div>}
        <div className="text-[14px] leading-relaxed" style={{ color: p.text }}>{children}</div>
      </div>
    </div>
  );
};

const Badge = ({ children, tone = "neutral" }) => {
  const palettes = {
    ok: { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
    warn: { bg: "#FEF3C7", text: "#78350F", border: "#FDE68A" },
    error: { bg: "#FEE2E2", text: "#7F1D1D", border: "#FECACA" },
    neutral: { bg: "#F1F5FA", text: "#334155", border: "#E2E8F0" },
  };
  const p = palettes[tone];
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide" style={{ backgroundColor: p.bg, color: p.text, border: `1px solid ${p.border}` }}>
      {children}
    </span>
  );
};

// ============================================================================
// NAV CONFIG
// ============================================================================

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: icons.home, requires: null },
  { id: "profile", label: "Your info", icon: icons.user, requires: null },
  { id: "concern", label: "Your concern", icon: icons.clipboard, requires: null },
  { id: "picture", label: "The picture", icon: icons.stethoscope, requires: "concern" },
  { id: "coverage", label: "Coverage", icon: icons.shield, requires: "both" },
  { id: "gps", label: "Next steps", icon: icons.compass, requires: "both" },
  { id: "roadmap", label: "Roadmap", icon: icons.map, requires: "both" },
];

// ============================================================================
// EMPTY STATE
// ============================================================================

const EmptyState = ({ title, description, actions }) => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Card className="max-w-md w-full p-8 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5" style={{ backgroundColor: "#F1F5FA" }}>
        <Icon path={icons.lock} size={22} style={{ color: "#5A6B8C" }} />
      </div>
      <Heading level={2} className="mb-2">{title}</Heading>
      <p className="text-[15px] leading-relaxed mb-6" style={{ color: "#5A6B8C" }}>{description}</p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">{actions}</div>
    </Card>
  </div>
);

// ============================================================================
// TABS
// ============================================================================

const OverviewTab = ({ profile, concern, aiResult, plan, completion, navigate }) => {
  const cards = [
    { id: "profile", title: "Your info", icon: icons.user, done: completion.profile,
      desc: completion.profile ? `${plan?.name} · ZIP ${profile.zip}` : "Tell us your plan and ZIP code." },
    { id: "concern", title: "Your concern", icon: icons.clipboard, done: completion.concern,
      desc: completion.concern ? `"${concern.text.slice(0, 60)}${concern.text.length > 60 ? "…" : ""}"` : "Describe your diagnosis or symptoms." },
    { id: "picture", title: "The picture", icon: icons.stethoscope, done: !!aiResult,
      desc: aiResult ? aiResult.condition_name : "We'll analyze what you shared." },
    { id: "coverage", title: "Coverage", icon: icons.shield, done: completion.both,
      desc: completion.both ? `${plan.name} · $${plan.specialistCopay} specialist copay` : "See what your plan actually covers." },
    { id: "gps", title: "Next steps", icon: icons.compass, done: completion.both,
      desc: completion.both ? "Your step-by-step action plan." : "Where to go and in what order." },
    { id: "roadmap", title: "Roadmap", icon: icons.map, done: completion.both,
      desc: completion.both ? "This week, next two weeks, ongoing." : "Your full timeline, copy-ready." },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full" style={{ backgroundColor: "#ECFDF5", color: "#0D9488" }}>
          <Icon path={icons.sparkle} size={13} />
          <span className="text-[11px] font-semibold tracking-wider uppercase">Welcome</span>
        </div>
        <Heading level={1} className="mb-3">
          {completion.both ? `Here's your dashboard.` : `Let's get you a care plan.`}
        </Heading>
        <p className="text-[16px] leading-relaxed max-w-2xl" style={{ color: "#5A6B8C" }}>
          {completion.both
            ? `Everything you need is in the sidebar. Jump between sections freely — your info is saved.`
            : `Two quick sections to fill out, then you'll have a full coverage-aware action plan. Start wherever makes sense.`}
        </p>
      </div>

      {!completion.both && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Setup progress</SectionLabel>
            <span className="text-[13px] font-semibold" style={{ color: "#0D9488" }}>
              {completion.profile && completion.concern ? "2 of 2" : completion.profile || completion.concern ? "1 of 2" : "0 of 2"}
            </span>
          </div>
          <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
                 style={{ width: `${((completion.profile ? 1 : 0) + (completion.concern ? 1 : 0)) * 50}%`, backgroundColor: "#0D9488" }} />
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <button key={c.id} onClick={() => navigate(c.id)} className="text-left group">
            <Card className="p-5 h-full transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
                     style={{ backgroundColor: c.done ? "#ECFDF5" : "#F1F5FA", color: c.done ? "#0D9488" : "#5A6B8C" }}>
                  <Icon path={c.icon} size={18} />
                </div>
                {c.done ? (
                  <Badge tone="ok"><Icon path={icons.check} size={10} /> Ready</Badge>
                ) : (
                  <Badge tone="neutral">—</Badge>
                )}
              </div>
              <Heading level={3} className="mb-1.5">{c.title}</Heading>
              <p className="text-[13px] leading-relaxed" style={{ color: "#5A6B8C" }}>{c.desc}</p>
            </Card>
          </button>
        ))}
      </div>

      <Banner tone="info" icon={<Icon path={icons.shield} size={18} />} title="Your info stays on this device">
        We don't store anything. Close the tab and it's gone.
      </Banner>
    </div>
  );
};

const ProfileTab = ({ profile, setProfile, navigate }) => {
  const canSave = profile.provider && profile.planType && profile.zip.length >= 5;
  const handleProviderChange = (provider) => {
    const typeMap = { BCBS: "PPO", Aetna: "HMO", United: "EPO" };
    setProfile({ ...profile, provider, planType: typeMap[provider] || "" });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Heading level={1} className="mb-2">Your info</Heading>
        <p className="text-[15px] leading-relaxed" style={{ color: "#5A6B8C" }}>
          We use this to figure out what's actually covered and find in-network doctors nearby.
        </p>
      </div>

      <Card className="p-6 md:p-7 space-y-5">
        <Field label="Insurance provider">
          <Select value={profile.provider} onChange={(e) => handleProviderChange(e.target.value)}>
            <option value="">Select your insurance…</option>
            <option value="BCBS">Blue Cross Blue Shield</option>
            <option value="Aetna">Aetna</option>
            <option value="United">United Healthcare</option>
          </Select>
        </Field>

        <Field label="Plan type">
          <Select value={profile.planType} onChange={(e) => setProfile({ ...profile, planType: e.target.value })} disabled={!profile.provider}>
            <option value="">Select your plan type…</option>
            <option value="PPO">PPO</option>
            <option value="HMO">HMO</option>
            <option value="EPO">EPO</option>
          </Select>
        </Field>

        <Field label="ZIP code" hint="We use this to find in-network doctors nearby.">
          <Input type="text" inputMode="numeric" maxLength={5} placeholder="e.g. 78701"
                 value={profile.zip}
                 onChange={(e) => setProfile({ ...profile, zip: e.target.value.replace(/\D/g, "") })} />
        </Field>
      </Card>

      {canSave && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Badge tone="ok"><Icon path={icons.check} size={10} /> Info saved</Badge>
          <Button onClick={() => navigate("concern")}>
            Continue to your concern <Icon path={icons.arrowRight} size={16} />
          </Button>
        </div>
      )}
    </div>
  );
};

const ConcernTab = ({ concern, setConcern, onAnalyze, loading, navigate }) => {
  const canAnalyze = concern.text.trim().length > 3 && concern.status;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Heading level={1} className="mb-2">What's going on?</Heading>
        <p className="text-[15px] leading-relaxed" style={{ color: "#5A6B8C" }}>
          Tell us in your own words — a diagnosis from a doctor, or the symptoms you've been dealing with.
        </p>
      </div>

      <Card className="p-6 md:p-7 space-y-5">
        <Field label="Your diagnosis or symptoms">
          <Textarea rows={5} placeholder="e.g. My doctor just told me I have Type 2 diabetes. My A1C was 7.8."
                    value={concern.text} onChange={(e) => setConcern({ ...concern, text: e.target.value })} />
        </Field>

        <Field label="Is this…">
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "new", label: "New diagnosis", sub: "Just found out" },
              { key: "ongoing", label: "Ongoing condition", sub: "Managing it" },
            ].map((opt) => {
              const active = concern.status === opt.key;
              return (
                <button key={opt.key} onClick={() => setConcern({ ...concern, status: opt.key })}
                        className="text-left p-4 rounded-xl border-2 transition"
                        style={{ borderColor: active ? "#0D9488" : "#E2E8F0", backgroundColor: active ? "#F0FDFA" : "white" }}>
                  <div className="font-semibold text-[14px]" style={{ color: "#1B2B4B" }}>{opt.label}</div>
                  <div className="text-[12px] mt-0.5" style={{ color: "#5A6B8C" }}>{opt.sub}</div>
                </button>
              );
            })}
          </div>
        </Field>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" onClick={() => navigate("overview")}>
          <Icon path={icons.arrowLeft} size={16} /> Back to overview
        </Button>
        <Button onClick={() => onAnalyze(navigate)} disabled={!canAnalyze || loading}>
          {loading ? "Analyzing…" : "Analyze"} <Icon path={icons.arrowRight} size={16} />
        </Button>
      </div>
    </div>
  );
};

const PictureTab = ({ aiResult, loading, navigate, onReanalyze }) => {
  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Heading level={1}>Reading through that now…</Heading>
        <Card className="p-8 md:p-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-stone-200" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
                   style={{ borderTopColor: "#0D9488", animationDuration: "0.9s" }} />
            </div>
            <div>
              <div className="font-semibold text-[15px]" style={{ color: "#1B2B4B" }}>Analyzing your condition</div>
              <div className="text-[13px]" style={{ color: "#5A6B8C" }}>This takes about 5 seconds.</div>
            </div>
          </div>
          <div className="space-y-3">
            {[80, 95, 70, 85, 60].map((w, i) => (
              <div key={i} className="h-3 rounded-full bg-stone-100 animate-pulse"
                   style={{ width: `${w}%`, animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (!aiResult) {
    return (
      <EmptyState
        title="Tell us what's going on first"
        description="Once you describe your diagnosis or symptoms, we'll break down what the condition means, what specialists you'll need, and what your plan covers."
        actions={<Button onClick={() => navigate("concern")}>Go to 'Your concern' <Icon path={icons.arrowRight} size={16} /></Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full" style={{ backgroundColor: "#F1F5FA", color: "#1B2B4B" }}>
            <Icon path={icons.stethoscope} size={13} />
            <span className="text-[11px] font-semibold tracking-wider uppercase">The picture</span>
          </div>
          <Heading level={1}>{aiResult.condition_name}</Heading>
        </div>
        <Button variant="ghost" onClick={() => onReanalyze(navigate)}>
          <Icon path={icons.refresh} size={14} /> Re-analyze
        </Button>
      </div>

      <Card className="p-6 md:p-8">
        <p className="text-[16px] leading-relaxed" style={{ color: "#1B2B4B" }}>
          {aiResult.plain_english_summary}
        </p>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Icon path={icons.stethoscope} size={18} style={{ color: "#0D9488" }} />
            <SectionLabel>Specialists you'll see</SectionLabel>
          </div>
          <ul className="space-y-2">
            {aiResult.required_specialists.map((s, i) => (
              <li key={i} className="text-[14px] flex gap-2" style={{ color: "#1B2B4B" }}>
                <span style={{ color: "#0D9488", fontWeight: "bold" }}>·</span>{s}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Icon path={icons.beaker} size={18} style={{ color: "#0D9488" }} />
            <SectionLabel>Labs you'll need</SectionLabel>
          </div>
          <ul className="space-y-2">
            {aiResult.required_labs.map((s, i) => (
              <li key={i} className="text-[14px] flex gap-2" style={{ color: "#1B2B4B" }}>
                <span style={{ color: "#0D9488", fontWeight: "bold" }}>·</span>{s}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Icon path={icons.pill} size={18} style={{ color: "#0D9488" }} />
            <SectionLabel>Common medications</SectionLabel>
          </div>
          {aiResult.typical_medications.length ? (
            <ul className="space-y-2">
              {aiResult.typical_medications.map((s, i) => (
                <li key={i} className="text-[14px] flex gap-2" style={{ color: "#1B2B4B" }}>
                  <span style={{ color: "#0D9488", fontWeight: "bold" }}>·</span>{s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px]" style={{ color: "#5A6B8C" }}>Your doctor will decide based on the full workup.</p>
          )}
          <div className="mt-3 pt-3 border-t border-stone-100">
            <div className="text-[12px]" style={{ color: "#5A6B8C" }}>
              <strong style={{ color: "#1B2B4B" }}>Visit cadence:</strong> {aiResult.visit_frequency}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Icon path={icons.leaf} size={18} style={{ color: "#0D9488" }} />
            <SectionLabel>Lifestyle</SectionLabel>
          </div>
          <p className="text-[14px] leading-relaxed" style={{ color: "#1B2B4B" }}>{aiResult.lifestyle_note}</p>
        </Card>
      </div>

      <Banner tone="info" icon={<Icon path={icons.alert} size={18} />} title="This is guidance, not a diagnosis">
        ClearCare helps you prepare — your doctor makes the call.
      </Banner>
    </div>
  );
};

const CoverageTab = ({ plan, aiResult, effectiveReferralRule, navigate, completion }) => {
  if (!completion.both) {
    return (
      <EmptyState
        title="Fill out your info and concern first"
        description="We need to know your plan and what you're being treated for before we can show coverage details."
        actions={
          <>
            {!completion.profile && <Button onClick={() => navigate("profile")}>Add your info</Button>}
            {!completion.concern && <Button variant={completion.profile ? "primary" : "secondary"} onClick={() => navigate("concern")}>Describe your concern</Button>}
          </>
        }
      />
    );
  }

  const medsToShow = aiResult.typical_medications.length ? aiResult.typical_medications : [];
  const headerLine = effectiveReferralRule
    ? `Your ${plan.name} covers most of this, but you'll need a referral first.`
    : `Your ${plan.name} covers most of this — no referral needed.`;

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full" style={{ backgroundColor: "#F1F5FA", color: "#1B2B4B" }}>
          <Icon path={icons.shield} size={13} />
          <span className="text-[11px] font-semibold tracking-wider uppercase">Your coverage</span>
        </div>
        <Heading level={1} className="mb-2">{headerLine}</Heading>
        <p className="text-[15px]" style={{ color: "#5A6B8C" }}>
          Deductible: <strong style={{ color: "#1B2B4B" }}>${plan.deductible.toLocaleString()}</strong>
          {" · "}PCP visit: <strong style={{ color: "#1B2B4B" }}>${plan.pcpCopay}</strong>
          {" · "}Specialist visit: <strong style={{ color: "#1B2B4B" }}>${plan.specialistCopay}</strong>
        </p>
      </div>

      {effectiveReferralRule && (
        <Banner tone="warn" icon={<Icon path={icons.alert} size={18} />} title="Referral required">
          Your plan needs a referral from your PCP before a specialist visit will be covered. We'll walk you through that in Next steps.
        </Banner>
      )}

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Icon path={icons.stethoscope} size={18} style={{ color: "#0D9488" }} />
          <SectionLabel>Specialist visits</SectionLabel>
        </div>
        <div className="space-y-3">
          {aiResult.required_specialists.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
              <div className="text-[15px]" style={{ color: "#1B2B4B" }}>{s}</div>
              <div className="text-[15px] font-semibold" style={{ color: "#059669" }}>${plan.specialistCopay} copay</div>
            </div>
          ))}
        </div>
      </Card>

      {medsToShow.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon path={icons.pill} size={18} style={{ color: "#0D9488" }} />
            <SectionLabel>Medications</SectionLabel>
          </div>
          <div className="space-y-3">
            {medsToShow.map((m, i) => {
              const isMetformin = /metformin/i.test(m);
              const covered = isMetformin && plan.medications.metformin?.covered;
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                  <div className="text-[15px]" style={{ color: "#1B2B4B" }}>{m}</div>
                  {covered ? (
                    <div className="text-[15px] font-semibold" style={{ color: "#059669" }}>${plan.medications.metformin.cost}/month</div>
                  ) : isMetformin ? (
                    <div className="text-[15px] font-semibold" style={{ color: "#DC2626" }}>Not covered</div>
                  ) : (
                    <Badge tone="neutral">Check with pharmacist</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Icon path={icons.leaf} size={18} style={{ color: "#0D9488" }} />
          <SectionLabel>Preventive services</SectionLabel>
        </div>
        <div className="flex items-center justify-between py-2">
          <div className="text-[15px]" style={{ color: "#1B2B4B" }}>Registered dietitian / nutritionist</div>
          {plan.nutritionist.covered ? (
            <div className="text-[15px] font-semibold" style={{ color: "#059669" }}>{plan.nutritionist.visits} visits/year · $0</div>
          ) : (
            <div className="text-[15px] font-semibold" style={{ color: "#DC2626" }}>Not covered</div>
          )}
        </div>
      </Card>

      {plan.warnings.length > 0 && (
        <div className="space-y-3">
          {plan.warnings.map((w, i) => (
            <Banner key={i} tone="warn" icon={<Icon path={icons.alert} size={18} />}>{w}</Banner>
          ))}
        </div>
      )}
    </div>
  );
};

const GpsTab = ({ gpsSteps, checks, setChecks, navigate, completion }) => {
  if (!completion.both) {
    return (
      <EmptyState
        title="We need a bit more info"
        description="Once you've told us your plan and what you're dealing with, we'll lay out exactly where to go and in what order."
        actions={
          <>
            {!completion.profile && <Button onClick={() => navigate("profile")}>Add your info</Button>}
            {!completion.concern && <Button variant={completion.profile ? "primary" : "secondary"} onClick={() => navigate("concern")}>Describe your concern</Button>}
          </>
        }
      />
    );
  }

  const toggle = (i) => setChecks({ ...checks, [i]: !checks[i] });
  const doneCount = Object.values(checks).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full" style={{ backgroundColor: "#ECFDF5", color: "#0D9488" }}>
          <Icon path={icons.compass} size={13} />
          <span className="text-[11px] font-semibold tracking-wider uppercase">Next steps</span>
        </div>
        <Heading level={1} className="mb-2">Here's your route.</Heading>
        <p className="text-[15px]" style={{ color: "#5A6B8C" }}>
          Work through these in order. Check them off as you go — {doneCount} of {gpsSteps.length} done.
        </p>
      </div>

      <div className="space-y-4">
        {gpsSteps.map((step, i) => {
          const done = !!checks[i];
          return (
            <Card key={i} className={`p-6 transition ${done ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-4">
                <button onClick={() => toggle(i)}
                        className="flex items-center justify-center w-7 h-7 rounded-full border-2 transition flex-shrink-0 mt-0.5"
                        style={{ borderColor: done ? "#0D9488" : "#CBD5E1", backgroundColor: done ? "#0D9488" : "transparent" }}>
                  {done && <Icon path={icons.check} size={14} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-[11px] font-bold tracking-wider" style={{ color: "#0D9488" }}>STEP {i + 1}</div>
                    {step.tag && <Badge tone={step.tagTone || "neutral"}>{step.tag}</Badge>}
                  </div>
                  <Heading level={3} className={`mb-2 ${done ? "line-through" : ""}`}>{step.title}</Heading>
                  <p className="text-[14px] leading-relaxed mb-3" style={{ color: "#5A6B8C" }}>{step.description}</p>
                  {step.content}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const RoadmapTab = ({ roadmap, plan, aiResult, navigate, reset, completion }) => {
  const [copied, setCopied] = useState(false);

  if (!completion.both) {
    return (
      <EmptyState
        title="Finish the setup to see your roadmap"
        description="Your roadmap pulls from your coverage and action steps — we need both pieces first."
        actions={
          <>
            {!completion.profile && <Button onClick={() => navigate("profile")}>Add your info</Button>}
            {!completion.concern && <Button variant={completion.profile ? "primary" : "secondary"} onClick={() => navigate("concern")}>Describe your concern</Button>}
          </>
        }
      />
    );
  }

  const copyToClipboard = () => {
    const text =
      `CLEARCARE ROADMAP — ${aiResult.condition_name}\n` +
      `Plan: ${plan.name}\n\n` +
      `THIS WEEK:\n${roadmap.thisWeek.map((t) => `  • ${t}`).join("\n")}\n\n` +
      `NEXT 2 WEEKS:\n${roadmap.next2Weeks.map((t) => `  • ${t}`).join("\n")}\n\n` +
      `ONGOING:\n${roadmap.ongoing.map((t) => `  • ${t}`).join("\n")}\n`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const columns = [
    { title: "This week", subtitle: "Start here", items: roadmap.thisWeek, accent: "#0D9488", bg: "#ECFDF5" },
    { title: "Next 2 weeks", subtitle: "Book & prep", items: roadmap.next2Weeks, accent: "#1B2B4B", bg: "#F1F5FA" },
    { title: "Ongoing", subtitle: "Stay on track", items: roadmap.ongoing, accent: "#B37400", bg: "#FEF7E7" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full" style={{ backgroundColor: "#ECFDF5", color: "#0D9488" }}>
          <Icon path={icons.map} size={13} />
          <span className="text-[11px] font-semibold tracking-wider uppercase">Your roadmap</span>
        </div>
        <Heading level={1} className="mb-2">Your full plan, at a glance.</Heading>
        <p className="text-[15px]" style={{ color: "#5A6B8C" }}>
          Save this, print it, or text it to yourself — whatever helps you keep it close.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {columns.map((c) => (
          <Card key={c.title} className="overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100" style={{ backgroundColor: c.bg }}>
              <Heading level={3} className="mb-0.5">{c.title}</Heading>
              <div className="text-[12px] font-medium" style={{ color: c.accent }}>{c.subtitle}</div>
            </div>
            <div className="p-5">
              <ul className="space-y-3">
                {c.items.map((item, i) => (
                  <li key={i} className="flex gap-3 text-[14px] leading-relaxed" style={{ color: "#1B2B4B" }}>
                    <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.accent }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 md:p-7">
        <Heading level={3} className="mb-3">Summary</Heading>
        <div className="grid md:grid-cols-2 gap-4 text-[14px]">
          <div>
            <SectionLabel>Condition</SectionLabel>
            <div className="mt-1" style={{ color: "#1B2B4B" }}>{aiResult.condition_name}</div>
          </div>
          <div>
            <SectionLabel>Insurance</SectionLabel>
            <div className="mt-1" style={{ color: "#1B2B4B" }}>{plan.name}</div>
          </div>
          <div>
            <SectionLabel>Deductible</SectionLabel>
            <div className="mt-1" style={{ color: "#1B2B4B" }}>${plan.deductible.toLocaleString()}</div>
          </div>
          <div>
            <SectionLabel>Specialist visit</SectionLabel>
            <div className="mt-1" style={{ color: "#1B2B4B" }}>${plan.specialistCopay} copay</div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={copyToClipboard} variant="secondary" className="flex-1">
          <Icon path={copied ? icons.check : icons.copy} size={16} />
          {copied ? "Copied to clipboard" : "Copy roadmap"}
        </Button>
        <Button onClick={reset} variant="ghost" className="flex-1">
          <Icon path={icons.refresh} size={16} /> Start over
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// SIDEBAR
// ============================================================================

const Sidebar = ({ active, navigate, completion, onClose, isMobile }) => {
  const isLocked = (requires) => {
    if (!requires) return false;
    if (requires === "concern") return !completion.concern;
    if (requires === "both") return !completion.both;
    return false;
  };

  return (
    <aside className="flex flex-col h-full border-r border-stone-200" style={{ backgroundColor: "#F4F3EE", width: 260 }}>
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: "#0D9488" }}>
            <Icon path={icons.shield} size={16} className="text-white" />
          </div>
          <div>
            <div className="font-semibold text-[15px]" style={{ color: "#1B2B4B", fontFamily: "'Fraunces', Georgia, serif" }}>ClearCare</div>
            <div className="text-[10px] tracking-wider uppercase" style={{ color: "#5A6B8C" }}>Care navigator</div>
          </div>
        </div>
        {isMobile && (
          <button onClick={onClose} className="p-1 rounded hover:bg-stone-200">
            <Icon path={icons.x} size={18} style={{ color: "#1B2B4B" }} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const locked = isLocked(item.requires);
          const isActive = active === item.id;
          return (
            <button key={item.id}
                    onClick={() => { navigate(item.id); if (isMobile) onClose(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition"
                    style={{
                      backgroundColor: isActive ? "white" : "transparent",
                      boxShadow: isActive ? "0 1px 3px rgba(27,43,75,0.08)" : "none",
                    }}>
              <Icon path={item.icon} size={17}
                    style={{ color: isActive ? "#0D9488" : locked ? "#B8C0CE" : "#5A6B8C", flexShrink: 0 }} />
              <span className="text-[14px] font-medium flex-1"
                    style={{ color: isActive ? "#1B2B4B" : locked ? "#B8C0CE" : "#384868" }}>
                {item.label}
              </span>
              {locked && <Icon path={icons.lock} size={12} style={{ color: "#B8C0CE" }} />}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-stone-200/70">
        <div className="rounded-xl p-3.5" style={{ backgroundColor: "white" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: completion.both ? "#0D9488" : "#F59E0B" }} />
            <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "#5A6B8C" }}>
              {completion.both ? "All set" : "Setup"}
            </span>
          </div>
          <div className="text-[12px] leading-relaxed" style={{ color: "#5A6B8C" }}>
            {completion.both
              ? "Jump between sections freely — your info is saved."
              : `${(completion.profile ? 1 : 0) + (completion.concern ? 1 : 0)} of 2 steps done. Finish to unlock everything.`}
          </div>
        </div>
      </div>
    </aside>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  const [active, setActive] = useState("overview");
  const [profile, setProfile] = useState({ provider: "", planType: "", zip: "" });
  const [concern, setConcern] = useState({ text: "", status: "" });
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checks, setChecks] = useState({});
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const plan = useMemo(() => {
    const key = `${profile.provider}-${profile.planType}`;
    return INSURANCE_PLANS[key] || null;
  }, [profile]);

  const completion = useMemo(() => {
    const profileDone = !!(profile.provider && profile.planType && profile.zip.length >= 5);
    const concernDone = !!aiResult;
    return { profile: profileDone, concern: concernDone, both: profileDone && concernDone };
  }, [profile, aiResult]);

  const effectiveReferralRule = useMemo(() => {
    if (!plan) return false;
    if (plan.type === "HMO" || plan.type === "EPO") return true;
    return plan.requiresReferral;
  }, [plan]);

  const primarySpecialistKey = useMemo(() => {
    if (!aiResult) return "pcp";
    const first = (aiResult.required_specialists[0] || "").toLowerCase();
    if (first.includes("endocrin")) return "endocrinologist";
    if (first.includes("cardio")) return "cardiologist";
    return "pcp";
  }, [aiResult]);

  const primarySpecialistLabel = useMemo(() => {
    if (!aiResult) return "specialist";
    return aiResult.required_specialists[0] || "specialist";
  }, [aiResult]);

  const isDefaultZip = profile.zip === "78701";

  const gpsSteps = useMemo(() => {
    if (!aiResult || !plan) return [];
    const steps = [];
    const specialists = DOCTORS_78701[primarySpecialistKey] || DOCTORS_78701.pcp;
    const primaryLab = aiResult.required_labs[0] || "baseline labs";

    if (effectiveReferralRule) {
      const pcps = DOCTORS_78701.pcp;
      steps.push({
        title: "Call your PCP this week",
        description: `Ask for a referral to a ${primarySpecialistLabel.toLowerCase()} and request an order for ${primaryLab}. Most offices can handle this over the phone or patient portal.`,
        tag: "Start here", tagTone: "ok",
        content: (
          <div className="mt-2 p-4 rounded-xl bg-stone-50 border border-stone-200">
            <SectionLabel>In-network PCPs near you</SectionLabel>
            <div className="mt-3 space-y-2.5">
              {pcps.slice(0, 2).map((d, i) => (
                <div key={i} className="flex items-center justify-between text-[13px]">
                  <div>
                    <div className="font-semibold" style={{ color: "#1B2B4B" }}>{d.name}</div>
                    <div style={{ color: "#5A6B8C" }}>{d.distance} mi · {d.address}</div>
                  </div>
                  <Badge tone={d.accepting ? "ok" : "error"}>{d.accepting ? "Accepting" : "Full"}</Badge>
                </div>
              ))}
            </div>
          </div>
        ),
      });
    }

    steps.push({
      title: `Book your ${primarySpecialistLabel.toLowerCase()} appointment`,
      description: `Once your referral is in hand${effectiveReferralRule ? "" : " (no referral needed for your plan)"}, call one of these in-network providers. Your copay will be $${plan.specialistCopay}.`,
      tag: `${plan.specialistCopay} copay`, tagTone: "ok",
      content: (
        <div className="mt-2 space-y-2.5">
          {!isDefaultZip && (
            <div className="text-[12px] italic mb-2" style={{ color: "#B37400" }}>
              Showing sample providers — real directory coming soon for your ZIP.
            </div>
          )}
          {specialists.map((d, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-white">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[14px]" style={{ color: "#1B2B4B" }}>{d.name}</div>
                <div className="text-[12px] flex items-center gap-2 mt-0.5" style={{ color: "#5A6B8C" }}>
                  <Icon path={icons.pin} size={11} />
                  {d.distance} mi · {d.address}
                </div>
              </div>
              <Badge tone={d.accepting ? "ok" : "error"}>{d.accepting ? "Accepting" : "Full"}</Badge>
            </div>
          ))}
        </div>
      ),
    });

    if (aiResult.typical_medications.length > 0) {
      const medName = aiResult.typical_medications[0];
      const sorted = [...PHARMACIES].sort((a, b) => a.price - b.price);
      steps.push({
        title: `Fill your ${medName} prescription`,
        description: `Same drug, very different prices. Here's where it's cheapest near you.`,
        tag: "Under $10/mo", tagTone: "ok",
        content: (
          <div className="mt-2 rounded-xl border border-stone-200 overflow-hidden">
            <table className="w-full text-[13px]">
              <thead style={{ backgroundColor: "#F1F5FA" }}>
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold" style={{ color: "#1B2B4B" }}>Pharmacy</th>
                  <th className="text-right px-4 py-2.5 font-semibold" style={{ color: "#1B2B4B" }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, i) => (
                  <tr key={i} className="border-t border-stone-100">
                    <td className="px-4 py-3">
                      <div className="font-semibold" style={{ color: "#1B2B4B" }}>{p.name}</div>
                      {p.note && <div className="text-[11.5px] mt-0.5" style={{ color: "#5A6B8C" }}>{p.note}</div>}
                    </td>
                    <td className="text-right px-4 py-3">
                      <span className="font-semibold" style={{ color: p.price <= 4 ? "#059669" : "#1B2B4B" }}>${p.price}/mo</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2.5 text-[11.5px] border-t border-stone-100" style={{ backgroundColor: "#FEF7E7", color: "#7A4A00" }}>
              💡 GoodRx coupon brings CVS down to $4/month — ask at the counter or use the app.
            </div>
          </div>
        ),
      });
    }

    if (plan.nutritionist.covered) {
      steps.push({
        title: "Book your free nutritionist visits",
        description: `Your plan covers ${plan.nutritionist.visits} registered-dietitian visits per year at no cost. For a new diagnosis this is one of the highest-value things you can do early.`,
        tag: `${plan.nutritionist.visits} free visits`, tagTone: "ok", content: null,
      });
    } else {
      steps.push({
        title: "Nutrition guidance (self-pay options)",
        description: `Your plan doesn't cover a nutritionist, but a single consult (~$100–150) can pay for itself. Look for registered dietitians in your area or evidence-based apps.`,
        tag: "Not covered", tagTone: "warn", content: null,
      });
    }

    return steps;
  }, [aiResult, plan, effectiveReferralRule, primarySpecialistKey, primarySpecialistLabel, isDefaultZip]);

  const roadmap = useMemo(() => {
    if (!aiResult || !plan) return { thisWeek: [], next2Weeks: [], ongoing: [] };
    const primaryLab = aiResult.required_labs[0] || "baseline labs";
    const thisWeek = [], next2Weeks = [], ongoing = [];

    if (effectiveReferralRule) {
      thisWeek.push(`Call your PCP and request a referral to a ${primarySpecialistLabel.toLowerCase()}.`);
      thisWeek.push(`Ask your PCP to order ${primaryLab}.`);
    } else {
      thisWeek.push(`Book a ${primarySpecialistLabel.toLowerCase()} appointment directly (no referral needed).`);
    }
    next2Weeks.push(`Attend your ${primarySpecialistLabel.toLowerCase()} appointment ($${plan.specialistCopay} copay).`);
    next2Weeks.push(`Get your labs drawn: ${aiResult.required_labs.slice(0, 2).join(", ")}.`);
    if (aiResult.typical_medications.length > 0) {
      ongoing.push(`Fill ${aiResult.typical_medications[0]} monthly — HEB or Costco at $4 is your cheapest option.`);
    }
    if (plan.nutritionist.covered) {
      ongoing.push(`Schedule nutritionist visits (${plan.nutritionist.visits} free visits remaining this year).`);
    }
    ongoing.push(`Follow-up: ${aiResult.visit_frequency}.`);
    ongoing.push(aiResult.lifestyle_note);
    return { thisWeek, next2Weeks, ongoing };
  }, [aiResult, plan, effectiveReferralRule, primarySpecialistLabel]);

  const analyzeAndNavigate = async (navigate) => {
    setLoading(true);
    navigate("picture");
    const result = await callAnthropicAPI(concern.text, concern.status);
    setAiResult(result);
    setLoading(false);
  };

  const reanalyze = async (navigate) => {
    if (!concern.text.trim()) { navigate("concern"); return; }
    setLoading(true);
    const result = await callAnthropicAPI(concern.text, concern.status);
    setAiResult(result);
    setLoading(false);
  };

  const reset = () => {
    setActive("overview");
    setProfile({ provider: "", planType: "", zip: "" });
    setConcern({ text: "", status: "" });
    setAiResult(null);
    setChecks({});
  };

  const navigate = (id) => setActive(id);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#FAFAF8", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap');
        body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        @keyframes fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .tab-enter { animation: fadein 0.3s ease-out; }
        @keyframes slidein { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .slide-in { animation: slidein 0.25s ease-out; }
      `}</style>

      {!isMobile && (
        <div className="flex-shrink-0 sticky top-0 h-screen">
          <Sidebar active={active} navigate={navigate} completion={completion} isMobile={false} />
        </div>
      )}

      {isMobile && mobileNavOpen && (
        <>
          <div className="fixed inset-0 z-40" style={{ backgroundColor: "rgba(27,43,75,0.4)" }} onClick={() => setMobileNavOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 slide-in">
            <Sidebar active={active} navigate={navigate} completion={completion}
                     onClose={() => setMobileNavOpen(false)} isMobile={true} />
          </div>
        </>
      )}

      <main className="flex-1 min-w-0">
        {isMobile && (
          <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-stone-200"
               style={{ backgroundColor: "#FAFAF8" }}>
            <button onClick={() => setMobileNavOpen(true)} className="p-2 rounded-lg hover:bg-stone-100">
              <Icon path={icons.menu} size={20} style={{ color: "#1B2B4B" }} />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ backgroundColor: "#0D9488" }}>
                <Icon path={icons.shield} size={14} className="text-white" />
              </div>
              <span className="font-semibold text-[14px]" style={{ color: "#1B2B4B", fontFamily: "'Fraunces', Georgia, serif" }}>ClearCare</span>
            </div>
            <div className="w-9" />
          </div>
        )}

        <div className="px-5 py-6 md:px-10 md:py-10 max-w-5xl">
          <div key={active} className="tab-enter">
            {active === "overview" && (
              <OverviewTab profile={profile} concern={concern} aiResult={aiResult} plan={plan}
                           completion={completion} navigate={navigate} />
            )}
            {active === "profile" && (
              <ProfileTab profile={profile} setProfile={setProfile} navigate={navigate} />
            )}
            {active === "concern" && (
              <ConcernTab concern={concern} setConcern={setConcern}
                          onAnalyze={analyzeAndNavigate} loading={loading} navigate={navigate} />
            )}
            {active === "picture" && (
              <PictureTab aiResult={aiResult} loading={loading} navigate={navigate} onReanalyze={reanalyze} />
            )}
            {active === "coverage" && (
              <CoverageTab plan={plan} aiResult={aiResult} effectiveReferralRule={effectiveReferralRule}
                           navigate={navigate} completion={completion} />
            )}
            {active === "gps" && (
              <GpsTab gpsSteps={gpsSteps} checks={checks} setChecks={setChecks}
                      navigate={navigate} completion={completion} />
            )}
            {active === "roadmap" && (
              <RoadmapTab roadmap={roadmap} plan={plan} aiResult={aiResult}
                          navigate={navigate} reset={reset} completion={completion} />
            )}
          </div>

          <div className="mt-12 pt-6 border-t border-stone-200">
            <p className="text-[11.5px] text-center" style={{ color: "#8A95AB" }}>
              ClearCare provides coverage guidance, not medical advice. Always confirm with your provider and insurance.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
