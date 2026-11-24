import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  Stethoscope,
} from 'lucide-react';
import {
  formatCurrencyUSD,
  formatDateToISO,
  formatDbTimeTo12Hour,
  formatReadableDate,
} from '../../lib/availability';
import {
  fetchAllAppointments,
  fetchAllServices,
  fetchBlockedDates,
  fetchClinicSettings,
} from '../../lib/clinicApi';
import type {
  AppointmentStatus,
  AppointmentWithService,
  BlockedDate,
  ClinicSettings,
  Service,
} from '../../types/database';

const STATUS_STYLE: Record<AppointmentStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'text-amber-700 bg-amber-50 border-amber-200' },
  confirmed: { label: 'Confirmed', className: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  completed: { label: 'Completed', className: 'text-slate-700 bg-slate-100 border-slate-200' },
  cancelled: { label: 'Cancelled', className: 'text-rose-700 bg-rose-50 border-rose-200' },
};

export function OverviewPage() {
  const [appointments, setAppointments] = useState<AppointmentWithService[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [appts, svcs, blocked, clinic] = await Promise.all([
        fetchAllAppointments(),
        fetchAllServices(),
        fetchBlockedDates(),
        fetchClinicSettings(),
      ]);
      setAppointments(appts);
      setServices(svcs);
      setBlockedDates(blocked);
      setSettings(clinic);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard overview.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const todayISO = formatDateToISO(new Date());

  const stats = useMemo(() => {
    const upcoming = appointments.filter(
      (a) =>
        a.appointment_date >= todayISO &&
        (a.status === 'pending' || a.status === 'confirmed')
    );
    const pending = appointments.filter((a) => a.status === 'pending');
    const completed = appointments.filter((a) => a.status === 'completed');
    const activeServices = services.filter((s) => s.is_active);
    const upcomingBlocked = blockedDates.filter((b) => b.blocked_date >= todayISO);

    return {
      upcomingCount: upcoming.length,
      pendingCount: pending.length,
      completedCount: completed.length,
      activeServicesCount: activeServices.length,
      totalServicesCount: services.length,
      upcomingBlockedCount: upcomingBlocked.length,
      upcomingList: [...upcoming]
        .sort((a, b) =>
          `${a.appointment_date} ${a.start_time}`.localeCompare(
            `${b.appointment_date} ${b.start_time}`
          )
        )
        .slice(0, 6),
    };
  }, [appointments, services, blockedDates, todayISO]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0D223A] sm:text-3xl">
            Clinic Overview
          </h1>
          <p className="mt-1 text-sm text-[#4E647B]">
            Real-time snapshot of bookings, pending patient requests, and active dental services.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadOverview()}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-[#DCE6F0] bg-white px-3.5 py-2 text-xs font-medium text-[#0D223A] transition-colors hover:bg-[#F4F8FB] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Upcoming Appointments',
            value: stats.upcomingCount,
            sub: 'Pending & confirmed from today',
            icon: CalendarCheck,
            accent: 'text-[#0F766E] bg-[#E6F4F1]',
          },
          {
            label: 'Pending Requests',
            value: stats.pendingCount,
            sub: 'Awaiting front-desk review',
            icon: Clock,
            accent: 'text-amber-700 bg-amber-50',
          },
          {
            label: 'Completed Visits',
            value: stats.completedCount,
            sub: 'Logged finished treatments',
            icon: CheckCircle2,
            accent: 'text-[#1D4ED8] bg-[#EFF6FF]',
          },
          {
            label: 'Active Services',
            value: stats.activeServicesCount,
            sub: `Of ${stats.totalServicesCount} total in catalog`,
            icon: Stethoscope,
            accent: 'text-[#0F766E] bg-[#E6F4F1]',
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="rounded-2xl border border-[#DCE6F0] bg-white p-5 sm:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-[#4E647B]">{metric.label}</p>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${metric.accent}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              {loading ? (
                <div className="mt-3 h-8 w-16 animate-pulse rounded bg-[#EAF2F7]" />
              ) : (
                <p className="mt-3 font-display text-3xl font-bold tracking-tight text-[#0D223A] tabular-nums">
                  {metric.value}
                </p>
              )}
              <p className="mt-1.5 text-xs text-[#6E849C]">{metric.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Upcoming Appointments Queue */}
        <div className="lg:col-span-8 rounded-2xl border border-[#DCE6F0] bg-white overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-[#EAF2F7] px-6 py-4">
            <div>
              <h2 className="font-display text-base font-semibold text-[#0D223A]">
                Upcoming Schedule
              </h2>
              <p className="text-xs text-[#4E647B]">Next scheduled visits across your clinic</p>
            </div>
            <Link
              to="/admin/appointments"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E] hover:text-[#115E59] whitespace-nowrap"
            >
              Manage All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-[#EAF2F7] p-6 space-y-4">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="h-12 animate-pulse rounded-lg bg-[#F4F8FB]" />
              ))}
            </div>
          ) : stats.upcomingList.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-[#0D223A]">No upcoming appointments yet</p>
              <p className="mt-1 text-xs text-[#4E647B]">
                New bookings submitted from the public clinic website will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#EAF2F7] bg-[#FAFDFE] text-xs font-medium text-[#4E647B]">
                  <tr>
                    <th className="px-6 py-3">Patient</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Date &amp; Time</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAF2F7]">
                  {stats.upcomingList.map((appt) => {
                    const badge = STATUS_STYLE[appt.status] ?? STATUS_STYLE.pending;
                    return (
                      <tr key={appt.id} className="hover:bg-[#FAFDFE] transition-colors">
                        <td className="px-6 py-3.5">
                          <p className="font-medium text-[#0D223A]">{appt.full_name}</p>
                          <p className="text-xs text-[#6E849C] tabular-nums">{appt.phone}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-[#0D223A]">{appt.services?.name ?? 'Dental Visit'}</p>
                          {appt.services && (
                            <p className="text-xs text-[#6E849C] tabular-nums">
                              {appt.services.duration_minutes} min ·{' '}
                              {formatCurrencyUSD(appt.services.price)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 tabular-nums whitespace-nowrap">
                          <p className="text-[#0D223A]">
                            {formatReadableDate(appt.appointment_date, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-[#6E849C]">
                            {formatDbTimeTo12Hour(appt.start_time)} –{' '}
                            {formatDbTimeTo12Hour(appt.end_time)}
                          </p>
                        </td>
                        <td className="px-6 py-3.5 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Operations Summary & Quick Links */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-[#DCE6F0] bg-white p-6">
            <h2 className="font-display text-base font-semibold text-[#0D223A]">
              Scheduling Rules
            </h2>
            <dl className="mt-4 divide-y divide-[#EAF2F7] text-sm">
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-[#4E647B]">Slot Interval</dt>
                <dd className="font-mono font-medium text-[#0D223A] tabular-nums">
                  {settings ? `${settings.slot_interval_minutes} min` : '30 min'}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-[#4E647B]">Booking Notice</dt>
                <dd className="font-mono font-medium text-[#0D223A] tabular-nums">
                  {settings ? `${settings.booking_notice_hours} hrs` : '2 hrs'}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-[#4E647B]">Upcoming Closures</dt>
                <dd className="font-mono font-medium text-[#0D223A] tabular-nums">
                  {stats.upcomingBlockedCount}
                </dd>
              </div>
            </dl>
            <Link
              to="/admin/settings"
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-[#DCE6F0] bg-[#FAFDFE] px-4 py-2 text-xs font-semibold text-[#0D223A] hover:bg-[#EAF2F7] transition-colors"
            >
              Edit Clinic Settings
            </Link>
          </div>

          <div className="rounded-2xl border border-[#DCE6F0] bg-white p-6">
            <h2 className="font-display text-base font-semibold text-[#0D223A]">
              Quick Management
            </h2>
            <div className="mt-4 space-y-2">
              {[
                { to: '/admin/services', label: 'Add or update dental services' },
                { to: '/admin/hours', label: 'Adjust weekly business hours' },
                { to: '/admin/blocked-dates', label: 'Block holiday or training dates' },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center justify-between rounded-xl border border-[#EAF2F7] px-4 py-3 text-sm font-medium text-[#0D223A] transition-colors hover:border-[#B7CBE0] hover:bg-[#FAFDFE]"
                >
                  <span>{link.label}</span>
                  <ArrowRight className="h-4 w-4 text-[#0F766E] shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
