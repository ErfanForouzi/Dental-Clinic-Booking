import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, RefreshCw, Save } from 'lucide-react';
import { Toast, type ToastMessage } from '../../components/Toast';
import {
  formatDbTimeTo12Hour,
  fromTimeInputValue,
  toTimeInputValue,
  WEEKDAY_NAMES,
} from '../../lib/availability';
import {
  fetchBusinessHours,
  saveBusinessHours,
  type BusinessHourDraft,
} from '../../lib/clinicApi';

interface WeekdayRow {
  id?: string;
  weekday: number;
  is_open: boolean;
  startInput: string; // HH:MM
  endInput: string; // HH:MM
}

// Display Monday (1) -> Saturday (6) -> Sunday (0)
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function buildDefaultRows(): WeekdayRow[] {
  return DISPLAY_ORDER.map((weekday) => ({
    weekday,
    is_open: weekday >= 1 && weekday <= 5,
    startInput: '09:00',
    endInput: '17:00',
  }));
}

export function BusinessHoursPage() {
  const [rows, setRows] = useState<WeekdayRow[]>(buildDefaultRows);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ id: Date.now(), type, text });
  };

  const loadHours = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dbRows = await fetchBusinessHours();
      const merged = DISPLAY_ORDER.map((weekday) => {
        const found = dbRows.find((r) => r.weekday === weekday);
        if (found) {
          return {
            id: found.id,
            weekday,
            is_open: found.is_open,
            startInput: toTimeInputValue(found.start_time),
            endInput: toTimeInputValue(found.end_time),
          };
        }
        return {
          weekday,
          is_open: weekday >= 1 && weekday <= 5,
          startInput: '09:00',
          endInput: '17:00',
        };
      });
      setRows(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load business hours.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHours();
  }, [loadHours]);

  const updateRow = (weekday: number, patch: Partial<WeekdayRow>) => {
    setRows((prev) =>
      prev.map((row) => (row.weekday === weekday ? { ...row, ...patch } : row))
    );
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate open days have start < end
    for (const row of rows) {
      if (row.is_open && row.startInput >= row.endInput) {
        setError(
          `${WEEKDAY_NAMES[row.weekday]} closing time must be later than its opening time.`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const payload: BusinessHourDraft[] = rows.map((row) => ({
        id: row.id,
        weekday: row.weekday,
        is_open: row.is_open,
        start_time: fromTimeInputValue(row.startInput),
        end_time: fromTimeInputValue(row.endInput),
      }));

      const saved = await saveBusinessHours(payload);
      setRows(
        DISPLAY_ORDER.map((weekday) => {
          const found = saved.find((r) => r.weekday === weekday);
          return {
            id: found?.id,
            weekday,
            is_open: found?.is_open ?? false,
            startInput: toTimeInputValue(found?.start_time),
            endInput: toTimeInputValue(found?.end_time),
          };
        })
      );
      showToast('success', 'Business hours saved. Public booking availability is updated.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to save business hours.';
      setError(msg);
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0D223A] sm:text-3xl">
            Business Hours
          </h1>
          <p className="mt-1 text-sm text-[#4E647B]">
            Configure clinic open days and operating hours. Available online booking slots adjust
            automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadHours()}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-[#DCE6F0] bg-white px-3.5 py-2 text-xs font-medium text-[#0D223A] hover:bg-[#F4F8FB]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Reload
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="overflow-hidden rounded-2xl border border-[#DCE6F0] bg-white"
      >
        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-[#F4F8FB]" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-[#EAF2F7]">
            {rows.map((row) => (
              <div
                key={row.weekday}
                className={`flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between ${
                  !row.is_open ? 'bg-[#FAFBFD]' : ''
                }`}
              >
                <div className="flex items-center justify-between sm:w-52 gap-4">
                  <div>
                    <p className="font-display text-sm font-semibold text-[#0D223A]">
                      {WEEKDAY_NAMES[row.weekday]}
                    </p>
                    <p className="text-xs text-[#6E849C] tabular-nums">
                      {row.is_open
                        ? `${formatDbTimeTo12Hour(row.startInput)} – ${formatDbTimeTo12Hour(
                            row.endInput
                          )}`
                        : 'Closed to bookings'}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={row.is_open}
                    aria-label={`Toggle ${WEEKDAY_NAMES[row.weekday]} open`}
                    onClick={() => updateRow(row.weekday, { is_open: !row.is_open })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                      row.is_open ? 'bg-[#0F766E]' : 'bg-[#CBD8E6]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-xs transition-transform ${
                        row.is_open ? 'translate-x-5.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`start-${row.weekday}`}
                      className="text-xs font-medium text-[#4E647B]"
                    >
                      Opens
                    </label>
                    <input
                      id={`start-${row.weekday}`}
                      type="time"
                      disabled={!row.is_open}
                      value={row.startInput}
                      onChange={(e) => updateRow(row.weekday, { startInput: e.target.value })}
                      className="rounded-lg border border-[#DCE6F0] bg-white px-3 py-2 text-sm font-mono text-[#0D223A] tabular-nums focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 disabled:bg-[#F1F5F9] disabled:text-[#8499AE]"
                    />
                  </div>

                  <span className="text-xs text-[#8499AE]">to</span>

                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`end-${row.weekday}`}
                      className="text-xs font-medium text-[#4E647B]"
                    >
                      Closes
                    </label>
                    <input
                      id={`end-${row.weekday}`}
                      type="time"
                      disabled={!row.is_open}
                      value={row.endInput}
                      onChange={(e) => updateRow(row.weekday, { endInput: e.target.value })}
                      className="rounded-lg border border-[#DCE6F0] bg-white px-3 py-2 text-sm font-mono text-[#0D223A] tabular-nums focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 disabled:bg-[#F1F5F9] disabled:text-[#8499AE]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-[#EAF2F7] bg-[#FAFDFE] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#4E647B]">
            Slot generation automatically respects each open day&apos;s window and service
            duration.
          </p>
          <button
            type="submit"
            disabled={loading || saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#115E59] disabled:opacity-60 whitespace-nowrap"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Business Hours
          </button>
        </div>
      </form>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
