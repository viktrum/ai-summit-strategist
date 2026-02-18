'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Mail, Sparkles, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics';
import {
  setEmail as persistEmail,
  setCompany as persistCompany,
  incrementDismiss,
  setDismissedThisSession,
  setNeverShow,
} from '@/lib/email-state';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmailModalVariant = 'save' | 'brief' | 'create-plan' | 'sent-confirmation';

/** Slim plan data passed to the PDF email function */
export interface PlanDataForPDF {
  headline: string;
  strategy_note: string;
  schedule: {
    date: string;
    events: {
      title: string;
      start_time: string;
      end_time: string | null;
      venue: string;
      room: string;
      speakers: string;
      summary_one_liner: string;
      tier: string;
      score: number;
      is_time_slot_fill?: boolean;
    }[];
  }[];
  exhibitor_count: number;
}

interface EmailModalProps {
  variant: EmailModalVariant;
  planId?: string | null;
  planData?: PlanDataForPDF | null;
  sentToEmail?: string | null;
  onClose: () => void;
  onEmailSubmitted?: (email: string) => void;
}

// ---------------------------------------------------------------------------
// Variant content
// ---------------------------------------------------------------------------

const VARIANT_CONTENT = {
  save: {
    icon: <Mail className="size-5 text-white" />,
    iconBg: 'bg-[#4338CA]',
    headline: 'Save your schedule',
    subline: 'This schedule is unique to you',
    body: "We'll email you a PDF copy of your personalised schedule \u2014 perfect for offline use at the venue.",
    cta: 'Send My Schedule',
    submittingText: 'Generating PDF...',
    success: "Check your inbox! Your schedule PDF is on its way.",
    showNeverShow: true,
  },
  brief: {
    icon: <Mail className="size-5 text-white" />,
    iconBg: 'bg-[#4338CA]',
    headline: 'Get your Post-Summit Intelligence Brief',
    subline: 'Personalised insights from your sessions',
    body: "After the summit, I'll compile key insights from YOUR sessions \u2014 what you missed, who to follow up with, and what to act on.",
    cta: 'Send My Brief',
    submittingText: 'Sending...',
    success: "You're all set! We'll send your post-summit brief.",
    showNeverShow: false,
  },
  'create-plan': {
    icon: <Users className="size-5 text-white" />,
    iconBg: 'bg-gradient-to-br from-[#4338CA] to-[#6366F1]',
    headline: '3,000+ attendees are following their personalised plan',
    subline: '',
    body: 'Generate your free summit strategy in 30 seconds.',
    cta: 'Generate My Schedule',
    submittingText: '',
    success: '',
    showNeverShow: false,
  },
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmailModal({ variant, planId, planData, sentToEmail, onClose, onEmailSubmitted }: EmailModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [neverShowChecked, setNeverShowChecked] = useState(false);

  const content = variant !== 'sent-confirmation' && variant !== 'brief'
    ? VARIANT_CONTENT[variant]
    : VARIANT_CONTENT.save; // fallback, not used for these variants
  const isCreatePlan = variant === 'create-plan';

  function handleDismiss() {
    const count = incrementDismiss();
    setDismissedThisSession();
    if (neverShowChecked) setNeverShow();
    trackEvent('email_modal_dismissed', planId, { variant, dismiss_count: count });
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      // Persist to localStorage
      persistEmail(email.trim());
      if (company.trim()) persistCompany(company.trim());

      // Persist to Supabase if we have a planId
      if (planId) {
        await supabase.rpc('update_plan_email', {
          plan_uuid: planId,
          email_value: email.trim(),
        });
      }

      // For 'save' variant with plan data — send PDF email via Netlify Function
      if (variant === 'save' && planData) {
        const planUrl = typeof window !== 'undefined' ? window.location.href : '';
        try {
          const res = await fetch('/api/send-plan-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email.trim(),
              company: company.trim() || undefined,
              plan: planData,
              plan_url: planUrl,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.warn('PDF email failed:', err);
          }
        } catch (err) {
          console.warn('PDF email request failed:', err);
        }
      }

      const domain = email.split('@')[1] || '';
      trackEvent('email_submitted', planId, {
        email_domain: domain,
        has_company: !!company.trim(),
        source: variant === 'save' ? 'save_modal' : 'brief_modal',
      });

      setSubmitted(true);
      onEmailSubmitted?.(email.trim());
    } catch (err) {
      console.warn('Email submit failed:', err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCreatePlan() {
    handleDismiss();
    router.push('/quiz');
  }

  // ── Sent confirmation variant (auto-sent from quiz email) ─────────
  if (variant === 'sent-confirmation' && sentToEmail) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
        <div className="relative w-full max-w-[420px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#059669] via-[#10B981] to-[#34D399]" />
          <div className="px-6 py-8 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-[#ECFDF5]">
              <Mail className="size-6 text-[#059669]" />
            </div>
            <h3 className="text-[17px] font-bold text-[#292524] mb-1">
              Your schedule is on its way!
            </h3>
            <p className="text-[13px] text-[#57534E]">
              We&apos;ve sent your personalised PDF schedule to
            </p>
            <p className="text-[14px] font-semibold text-[#4338CA] mt-1">
              {sentToEmail}
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-[#4338CA] py-3 text-[14px] font-bold text-white transition-all hover:bg-[#3730A3]"
            >
              View My Schedule
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
        <div className="relative w-full max-w-[420px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#059669] via-[#10B981] to-[#34D399]" />
          <div className="px-6 py-8 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-[#ECFDF5]">
              <Mail className="size-6 text-[#059669]" />
            </div>
            <p className="text-[15px] font-semibold text-[#059669]">
              {content.success}
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-[#4338CA] py-3 text-[14px] font-bold text-white transition-all hover:bg-[#3730A3]"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Create-plan variant (no email form) ────────────────────────
  if (isCreatePlan) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={handleDismiss} />
        <div className="relative w-full max-w-[420px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#4338CA] via-[#6366F1] to-[#818CF8]" />
          <div className="flex justify-center py-2 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-[#D5D0C8]" />
          </div>

          <div className="px-6 pb-6 pt-4 sm:pt-5">
            <button
              onClick={handleDismiss}
              className="absolute right-4 top-4 sm:top-5 rounded-md p-1 text-[#A8A29E] hover:text-[#57534E] hover:bg-[#F5F3F0] transition-colors"
            >
              <X className="size-4" />
            </button>

            <div className="mb-3 flex items-center gap-3">
              <div className={`flex size-10 items-center justify-center rounded-full ${content.iconBg}`}>
                {content.icon}
              </div>
              <h3 className="text-[16px] font-bold text-[#292524] pr-6 leading-snug">
                {content.headline}
              </h3>
            </div>

            <p className="mb-5 text-[14px] leading-relaxed text-[#57534E]">
              {content.body}
            </p>

            <button
              onClick={handleCreatePlan}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4338CA] to-[#6366F1] py-3 text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(67,56,202,0.4)] transition-all hover:shadow-[0_6px_20px_rgba(67,56,202,0.5)] active:scale-[0.98]"
            >
              <Sparkles className="size-4" />
              {content.cta}
            </button>

            <p className="mt-4 text-center text-[12px] text-[#A8A29E]">
              Built by Piyush &mdash; see you at the summit!{' '}
              <a href="https://www.linkedin.com/in/piyushmayank?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#4338CA] hover:text-[#3730A3]">Let&apos;s connect</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Brief variant (custom design) ────────────────────────────────
  if (variant === 'brief') {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" onClick={handleDismiss} />
        <div className="relative w-full max-w-[420px] bg-gradient-to-b from-[#EEF2FF] to-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-[#4338CA] to-[#6366F1] px-6 pt-6 pb-8">
            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="absolute right-4 top-4 rounded-md p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="size-4" />
            </button>

            {/* AI Icon */}
            <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Sparkles className="size-6 text-white" />
            </div>

            <h3 className="text-[20px] font-bold text-white leading-tight">
              Your Post-Summit<br />Intelligence Brief
            </h3>
            <p className="mt-1 text-[13px] text-white/70">
              AI-powered insights from your sessions
            </p>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 -mt-4">
            {/* Benefits card */}
            <div className="rounded-xl bg-white border border-[#E0DCD6] shadow-sm p-4 mb-4">
              <p className="text-[12px] font-semibold text-[#4338CA] uppercase tracking-wide mb-3">
                What you&apos;ll get after the summit
              </p>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#4338CA] text-[10px] font-bold text-white">1</span>
                  <p className="text-[13px] text-[#292524]">Key insights from sessions you attended</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#4338CA] text-[10px] font-bold text-white">2</span>
                  <p className="text-[13px] text-[#292524]">Who to follow up with and how</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#4338CA] text-[10px] font-bold text-white">3</span>
                  <p className="text-[13px] text-[#292524]">Action items to maximise your ROI</p>
                </div>
              </div>
            </div>

            {/* Email form */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full rounded-xl border-2 border-[#E0DCD6] bg-white px-4 py-3 text-[14px] text-[#292524] placeholder:text-[#A8A29E] focus:border-[#4338CA] focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-gradient-to-r from-[#4338CA] to-[#6366F1] py-3 text-[14px] font-bold text-white shadow-lg shadow-[#4338CA]/25 transition-all hover:shadow-xl hover:shadow-[#4338CA]/30 active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? 'Sending...' : 'Send My Brief'}
              </button>
            </form>

            <p className="mt-3 text-center text-[11px] text-[#A8A29E]">
              100% free, no spam. Delivered after the summit ends.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Email collection variant (save) ────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={handleDismiss} />
      <div className="relative w-full max-w-[420px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up overflow-hidden">
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-[#4338CA] via-[#6366F1] to-[#818CF8]" />

        {/* Handle bar (mobile) */}
        <div className="flex justify-center py-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-[#D5D0C8]" />
        </div>

        <div className="px-6 pb-6 pt-4 sm:pt-5">
          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="absolute right-4 top-4 sm:top-5 rounded-md p-1 text-[#A8A29E] hover:text-[#57534E] hover:bg-[#F5F3F0] transition-colors"
          >
            <X className="size-4" />
          </button>

          {/* Header */}
          <div className="mb-2 flex items-center gap-3">
            <div className={`flex size-10 items-center justify-center rounded-full ${content.iconBg}`}>
              {content.icon}
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-[#292524]">{content.headline}</h3>
              {content.subline && (
                <p className="text-[13px] text-[#A8A29E]">{content.subline}</p>
              )}
            </div>
          </div>

          <p className="mb-5 text-[14px] leading-relaxed text-[#57534E]">
            {content.body}
          </p>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Work email preferred"
              className="w-full rounded-lg border border-[#E0DCD6] bg-white px-3.5 py-2.5 text-[13px] text-[#292524] placeholder:text-[#A8A29E] focus:border-[#4338CA] focus:outline-none focus:ring-1 focus:ring-[#4338CA]"
            />
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company (optional)"
              className="w-full rounded-lg border border-[#E0DCD6] bg-white px-3.5 py-2.5 text-[13px] text-[#292524] placeholder:text-[#A8A29E] focus:border-[#4338CA] focus:outline-none focus:ring-1 focus:ring-[#4338CA]"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#4338CA] py-2.5 text-[13px] font-bold text-white transition-all hover:bg-[#3730A3] disabled:opacity-60"
            >
              {submitting ? content.submittingText : content.cta}
            </button>
          </form>

          {/* Never show checkbox */}
          {content.showNeverShow && (
            <label className="mt-3 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={neverShowChecked}
                onChange={(e) => setNeverShowChecked(e.target.checked)}
                className="size-3.5 rounded border-[#D5D0C8] text-[#4338CA] focus:ring-[#4338CA]"
              />
              <span className="text-[11px] text-[#A8A29E]">Don&apos;t show this again</span>
            </label>
          )}

          <p className="mt-3 text-center text-[11px] text-[#A8A29E]">
            100% free, no spam. Just your personalised summit recap.
          </p>

          {/* Builder note */}
          <p className="mt-3 text-center text-[12px] text-[#A8A29E]">
            Built by Piyush &mdash; see you at the summit!{' '}
            <a href="https://www.linkedin.com/in/piyushmayank?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#4338CA] hover:text-[#3730A3]">Let&apos;s connect</a>
          </p>
        </div>
      </div>
    </div>
  );
}
