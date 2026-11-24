import type { Appointment, BlockedDate, BusinessHour, TimeSlot } from '../types/database';

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

/**
 * Formats a real Date object as YYYY-MM-DD (local date) for Supabase `date` columns.
 */
export function formatDateToISO(date: Date): string {
  if (!isValidDate(date)) {
    throw new Error('Invalid Date passed to formatDateToISO');
  }
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
}

/**
 * Formats a real Date object as HH:MM:SS (24-hour local time) for Supabase `time` columns.
 */
export function formatTimeToSupabase(date: Date): string {
  if (!isValidDate(date)) {
    throw new Error('Invalid Date passed to formatTimeToSupabase');
  }
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Parses a YYYY-MM-DD string safely into a local Date at midnight (00:00:00).
 * Never uses `new Date("YYYY-MM-DD")` which can shift dates across UTC offsets.
 */
export function parseISODate(isoDate: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);

  if (
    !isValidDate(date) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Safely combines a real Date (calendar day) and a Supabase HH:MM or HH:MM:SS time string
 * into a new local Date object without constructing ISO datetime strings.
 */
export function combineDateAndTime(baseDate: Date, timeString: string): Date | null {
  if (!isValidDate(baseDate) || !timeString) return null;

  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(timeString.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return null;
  }

  const combined = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hours,
    minutes,
    seconds,
    0
  );

  return isValidDate(combined) ? combined : null;
}

/**
 * Formats a real Date object into 12-hour clinic time (e.g., "9:30 AM").
 */
export function formatTime12Hour(date: Date): string {
  if (!isValidDate(date)) return '—';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Safely formats a Supabase time column string ("09:30:00" or "09:30") into "9:30 AM"
 * by first constructing a real Date object.
 */
export function formatDbTimeTo12Hour(timeString: string | null | undefined): string {
  if (!timeString) return '—';
  const anchor = new Date(2000, 0, 1, 0, 0, 0, 0);
  const date = combineDateAndTime(anchor, timeString);
  if (!date) return '—';
  return formatTime12Hour(date);
}

/**
 * Formats a real Date or YYYY-MM-DD string into a clean readable date (e.g., "Tue, Nov 24, 2026").
 */
export function formatReadableDate(
  input: Date | string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }
): string {
  const date = typeof input === 'string' ? parseISODate(input) : input;
  if (!date || !isValidDate(date)) return '—';
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Normalizes a Supabase HH:MM:SS value to HH:MM for HTML <input type="time">.
 */
export function toTimeInputValue(timeString: string | null | undefined): string {
  if (!timeString) return '09:00';
  const match = /^(\d{1,2}):(\d{2})/.exec(timeString.trim());
  if (!match) return '09:00';
  return `${pad2(Number(match[1]))}:${match[2]}`;
}

/**
 * Converts HTML <input type="time"> value ("09:00") into Supabase HH:MM:SS ("09:00:00").
 */
export function fromTimeInputValue(input: string): string {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(input.trim());
  if (!match) return '09:00:00';
  return `${pad2(Number(match[1]))}:${match[2]}:${match[3] ?? '00'}`;
}

export function formatCurrencyUSD(amount: number): string {
  if (!Number.isFinite(amount)) return '$0';
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export interface SlotGenerationParams {
  selectedDate: Date;
  serviceDurationMinutes: number;
  businessHours: BusinessHour[];
  blockedDates: BlockedDate[];
  existingAppointments: Pick<
    Appointment,
    'appointment_date' | 'start_time' | 'end_time' | 'status'
  >[];
  slotIntervalMinutes: number;
  bookingNoticeHours: number;
  now?: Date;
}

export interface DateAvailabilityStatus {
  isPast: boolean;
  isBlocked: boolean;
  blockedReason: string | null;
  isClosedWeekday: boolean;
  hours: BusinessHour | null;
}

export function getDateAvailabilityStatus(
  date: Date,
  businessHours: BusinessHour[],
  blockedDates: BlockedDate[],
  now: Date = new Date()
): DateAvailabilityStatus {
  const todayStart = startOfDay(now);
  const targetStart = startOfDay(date);
  const isPast = targetStart.getTime() < todayStart.getTime();

  const iso = formatDateToISO(targetStart);
  const blockedEntry = blockedDates.find((b) => b.blocked_date === iso);
  const weekday = targetStart.getDay();
  const hours = businessHours.find((h) => h.weekday === weekday) ?? null;
  const isClosedWeekday = !hours || !hours.is_open;

  return {
    isPast,
    isBlocked: Boolean(blockedEntry),
    blockedReason: blockedEntry?.reason ?? null,
    isClosedWeekday,
    hours,
  };
}

/**
 * Generates normalized available booking time slots using real Date objects:
 * - Respects business_hours (working hours & open/closed weekdays)
 * - Skips blocked_dates
 * - Skips overlapping non-cancelled appointments using:
 *   new_start < existing_end AND new_end > existing_start
 * - Respects clinic_settings.booking_notice_hours
 * - Steps by clinic_settings.slot_interval_minutes and sizes each slot by services.duration_minutes
 */
export function generateAvailableSlots({
  selectedDate,
  serviceDurationMinutes,
  businessHours,
  blockedDates,
  existingAppointments,
  slotIntervalMinutes,
  bookingNoticeHours,
  now = new Date(),
}: SlotGenerationParams): TimeSlot[] {
  if (!isValidDate(selectedDate) || serviceDurationMinutes <= 0) {
    return [];
  }

  const status = getDateAvailabilityStatus(selectedDate, businessHours, blockedDates, now);
  if (status.isPast || status.isBlocked || status.isClosedWeekday || !status.hours) {
    return [];
  }

  const dayStart = startOfDay(selectedDate);
  const openStart = combineDateAndTime(dayStart, status.hours.start_time);
  const openEnd = combineDateAndTime(dayStart, status.hours.end_time);

  if (!openStart || !openEnd || openStart.getTime() >= openEnd.getTime()) {
    return [];
  }

  const safeInterval = Math.max(5, Math.floor(slotIntervalMinutes || 30));
  const safeNoticeMs = Math.max(0, Number(bookingNoticeHours || 0)) * 60 * 60 * 1000;
  const earliestAllowedMs = now.getTime() + safeNoticeMs;
  const durationMs = serviceDurationMinutes * 60 * 1000;
  const intervalMs = safeInterval * 60 * 1000;

  const targetISO = formatDateToISO(dayStart);

  // Convert active (non-cancelled) appointments on this date into real Date intervals
  const bookedIntervals = existingAppointments
    .filter((appt) => appt.status !== 'cancelled' && appt.appointment_date === targetISO)
    .map((appt) => {
      const start = combineDateAndTime(dayStart, appt.start_time);
      const end = combineDateAndTime(dayStart, appt.end_time);
      return start && end ? { start, end } : null;
    })
    .filter((interval): interval is { start: Date; end: Date } => interval !== null);

  const slots: TimeSlot[] = [];

  for (
    let cursorMs = openStart.getTime();
    cursorMs + durationMs <= openEnd.getTime();
    cursorMs += intervalMs
  ) {
    const slotStart = new Date(cursorMs);
    const slotEnd = new Date(cursorMs + durationMs);

    // Enforce booking notice lead time
    if (slotStart.getTime() < earliestAllowedMs) {
      continue;
    }

    // Exact overlap rule: new_start < existing_end AND new_end > existing_start
    const hasOverlap = bookedIntervals.some(
      (existing) =>
        slotStart.getTime() < existing.end.getTime() &&
        slotEnd.getTime() > existing.start.getTime()
    );

    if (hasOverlap) {
      continue;
    }

    slots.push({
      start: slotStart,
      end: slotEnd,
      label: formatTime12Hour(slotStart),
    });
  }

  return slots;
}
