import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface ClinicImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  loading?: 'eager' | 'lazy';
}

export function ClinicImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackLabel = 'Harborview Dental',
  loading = 'lazy',
}: ClinicImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#EAF2F7] via-[#F4F8FB] to-[#E6F4F1] text-[#4E647B] p-6 text-center ${className}`}
      >
        <ShieldCheck className="w-7 h-7 text-[#0F766E] mb-2" strokeWidth={1.6} />
        <span className="text-xs font-medium tracking-wide text-[#0D223A]">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
