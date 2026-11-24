import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { getServiceMedia } from '../../config/media';
import { formatCurrencyUSD } from '../../lib/availability';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { Service } from '../../types/database';
import { ClinicImage } from '../ClinicImage';
import { SupabaseConfigNotice } from '../SupabaseConfigNotice';

interface ServicesSectionProps {
  services: Service[];
  loading: boolean;
  error: string | null;
  selectedServiceId: string | null;
  onSelectService: (service: Service) => void;
  onRetry: () => void;
}

export function ServicesSection({
  services,
  loading,
  error,
  selectedServiceId,
  onSelectService,
  onRetry,
}: ServicesSectionProps) {
  return (
    <section id="services" className="bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-[#0F766E]">Clinical Services</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#0D223A] sm:text-4xl">
              Comprehensive care tailored to your oral health.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-[#4E647B]">
            Every appointment includes clear upfront timing and pricing. Select any treatment below
            to check live time slots immediately.
          </p>
        </div>

        <div className="mt-12">
          {!isSupabaseConfigured ? (
            <SupabaseConfigNotice context="public" />
          ) : loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-2xl border border-[#DCE6F0] bg-white"
                >
                  <div className="aspect-[4/3] animate-pulse bg-[#EAF2F7]" />
                  <div className="p-6 space-y-3">
                    <div className="h-3.5 w-28 animate-pulse rounded bg-[#EAF2F7]" />
                    <div className="h-5 w-3/4 animate-pulse rounded bg-[#EAF2F7]" />
                    <div className="h-4 w-full animate-pulse rounded bg-[#F4F8FB]" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-[#F4F8FB]" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-[#0D223A]">
                  Unable to load dental services
                </h3>
                <p className="mt-1 text-sm text-[#4E647B]">{error}</p>
              </div>
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 rounded-lg border border-[#DCE6F0] bg-white px-4 py-2 text-sm font-medium text-[#0D223A] hover:bg-[#F4F8FB] whitespace-nowrap shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          ) : services.length === 0 ? (
            <div className="rounded-2xl border border-[#DCE6F0] bg-[#F4F8FB] p-10 text-center">
              <h3 className="text-lg font-semibold text-[#0D223A]">
                No active services published yet
              </h3>
              <p className="mt-2 text-sm text-[#4E647B] max-w-md mx-auto">
                Clinic administrators can add and activate dental services in the Admin Dashboard,
                and they will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service, index) => {
                const media = getServiceMedia(service.name, index);
                const isSelected = selectedServiceId === service.id;

                return (
                  <article
                    key={service.id}
                    className={`group flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 ${
                      isSelected
                        ? 'border-[#0F766E] bg-[#F7FCFB] shadow-[0_12px_30px_-16px_rgba(15,118,110,0.3)]'
                        : 'border-[#DCE6F0] bg-white hover:-translate-y-0.5 hover:border-[#B7CBE0] hover:shadow-[0_16px_36px_-22px_rgba(13,34,58,0.18)]'
                    }`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#EAF2F7]">
                      <ClinicImage
                        src={media.src}
                        alt={`${service.name} — ${media.alt}`}
                        fallbackLabel={service.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      {/* Zero-pill typographic metadata */}
                      <div className="flex items-center gap-2 text-xs font-medium text-[#4E647B] tabular-nums">
                        <span>{service.duration_minutes} min</span>
                        <span aria-hidden="true" className="text-[#B7CBE0]">
                          ·
                        </span>
                        <span className="font-mono text-[#0D223A] font-medium">
                          {formatCurrencyUSD(service.price)}
                        </span>
                      </div>

                      <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-[#0D223A]">
                        {service.name}
                      </h3>

                      <p className="mt-2.5 flex-1 text-sm leading-relaxed text-[#4E647B]">
                        {service.description ||
                          'Personalized clinical care with a calm consultation and clear preventive guidance.'}
                      </p>

                      <div className="mt-6 border-t border-[#EAF2F7] pt-4">
                        <button
                          type="button"
                          onClick={() => onSelectService(service)}
                          className={`inline-flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                            isSelected
                              ? 'bg-[#0F766E] text-white hover:bg-[#115E59]'
                              : 'bg-[#F4F8FB] text-[#0D223A] hover:bg-[#0F766E] hover:text-white'
                          }`}
                        >
                          <span>{isSelected ? 'Selected for Booking' : 'Schedule This Visit'}</span>
                          <ArrowUpRight className="h-4 w-4 shrink-0" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
