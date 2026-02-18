'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowRight, Menu, X, Sparkles, Link2, Download, AlertTriangle, CalendarDays, ExternalLink } from 'lucide-react';

const LINKEDIN_URL = 'https://www.linkedin.com/in/piyushmayank?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app';

export function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [intervention, setIntervention] = useState<'quiz' | 'plan' | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastPlanId, setLastPlanId] = useState<string | null>(null);
  const pendingNavRef = useRef<string | null>(null);

  const isHome = pathname === '/';
  const isQuiz = pathname === '/quiz';
  const isPlan = pathname.startsWith('/plan/');
  const isLoading = pathname === '/loading';
  const isExplore = pathname === '/explore';
  const showFloatingSchedule = (isHome || isExplore) && !!lastPlanId;

  // ── Read cached plan ID ────────────────────────────────────────
  useEffect(() => {
    try {
      const id = localStorage.getItem('lastPlanId');
      setLastPlanId(id);
    } catch {
      // ignore
    }
  }, [pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // ── Intervention checks ──────────────────────────────────────
  const isQuizInProgress = useCallback((): boolean => {
    if (!isQuiz) return false;
    try {
      const flag = sessionStorage.getItem('quizStarted');
      return flag === '1';
    } catch {
      return false;
    }
  }, [isQuiz]);

  // ── Navigate with intervention ───────────────────────────────
  const navigateTo = useCallback(
    (target: string) => {
      setMobileMenuOpen(false);

      // Quiz intervention
      if (isQuiz && isQuizInProgress()) {
        pendingNavRef.current = target;
        setIntervention('quiz');
        return;
      }

      // Plan intervention
      if (isPlan) {
        pendingNavRef.current = target;
        setIntervention('plan');
        return;
      }

      router.push(target);
    },
    [isQuiz, isPlan, isQuizInProgress, router],
  );

  const confirmLeave = () => {
    const target = pendingNavRef.current;
    setIntervention(null);
    pendingNavRef.current = null;
    if (target) {
      router.push(target);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  // Hide on loading page
  if (isLoading) return null;

  const planCta = 'Generate Schedule';

  return (
    <>
      <nav
        className="sticky top-0 z-40 border-b border-[#E0DCD6] bg-white/90 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-[780px] items-center justify-between px-5 py-2.5">
          {/* Brand logo */}
          <button
            onClick={() => navigateTo('/')}
            className="flex shrink-0 items-center gap-2"
          >
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#4338CA] to-[#6366F1]">
              <Sparkles className="size-3.5 text-white" />
            </div>
            <span className="text-[14px] font-bold text-[#292524] hidden sm:block">
              Summit Planner
            </span>
          </button>

          {/* Desktop links */}
          <div className="hidden items-center gap-5 sm:flex">
            {!isHome && (
              <button
                onClick={() => navigateTo('/')}
                className="text-[13px] font-medium text-[#57534E] transition-colors hover:text-[#292524]"
              >
                Home
              </button>
            )}
            <button
              onClick={() => navigateTo('/explore')}
              className="text-[13px] font-medium text-[#57534E] transition-colors hover:text-[#292524]"
            >
              Explore
            </button>
            {lastPlanId && !isPlan && (
              <button
                onClick={() => navigateTo(`/plan/${lastPlanId}`)}
                className="text-[13px] font-medium text-[#4338CA] transition-colors hover:text-[#3730A3]"
              >
                My Schedule
              </button>
            )}
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-[#57534E] transition-colors hover:text-[#292524]"
            >
              Contact
              <ExternalLink className="size-3" />
            </a>
            <button
              onClick={() => navigateTo('/quiz')}
              className="rounded-lg bg-[#4338CA] px-3.5 py-1.5 text-[12px] font-bold text-white transition-all hover:bg-[#3730A3]"
            >
              {planCta}
            </button>
          </div>

          {/* Mobile: LinkedIn pill + hamburger */}
          <div className="flex items-center gap-2 sm:hidden">
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E0DCD6] px-2.5 py-1.5 text-[12px] font-semibold text-[#57534E] transition-colors hover:border-[#0A66C2]/30 hover:bg-[#EFF6FF] hover:text-[#0A66C2]"
            >
              <svg viewBox="0 0 24 24" className="size-3.5 text-[#0A66C2]" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              Piyush
            </a>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-1.5 text-[#57534E] transition-colors hover:bg-[#F5F3F0]"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="border-t border-[#E0DCD6] bg-white px-5 pb-4 pt-2 sm:hidden">
            {!isHome && (
              <button
                onClick={() => navigateTo('/')}
                className="block w-full py-2 text-left text-[14px] font-medium text-[#57534E] transition-colors hover:text-[#292524]"
              >
                Home
              </button>
            )}
            <button
              onClick={() => navigateTo('/explore')}
              className="block w-full py-2 text-left text-[14px] font-medium text-[#57534E] transition-colors hover:text-[#292524]"
            >
              Explore
            </button>
            {lastPlanId && !isPlan && (
              <button
                onClick={() => navigateTo(`/plan/${lastPlanId}`)}
                className="block w-full py-2 text-left text-[14px] font-semibold text-[#4338CA] transition-colors hover:text-[#3730A3]"
              >
                My Schedule
              </button>
            )}
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-1.5 py-2 text-left text-[14px] font-medium text-[#57534E] transition-colors hover:text-[#292524]"
            >
              Contact
              <ExternalLink className="size-3" />
            </a>
            <button
              onClick={() => navigateTo('/quiz')}
              className="mt-2 w-full rounded-lg bg-[#4338CA] py-2.5 text-center text-[13px] font-bold text-white transition-all hover:bg-[#3730A3]"
            >
              {planCta}
            </button>
          </div>
        )}
      </nav>

      {/* ── FLOATING "MY SCHEDULE" BUTTON ───────────────────────── */}
      {showFloatingSchedule && (
        <button
          onClick={() => router.push(`/plan/${lastPlanId}`)}
          className="no-print fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#4338CA] to-[#6366F1] px-5 py-3 text-[13px] font-bold text-white shadow-[0_4px_20px_rgba(67,56,202,0.4)] transition-all hover:shadow-[0_8px_30px_rgba(67,56,202,0.5)] hover:scale-105 active:scale-95"
        >
          <CalendarDays className="size-4" />
          My Schedule
        </button>
      )}

      {/* ── INTERVENTION MODALS ──────────────────────────────────── */}
      {intervention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setIntervention(null)}
          />
          <div className="relative w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-xl">
            {intervention === 'quiz' ? (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#FEF3C7]">
                    <AlertTriangle className="size-5 text-[#D97706]" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-[#292524]">Quiz in progress</h3>
                    <p className="text-[13px] text-[#A8A29E]">Your answers will be lost</p>
                  </div>
                </div>
                <p className="mb-6 text-[14px] leading-relaxed text-[#57534E]">
                  You haven&apos;t finished the quiz yet. If you leave now, your progress won&apos;t be saved.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIntervention(null)}
                    className="flex-1 rounded-xl bg-[#4338CA] py-2.5 text-[13px] font-bold text-white transition-all hover:bg-[#3730A3]"
                  >
                    Continue Quiz
                  </button>
                  <button
                    onClick={confirmLeave}
                    className="flex-1 rounded-xl border border-[#E0DCD6] py-2.5 text-[13px] font-semibold text-[#57534E] transition-all hover:bg-[#F5F3F0]"
                  >
                    Leave Anyway
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#EEF2FF]">
                    <Sparkles className="size-5 text-[#4338CA]" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-[#292524]">Save your schedule</h3>
                    <p className="text-[13px] text-[#A8A29E]">Don&apos;t lose your strategy</p>
                  </div>
                </div>
                <p className="mb-5 text-[14px] leading-relaxed text-[#57534E]">
                  Save your schedule before leaving so you can come back to it anytime.
                </p>
                <div className="mb-4 flex flex-col gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2.5 rounded-xl border border-[#E0DCD6] px-4 py-3 text-left transition-all hover:bg-[#F5F3F0]"
                  >
                    <Link2 className="size-4 text-[#4338CA]" />
                    <div>
                      <span className="block text-[13px] font-semibold text-[#292524]">
                        {copied ? 'Link copied!' : 'Copy schedule link'}
                      </span>
                      <span className="text-[11px] text-[#A8A29E]">Share or bookmark this URL</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      const text = `Check out my personalised AI Summit 2026 strategy: ${window.location.href}`;
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
                    }}
                    className="flex items-center gap-2.5 rounded-xl border border-[#E0DCD6] px-4 py-3 text-left transition-all hover:bg-[#F0FFF4]"
                  >
                    <svg viewBox="0 0 24 24" className="size-4 text-[#25D366]" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    <div>
                      <span className="block text-[13px] font-semibold text-[#292524]">Send via WhatsApp</span>
                      <span className="text-[11px] text-[#A8A29E]">Send the link to yourself</span>
                    </div>
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2.5 rounded-xl border border-[#E0DCD6] px-4 py-3 text-left transition-all hover:bg-[#F5F3F0]"
                  >
                    <Download className="size-4 text-[#4338CA]" />
                    <div>
                      <span className="block text-[13px] font-semibold text-[#292524]">Download PDF</span>
                      <span className="text-[11px] text-[#A8A29E]">Save a printable copy of your schedule</span>
                    </div>
                  </button>
                </div>
                <button
                  onClick={confirmLeave}
                  className="w-full rounded-xl border border-[#E0DCD6] py-2.5 text-[13px] font-semibold text-[#57534E] transition-all hover:bg-[#F5F3F0]"
                >
                  Leave without saving
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
