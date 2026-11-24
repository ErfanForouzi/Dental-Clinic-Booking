import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { Toast, type ToastMessage } from '../../components/Toast';
import {
  formatCurrencyUSD,
  formatDbTimeTo12Hour,
  formatReadableDate,
} from '../../lib/availability';
import { fetchAllAppointments, updateAppointmentStatus } from '../../lib/clinicApi';
import type { AppointmentStatus, AppointmentWithService } from '../../types/database';

const STATUS_OPTIONS: AppointmentStatus[] = ['pending', 'confirmed', 'completed', 'cancelled'];

const STATUS_META: Record<AppointmentStatus, { label: string; style: string }> = {
  pending: { label: 'Pending', style: 'border-amber-200 bg-amber-50 text-amber-800' },
  confirmed: { label: 'Confirmed', style: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  completed: { label: 'Completed', style: 'border-slate-200 bg-slate-100 text-slate-700' },
  cancelled: { label: 'Cancelled', style: 'border-rose-200 bg-rose-50 text-rose-800' },
};

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<AppointmentWithService | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ id: Date.now(), type, text });
  };

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllAppointments();
      setAppointments(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const counts = useMemo(() => {
    const map: Record<'all' | AppointmentStatus, number> = {
      all: appointments.length,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const appt of appointments) {
      if (appt.status in map) {
        map[appt.status] += 1;
      }
    }
    return map;
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return appointments.filter((appt) => {
      if (statusFilter !== 'all' && appt.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        appt.full_name.toLowerCase().includes(q) ||
        appt.email.toLowerCase().includes(q) ||
        appt.phone.toLowerCase().includes(q) ||
        (appt.services?.name ?? '').toLowerCase().includes(q) ||
        (appt.notes ?? '').toLowerCase().includes(q) ||
        appt.appointment_date.includes(q)
      );
    });
  }, [appointments, statusFilter, searchQuery]);

  const handleStatusChange = async (id: string, nextStatus: AppointmentStatus) => {
    setUpdatingId(id);
    try {
      const updated = await updateAppointmentStatus(id, nextStatus);
      setAppointments((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: updated.status } : item))
      );
      setSelectedAppt((prev) =>
        prev && prev.id === id ? { ...prev, status: updated.status } : prev
      );
      showToast('success', `Appointment marked as ${STATUS_META[nextStatus].label.toLowerCase()}.`);
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Failed to update appointment status.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0D223A] sm:text-3xl">
            Appointments
          </h1>
          <p className="mt-1 text-sm text-[#4E647B]">
            Review patient requests, inspect visit notes, and update appointment statuses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAppointments()}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-[#DCE6F0] bg-white px-3.5 py-2 text-xs font-medium text-[#0D223A] hover:bg-[#F4F8FB]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Filter appointments by status"
          className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-[#DCE6F0] bg-white p-1"
        >
          {(['all', ...STATUS_OPTIONS] as const).map((tab) => {
            const active = statusFilter === tab;
            const label = tab === 'all' ? 'All' : STATUS_META[tab].label;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(tab)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#0D223A] text-white'
                    : 'text-[#4E647B] hover:bg-[#F4F8FB] hover:text-[#0D223A]'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`tabular-nums ${active ? 'text-white/80' : 'text-[#8499AE]'}`}
                >
                  {counts[tab]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E849C]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, email, phone, or service..."
            className="w-full rounded-xl border border-[#DCE6F0] bg-white py-2 pl-10 pr-4 text-sm text-[#0D223A] placeholder:text-[#9CB0C4] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Appointments Table */}
      <div className="overflow-hidden rounded-2xl border border-[#DCE6F0] bg-white">
        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-[#F4F8FB]" />
            ))}
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-display text-base font-semibold text-[#0D223A]">
              No matching appointments
            </p>
            <p className="mt-1 text-sm text-[#4E647B]">
              {appointments.length === 0
                ? 'Booked appointments from patients will appear here.'
                : 'Try adjusting your status filter or search term.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#EAF2F7] bg-[#FAFDFE] text-xs font-medium text-[#4E647B]">
                <tr>
                  <th className="px-6 py-3.5">Patient</th>
                  <th className="px-4 py-3.5">Service</th>
                  <th className="px-4 py-3.5">Date &amp; Time</th>
                  <th className="px-4 py-3.5">Notes</th>
                  <th className="px-6 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF2F7]">
                {filteredAppointments.map((appt) => {
                  const isBusy = updatingId === appt.id;
                  const meta = STATUS_META[appt.status] ?? STATUS_META.pending;

                  return (
                    <tr key={appt.id} className="hover:bg-[#FAFDFE] transition-colors">
                      <td className="px-6 py-4 align-top">
                        <p className="font-medium text-[#0D223A]">{appt.full_name}</p>
                        <p className="mt-0.5 text-xs text-[#4E647B]">{appt.email}</p>
                        <p className="text-xs text-[#6E849C] tabular-nums">{appt.phone}</p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-[#0D223A]">
                          {appt.services?.name ?? 'Dental Service'}
                        </p>
                        {appt.services && (
                          <p className="mt-0.5 text-xs text-[#6E849C] tabular-nums">
                            {appt.services.duration_minutes} min ·{' '}
                            {formatCurrencyUSD(appt.services.price)}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 align-top tabular-nums whitespace-nowrap">
                        <p className="font-medium text-[#0D223A]">
                          {formatReadableDate(appt.appointment_date, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="mt-0.5 text-xs text-[#4E647B]">
                          {formatDbTimeTo12Hour(appt.start_time)} –{' '}
                          {formatDbTimeTo12Hour(appt.end_time)}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top max-w-[240px]">
                        {appt.notes ? (
                          <button
                            type="button"
                            onClick={() => setSelectedAppt(appt)}
                            className="group flex items-start gap-1.5 text-left text-xs text-[#4E647B] hover:text-[#0D223A]"
                          >
                            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0F766E]" />
                            <span className="line-clamp-2">{appt.notes}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-[#9CB0C4]">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {isBusy && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0F766E]" />
                          )}
                          <select
                            aria-label={`Change status for ${appt.full_name}`}
                            disabled={isBusy}
                            value={appt.status}
                            onChange={(e) =>
                              void handleStatusChange(
                                appt.id,
                                e.target.value as AppointmentStatus
                              )
                            }
                            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 ${meta.style}`}
                          >
                            {STATUS_OPTIONS.map((statusOption) => (
                              <option
                                key={statusOption}
                                value={statusOption}
                                className="bg-white text-[#0D223A]"
                              >
                                {STATUS_META[statusOption].label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Notes & Details Modal */}
      {selectedAppt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D223A]/45 p-4 backdrop-blur-[2px]"
          onClick={() => setSelectedAppt(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#DCE6F0] bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#EAF2F7] pb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0D223A]">
                  {selectedAppt.full_name}
                </h2>
                <p className="text-xs text-[#4E647B]">
                  {selectedAppt.email} · {selectedAppt.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppt(null)}
                aria-label="Close appointment details"
                className="rounded-lg p-1.5 text-[#4E647B] hover:bg-[#F4F8FB]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#6E849C]">Service</p>
                  <p className="mt-0.5 font-medium text-[#0D223A]">
                    {selectedAppt.services?.name ?? 'Dental Visit'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#6E849C]">Date &amp; Time</p>
                  <p className="mt-0.5 font-medium text-[#0D223A] tabular-nums">
                    {formatReadableDate(selectedAppt.appointment_date, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    , {formatDbTimeTo12Hour(selectedAppt.start_time)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-[#6E849C]">Patient Notes</p>
                <div className="mt-1.5 rounded-xl border border-[#EAF2F7] bg-[#FAFDFE] p-4 text-sm leading-relaxed text-[#0D223A]">
                  {selectedAppt.notes || 'No notes provided.'}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAppt(null)}
                className="rounded-lg bg-[#0D223A] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B3654]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
