import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Phone,
} from 'lucide-react';
import {
  formatCurrencyUSD,
  formatDateToISO,
  formatReadableDate,
  formatTime12Hour,
  formatTimeToSupabase,
  generateAvailableSlots,
  getDateAvailabilityStatus,
  isSameDay,
  startOfDay,
  WEEKDAY_SHORT,
} from '../../lib/availability';
import { createAppointment, fetchAppointmentsForDate } from '../../lib/clinicApi';
import { isSupabaseConfigured } from '../../lib/supabase';
import type {
  Appointment,
  BlockedDate,
  BusinessHour,
  ClinicSettings,
  Service,
  TimeSlot,
} from '../../types/database';
import { SupabaseConfigNotice } from '../SupabaseConfigNotice';

interface BookingSectionProps {
  services: Service[];
  clinicSettings: ClinicSettings | null;
  businessHours: BusinessHour[];
  blockedDates: BlockedDate[];
  selectedServiceId: string | null;
  onSelectServiceId: (serviceId: string | null) => void;
  externalStepTrigger: number;
}

type BookingStep = 1 | 2 | 3 | 4;

interface BookedReceipt {
  appointment: Appointment;
  service: Service;
  slot: TimeSlot;
}

const STEP_ITEMS: { step: BookingStep; label: string }[] = [
  { step: 1, label: 'Select Service' },
  { step: 2, label: 'Date & Time' },
  { step: 3, label: 'Patient Details' },
  { step: 4, label: 'Confirmation' },
];

