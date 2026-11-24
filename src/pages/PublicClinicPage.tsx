import { useCallback, useEffect, useState } from 'react';
import { AboutSection } from '../components/public/AboutSection';
import { BookingSection } from '../components/public/BookingSection';
import { Footer } from '../components/public/Footer';
import { HeroSection } from '../components/public/HeroSection';
import { Navbar } from '../components/public/Navbar';
import { ServicesSection } from '../components/public/ServicesSection';
import { fetchPublicClinicData } from '../lib/clinicApi';
import { isSupabaseConfigured } from '../lib/supabase';
import type { BlockedDate, BusinessHour, ClinicSettings, Service } from '../types/database';

export function PublicClinicPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [stepTrigger, setStepTrigger] = useState(0);

  const loadClinicData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchPublicClinicData();
      setServices(data.services);
      setClinicSettings(data.clinicSettings);
      setBusinessHours(data.businessHours);
      setBlockedDates(data.blockedDates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load clinic information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClinicData();
  }, [loadClinicData]);

  // Keep browser tab title synced with clinic_settings.clinic_name when loaded
  useEffect(() => {
    if (clinicSettings?.clinic_name) {
      document.title = `${clinicSettings.clinic_name} — Dental Care & Online Booking`;
    }
  }, [clinicSettings?.clinic_name]);

  const scrollToBooking = () => {
    const el = document.getElementById('booking');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectServiceFromShowcase = (service: Service) => {
    setSelectedServiceId(service.id);
    setStepTrigger((prev) => prev + 1);
    scrollToBooking();
  };

  const clinicName = clinicSettings?.clinic_name || 'Harborview Dental';

  return (
    <div className="min-h-screen bg-white text-[#0D223A]">
      <Navbar clinicName={clinicName} onBookClick={scrollToBooking} />

      <main>
        <HeroSection
          clinicSettings={clinicSettings}
          businessHours={businessHours}
          onBookClick={scrollToBooking}
        />

        <ServicesSection
          services={services}
          loading={loading}
          error={error}
          selectedServiceId={selectedServiceId}
          onSelectService={handleSelectServiceFromShowcase}
          onRetry={loadClinicData}
        />

        <AboutSection clinicSettings={clinicSettings} businessHours={businessHours} />

        <BookingSection
          services={services}
          clinicSettings={clinicSettings}
          businessHours={businessHours}
          blockedDates={blockedDates}
          selectedServiceId={selectedServiceId}
          onSelectServiceId={setSelectedServiceId}
          externalStepTrigger={stepTrigger}
        />
      </main>

      <Footer clinicSettings={clinicSettings} />
    </div>
  );
}
