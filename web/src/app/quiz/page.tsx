'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Sparkles, Check } from 'lucide-react';
import { setEmail as persistEmail } from '@/lib/email-state';

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------

const DATES = [
  { date: '2026-02-16', num: '16', day: 'Mon' },
  { date: '2026-02-17', num: '17', day: 'Tue' },
  { date: '2026-02-18', num: '18', day: 'Wed' },
  { date: '2026-02-19', num: '19', day: 'Thu' },
  { date: '2026-02-20', num: '20', day: 'Fri' },
];

const ROLES = [
  { id: 'founder-cxo', label: 'Founder / CXO', emoji: '🚀' },
  { id: 'investor-vc', label: 'Investor / VC', emoji: '💰' },
  { id: 'product-leader', label: 'Product Leader', emoji: '📊' },
  { id: 'engineer-researcher', label: 'Engineer / Researcher', emoji: '⚙️' },
  { id: 'policy-government', label: 'Policy / Government', emoji: '🏛️' },
  { id: 'student-academic', label: 'Student / Academic', emoji: '🎓' },
];

const INTERESTS = [
  { id: 'llms_foundation', label: 'LLMs & Foundation Models' },
  { id: 'agentic_ai', label: 'Agentic AI' },
  { id: 'compute_infra', label: 'Compute & Infra' },
  { id: 'safety_governance', label: 'AI Safety & Governance' },
  { id: 'startups_vc', label: 'Startups & VC' },
  { id: 'enterprise_ai', label: 'Enterprise AI' },
  { id: 'health_agri_impact', label: 'Health & Social Impact' },
  { id: 'geopolitics', label: 'Global AI Policy' },
];

const MISSIONS = [
  { id: 'hiring', label: 'Hire Talent', emoji: '👥' },
  { id: 'fundraising', label: 'Fundraise', emoji: '💵' },
  { id: 'sales', label: 'Find Customers', emoji: '🤝' },
  { id: 'upskilling', label: 'Deep Learn', emoji: '📖' },
  { id: 'networking', label: 'Network', emoji: '🌐' },
];

const TECH_DEPTH = [
  { id: 1, label: 'Policy', short: 'Big picture' },
  { id: 2, label: 'Leadership', short: 'Strategy' },
  { id: 3, label: 'Applied', short: 'Hands-on' },
  { id: 4, label: 'Technical', short: 'Deep tech' },
  { id: 5, label: 'Research', short: 'Cutting edge' },
];

const NETWORKING_DENSITY = [
  { id: 'high_power', emoji: '🎯', title: 'High-power rooms', desc: 'CEOs, ministers, decision-makers' },
  { id: 'high_volume', emoji: '🌊', title: 'High-volume halls', desc: 'Diverse, unexpected connections' },
  { id: 'balanced', emoji: '⚖️', title: 'Balanced mix', desc: 'Best of both worlds' },
];

const ORG_SIZES = [
  { id: 'solo', label: 'Solo / Pre-revenue' },
  { id: 'early_stage', label: 'Early-stage' },
  { id: 'growth_stage', label: 'Growth / Scale-up' },
  { id: 'enterprise', label: 'Enterprise / MNC' },
  { id: 'gov_ngo', label: 'Govt / NGO / Academic' },
  { id: 'exploring', label: 'Exploring' },
];

const SECTORS = [
  { id: 'developer_tools', label: 'DevTools & SaaS' },
  { id: 'fintech', label: 'Fintech' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'edtech', label: 'EdTech' },
  { id: 'manufacturing', label: 'Manufacturing' },
  { id: 'agriculture', label: 'Agriculture' },
  { id: 'defense', label: 'Defense & Cyber' },
  { id: 'media', label: 'Media' },
  { id: 'government', label: 'Public Sector' },
];

const DEAL_BREAKERS = [
  { id: 'pure_policy', label: 'Pure policy panels' },
  { id: 'highly_technical', label: 'Deep research sessions' },
  { id: 'global_south', label: 'Global South focus' },
  { id: 'large_keynote', label: 'Large keynotes only' },
  { id: 'sushma_swaraj_bhavan', label: 'Sushma Swaraj Bhavan' },
];

const TOTAL_STEPS = 9;

// Steps where selecting one option auto-advances (single-select)
const AUTO_ADVANCE_STEPS = new Set([2, 5, 7, 8]);

