import { ArrowRight, Calendar, Clock, MapPin, Phone } from 'lucide-react';
import { CLINIC_MEDIA } from '../../config/media';
import { formatDbTimeTo12Hour, WEEKDAY_NAMES } from '../../lib/availability';
import type { BusinessHour, ClinicSettings } from '../../types/database';
import { ClinicImage } from '../ClinicImage';

interface HeroSectionProps {
  clinicSettings: ClinicSettings | null;
  businessHours: BusinessHour[];
  onBookClick: () => void;
}

export function HeroSection({ clinicSettings, businessHours, onBookClick }: HeroSectionProps) {
  const todayWeekday = new Date().getDay();
  const todayHours = businessHours.find((h) => h.weekday === todayWeekday);

  const todayHoursText = todayHours
    ? todayHours.is_open
      ? `${formatDbTimeTo12Hour(todayHours.start_time)} – ${formatDbTimeTo12Hour(todayHours.end_time)}`
      : 'Closed today'
    : 'Check schedule below';

  const clinicAddress = clinicSettings?.clinic_address || '420 Waterfront Plaza, Suite 300';
  const clinicPhone = clinicSettings?.clinic_phone || '(206) 555-0194';

  return (
    <section
      id="top"
      className="relative overflow-hidden bg-gradient-to-b from-[#F5FAFD] via-[#F9FCFE] to-white"
    >
      {/* Subtle architectural daylight radial wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 right-0 h-[480px] w-[620px] rounded-full bg-[#0F766E]/[0.05] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-[320px] w-[420px] rounded-full bg-[#38BDF8]/[0.06] blur-3xl"
      />

      <div className="relative mx-auto max-w-[1200px] px-5 pt-12 pb-10 sm:px-8 lg:pt-18 lg:pb-14">
        <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Clear Clinical Proposition */}
          <div className="flex flex-col justify-center lg:col-span-6">
            <p className="text-sm font-medium tracking-wide text-[#0F766E]">
              Preventive, Restorative &amp; Cosmetic Dentistry
            </p>

            <h1
              className="mt-4 font-display font-bold tracking-[-0.025em] text-[#0D223A] leading-[1.09]"
              style={{ fontSize: 'clamp(2.25rem, 4.1vw, 3.65rem)' }}
            >
              Calm, attentive dental care built around your comfort.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#4E647B] sm:text-[17px]">
              From thorough preventive checkups and gentle cleanings to restorative and cosmetic
              consultations, our clinicians take the time to explain every option clearly—with
              transparent scheduling and zero guesswork.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onBookClick}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#115E59] hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E] whitespace-nowrap shrink-0"
              >
                Book Your Appointment
                <ArrowRight className="h-4 w-4" />
              </button>

              <a
                href="#services"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE6F0] bg-white px-5 py-3.5 text-sm font-medium text-[#0D223A] transition-colors duration-150 hover:border-[#B7CBE0] hover:bg-[#F4F8FB] whitespace-nowrap shrink-0"
              >
                Explore Services
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-[#4E647B]">
              <span>New patients welcome</span>
              <span aria-hidden="true" className="text-[#B7CBE0]">
                ·
              </span>
              <span>Transparent durations &amp; fees</span>
              <span aria-hidden="true" className="text-[#B7CBE0]">
                ·
              </span>
              <span>Real-time online booking</span>
            </div>
          </div>

          {/* Right Column: Dominant Architectural Dental Visual */}
          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[300px] sm:min-h-[380px] lg:min-h-[450px] overflow-hidden rounded-2xl border border-[#DCE6F0] bg-[#EAF2F7] shadow-[0_20px_50px_-24px_rgba(13,34,58,0.18)]">
              <ClinicImage
                src={CLINIC_MEDIA.heroSuite.src}
                alt={CLINIC_MEDIA.heroSuite.alt}
                loading="eager"
                className="h-full w-full object-cover"
              />
              {/* Measured bottom contrast scrim */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0D223A]/75 via-[#0D223A]/30 to-transparent"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6 text-white">
                <div>
                  <p className="text-sm font-semibold tracking-tight">
                    Private Daylight Treatment Suites
                  </p>
                  <p className="mt-0.5 text-xs text-white/85">
                    Modern digital diagnostics · Hospital-grade sterilization
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Clinic Quick-Facts Strip Below Hero Split */}
        <div className="mt-10 grid grid-cols-1 gap-4 border-t border-[#DCE6F0] pt-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#4E647B]">Clinic Location</p>
              <p className="mt-0.5 text-sm font-medium text-[#0D223A] leading-snug">
                {clinicAddress}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#4E647B]">Direct Reception</p>
              <a
                href={`tel:${clinicPhone.replace(/[^\d+]/g, '')}`}
                className="mt-0.5 block text-sm font-medium text-[#0D223A] tabular-nums hover:text-[#0F766E]"
              >
                {clinicPhone}
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#4E647B]">
                Today ({WEEKDAY_NAMES[todayWeekday]})
              </p>
              <p className="mt-0.5 text-sm font-medium text-[#0D223A] tabular-nums">
                {todayHoursText}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#4E647B]">Online Scheduling</p>
              <p className="mt-0.5 text-sm font-medium text-[#0D223A]">
                Live availability &amp; instant request
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
