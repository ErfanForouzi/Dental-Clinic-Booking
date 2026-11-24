export interface MediaAsset {
  src: string;
  alt: string;
}

/**
 * Centralized dental clinic imagery registry.
 * Replace any `src` path here to swap photography across the entire website.
 */
export const CLINIC_MEDIA = {
  heroSuite: {
    src: '/src/assets/images/hero_dental_suite_1795557868953.jpg',
    alt: 'Sunlit modern dental treatment suite with ergonomic dental chair and pale oak cabinetry',
  },
  aboutConsultation: {
    src: '/src/assets/images/about_dentist_consultation_1795557848508.jpg',
    alt: 'Dentist calmly reviewing a digital dental care plan with a smiling patient in a bright consultation room',
  },
  serviceCheckup: {
    src: '/src/assets/images/service_dental_checkup_1795557848966.jpg',
    alt: 'Clean sunlit dental examination room prepared for a comprehensive dental checkup',
  },
  serviceCleaning: {
    src: '/src/assets/images/service_teeth_cleaning_1795557852473.jpg',
    alt: 'Sterilized polished dental hygiene instruments arranged neatly on an aqua ceramic tray',
  },
  serviceLounge: {
    src: '/src/assets/images/service_smile_whitening_1795557865524.jpg',
    alt: 'Calm modern dental clinic reception and smile consultation lounge bathed in natural daylight',
  },
} as const satisfies Record<string, MediaAsset>;

const SERVICE_FALLBACK_ROTATION: MediaAsset[] = [
  CLINIC_MEDIA.serviceCheckup,
  CLINIC_MEDIA.serviceCleaning,
  CLINIC_MEDIA.serviceLounge,
  CLINIC_MEDIA.aboutConsultation,
];

/**
 * Resolves a consistent, non-graphic dental clinic photograph for any dynamic service
 * loaded from Supabase, including newly created services from the admin dashboard.
 */
export function getServiceMedia(serviceName: string, index = 0): MediaAsset {
  const normalized = serviceName.toLowerCase();

  if (normalized.includes('clean') || normalized.includes('hygiene') || normalized.includes('polish') || normalized.includes('scaling')) {
    return CLINIC_MEDIA.serviceCleaning;
  }

  if (normalized.includes('whiten') || normalized.includes('cosmetic') || normalized.includes('veneer') || normalized.includes('smile')) {
    return CLINIC_MEDIA.serviceLounge;
  }

  if (normalized.includes('consult') || normalized.includes('emergency') || normalized.includes('orthodont') || normalized.includes('invisalign')) {
    return CLINIC_MEDIA.aboutConsultation;
  }

  if (normalized.includes('checkup') || normalized.includes('exam') || normalized.includes('filling') || normalized.includes('crown') || normalized.includes('restor')) {
    return CLINIC_MEDIA.serviceCheckup;
  }

  return SERVICE_FALLBACK_ROTATION[Math.abs(index) % SERVICE_FALLBACK_ROTATION.length];
}
