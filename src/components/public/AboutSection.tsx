import { CLINIC_MEDIA } from '../../config/media';
import { formatDbTimeTo12Hour, WEEKDAY_NAMES } from '../../lib/availability';
import type { BusinessHour, ClinicSettings } from '../../types/database';
import { ClinicImage } from '../ClinicImage';

interface AboutSectionProps {
  clinicSettings: ClinicSettings | null;
  businessHours: BusinessHour[];
}

const CARE_STANDARDS = [
  {
    index: '01.',
    title: 'Clear explanations before every step',
    body: 'We review digital images together and walk through practical options, visit timing, and expected costs before beginning any care.',
  },
  {
    index: '02.',
    title: 'Prevention-first, conservative dentistry',
    body: 'Our focus is preserving natural tooth structure through attentive routine exams, gentle cleanings, and early intervention.',
  },
  {
    index: '03.',
    title: 'Calm suites & strict clinical hygiene',
    body: 'Bright, quiet treatment rooms paired with hospital-grade sterilization protocols designed to put every patient at ease.',
  },
];

export function AboutSection({ clinicSettings, businessHours }: AboutSectionProps) {
  const clinicName = clinicSettings?.clinic_name || 'Harborview Dental';

  // Display Monday (1) through Sunday (0) in natural clinic order
  const orderedWeekdays = [1, 2, 3, 4, 5, 6, 0];

  return (
    <section id="about" className="border-y border-[#DCE6F0] bg-[#F4F8FB] py-20 lg:py-24">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="grid grid-cols-1 items-stretch gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Left Column: Authentic Dental Consultation Storytelling */}
          <div className="flex flex-col gap-6 lg:col-span-6">
            <div className="overflow-hidden rounded-2xl border border-[#DCE6F0] bg-white">
              <div className="aspect-[4/3] overflow-hidden bg-[#EAF2F7]">
                <ClinicImage
                  src={CLINIC_MEDIA.aboutConsultation.src}
                  alt={CLINIC_MEDIA.aboutConsultation.alt}
                  fallbackLabel={clinicName}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-[#EAF2F7] px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-[#0D223A]">
                    Unhurried Patient Consultations
                  </p>
                  <p className="text-xs text-[#4E647B]">
                    Dedicated one-on-one time with your dentist at every visit
                  </p>
                </div>
              </div>
            </div>

            {/* Live Weekly Hours Panel */}
            <div className="rounded-2xl border border-[#DCE6F0] bg-white p-6">
              <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-[#EAF2F7]">
                <h3 className="font-display text-base font-semibold text-[#0D223A]">
                  Weekly Clinic Hours
                </h3>
                <span className="text-xs text-[#4E647B]">Live schedule</span>
              </div>

              {businessHours.length === 0 ? (
                <p className="pt-4 text-sm text-[#4E647B]">
                  Clinic hours will display here once configured in the dashboard.
                </p>
              ) : (
                <dl className="mt-3 divide-y divide-[#F0F5FA] text-sm">
                  {orderedWeekdays.map((dayIndex) => {
                    const entry = businessHours.find((h) => h.weekday === dayIndex);
                    const isOpen = Boolean(entry?.is_open);

                    return (
                      <div
                        key={dayIndex}
                        className="flex items-center justify-between py-2.5 gap-4"
                      >
                        <dt className="font-medium text-[#0D223A]">{WEEKDAY_NAMES[dayIndex]}</dt>
                        <dd
                          className={`tabular-nums ${
                            isOpen ? 'text-[#4E647B]' : 'text-[#8499AE]'
                          }`}
                        >
                          {isOpen && entry
                            ? `${formatDbTimeTo12Hour(entry.start_time)} – ${formatDbTimeTo12Hour(
                                entry.end_time
                              )}`
                            : 'Closed'}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              )}
            </div>
          </div>

          {/* Right Column: Practice Philosophy & Care Standards */}
          <div className="flex flex-col justify-center lg:col-span-6">
            <p className="text-sm font-medium text-[#0F766E]">About {clinicName}</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#0D223A] sm:text-4xl">
              A calmer standard of everyday dental care.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#4E647B]">
              Visiting the dentist should feel transparent, calm, and respectful of your time. We
              designed our clinic around quiet daylight suites, gentle clinical techniques, and
              straightforward communication so you always know what to expect.
            </p>

            <div className="mt-8 divide-y divide-[#DCE6F0] border-y border-[#DCE6F0]">
              {CARE_STANDARDS.map((item) => (
                <div key={item.index} className="py-5">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs font-medium text-[#0F766E]">
                      {item.index}
                    </span>
                    <h3 className="font-display text-base font-semibold text-[#0D223A]">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mt-1.5 pl-8 text-sm leading-relaxed text-[#4E647B]">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-[#DCE6F0] bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center">
                <div className="sm:col-span-5 h-36 sm:h-full bg-[#EAF2F7]">
                  <ClinicImage
                    src={CLINIC_MEDIA.serviceLounge.src}
                    alt={CLINIC_MEDIA.serviceLounge.alt}
                    fallbackLabel="Patient Lounge"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="sm:col-span-7 p-5">
                  <p className="text-sm font-semibold text-[#0D223A]">
                    Welcoming Reception &amp; On-Time Visits
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#4E647B]">
                    Appointments are carefully spaced around treatment durations so you spend your
                    visit with your care team, not waiting in the lobby.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
