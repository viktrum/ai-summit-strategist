import { supabase } from '@/lib/supabase';

/**
 * Fire-and-forget analytics event. Never throws — analytics must not break the app.
 */
export function trackEvent(
  eventType: string,
  planId?: string | null,
  eventData?: Record<string, unknown>,
): void {
  try {
    supabase
      .from('analytics_events')
      .insert({
        event_type: eventType,
        plan_id: planId || null,
        event_data: eventData || {},
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      })
      .then(({ error }) => {
        if (error) console.warn('Analytics insert failed:', error.message);
      });
  } catch {
    // Silently swallow — analytics never breaks the app
  }
}
