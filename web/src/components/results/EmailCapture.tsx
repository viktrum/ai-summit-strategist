'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics';
import { Mail, X } from 'lucide-react';

interface EmailCaptureProps {
  planId: string | null;
}

export function EmailCapture({ planId }: EmailCaptureProps) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Gate 1: Date gate — only show from Day 3 (Feb 18) onward
    const today = new Date().toISOString().slice(0, 10);
    if (today < '2026-02-18') return;

    // Gate 2: Already submitted
    if (localStorage.getItem('userEmail')) return;

    // Gate 3: Dismissed this session
    if (sessionStorage.getItem('emailDismissed')) return;

    // Gate 4: Must be plan owner (has lastPlanId)
    const lastPlanId = localStorage.getItem('lastPlanId');
    if (!lastPlanId) return;

    // Gate 5: Not first visit — either returning user or 2nd+ visit today
    const planCreatedDate = localStorage.getItem('planCreatedDate');
    const visitCount = parseInt(localStorage.getItem('planVisitCount') || '0', 10);

    if (planCreatedDate && planCreatedDate < today) {
      // Returning user from a previous day — show immediately
      setVisible(true);
    } else if (visitCount >= 2) {
      // Same-day user who came back
      setVisible(true);
    }
    // else: first visit on creation day — don't show yet
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !planId) return;

    setSubmitting(true);
    try {
      await supabase.rpc('update_plan_email', {
        plan_uuid: planId,
        email_value: email.trim(),
      });

      localStorage.setItem('userEmail', email.trim());
      if (company.trim()) localStorage.setItem('userCompany', company.trim());

      const domain = email.split('@')[1] || '';
      trackEvent('email_submitted', planId, { email_domain: domain, has_company: !!company.trim() });

      setSubmitted(true);
    } catch (err) {
      console.warn('Email submit failed:', err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDismiss() {
    sessionStorage.setItem('emailDismissed', '1');
    setVisible(false);
  }

  if (!visible) return null;

  // Success state
  if (submitted) {
    return (
      <div className="mb-6 rounded-xl border border-[#059669]/20 bg-[#ECFDF5] p-4 text-center">
        <p className="text-[14px] font-semibold text-[#059669]">
          You&apos;re all set! We&apos;ll send your post-summit brief.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-[#4338CA]/15 bg-gradient-to-br from-[#EEF2FF] to-[#F5F3FF] p-5 relative">
      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-3 rounded-md p-1 text-[#A8A29E] hover:text-[#57534E] hover:bg-white/50"
      >
        <X className="size-4" />
      </button>

      {/* Icon + headline */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-[#4338CA]">
          <Mail className="size-4 text-white" />
        </div>
        <h3 className="text-[15px] font-bold text-[#292524]">
          Get your Post-Summit Intelligence Brief
        </h3>
      </div>

      <p className="text-[13px] leading-relaxed text-[#57534E] mb-4">
        After the summit, I&apos;ll compile key insights from YOUR sessions — what you missed, who to follow up with, and what to act on.
      </p>

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
          {submitting ? 'Sending...' : 'Send My Brief'}
        </button>
      </form>

      <p className="mt-2.5 text-center text-[11px] text-[#A8A29E]">
        100% free, no spam. Just your personalised summit recap.
      </p>
    </div>
  );
}