// ---------------------------------------------------------------------------
// Step progress dots
// ---------------------------------------------------------------------------

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              isActive
                ? 'h-2 w-6 bg-[#4338CA]'
                : isDone
                  ? 'size-2 bg-[#4338CA]/40'
                  : 'size-2 bg-[#D5D0C8]'
            }`}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable option components
// ---------------------------------------------------------------------------

function Pill({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border-[1.5px] px-4 py-2.5 text-[13px] font-semibold transition-all duration-200 ${
        selected
          ? 'border-[#4338CA] bg-[#4338CA] text-white shadow-[0_2px_8px_rgba(67,56,202,0.25)]'
          : disabled
            ? 'cursor-not-allowed border-[#E0DCD6] bg-[#FAF9F7] text-[#D5D0C8]'
            : 'border-[#E0DCD6] bg-white text-[#57534E] hover:border-[#4338CA]/30 hover:bg-[#EEF2FF] active:scale-[0.97]'
      }`}
    >
      {selected && <Check className="mr-1 inline size-3" />}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function QuizPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [userEmail, setUserEmail] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [missions, setMissions] = useState<string[]>([]);
  const [depth, setDepth] = useState<number | null>(null);
  const [density, setDensity] = useState<string | null>(null);
  const [orgSize, setOrgSize] = useState<string | null>(null);
  const [sectors, setSectors] = useState<string[]>([]);
  const [dealBreakers, setDealBreakers] = useState<string[]>([]);

  // Track quiz progress for NavBar intervention
  useEffect(() => {
    if (step > 1) {
      sessionStorage.setItem('quizStarted', '1');
    }
    return () => {
      sessionStorage.removeItem('quizStarted');
    };
  }, [step]);

  // Auto-advance: briefly shows the selection, then moves forward
  const [advancing, setAdvancing] = useState(false);

  const advance = useCallback(() => {
    setAdvancing(true);
    setTimeout(() => {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
      setAdvancing(false);
    }, 350);
  }, []);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const goNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);

  // Can user proceed from current step?
  const canProceed =
    step === 1 ? dates.length >= 1 :
    step === 2 ? role !== null :
    step === 3 ? interests.length >= 1 :
    true; // Steps 4+ are optional

  const canGenerate = step >= 3;

  function handleSubmit() {
    // Persist email to localStorage if provided
    if (userEmail.trim()) {
      persistEmail(userEmail.trim());
    }

    const quizAnswers = {
      mode: 'quiz' as const,
      user_email: userEmail.trim() || null,
      dates,
      role,
      interests,
      missions: missions.length > 0 ? missions : null,
      technical_depth: depth,
      networking_density: density,
      org_size: orgSize,
      sectors: sectors.length > 0 ? sectors : null,
      deal_breakers: dealBreakers.length > 0 ? dealBreakers : null,
      completedSteps: step,
    };
    localStorage.setItem('quizAnswers', JSON.stringify(quizAnswers));
    router.push('/loading');
  }

  // Toggle helpers for multi-select with limits
  function toggle(arr: string[], id: string, max: number): string[] {
    if (arr.includes(id)) return arr.filter((x) => x !== id);
    if (arr.length >= max) return arr;
    return [...arr, id];
  }

  // -----------------------------------------------------------------------
  // Step content renderer
  // -----------------------------------------------------------------------

  function renderContent() {
    switch (step) {
      // ─── STEP 1: Dates ─────────────────────────────────────────
      case 1:
        return (
          <StepLayout
            title="When are you there?"
            subtitle="Select the days you'll attend"
            badge="Required"
          >
            {/* Email input — prominent card */}
            <div className="mb-8 mx-auto max-w-[340px]">
              <div className="rounded-2xl border border-[#E0DCD6] bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4338CA] to-[#6366F1]">
                    <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-[#292524] leading-snug">
                      Get your PDF schedule + post-summit brief
                    </p>
                    <p className="text-[11px] text-[#78716C] mt-0.5">
                      Printable itinerary & key takeaways from your sessions
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full rounded-xl border-[1.5px] border-[#E0DCD6] bg-white px-4 py-3 pr-16 text-[14px] text-[#292524] placeholder:text-[#A8A29E] focus:border-[#4338CA] focus:outline-none focus:ring-2 focus:ring-[#4338CA]/20 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[#A8A29E]">
                    optional
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-2.5 sm:gap-3">
              {DATES.map((d) => {
                const sel = dates.includes(d.date);
                return (
                  <button
                    key={d.date}
                    onClick={() => setDates((p) => p.includes(d.date) ? p.filter((x) => x !== d.date) : [...p, d.date])}
                    className={`flex flex-col items-center rounded-2xl px-3.5 py-3.5 transition-all duration-200 sm:px-5 sm:py-4 ${
                      sel
                        ? 'bg-[#4338CA] text-white shadow-[0_4px_14px_rgba(67,56,202,0.35)]'
                        : 'bg-white border border-[#E0DCD6] text-[#57534E] hover:border-[#4338CA]/30 active:scale-[0.97]'
                    }`}
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${sel ? 'text-white/60' : 'text-[#A8A29E]'}`}>
                      {d.day}
                    </span>
                    <span className={`font-[family-name:var(--font-mono)] text-[24px] font-black leading-tight ${sel ? 'text-white' : 'text-[#292524]'}`}>
                      {d.num}
                    </span>
                    <span className={`text-[10px] font-medium ${sel ? 'text-white/60' : 'text-[#A8A29E]'}`}>
                      Feb
                    </span>
                  </button>
                );
              })}
            </div>
            {dates.length > 0 && (
              <p className="mt-4 text-center text-[12px] font-medium text-[#4338CA]">
                {dates.length} day{dates.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </StepLayout>
        );

      // ─── STEP 2: Role (auto-advance) ──────────────────────────
      case 2:
        return (
          <StepLayout
            title="What's your role?"
            subtitle="This shapes who you'll meet"
            badge="Required"
          >
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
              {ROLES.map((r) => {
                const sel = role === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => { setRole(r.id); advance(); }}
                    className={`flex flex-col items-center rounded-2xl border-[1.5px] px-3 py-4 text-center transition-all duration-200 ${
                      sel
                        ? 'border-[#4338CA] bg-[#4338CA] text-white shadow-[0_4px_14px_rgba(67,56,202,0.35)]'
                        : 'border-[#E0DCD6] bg-white text-[#57534E] hover:border-[#4338CA]/30 active:scale-[0.97]'
                    }`}
                  >
                    <span className="text-[22px] mb-1.5">{r.emoji}</span>
                    <span className="text-[12px] font-bold leading-tight">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </StepLayout>
        );

      // ─── STEP 3: Interests (multi max 3) ──────────────────────
      case 3:
        return (
          <StepLayout
            title="What pulls you in?"
            subtitle="Pick up to 3 topics"
            badge="Required"
          >
            <div className="flex flex-wrap justify-center gap-2">
              {INTERESTS.map((i) => (
                <Pill
                  key={i.id}
                  label={i.label}
                  selected={interests.includes(i.id)}
                  disabled={!interests.includes(i.id) && interests.length >= 3}
                  onClick={() => setInterests((p) => toggle(p, i.id, 3))}
                />
              ))}
            </div>
            <Counter current={interests.length} max={3} />
          </StepLayout>
        );

      // ─── STEP 4: Sectors (multi max 2) ────────────────────────
      case 4:
        return (
          <StepLayout
            title="Your sector?"
            subtitle="Pick up to 2"
            badge="Optional"
          >
            <div className="flex flex-wrap justify-center gap-2">
              {SECTORS.map((s) => (
                <Pill
                  key={s.id}
                  label={s.label}
                  selected={sectors.includes(s.id)}
                  disabled={!sectors.includes(s.id) && sectors.length >= 2}
                  onClick={() => setSectors((p) => toggle(p, s.id, 2))}
                />
              ))}
            </div>
            <Counter current={sectors.length} max={2} />
          </StepLayout>
        );

      // ─── STEP 5: Org Size (auto-advance) ──────────────────────
      case 5:
        return (
          <StepLayout
            title="Your organization?"
            subtitle="Helps us match you with peers"
            badge="Optional"
          >
            <div className="flex flex-wrap justify-center gap-2">
              {ORG_SIZES.map((o) => (
                <button
                  key={o.id}
                  onClick={() => { setOrgSize(o.id); advance(); }}
                  className={`rounded-full border-[1.5px] px-4 py-2.5 text-[13px] font-semibold transition-all duration-200 ${
                    orgSize === o.id
                      ? 'border-[#4338CA] bg-[#4338CA] text-white shadow-[0_2px_8px_rgba(67,56,202,0.25)]'
                      : 'border-[#E0DCD6] bg-white text-[#57534E] hover:border-[#4338CA]/30 active:scale-[0.97]'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </StepLayout>
        );

      // ─── STEP 6: Missions (multi max 2) ───────────────────────
      case 6:
        return (
          <StepLayout
            title="Your #1 mission?"
            subtitle="Pick up to 2"
            badge="Optional"
          >
            <div className="flex flex-wrap justify-center gap-2">
              {MISSIONS.map((m) => {
                const sel = missions.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => setMissions((p) => toggle(p, m.id, 2))}
                    disabled={!sel && missions.length >= 2}
                    className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-4 py-2.5 text-[13px] font-semibold transition-all duration-200 ${
                      sel
                        ? 'border-[#4338CA] bg-[#4338CA] text-white shadow-[0_2px_8px_rgba(67,56,202,0.25)]'
                        : !sel && missions.length >= 2
                          ? 'cursor-not-allowed border-[#E0DCD6] bg-[#FAF9F7] text-[#D5D0C8]'
                          : 'border-[#E0DCD6] bg-white text-[#57534E] hover:border-[#4338CA]/30 active:scale-[0.97]'
                    }`}
                  >
                    <span>{m.emoji}</span>
                    {m.label}
                  </button>
                );
              })}
            </div>
            <Counter current={missions.length} max={2} />
          </StepLayout>
        );

      // ─── STEP 7: Tech Depth (auto-advance) ────────────────────
      case 7:
        return (
          <StepLayout
            title="How technical?"
            subtitle="Slide from strategy to research"
            badge="Optional"
          >
            <div className="flex justify-center gap-1.5 sm:gap-2">
              {TECH_DEPTH.map((td) => {
                const sel = depth === td.id;
                return (
                  <button
                    key={td.id}
                    onClick={() => { setDepth(td.id); advance(); }}
                    className={`flex flex-1 max-w-[72px] flex-col items-center rounded-2xl border-[1.5px] py-4 transition-all duration-200 ${
                      sel
                        ? 'border-[#4338CA] bg-[#4338CA] text-white shadow-[0_4px_14px_rgba(67,56,202,0.35)]'
                        : 'border-[#E0DCD6] bg-white text-[#57534E] hover:border-[#4338CA]/30 active:scale-[0.97]'
                    }`}
                  >
                    <span className={`font-[family-name:var(--font-mono)] text-[20px] font-black ${sel ? 'text-white' : 'text-[#292524]'}`}>
                      {td.id}
                    </span>
                    <span className="mt-1 text-[10px] font-bold leading-tight">{td.label}</span>
                    <span className={`mt-0.5 text-[9px] ${sel ? 'text-white/60' : 'text-[#A8A29E]'}`}>{td.short}</span>
                  </button>
                );
              })}
            </div>
          </StepLayout>
        );

      // ─── STEP 8: Networking Density (auto-advance) ─────────────
      case 8:
        return (
          <StepLayout
            title="What kind of room?"
            subtitle="Think about who you want around you"
            badge="Optional"
          >
            <div className="flex flex-col gap-2.5">
              {NETWORKING_DENSITY.map((nd) => {
                const sel = density === nd.id;
                return (
                  <button
                    key={nd.id}
                    onClick={() => { setDensity(nd.id); advance(); }}
                    className={`flex items-center gap-4 rounded-2xl border-[1.5px] px-5 py-4 text-left transition-all duration-200 ${
                      sel
                        ? 'border-[#4338CA] bg-[#4338CA] text-white shadow-[0_4px_14px_rgba(67,56,202,0.35)]'
                        : 'border-[#E0DCD6] bg-white text-[#57534E] hover:border-[#4338CA]/30 active:scale-[0.97]'
                    }`}
                  >
                    <span className="text-[24px] shrink-0">{nd.emoji}</span>
                    <div>
                      <span className="block text-[14px] font-bold">{nd.title}</span>
                      <span className={`block text-[12px] ${sel ? 'text-white/70' : 'text-[#A8A29E]'}`}>{nd.desc}</span>
                    </div>
                    {sel && <Check className="ml-auto size-5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </StepLayout>
        );

      // ─── STEP 9: Deal Breakers (multi max 3) ──────────────────
      case 9:
        return (
          <StepLayout
            title="Anything to avoid?"
            subtitle="We'll keep these out of your schedule"
            badge="Optional"
          >
            <div className="flex flex-wrap justify-center gap-2">
              {DEAL_BREAKERS.map((db) => (
                <Pill
                  key={db.id}
                  label={db.label}
                  selected={dealBreakers.includes(db.id)}
                  disabled={!dealBreakers.includes(db.id) && dealBreakers.length >= 3}
                  onClick={() => setDealBreakers((p) => toggle(p, db.id, 3))}
                />
              ))}
            </div>
            <Counter current={dealBreakers.length} max={3} label="optional" />
          </StepLayout>
        );

      default:
        return null;
    }
  }

  // -----------------------------------------------------------------------
  // Determine bottom bar type
  // -----------------------------------------------------------------------

  const isLastStep = step === TOTAL_STEPS;
  const isFirstStep = step === 1;
  // Generate enabled once all 3 mandatory steps are answered
  const canGenerateFinal = dates.length >= 1 && role !== null && interests.length >= 1;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#EEEBE6]">
      {/* ── TOP BAR ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <button
          onClick={() => (step === 1 ? router.back() : undefined)}
          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-[#57534E] transition-colors hover:bg-white/60 ${step !== 1 ? 'invisible' : ''}`}
        >
          <ArrowLeft className="size-4" />
          Home
        </button>

        <StepDots current={step} total={TOTAL_STEPS} />

        <div className="w-[60px]" /> {/* Spacer for centering */}
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-4">
        <div key={step} className={`w-full max-w-[480px] ${advancing ? 'animate-fade-out-left' : 'animate-slide-in-right'}`}>
          {renderContent()}
        </div>
      </div>

      {/* ── BOTTOM BAR ──────────────────────────────────────────── */}
      <div className="sticky bottom-0 border-t border-[#E0DCD6] bg-[#FAF9F7]/95 backdrop-blur-sm px-5 py-4 safe-bottom">
        <div className="mx-auto flex max-w-[480px] flex-col gap-3">
          {/* Row 1: Main action buttons */}
          {isLastStep ? (
            // Last step: full-width primary Generate
            <button
              onClick={handleSubmit}
              disabled={!canGenerateFinal}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4338CA] to-[#6366F1] py-4 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(67,56,202,0.4)] transition-all hover:shadow-[0_6px_20px_rgba(67,56,202,0.5)] active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
            >
              <Sparkles className="size-5" />
              Generate Schedule
            </button>
          ) : (
            // Steps 1-8: Generate (secondary) + Next (primary)
            <div className="flex w-full items-center gap-3">
              {/* Generate Schedule — secondary */}
              <button
                onClick={handleSubmit}
                disabled={!canGenerateFinal}
                className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-4 py-3 text-[13px] font-bold transition-all active:scale-[0.98] ${
                  canGenerateFinal
                    ? 'border-[#4338CA] bg-white text-[#4338CA] hover:bg-[#EEF2FF]'
                    : 'cursor-not-allowed border-[#E0DCD6] bg-white text-[#D5D0C8]'
                }`}
              >
                <Sparkles className="size-4" />
                Generate
              </button>

              {/* Next — primary */}
              <button
                onClick={goNext}
                disabled={!canProceed}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#4338CA] py-3 text-[14px] font-bold text-white transition-all hover:bg-[#3730A3] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#E0DCD6] disabled:text-[#A8A29E]"
              >
                Next
                <ArrowRight className="size-4" />
              </button>
            </div>
          )}

          {/* Row 2: Previous link + step hint */}
          <div className="flex items-center justify-between">
            {!isFirstStep ? (
              <button
                onClick={goBack}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[#57534E] underline underline-offset-2 decoration-[#D5D0C8] transition-colors hover:text-[#292524] hover:decoration-[#292524]"
              >
                <ArrowLeft className="size-3.5" />
                Previous
              </button>
            ) : (
              <div />
            )}
            {step <= 3 ? (
              <p className="text-[11px] text-[#A8A29E]">
                {step === 3 ? 'Required steps done' : `Step ${step} of 3 required`}
              </p>
            ) : (
              <p className="text-[11px] text-[#A8A29E]">
                Optional — refine your schedule
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout wrapper for each step
// ---------------------------------------------------------------------------

function StepLayout({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {badge && (
        <div className="mb-3 flex justify-center">
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            badge === 'Required'
              ? 'bg-[#4338CA]/10 text-[#4338CA]'
              : 'bg-[#D5D0C8]/40 text-[#A8A29E]'
          }`}>
            {badge}
          </span>
        </div>
      )}
      <h2 className="mb-1 text-center text-[24px] font-black tracking-tight text-[#292524] sm:text-[28px]">
        {title}
      </h2>
      <p className="mb-6 text-center text-[13px] text-[#A8A29E]">
        {subtitle}
      </p>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Counter for multi-select steps
// ---------------------------------------------------------------------------

function Counter({ current, max, label }: { current: number; max: number; label?: string }) {
  return (
    <p className="mt-3 text-center text-[12px] font-medium text-[#A8A29E]">
      {current} of {max} {label ? `(${label})` : 'selected'}
    </p>
  );
}