export function BookingSection({
  services,
  clinicSettings,
  businessHours,
  blockedDates,
  selectedServiceId,
  onSelectServiceId,
  externalStepTrigger,
}: BookingSectionProps) {
  const [step, setStep] = useState<BookingStep>(1);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const [dayAppointments, setDayAppointments] = useState<
    Pick<Appointment, 'appointment_date' | 'start_time' | 'end_time' | 'status'>[]
  >([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Patient form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<BookedReceipt | null>(null);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId]
  );

  // Advance to Step 2 when a visitor clicks "Schedule This Visit" on a service card above
  useEffect(() => {
    if (externalStepTrigger > 0 && selectedServiceId) {
      setReceipt(null);
      setSelectedSlot(null);
      setStep(2);
    }
  }, [externalStepTrigger, selectedServiceId]);

  // Auto-select the first available upcoming open date when entering Step 2 if none chosen yet
  useEffect(() => {
    if (step !== 2 || selectedDate || businessHours.length === 0) return;
    const today = startOfDay(new Date());
    for (let offset = 0; offset < 45; offset++) {
      const candidate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
      const status = getDateAvailabilityStatus(candidate, businessHours, blockedDates);
      if (!status.isPast && !status.isBlocked && !status.isClosedWeekday) {
        setSelectedDate(candidate);
        setViewMonth(new Date(candidate.getFullYear(), candidate.getMonth(), 1));
        break;
      }
    }
  }, [step, selectedDate, businessHours, blockedDates]);

  // Fetch existing non-cancelled appointments whenever selectedDate changes
  useEffect(() => {
    if (!selectedDate || !isSupabaseConfigured) {
      setDayAppointments([]);
      return;
    }

    let cancelled = false;
    const isoDate = formatDateToISO(selectedDate);

    const loadDay = async () => {
      setLoadingSlots(true);
      setSlotsError(null);
      try {
        const rows = await fetchAppointmentsForDate(isoDate);
        if (!cancelled) {
          setDayAppointments(rows);
        }
      } catch (err) {
        if (!cancelled) {
          setSlotsError(err instanceof Error ? err.message : 'Unable to check availability.');
          setDayAppointments([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      }
    };

    void loadDay();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const slotIntervalMinutes = clinicSettings?.slot_interval_minutes ?? 30;
  const bookingNoticeHours = clinicSettings?.booking_notice_hours ?? 2;

  const selectedDateStatus = useMemo(() => {
    if (!selectedDate) return null;
    return getDateAvailabilityStatus(selectedDate, businessHours, blockedDates);
  }, [selectedDate, businessHours, blockedDates]);

  const availableSlots = useMemo(() => {
    if (!selectedDate || !selectedService) return [];
    return generateAvailableSlots({
      selectedDate,
      serviceDurationMinutes: selectedService.duration_minutes,
      businessHours,
      blockedDates,
      existingAppointments: dayAppointments,
      slotIntervalMinutes,
      bookingNoticeHours,
    });
  }, [
    selectedDate,
    selectedService,
    businessHours,
    blockedDates,
    dayAppointments,
    slotIntervalMinutes,
    bookingNoticeHours,
  ]);

  // Clear selectedSlot if it is no longer present in availableSlots
  useEffect(() => {
    if (!selectedSlot) return;
    const stillValid = availableSlots.some(
      (slot) => slot.start.getTime() === selectedSlot.start.getTime()
    );
    if (!stillValid) {
      setSelectedSlot(null);
    }
  }, [availableSlots, selectedSlot]);

  // Calendar grid days for viewMonth
  const calendarCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(year, month, d));
    }
    return cells;
  }, [viewMonth]);

  const todayStart = startOfDay(new Date());
  const canGoPrevMonth =
    viewMonth.getFullYear() > todayStart.getFullYear() ||
    (viewMonth.getFullYear() === todayStart.getFullYear() &&
      viewMonth.getMonth() > todayStart.getMonth());

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleStepNavigation = (target: BookingStep) => {
    if (step === 4) return;
    if (target === 1) {
      setStep(1);
    } else if (target === 2 && selectedService) {
      setStep(2);
    } else if (target === 3 && selectedService && selectedDate && selectedSlot) {
      setStep(3);
    }
  };

  const validatePatientForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = 'Please enter your full name.';
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    const digitsOnly = phone.replace(/\D/g, '');
    if (!phone.trim() || digitsOnly.length < 7) {
      errors.phone = 'Please enter a valid phone number.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBookingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedSlot) return;
    if (!validatePatientForm()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const isoDate = formatDateToISO(selectedDate);

      // Re-check latest appointments right before saving to avoid race-condition overlaps
      const latestDayAppointments = await fetchAppointmentsForDate(isoDate);
      const freshSlots = generateAvailableSlots({
        selectedDate,
        serviceDurationMinutes: selectedService.duration_minutes,
        businessHours,
        blockedDates,
        existingAppointments: latestDayAppointments,
        slotIntervalMinutes,
        bookingNoticeHours,
      });

      const slotStillAvailable = freshSlots.some(
        (slot) => slot.start.getTime() === selectedSlot.start.getTime()
      );

      if (!slotStillAvailable) {
        setDayAppointments(latestDayAppointments);
        setSelectedSlot(null);
        setSubmitError(
          'That time slot was just reserved. Please select another available time.'
        );
        setStep(2);
        return;
      }

      const saved = await createAppointment({
        full_name: fullName,
        email,
        phone,
        service_id: selectedService.id,
        appointment_date: isoDate,
        start_time: formatTimeToSupabase(selectedSlot.start),
        end_time: formatTimeToSupabase(selectedSlot.end),
        notes: notes.trim() ? notes.trim() : null,
      });

      setReceipt({
        appointment: saved,
        service: selectedService,
        slot: selectedSlot,
      });
      setStep(4);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to submit your appointment request.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetBooking = () => {
    setReceipt(null);
    setSelectedSlot(null);
    setSelectedDate(null);
    onSelectServiceId(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setNotes('');
    setFormErrors({});
    setSubmitError(null);
    setStep(1);
  };

  const clinicName = clinicSettings?.clinic_name || 'Harborview Dental';
  const clinicPhone = clinicSettings?.clinic_phone || '(206) 555-0194';
  const clinicAddress = clinicSettings?.clinic_address || '420 Waterfront Plaza, Suite 300';

  return (
    <section id="booking" className="bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-[#0F766E]">Online Scheduling</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#0D223A] sm:text-4xl">
            Schedule your visit in a few clear steps.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#4E647B] sm:text-base">
            Available times update directly from our clinic schedule and treatment durations.
          </p>
        </div>

        {!isSupabaseConfigured ? (
          <div className="mt-10">
            <SupabaseConfigNotice context="public" />
          </div>
        ) : (
          <div className="mt-10">
            {/* Step Progress Indicator */}
            <nav aria-label="Booking progress" className="mb-8">
              <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                {STEP_ITEMS.map((item) => {
                  const isActive = step === item.step;
                  const isCompleted = step > item.step;
                  const canClick =
                    step !== 4 &&
                    (item.step === 1 ||
                      (item.step === 2 && Boolean(selectedService)) ||
                      (item.step === 3 &&
                        Boolean(selectedService && selectedDate && selectedSlot)));

                  return (
                    <li key={item.step}>
                      <button
                        type="button"
                        disabled={!canClick}
                        onClick={() => handleStepNavigation(item.step)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                          isActive
                            ? 'border-[#0F766E] bg-[#F2FAF8] text-[#0D223A]'
                            : isCompleted
                              ? 'border-[#DCE6F0] bg-white text-[#0D223A] hover:bg-[#F4F8FB]'
                              : 'border-[#EAF2F7] bg-[#F9FCFE] text-[#8499AE] cursor-default'
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                            isActive
                              ? 'bg-[#0F766E] text-white'
                              : isCompleted
                                ? 'bg-[#E6F4F1] text-[#0F766E]'
                                : 'bg-[#EAF2F7] text-[#64748B]'
                          }`}
                        >
                          {isCompleted ? <Check className="h-3.5 w-3.5" /> : item.step}
                        </span>
                        <span className="truncate text-xs font-semibold sm:text-sm">
                          {item.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            {step === 4 && receipt ? (
              /* ============================================================
               * STEP 4: SUCCESS CONFIRMATION SCREEN
               * ========================================================== */
              <div className="mx-auto max-w-3xl rounded-2xl border border-[#B8DDD5] bg-gradient-to-b from-[#F5FBF9] to-white p-6 sm:p-10 shadow-sm">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E6F4F1] text-[#0F766E]">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-[#0F766E]">
                      Appointment Request Received
                    </p>
                    <h3 className="mt-0.5 font-display text-2xl font-bold text-[#0D223A]">
                      Thank you, {receipt.appointment.full_name}.
                    </h3>
                    <p className="mt-1 text-sm text-[#4E647B]">
                      Your visit at {clinicName} has been logged and is pending confirmation from
                      our reception desk.
                    </p>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-6 border-y border-[#DCE6F0] py-6 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-[#4E647B]">Treatment</p>
                    <p className="mt-1 font-display text-base font-semibold text-[#0D223A]">
                      {receipt.service.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[#4E647B] tabular-nums">
                      {receipt.service.duration_minutes} minutes ·{' '}
                      {formatCurrencyUSD(receipt.service.price)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-[#4E647B]">Date &amp; Time</p>
                    <p className="mt-1 font-display text-base font-semibold text-[#0D223A]">
                      {formatReadableDate(receipt.slot.start, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="mt-0.5 text-xs text-[#4E647B] tabular-nums">
                      {formatTime12Hour(receipt.slot.start)} – {formatTime12Hour(receipt.slot.end)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-[#4E647B]">Patient Contact</p>
                    <p className="mt-1 text-sm font-medium text-[#0D223A]">
                      {receipt.appointment.email}
                    </p>
                    <p className="mt-0.5 text-xs text-[#4E647B] tabular-nums">
                      {receipt.appointment.phone}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-[#4E647B]">Clinic Details</p>
                    <p className="mt-1 text-sm font-medium text-[#0D223A]">{clinicAddress}</p>
                    <p className="mt-0.5 text-xs text-[#4E647B] tabular-nums">{clinicPhone}</p>
                  </div>

                  {receipt.appointment.notes && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium text-[#4E647B]">Notes for your dentist</p>
                      <p className="mt-1 text-sm text-[#0D223A]">{receipt.appointment.notes}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-xs text-[#4E647B]">
                    Status:{' '}
                    <span className="font-medium text-[#0F766E]">Pending clinic confirmation</span>
                  </p>
                  <button
                    type="button"
                    onClick={handleResetBooking}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#115E59]"
                  >
                    Book Another Appointment
                  </button>
                </div>
              </div>
            ) : (
              /* ============================================================
               * STEPS 1–3: TWO-COLUMN WORKBENCH + LIVE SUMMARY
               * ========================================================== */
              <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
                <div className="lg:col-span-8 rounded-2xl border border-[#DCE6F0] bg-white p-6 sm:p-8">
                  {submitError && (
                    <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* STEP 1: SELECT SERVICE */}
                  {step === 1 && (
                    <div>
                      <h3 className="font-display text-xl font-semibold text-[#0D223A]">
                        Choose a dental service
                      </h3>
                      <p className="mt-1 text-sm text-[#4E647B]">
                        Select the visit type so we reserve the right amount of time with your care
                        team.
                      </p>

                      {services.length === 0 ? (
                        <div className="mt-6 rounded-xl border border-[#DCE6F0] bg-[#F4F8FB] p-6 text-sm text-[#4E647B]">
                          No active services are available to book yet. Please check back soon or
                          contact reception at {clinicPhone}.
                        </div>
                      ) : (
                        <div className="mt-6 space-y-3">
                          {services.map((service) => {
                            const active = selectedServiceId === service.id;
                            return (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => {
                                  onSelectServiceId(service.id);
                                  setSelectedSlot(null);
                                }}
                                className={`flex w-full items-start justify-between gap-4 rounded-xl border p-4 sm:p-5 text-left transition-all duration-150 ${
                                  active
                                    ? 'border-[#0F766E] bg-[#F2FAF8] ring-1 ring-[#0F766E]'
                                    : 'border-[#DCE6F0] bg-white hover:border-[#9EC5D8] hover:bg-[#F9FCFE]'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2.5">
                                    <span className="font-display text-base font-semibold text-[#0D223A]">
                                      {service.name}
                                    </span>
                                  </div>
                                  {service.description && (
                                    <p className="mt-1 text-sm text-[#4E647B] line-clamp-2">
                                      {service.description}
                                    </p>
                                  )}
                                  <p className="mt-2 text-xs font-medium text-[#4E647B] tabular-nums">
                                    {service.duration_minutes} minutes
                                  </p>
                                </div>

                                <div className="flex flex-col items-end gap-2 shrink-0">
                                  <span className="font-mono text-base font-semibold text-[#0D223A] tabular-nums">
                                    {formatCurrencyUSD(service.price)}
                                  </span>
                                  <span
                                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                      active
                                        ? 'border-[#0F766E] bg-[#0F766E] text-white'
                                        : 'border-[#C5D6E5] bg-white'
                                    }`}
                                  >
                                    {active && <Check className="h-3 w-3" />}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-8 flex justify-end border-t border-[#EAF2F7] pt-5">
                        <button
                          type="button"
                          disabled={!selectedService}
                          onClick={() => setStep(2)}
                          className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#115E59] disabled:cursor-not-allowed disabled:bg-[#B7CBE0]"
                        >
                          Continue to Date &amp; Time
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: SELECT DATE & AVAILABLE TIME */}
                  {step === 2 && (
                    <div>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-display text-xl font-semibold text-[#0D223A]">
                            Choose a date and time
                          </h3>
                          <p className="mt-1 text-sm text-[#4E647B]">
                            Showing open slots for{' '}
                            <span className="font-medium text-[#0D223A]">
                              {selectedService?.name}
                            </span>{' '}
                            ({selectedService?.duration_minutes} min).
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-12">
                        {/* Interactive Calendar */}
                        <div className="md:col-span-6">
                          <div className="rounded-xl border border-[#DCE6F0] bg-[#FAFDFE] p-4">
                            <div className="flex items-center justify-between pb-3">
                              <span className="font-display text-sm font-semibold text-[#0D223A]">
                                {new Intl.DateTimeFormat('en-US', {
                                  month: 'long',
                                  year: 'numeric',
                                }).format(viewMonth)}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={!canGoPrevMonth}
                                  onClick={() =>
                                    setViewMonth(
                                      new Date(
                                        viewMonth.getFullYear(),
                                        viewMonth.getMonth() - 1,
                                        1
                                      )
                                    )
                                  }
                                  aria-label="Previous month"
                                  className="rounded-lg p-1.5 text-[#0D223A] hover:bg-[#EAF2F7] disabled:opacity-35"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewMonth(
                                      new Date(
                                        viewMonth.getFullYear(),
                                        viewMonth.getMonth() + 1,
                                        1
                                      )
                                    )
                                  }
                                  aria-label="Next month"
                                  className="rounded-lg p-1.5 text-[#0D223A] hover:bg-[#EAF2F7]"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-[#4E647B] pb-2">
                              {WEEKDAY_SHORT.map((day) => (
                                <div key={day} className="py-1">
                                  {day}
                                </div>
                              ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1">
                              {calendarCells.map((cellDate, idx) => {
                                if (!cellDate) {
                                  return <div key={`empty-${idx}`} className="h-9" />;
                                }

                                const cellStatus = getDateAvailabilityStatus(
                                  cellDate,
                                  businessHours,
                                  blockedDates
                                );
                                const unavailable =
                                  cellStatus.isPast ||
                                  cellStatus.isBlocked ||
                                  cellStatus.isClosedWeekday;
                                const isChosen =
                                  selectedDate !== null && isSameDay(cellDate, selectedDate);
                                const isToday = isSameDay(cellDate, todayStart);

                                return (
                                  <button
                                    key={formatDateToISO(cellDate)}
                                    type="button"
                                    disabled={cellStatus.isPast}
                                    onClick={() => handleSelectDate(cellDate)}
                                    title={
                                      cellStatus.isBlocked
                                        ? cellStatus.blockedReason || 'Clinic closed on this date'
                                        : cellStatus.isClosedWeekday
                                          ? 'Clinic closed'
                                          : formatReadableDate(cellDate)
                                    }
                                    className={`relative h-9 rounded-lg text-xs font-medium tabular-nums transition-colors ${
                                      isChosen
                                        ? 'bg-[#0F766E] text-white font-semibold'
                                        : cellStatus.isPast
                                          ? 'text-[#C2D1DF] cursor-not-allowed'
                                          : unavailable
                                            ? 'text-[#9CB0C4] bg-[#F1F5F9]/70 hover:bg-[#EAF2F7]'
                                            : 'text-[#0D223A] hover:bg-[#E6F4F1] hover:text-[#0F766E]'
                                    } ${isToday && !isChosen ? 'ring-1 ring-[#0F766E]/40' : ''}`}
                                  >
                                    {cellDate.getDate()}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <p className="mt-3 text-xs text-[#4E647B]">
                            Appointments require at least{' '}
                            <span className="font-medium text-[#0D223A] tabular-nums">
                              {bookingNoticeHours} hour{bookingNoticeHours === 1 ? '' : 's'}
                            </span>{' '}
                            advance notice.
                          </p>
                        </div>

                        {/* Available Time Slots */}
                        <div className="md:col-span-6">
                          <div className="flex items-center justify-between pb-3 border-b border-[#EAF2F7]">
                            <span className="text-sm font-semibold text-[#0D223A]">
                              {selectedDate
                                ? formatReadableDate(selectedDate, {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : 'Select a date'}
                            </span>
                            {selectedDate && !loadingSlots && availableSlots.length > 0 && (
                              <span className="text-xs text-[#4E647B] tabular-nums">
                                {availableSlots.length} open
                              </span>
                            )}
                          </div>

                          <div className="mt-4">
                            {!selectedDate ? (
                              <p className="text-sm text-[#4E647B]">
                                Choose an available date on the calendar to view open times.
                              </p>
                            ) : selectedDateStatus?.isBlocked ? (
                              <div className="rounded-xl border border-[#DCE6F0] bg-[#F4F8FB] p-4 text-sm text-[#4E647B]">
                                <p className="font-medium text-[#0D223A]">
                                  Clinic closed on this date
                                </p>
                                <p className="mt-1 text-xs">
                                  {selectedDateStatus.blockedReason ||
                                    'This date is blocked for scheduling. Please pick another day.'}
                                </p>
                              </div>
                            ) : selectedDateStatus?.isClosedWeekday ? (
                              <div className="rounded-xl border border-[#DCE6F0] bg-[#F4F8FB] p-4 text-sm text-[#4E647B]">
                                <p className="font-medium text-[#0D223A]">
                                  Closed on {formatReadableDate(selectedDate, { weekday: 'long' })}s
                                </p>
                                <p className="mt-1 text-xs">
                                  Please select another open clinic day on the calendar.
                                </p>
                              </div>
                            ) : loadingSlots ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                  <div
                                    key={i}
                                    className="h-10 animate-pulse rounded-lg bg-[#EAF2F7]"
                                  />
                                ))}
                              </div>
                            ) : slotsError ? (
                              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
                                {slotsError}
                              </div>
                            ) : availableSlots.length === 0 ? (
                              <div className="rounded-xl border border-[#DCE6F0] bg-[#F4F8FB] p-4 text-sm text-[#4E647B]">
                                <p className="font-medium text-[#0D223A]">No open times left</p>
                                <p className="mt-1 text-xs">
                                  All slots on this date are booked or within the minimum booking
                                  notice window. Please choose another date.
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
                                {availableSlots.map((slot) => {
                                  const isPicked =
                                    selectedSlot !== null &&
                                    selectedSlot.start.getTime() === slot.start.getTime();
                                  return (
                                    <button
                                      key={slot.start.getTime()}
                                      type="button"
                                      onClick={() => setSelectedSlot(slot)}
                                      className={`rounded-lg border px-3 py-2.5 text-xs font-medium tabular-nums transition-all duration-150 whitespace-nowrap ${
                                        isPicked
                                          ? 'border-[#0F766E] bg-[#0F766E] text-white shadow-xs'
                                          : 'border-[#DCE6F0] bg-white text-[#0D223A] hover:border-[#0F766E] hover:bg-[#F2FAF8]'
                                      }`}
                                    >
                                      {slot.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 flex items-center justify-between gap-4 border-t border-[#EAF2F7] pt-5">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE6F0] bg-white px-4 py-2.5 text-sm font-medium text-[#0D223A] hover:bg-[#F4F8FB]"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={!selectedDate || !selectedSlot}
                          onClick={() => setStep(3)}
                          className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#115E59] disabled:cursor-not-allowed disabled:bg-[#B7CBE0]"
                        >
                          Continue to Details
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: PATIENT DETAILS */}
                  {step === 3 && (
                    <form onSubmit={handleBookingSubmit} noValidate>
                      <h3 className="font-display text-xl font-semibold text-[#0D223A]">
                        Enter your contact details
                      </h3>
                      <p className="mt-1 text-sm text-[#4E647B]">
                        We will use these details to confirm your appointment and share arrival
                        instructions.
                      </p>

                      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label
                            htmlFor="patient-full-name"
                            className="block text-sm font-medium text-[#0D223A]"
                          >
                            Full name <span className="text-rose-600">*</span>
                          </label>
                          <input
                            id="patient-full-name"
                            type="text"
                            required
                            autoComplete="name"
                            value={fullName}
                            onChange={(e) => {
                              setFullName(e.target.value);
                              if (formErrors.fullName) {
                                setFormErrors((prev) => ({ ...prev, fullName: '' }));
                              }
                            }}
                            placeholder="Jordan Taylor"
                            className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-sm text-[#0D223A] placeholder:text-[#9CB0C4] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 ${
                              formErrors.fullName
                                ? 'border-rose-400 focus:border-rose-500'
                                : 'border-[#DCE6F0] focus:border-[#0F766E]'
                            }`}
                          />
                          {formErrors.fullName && (
                            <p className="mt-1 text-xs text-rose-600">{formErrors.fullName}</p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="patient-email"
                            className="block text-sm font-medium text-[#0D223A]"
                          >
                            Email address <span className="text-rose-600">*</span>
                          </label>
                          <input
                            id="patient-email"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (formErrors.email) {
                                setFormErrors((prev) => ({ ...prev, email: '' }));
                              }
                            }}
                            placeholder="jordan@example.com"
                            className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-sm text-[#0D223A] placeholder:text-[#9CB0C4] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 ${
                              formErrors.email
                                ? 'border-rose-400 focus:border-rose-500'
                                : 'border-[#DCE6F0] focus:border-[#0F766E]'
                            }`}
                          />
                          {formErrors.email && (
                            <p className="mt-1 text-xs text-rose-600">{formErrors.email}</p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="patient-phone"
                            className="block text-sm font-medium text-[#0D223A]"
                          >
                            Phone number <span className="text-rose-600">*</span>
                          </label>
                          <input
                            id="patient-phone"
                            type="tel"
                            required
                            autoComplete="tel"
                            value={phone}
                            onChange={(e) => {
                              setPhone(e.target.value);
                              if (formErrors.phone) {
                                setFormErrors((prev) => ({ ...prev, phone: '' }));
                              }
                            }}
                            placeholder="(206) 555-0148"
                            className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-sm text-[#0D223A] placeholder:text-[#9CB0C4] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 ${
                              formErrors.phone
                                ? 'border-rose-400 focus:border-rose-500'
                                : 'border-[#DCE6F0] focus:border-[#0F766E]'
                            }`}
                          />
                          {formErrors.phone && (
                            <p className="mt-1 text-xs text-rose-600">{formErrors.phone}</p>
                          )}
                        </div>

                        <div className="sm:col-span-2">
                          <label
                            htmlFor="patient-notes"
                            className="block text-sm font-medium text-[#0D223A]"
                          >
                            Notes for the clinic{' '}
                            <span className="font-normal text-[#4E647B]">(optional)</span>
                          </label>
                          <textarea
                            id="patient-notes"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Share any tooth sensitivity, preferences, or questions ahead of your visit."
                            className="mt-1.5 block w-full rounded-lg border border-[#DCE6F0] px-3.5 py-2.5 text-sm text-[#0D223A] placeholder:text-[#9CB0C4] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                          />
                        </div>
                      </div>

                      <div className="mt-8 flex items-center justify-between gap-4 border-t border-[#EAF2F7] pt-5">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          disabled={submitting}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE6F0] bg-white px-4 py-2.5 text-sm font-medium text-[#0D223A] hover:bg-[#F4F8FB]"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Back
                        </button>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#115E59] disabled:opacity-60"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Submitting Request...
                            </>
                          ) : (
                            <>
                              Submit Appointment Request
                              <Check className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Right Sticky Appointment Summary Panel */}
                <aside className="lg:col-span-4 lg:sticky lg:top-24 rounded-2xl border border-[#DCE6F0] bg-[#F4F8FB] p-6">
                  <h3 className="font-display text-base font-semibold text-[#0D223A]">
                    Appointment Summary
                  </h3>

                  <div className="mt-5 space-y-4 divide-y divide-[#DCE6F0] text-sm">
                    <div className="pt-0">
                      <p className="text-xs font-medium text-[#4E647B]">Selected Service</p>
                      {selectedService ? (
                        <div className="mt-1">
                          <p className="font-semibold text-[#0D223A]">{selectedService.name}</p>
                          <p className="mt-0.5 text-xs text-[#4E647B] tabular-nums">
                            {selectedService.duration_minutes} minutes ·{' '}
                            <span className="font-mono font-medium text-[#0D223A]">
                              {formatCurrencyUSD(selectedService.price)}
                            </span>
                          </p>
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-[#8499AE]">No service selected yet</p>
                      )}
                    </div>

                    <div className="pt-4">
                      <p className="text-xs font-medium text-[#4E647B]">Date &amp; Time</p>
                      {selectedDate && selectedSlot ? (
                        <div className="mt-1 space-y-1">
                          <p className="flex items-center gap-2 font-medium text-[#0D223A]">
                            <CalendarIcon className="h-3.5 w-3.5 text-[#0F766E]" />
                            {formatReadableDate(selectedDate, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="flex items-center gap-2 text-xs text-[#4E647B] tabular-nums">
                            <Clock className="h-3.5 w-3.5 text-[#0F766E]" />
                            {formatTime12Hour(selectedSlot.start)} –{' '}
                            {formatTime12Hour(selectedSlot.end)}
                          </p>
                        </div>
                      ) : selectedDate ? (
                        <p className="mt-1 text-xs text-[#4E647B]">
                          {formatReadableDate(selectedDate)} · Choose a time slot
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-[#8499AE]">Not chosen yet</p>
                      )}
                    </div>

                    <div className="pt-4 space-y-2 text-xs text-[#4E647B]">
                      <p className="font-medium text-[#0D223A]">{clinicName}</p>
                      <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0F766E]" />
                        <span>{clinicAddress}</span>
                      </p>
                      <p className="flex items-center gap-2 tabular-nums">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-[#0F766E]" />
                        <span>{clinicPhone}</span>
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
