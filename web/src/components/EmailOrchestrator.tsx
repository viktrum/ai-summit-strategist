'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { EmailModal, type EmailModalVariant, type PlanDataForPDF } from '@/components/EmailModal';
import { EmailStickyBar } from '@/components/EmailStickyBar';
import { trackEvent } from '@/lib/analytics';
import {
  ensureFirstVisitDate,
  hasEmail,
  isReturningUser,
  shouldShowModal,
  shouldShowStickyBar,
  isDismissedThisSession,
} from '@/lib/email-state';

export function EmailOrchestrator() {
  const pathname = usePathname();
  const [modalVariant, setModalVariant] = useState<EmailModalVariant | null>(null);
  const [showBar, setShowBar] = useState(false);
  const [emailCollected, setEmailCollected] = useState(false);

  const isPlanPage = pathname.startsWith('/plan/');
  const isHomePage = pathname === '/';
  const isLoadingPage = pathname === '/loading';
  const isQuizPage = pathname === '/quiz';

  // Decide what to show
  const evaluate = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isLoadingPage || isQuizPage) return; // Never show on loading or quiz

    ensureFirstVisitDate();

    // If email already collected, nothing to show
    if (hasEmail()) {
      setModalVariant(null);
      setShowBar(false);
      return;
    }

    // Check sticky bar first (takes priority — user opted out of modals)
    if (shouldShowStickyBar()) {
      setShowBar(isPlanPage || isHomePage);
      setModalVariant(null);
      return;
    }

    // Check modal gates
    if (!shouldShowModal()) {
      setModalVariant(null);
      setShowBar(false);
      return;
    }

    // Check for post-generation save modal trigger
    if (isPlanPage) {
      try {
        const showSave = sessionStorage.getItem('showSaveModal');
        if (showSave === '1') {
          sessionStorage.removeItem('showSaveModal');
          // Small delay so the plan renders first
          setTimeout(() => setModalVariant('save'), 800);
          return;
        }
      } catch { /* ignore */ }
    }

    // Returning user checks
    if (isReturningUser()) {
      try {
        const lastPlanId = localStorage.getItem('lastPlanId');
        if (lastPlanId) {
          setModalVariant('brief');
        } else {
          setModalVariant('create-plan');
        }
      } catch {
        setModalVariant('create-plan');
      }
      return;
    }

    // First-time visitor — don't show anything
    setModalVariant(null);
    setShowBar(false);
  }, [isPlanPage, isHomePage, isLoadingPage, isQuizPage]);

  // Evaluate on mount and route change
  useEffect(() => {
    evaluate();
  }, [evaluate, pathname]);

  // After modal dismiss — re-check if sticky bar should appear
  const handleModalClose = useCallback(() => {
    setModalVariant(null);
    // Re-evaluate after a tick (dismiss state needs to settle)
    setTimeout(() => {
      if (shouldShowStickyBar() && (isPlanPage || isHomePage)) {
        setShowBar(true);
      }
    }, 50);
  }, [isPlanPage, isHomePage]);

  // Email submitted — hide everything
  const handleEmailSubmitted = useCallback(() => {
    setEmailCollected(true);
    setShowBar(false);
    setModalVariant(null);
  }, []);

  // Sticky bar click — open modal
  const handleBarClick = useCallback(() => {
    trackEvent('sticky_bar_clicked', null, { page: pathname });
    setShowBar(false);
    // Show appropriate variant
    try {
      const lastPlanId = localStorage.getItem('lastPlanId');
      setModalVariant(isPlanPage ? 'save' : (lastPlanId ? 'brief' : 'create-plan'));
    } catch {
      setModalVariant('brief');
    }
  }, [isPlanPage, pathname]);

  // Get planId for Supabase operations
  const getPlanId = useCallback((): string | null => {
    try {
      return localStorage.getItem('lastPlanId');
    } catch {
      return null;
    }
  }, []);

  // Extract plan data from localStorage for PDF generation
  const getPlanData = useCallback((): PlanDataForPDF | null => {
    if (!isPlanPage) return null;
    try {
      const raw = localStorage.getItem('planResult');
      if (!raw) return null;
      const plan = JSON.parse(raw);
      if (!plan?.schedule) return null;
      return {
        headline: plan.headline || '',
        strategy_note: plan.strategyNote || '',
        schedule: plan.schedule.map((day: { date: string; events: Array<{ event: { title: string; start_time: string; end_time: string | null; venue: string; room: string; speakers: string; summary_one_liner: string }; tier: string; score: number; isFallback?: boolean; isTimeSlotFill?: boolean }> }) => ({
          date: day.date,
          events: day.events
            .filter((e: { isFallback?: boolean }) => !e.isFallback)
            .map((e: { event: { title: string; start_time: string; end_time: string | null; venue: string; room: string; speakers: string; summary_one_liner: string }; tier: string; score: number; isTimeSlotFill?: boolean }) => ({
              title: e.event.title,
              start_time: e.event.start_time,
              end_time: e.event.end_time,
              venue: e.event.venue || '',
              room: e.event.room || '',
              speakers: e.event.speakers || '',
              summary_one_liner: e.event.summary_one_liner || '',
              tier: e.tier,
              score: e.score,
              is_time_slot_fill: e.isTimeSlotFill || false,
            })),
        })),
        exhibitor_count: plan.exhibitors?.length || 0,
      };
    } catch {
      return null;
    }
  }, [isPlanPage]);

  if (emailCollected) return null;

  return (
    <>
      {showBar && <EmailStickyBar onClick={handleBarClick} />}
      {modalVariant && (
        <EmailModal
          variant={modalVariant}
          planId={getPlanId()}
          planData={modalVariant === 'save' ? getPlanData() : null}
          onClose={handleModalClose}
          onEmailSubmitted={handleEmailSubmitted}
        />
      )}
    </>
  );
}
