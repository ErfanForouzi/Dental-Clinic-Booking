import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, CalendarOff, Loader2, Plus, Trash2 } from 'lucide-react';
import { Toast, type ToastMessage } from '../../components/Toast';
import { formatDateToISO, formatReadableDate } from '../../lib/availability';
import {
  createBlockedDate,
  deleteBlockedDate,
  fetchBlockedDates,
} from '../../lib/clinicApi';
import type { BlockedDate } from '../../types/database';

export function BlockedDatesPage() {
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ id: Date.now(), type, text });
  };

  const loadBlockedDates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchBlockedDates();
      setBlockedDates(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load blocked dates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBlockedDates();
  }, [loadBlockedDates]);

  const todayISO = formatDateToISO(new Date());

  const { upcoming, past } = useMemo(() => {
    return {
      upcoming: blockedDates.filter((b) => b.blocked_date >= todayISO),
      past: blockedDates.filter((b) => b.blocked_date < todayISO).reverse(),
    };
  }, [blockedDates, todayISO]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newDate) {
      setError('Please select a date to block.');
      return;
    }

    if (blockedDates.some((b) => b.blocked_date === newDate)) {
      setError('That date is already blocked.');
      return;
    }

    setAdding(true);
    try {
      const created = await createBlockedDate(newDate, reason);
      setBlockedDates((prev) =>
        [...prev, created].sort((a, b) => a.blocked_date.localeCompare(b.blocked_date))
      );
      setNewDate('');
      setReason('');
      showToast(
        'success',
        `${formatReadableDate(created.blocked_date)} blocked from online bookings.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to add blocked date.';
      setError(msg);
      showToast('error', msg);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (item: BlockedDate) => {
    setRemovingId(item.id);
    try {
      await deleteBlockedDate(item.id);
      setBlockedDates((prev) => prev.filter((b) => b.id !== item.id));
      showToast('success', `${formatReadableDate(item.blocked_date)} reopened for scheduling.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Unable to remove blocked date.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#0D223A] sm:text-3xl">
          Blocked Dates
        </h1>
        <p className="mt-1 text-sm text-[#4E647B]">
          Close specific days for holidays, continuing education, or clinic maintenance. Blocked
          dates are automatically skipped in the public booking flow.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Blocked Date Form */}
      <form
        onSubmit={handleAdd}
        className="rounded-2xl border border-[#DCE6F0] bg-white p-6"
      >
        <h2 className="font-display text-base font-semibold text-[#0D223A]">
          Block a Clinic Date
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
          <div className="sm:col-span-4">
            <label
              htmlFor="blocked-date-input"
              className="block text-xs font-medium text-[#4E647B]"
            >
              Date <span className="text-rose-600">*</span>
            </label>
            <input
              id="blocked-date-input"
              type="date"
              min={todayISO}
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-[#DCE6F0] px-3.5 py-2.5 text-sm font-mono text-[#0D223A] tabular-nums focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
            />
          </div>

          <div className="sm:col-span-5">
            <label
              htmlFor="blocked-reason-input"
              className="block text-xs font-medium text-[#4E647B]"
            >
              Reason (optional)
            </label>
            <input
              id="blocked-reason-input"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Holiday Closure, Staff Training"
              className="mt-1.5 block w-full rounded-lg border border-[#DCE6F0] px-3.5 py-2.5 text-sm text-[#0D223A] placeholder:text-[#9CB0C4] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
            />
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={adding}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#115E59] disabled:opacity-60 whitespace-nowrap"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Block Date
            </button>
          </div>
        </div>
      </form>

      {/* Upcoming Blocked Dates */}
      <div className="overflow-hidden rounded-2xl border border-[#DCE6F0] bg-white">
        <div className="flex items-center justify-between border-b border-[#EAF2F7] px-6 py-4">
          <h2 className="font-display text-base font-semibold text-[#0D223A]">
            Upcoming Blocked Dates
          </h2>
          <span className="text-xs font-medium text-[#6E849C] tabular-nums">
            {upcoming.length} scheduled
          </span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-[#F4F8FB]" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="p-10 text-center">
            <CalendarOff className="mx-auto h-6 w-6 text-[#9CB0C4]" />
            <p className="mt-3 text-sm font-medium text-[#0D223A]">No upcoming blocked dates</p>
            <p className="mt-1 text-xs text-[#4E647B]">
              Patients can book on all open weekdays defined in Business Hours.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#EAF2F7]">
            {upcoming.map((item) => {
              const isBusy = removingId === item.id;
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-[#FAFDFE]"
                >
                  <div>
                    <p className="font-medium text-[#0D223A] tabular-nums">
                      {formatReadableDate(item.blocked_date, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="mt-0.5 text-xs text-[#4E647B]">
                      {item.reason || 'Clinic closed — no reason specified'}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleRemove(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50 whitespace-nowrap"
                  >
                    {isBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Past Blocked Dates */}
      {past.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[#DCE6F0] bg-white">
          <div className="flex items-center justify-between border-b border-[#EAF2F7] px-6 py-4">
            <h2 className="font-display text-sm font-semibold text-[#4E647B]">
              Past Blocked Dates
            </h2>
            <span className="text-xs text-[#8499AE] tabular-nums">{past.length}</span>
          </div>
          <ul className="divide-y divide-[#EAF2F7]">
            {past.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 px-6 py-3.5 text-sm text-[#6E849C]"
              >
                <div>
                  <span className="font-medium tabular-nums">
                    {formatReadableDate(item.blocked_date)}
                  </span>
                  {item.reason && <span className="ml-2 text-xs">· {item.reason}</span>}
                </div>
                <button
                  type="button"
                  disabled={removingId === item.id}
                  onClick={() => void handleRemove(item)}
                  className="text-xs font-medium text-[#6E849C] hover:text-rose-700"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
