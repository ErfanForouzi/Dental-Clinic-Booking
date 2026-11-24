import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, RefreshCw, Save } from 'lucide-react';
import { Toast, type ToastMessage } from '../../components/Toast';
import { fetchClinicSettings, saveClinicSettings } from '../../lib/clinicApi';

interface SettingsFormState {
  clinic_name: string;
  clinic_email: string;
  clinic_phone: string;
  clinic_address: string;
  slot_interval_minutes: string;
  booking_notice_hours: string;
}

const DEFAULT_SETTINGS: SettingsFormState = {
  clinic_name: 'Harborview Dental',
  clinic_email: 'care@harborviewdental.com',
  clinic_phone: '(206) 555-0194',
  clinic_address: '420 Waterfront Plaza, Suite 300, Seattle, WA 98101',
  slot_interval_minutes: '30',
  booking_notice_hours: '2',
};

export function ClinicSettingsPage() {
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [form, setForm] = useState<SettingsFormState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ id: Date.now(), type, text });
  };

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClinicSettings();
      if (data) {
        setSettingsId(data.id);
        setForm({
          clinic_name: data.clinic_name,
          clinic_email: data.clinic_email,
          clinic_phone: data.clinic_phone,
          clinic_address: data.clinic_address,
          slot_interval_minutes: String(data.slot_interval_minutes),
          booking_notice_hours: String(data.booking_notice_hours),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load clinic settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const interval = Number(form.slot_interval_minutes);
    const notice = Number(form.booking_notice_hours);

    if (!form.clinic_name.trim()) {
      setError('Clinic name is required.');
      return;
    }
    if (!form.clinic_email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.clinic_email.trim())) {
      setError('Please enter a valid clinic email address.');
      return;
    }
    if (!form.clinic_phone.trim()) {
      setError('Clinic phone number is required.');
      return;
    }
    if (!form.clinic_address.trim()) {
      setError('Clinic address is required.');
      return;
    }
    if (!Number.isFinite(interval) || interval < 5 || interval > 180) {
      setError('Slot interval must be between 5 and 180 minutes.');
      return;
    }
    if (!Number.isFinite(notice) || notice < 0 || notice > 336) {
      setError('Booking notice hours must be between 0 and 336 hours.');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveClinicSettings(settingsId, {
        clinic_name: form.clinic_name,
        clinic_email: form.clinic_email,
        clinic_phone: form.clinic_phone,
        clinic_address: form.clinic_address,
        slot_interval_minutes: interval,
        booking_notice_hours: notice,
      });

      setSettingsId(saved.id);
      setForm({
        clinic_name: saved.clinic_name,
        clinic_email: saved.clinic_email,
        clinic_phone: saved.clinic_phone,
        clinic_address: saved.clinic_address,
        slot_interval_minutes: String(saved.slot_interval_minutes),
        booking_notice_hours: String(saved.booking_notice_hours),
      });
      showToast('success', 'Clinic settings saved and synced to the public website.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to save clinic settings.';
      setError(msg);
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0D223A] sm:text-3xl">
            Clinic Settings
          </h1>
          <p className="mt-1 text-sm text-[#4E647B]">
            Update practice contact details and online scheduling rules stored in{' '}
            <span className="font-mono text-xs text-[#0D223A]">clinic_settings</span>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadSettings()}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-[#DCE6F0] bg-white px-3.5 py-2 text-xs font-medium text-[#0D223A] hover:bg-[#F4F8FB]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Reload
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-2xl border border-[#DCE6F0] bg-white"
      >
        {loading ? (
          <div className="p-6 space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-[#F4F8FB]" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-[#EAF2F7]">
            {/* Practice Details */}
            <div className="p-6 sm:p-8">
              <h2 className="font-display text-base font-semibold text-[#0D223A]">
                Practice Information
              </h2>
              <p className="mt-1 text-xs text-[#4E647B]">
                Displayed across the public navbar, hero clinic strip, booking confirmation, and
                footer.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="clinic-name"
                    className="block text-sm font-medium text-[#0D223A]"
                  >
                    Clinic name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="clinic-name"
                    type="text"
                    required
                    value={form.clinic_name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, clinic_name: e.target.value }))
                    }
                    className="mt-1.5 block w-full rounded-lg border border-[#DCE6F0] px-3.5 py-2.5 text-sm text-[#0D223A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="clinic-email"
                    className="block text-sm font-medium text-[#0D223A]"
                  >
                    Clinic email <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="clinic-email"
                    type="email"
                    required
                    value={form.clinic_email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, clinic_email: e.target.value }))
                    }
                    className="mt-1.5 block w-full rounded-lg border border-[#DCE6F0] px-3.5 py-2.5 text-sm text-[#0D223A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="clinic-phone"
                    className="block text-sm font-medium text-[#0D223A]"
                  >
                    Clinic phone <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="clinic-phone"
                    type="tel"
                    required
                    value={form.clinic_phone}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, clinic_phone: e.target.value }))
                    }
                    className="mt-1.5 block w-full rounded-lg border border-[#DCE6F0] px-3.5 py-2.5 text-sm text-[#0D223A] tabular-nums focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="clinic-address"
                    className="block text-sm font-medium text-[#0D223A]"
                  >
                    Clinic address <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="clinic-address"
                    type="text"
                    required
                    value={form.clinic_address}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, clinic_address: e.target.value }))
                    }
                    className="mt-1.5 block w-full rounded-lg border border-[#DCE6F0] px-3.5 py-2.5 text-sm text-[#0D223A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                  />
                </div>
              </div>
            </div>

            {/* Scheduling Parameters */}
            <div className="p-6 sm:p-8">
              <h2 className="font-display text-base font-semibold text-[#0D223A]">
                Booking Slot Parameters
              </h2>
              <p className="mt-1 text-xs text-[#4E647B]">
                Controls how available time slots are spaced and how far in advance patients must
                book.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="slot-interval"
                    className="block text-sm font-medium text-[#0D223A]"
                  >
                    Slot interval (minutes) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="slot-interval"
                    type="number"
                    min={5}
                    max={180}
                    step={5}
                    required
                    value={form.slot_interval_minutes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, slot_interval_minutes: e.target.value }))
                    }
                    className="mt-1.5 block w-full rounded-lg border border-[#DCE6F0] px-3.5 py-2.5 text-sm font-mono text-[#0D223A] tabular-nums focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                  />
                  <p className="mt-1.5 text-xs text-[#6E849C]">
                    Start-time step between slots (e.g., 15, 30, or 60 minutes).
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="booking-notice"
                    className="block text-sm font-medium text-[#0D223A]"
                  >
                    Minimum booking notice (hours) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="booking-notice"
                    type="number"
                    min={0}
                    max={336}
                    step={1}
                    required
                    value={form.booking_notice_hours}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, booking_notice_hours: e.target.value }))
                    }
                    className="mt-1.5 block w-full rounded-lg border border-[#DCE6F0] px-3.5 py-2.5 text-sm font-mono text-[#0D223A] tabular-nums focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                  />
                  <p className="mt-1.5 text-xs text-[#6E849C]">
                    Slots closer than this lead time from now are hidden from patients.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-[#EAF2F7] bg-[#FAFDFE] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#4E647B]">
            Saved settings update the public clinic website and booking slot generator immediately.
          </p>
          <button
            type="submit"
            disabled={loading || saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#115E59] disabled:opacity-60 whitespace-nowrap"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Clinic Settings
          </button>
        </div>
      </form>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
