// ---------------------------------------------------------------------------
// Centralized email collection state — all localStorage/sessionStorage access
// for the email system goes through these helpers.
// ---------------------------------------------------------------------------

const KEYS = {
  email: 'userEmail',
  company: 'userCompany',
  firstVisitDate: 'firstVisitDate',
  dismissCount: 'emailDismissCount',
  neverShow: 'emailNeverShow',
} as const;

const SESSION_KEYS = {
  dismissed: 'emailDismissed',
} as const;

// ---------------------------------------------------------------------------
// Safe storage helpers (graceful SSR / quota exceeded)
// ---------------------------------------------------------------------------

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function lsSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* quota exceeded */ }
}

function ssGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function ssSet(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

export function getEmail(): string | null {
  return lsGet(KEYS.email);
}

export function setEmail(email: string): void {
  lsSet(KEYS.email, email.trim());
}

export function hasEmail(): boolean {
  return !!getEmail();
}

export function getCompany(): string | null {
  return lsGet(KEYS.company);
}

export function setCompany(company: string): void {
  lsSet(KEYS.company, company.trim());
}

// ---------------------------------------------------------------------------
// First visit tracking
// ---------------------------------------------------------------------------

export function getFirstVisitDate(): string | null {
  return lsGet(KEYS.firstVisitDate);
}

export function ensureFirstVisitDate(): void {
  if (!lsGet(KEYS.firstVisitDate)) {
    lsSet(KEYS.firstVisitDate, new Date().toISOString().slice(0, 10));
  }
}

export function isReturningUser(): boolean {
  // Returning user = has a firstVisitDate set (i.e., not their first pageview ever)
  // The firstVisitDate gets set on first pageview via ensureFirstVisitDate()
  // So if it exists, they've been here before (this session or earlier)
  return !!lsGet(KEYS.firstVisitDate);
}

// ---------------------------------------------------------------------------
// Dismiss tracking
// ---------------------------------------------------------------------------

export function getDismissCount(): number {
  return parseInt(lsGet(KEYS.dismissCount) || '0', 10);
}

export function incrementDismiss(): number {
  const count = getDismissCount() + 1;
  lsSet(KEYS.dismissCount, String(count));
  return count;
}

export function isNeverShow(): boolean {
  return lsGet(KEYS.neverShow) === '1';
}

export function setNeverShow(): void {
  lsSet(KEYS.neverShow, '1');
}

export function isDismissedThisSession(): boolean {
  return ssGet(SESSION_KEYS.dismissed) === '1';
}

export function setDismissedThisSession(): void {
  ssSet(SESSION_KEYS.dismissed, '1');
}

// ---------------------------------------------------------------------------
// Composite checks
// ---------------------------------------------------------------------------

/** Should we show the email modal? Combines all gates. */
export function shouldShowModal(): boolean {
  if (typeof window === 'undefined') return false;
  if (hasEmail()) return false;
  if (isDismissedThisSession()) return false;
  if (isNeverShow()) return false;
  if (getDismissCount() >= 5) return false;
  return true;
}

/** Should we show the sticky bar? (opted out or 5+ dismissals, but no email yet) */
export function shouldShowStickyBar(): boolean {
  if (typeof window === 'undefined') return false;
  if (hasEmail()) return false;
  return isNeverShow() || getDismissCount() >= 5;
}
