'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { generateRecommendations } from '@/lib/scoring';
import { buildProfileFromQuiz } from '@/lib/quiz-mapper';
import eventsData from '@/data/events.json';
import exhibitorsData from '@/data/exhibitors.json';
import type { Event, Exhibitor, UserRole } from '@/lib/types';
import { ROLE_LABEL_MAP, DENSITY_LABEL_MAP, INTEREST_LABEL_MAP, MISSION_LABEL_MAP } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Terminal animation line type
// ---------------------------------------------------------------------------

interface TerminalLine {
  text: string;
  isSuccess: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LINE_DELAY_MS = 400;
const REDIRECT_DELAY_MS = 500;

// ---------------------------------------------------------------------------
// Quiz ID -> scoring engine value mappings
// ---------------------------------------------------------------------------

const ROLE_ID_MAP: Record<string, UserRole> = {
  'founder-cxo': 'founder',
  'investor-vc': 'investor',
  'product-leader': 'product',
  'engineer-researcher': 'engineer',
  'policy-government': 'policy',
  'student-academic': 'student',
};

// ---------------------------------------------------------------------------
// Dynamic terminal line generator
// ---------------------------------------------------------------------------

function buildTerminalLines(quizAnswers: Record<string, unknown> | null): TerminalLine[] {
  // Line 1: always static
  const lines: TerminalLine[] = [
    { text: '> Initializing AI Impact Summit Planner...', isSuccess: false },
  ];

  // Line 2: role
  const roleId = quizAnswers?.role as string | undefined;
  const roleLabel = roleId ? ROLE_LABEL_MAP[roleId] : null;
  lines.push({
    text: roleLabel
      ? `> Reading your profile... (matched: ${roleLabel})`
      : '> Loading profile data...',
    isSuccess: false,
  });

  // Line 3: number of days
  const dates = (quizAnswers?.dates as string[] | undefined) || [];
  const dayCount = dates.length;
  lines.push({
    text: dayCount > 0
      ? `> Filtering 463 events across ${dayCount} day${dayCount === 1 ? '' : 's'}...`
      : '> Scanning 463 events across 5 days...',
    isSuccess: false,
  });

  // Line 4: interests
  const interestIds = (quizAnswers?.interests as string[] | undefined) || [];
  const interestLabels = interestIds
    .map((id) => INTEREST_LABEL_MAP[id] || id)
    .filter(Boolean);
  lines.push({
    text: interestLabels.length > 0
      ? `> Scoring against your interests: ${interestLabels.join(', ')}...`
      : '> Matching keywords and personas...',
    isSuccess: false,
  });

  // Line 5: networking density or fallback
  const densityId = quizAnswers?.networking_density as string | undefined;
  const densityLabel = densityId ? DENSITY_LABEL_MAP[densityId] : null;
  lines.push({
    text: densityLabel
      ? `> Identifying ${densityLabel}...`
      : '> Scanning heavy hitter sessions...',
    isSuccess: false,
  });

  // Lines 6-9: static
  lines.push({ text: '> Calculating ROI scores for top candidates...', isSuccess: false });
  lines.push({ text: '> Resolving time conflicts...', isSuccess: false });
  lines.push({ text: '> Generating icebreakers and strategy...', isSuccess: false });
  lines.push({ text: '> Building your personalized schedule...', isSuccess: false });

  // Line 10: success
  lines.push({ text: '\u2713 Strategy complete! Redirecting...', isSuccess: true });

  return lines;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoadingStrategyPage() {
  const router = useRouter();
  const [visibleLines, setVisibleLines] = useState(0);
  const [scoringDone, setScoringDone] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const hasStartedScoring = useRef(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const planIdRef = useRef<string>('local');

  // Read quizAnswers once for building dynamic terminal lines
  const terminalLines = useMemo<TerminalLine[]>(() => {
    if (typeof window === 'undefined') return buildTerminalLines(null);
    try {
      const raw = localStorage.getItem('quizAnswers');
      return buildTerminalLines(raw ? JSON.parse(raw) : null);
    } catch {
      return buildTerminalLines(null);
    }
  }, []);

  // Run the scoring engine once on mount
  const runScoring = useCallback(async () => {
    if (hasStartedScoring.current) return;
    hasStartedScoring.current = true;

    try {
      // Read quiz answers from localStorage
      const quizRaw = localStorage.getItem('quizAnswers');

      if (!quizRaw) {
        router.replace('/');
        return;
      }

      const quizAnswers = JSON.parse(quizRaw);

      // Read dates: prefer quizAnswers.dates, fall back to separate selectedDates key
      let selectedDates: string[] = [];
      if (Array.isArray(quizAnswers.dates) && quizAnswers.dates.length > 0) {
        selectedDates = quizAnswers.dates;
      } else {
        const datesRaw = localStorage.getItem('selectedDates');
        if (datesRaw) {
          selectedDates = JSON.parse(datesRaw);
        }
      }

      if (selectedDates.length === 0) {
        router.replace('/');
        return;
      }

      let plan;

      if (quizAnswers.mode === 'profile') {
        const profile = buildProfileFromQuiz(
          'founder',
          ['llms_foundation', 'enterprise_ai'],
          ['networking'],
          selectedDates
        );
        plan = generateRecommendations(
          eventsData as Event[],
          exhibitorsData as Exhibitor[],
          profile
        );
      } else {
        const role: UserRole = ROLE_ID_MAP[quizAnswers.role] || 'founder';
        const focusAreas: string[] = quizAnswers.interests || [];
        const missions: string[] = quizAnswers.missions || [];

        const profile = buildProfileFromQuiz(
          role,
          focusAreas,
          missions,
          selectedDates,
          undefined,
          quizAnswers.technical_depth || null,
          quizAnswers.networking_density || null,
          quizAnswers.org_size || null,
          quizAnswers.sectors || null,
          quizAnswers.deal_breakers || null,
        );

        plan = generateRecommendations(
          eventsData as Event[],
          exhibitorsData as Exhibitor[],
          profile
        );
      }

      // Always keep localStorage as fallback (full plan for local use)
      localStorage.setItem('planResult', JSON.stringify(plan));

      // Save slim version to Supabase (just IDs + tiers + scores)
      try {
        // Build id-based lookup for fallback_for resolution (event_id → id)
        const eidToId = new Map(
          plan.schedule.flatMap((d) => d.events.map((se) => [se.event.event_id, se.event.id]))
        );

        const slimEvents = plan.schedule.flatMap((day) =>
          day.events.map((se) => ({
            id: se.event.id,
            tier: se.tier,
            score: se.score,
            pinned: false,
            is_fallback: se.isFallback,
            fallback_for: se.fallbackFor ? (eidToId.get(se.fallbackFor) ?? null) : null,
          }))
        );
        const exhibitorIds = plan.exhibitors.map((e) => e.exhibitor.id);

        let saved = false;

        // Try with user_name first
        const { data, error } = await supabase
          .from('user_plans')
          .insert({
            headline: plan.headline,
            strategy_note: plan.strategyNote,
            events: slimEvents,
            exhibitor_ids: exhibitorIds,
            user_name: quizAnswers.user_name || '',
          })
          .select('id')
          .single();

        if (!error && data?.id) {
          planIdRef.current = data.id;
          localStorage.setItem('lastPlanId', data.id);
          saved = true;
        }

        // Retry without user_name if the column doesn't exist yet
        if (!saved && error) {
          console.warn('Supabase insert failed, retrying without user_name:', error.message);
          const { data: d2, error: e2 } = await supabase
            .from('user_plans')
            .insert({
              headline: plan.headline,
              strategy_note: plan.strategyNote,
              events: slimEvents,
              exhibitor_ids: exhibitorIds,
            })
            .select('id')
            .single();

          if (!e2 && d2?.id) {
            planIdRef.current = d2.id;
            localStorage.setItem('lastPlanId', d2.id);
          } else {
            console.warn('Supabase fallback also failed:', e2?.message);
          }
        }
      } catch (e) {
        console.warn('Supabase save failed, using local fallback:', e);
      }

      setScoringDone(true);
    } catch (err) {
      console.error('Scoring engine error:', err);
      setScoringDone(true);
    }
  }, [router]);

  // Start scoring on mount
  useEffect(() => {
    runScoring();
  }, [runScoring]);

  // Terminal animation: reveal lines one by one
  useEffect(() => {
    if (visibleLines >= terminalLines.length) {
      setAnimationDone(true);
      return;
    }

    const timer = setTimeout(() => {
      setVisibleLines((prev) => prev + 1);
    }, LINE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [visibleLines, terminalLines.length]);

  // Auto-scroll terminal to bottom as new lines appear
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [visibleLines]);

  // Navigate once both animation and scoring are done
  useEffect(() => {
    if (animationDone && scoringDone) {
      const timer = setTimeout(() => {
        try { sessionStorage.setItem('showSaveModal', '1'); } catch { /* ignore */ }
        router.push(`/plan/${planIdRef.current}`);
      }, REDIRECT_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [animationDone, scoringDone, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      {/* Terminal card */}
      <div className="w-full max-w-xl">
        {/* Terminal window */}
        <div className="overflow-hidden rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)]">
          {/* Title bar */}
          <div className="flex items-center gap-[6px] bg-[#2A2A28] p-3">
            {/* Traffic light dots */}
            <div className="h-[10px] w-[10px] rounded-full bg-[#FF5F57]" />
            <div className="h-[10px] w-[10px] rounded-full bg-[#FFBD2E]" />
            <div className="h-[10px] w-[10px] rounded-full bg-[#28CA42]" />
            <span className="ml-2 font-[family-name:var(--font-mono)] text-xs text-[#8A8A87]">
              AI Impact Summit Planner v1.0
            </span>
          </div>

          {/* Terminal body */}
          <div
            ref={terminalRef}
            className="min-h-[280px] max-h-[400px] overflow-y-auto bg-[#1A1A19] p-5 font-[family-name:var(--font-mono)] text-[13px] leading-8 text-[#A0A09D]"
          >
            {terminalLines.slice(0, visibleLines).map((line, index) => {
              const isCurrentLine = index === visibleLines - 1;
              const isLastLine = index === terminalLines.length - 1;

              return (
                <div
                  key={index}
                  className={`animate-fade-in-up ${
                    line.isSuccess ? 'font-semibold text-[#059669]' : ''
                  }`}
                >
                  {line.text}
                  {/* Blinking cursor on the current line (not the success line) */}
                  {isCurrentLine && !isLastLine && (
                    <span className="terminal-cursor" />
                  )}
                </div>
              );
            })}

            {/* Blinking cursor when no lines yet */}
            {visibleLines === 0 && (
              <div>
                <span className="terminal-cursor" />
              </div>
            )}
          </div>

          {/* Progress bar inside terminal */}
          <div className="mx-5 mb-5 mt-3 h-[2px] overflow-hidden rounded-full bg-[#2A2A28]">
            <div
              className="h-full rounded-full bg-[#4338CA] transition-all duration-500 ease-out"
              style={{
                width: `${(visibleLines / terminalLines.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Status text below terminal */}
        <p className="mt-4 text-center text-[13px] text-[#8A8A87]">
          {animationDone && scoringDone
            ? 'Redirecting to your strategy...'
            : animationDone && !scoringDone
              ? 'Finalizing calculations...'
              : 'Building your personalized strategy'}
        </p>
      </div>
    </div>
  );
}
