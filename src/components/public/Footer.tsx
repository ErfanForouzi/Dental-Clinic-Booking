import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import type { ClinicSettings } from '../../types/database';

interface FooterProps {
  clinicSettings: ClinicSettings | null;
}

export function Footer({ clinicSettings }: FooterProps) {
  const clinicName = clinicSettings?.clinic_name || 'Harborview Dental';
  const clinicEmail = clinicSettings?.clinic_email || 'care@harborviewdental.com';
  const clinicPhone = clinicSettings?.clinic_phone || '(206) 555-0194';
  const clinicAddress =
    clinicSettings?.clinic_address || '420 Waterfront Plaza, Suite 300, Seattle, WA 98101';

  return (
    <footer className="bg-[#0D223A] text-white">
      <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-display text-xl font-bold tracking-tight">{clinicName}</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#B7CBE0]">
              Preventive, restorative, and cosmetic dental care in a bright, calm clinical setting.
              Clear explanations and real-time online scheduling.
            </p>
          </div>

          <div className="md:col-span-4 space-y-3">
            <p className="text-xs font-semibold tracking-wide text-[#8DB3D4]">Contact &amp; Visit</p>
            <div className="space-y-2.5 text-sm text-[#D6E4F0]">
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#5EEAD4]" />
                <span>{clinicAddress}</span>
              </p>
              <a
                href={`tel:${clinicPhone.replace(/[^\d+]/g, '')}`}
                className="flex items-center gap-2.5 tabular-nums hover:text-white transition-colors"
              >
                <Phone className="h-4 w-4 shrink-0 text-[#5EEAD4]" />
                <span>{clinicPhone}</span>
              </a>
              <a
                href={`mailto:${clinicEmail}`}
                className="flex items-center gap-2.5 hover:text-white transition-colors"
              >
                <Mail className="h-4 w-4 shrink-0 text-[#5EEAD4]" />
                <span>{clinicEmail}</span>
              </a>
            </div>
          </div>

          <div className="md:col-span-3 space-y-3">
            <p className="text-xs font-semibold tracking-wide text-[#8DB3D4]">Clinic Links</p>
            <ul className="space-y-2 text-sm text-[#D6E4F0]">
              <li>
                <a href="#services" className="hover:text-white transition-colors">
                  Dental Services
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-white transition-colors">
                  About Our Clinic
                </a>
              </li>
              <li>
                <a href="#booking" className="hover:text-white transition-colors">
                  Book Appointment
                </a>
              </li>
              <li>
                <Link to="/admin" className="hover:text-white transition-colors">
                  Staff &amp; Admin Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-[#8DB3D4] sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {clinicName}. All rights reserved.
          </p>
          <p>Patient care &amp; online appointment scheduling</p>
        </div>
      </div>
    </footer>
  );
}
