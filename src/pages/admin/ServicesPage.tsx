import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Loader2,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  X,
} from 'lucide-react';
import { Toast, type ToastMessage } from '../../components/Toast';
import { formatCurrencyUSD } from '../../lib/availability';
import {
  createService,
  fetchAllServices,
  setServiceActive,
  updateService,
} from '../../lib/clinicApi';
import type { Service } from '../../types/database';

interface ServiceFormState {
  name: string;
  description: string;
  duration_minutes: string;
  price: string;
  is_active: boolean;
}

const EMPTY_FORM: ServiceFormState = {
  name: '',
  description: '',
  duration_minutes: '45',
  price: '125',
  is_active: true,
};

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal state (Add or Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ id: Date.now(), type, text });
  };

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllServices();
      setServices(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load services.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const counts = useMemo(
    () => ({
      all: services.length,
      active: services.filter((s) => s.is_active).length,
      inactive: services.filter((s) => !s.is_active).length,
    }),
    [services]
  );

  const filteredServices = useMemo(() => {
    if (filter === 'active') return services.filter((s) => s.is_active);
    if (filter === 'inactive') return services.filter((s) => !s.is_active);
    return services;
  }, [services, filter]);

  const openAddModal = () => {
    setEditingService(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description ?? '',
      duration_minutes: String(service.duration_minutes),
      price: String(service.price),
      is_active: service.is_active,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingService(null);
    setFormError(null);
  };

  const handleSaveService = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = form.name.trim();
    const duration = Number(form.duration_minutes);
    const price = Number(form.price);

    if (!name) {
      setFormError('Service name is required.');
      return;
    }
    if (!Number.isFinite(duration) || duration < 5 || duration > 480) {
      setFormError('Duration must be between 5 and 480 minutes.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setFormError('Price must be 0 or greater.');
      return;
    }

    setSaving(true);
    try {
      if (editingService) {
        const updated = await updateService(editingService.id, {
          name,
          description: form.description,
          duration_minutes: duration,
          price,
          is_active: form.is_active,
        });
        setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        showToast('success', `"${updated.name}" updated successfully.`);
      } else {
        const created = await createService({
          name,
          description: form.description,
          duration_minutes: duration,
          price,
          is_active: form.is_active,
        });
        setServices((prev) => [...prev, created]);
        showToast('success', `"${created.name}" added to your dental services.`);
      }
      setModalOpen(false);
      setEditingService(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save service.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (service: Service) => {
    setTogglingId(service.id);
    try {
      const updated = await setServiceActive(service.id, !service.is_active);
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showToast(
        'success',
        updated.is_active
          ? `"${updated.name}" is now active and visible on the public booking page.`
          : `"${updated.name}" deactivated and hidden from public booking.`
      );
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Unable to update service status.');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0D223A] sm:text-3xl">
            Dental Services
          </h1>
          <p className="mt-1 text-sm text-[#4E647B]">
            Add treatments, edit pricing and durations, or deactivate offerings without affecting
            past appointments.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => void loadServices()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-[#DCE6F0] bg-white px-3.5 py-2 text-xs font-medium text-[#0D223A] hover:bg-[#F4F8FB]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#115E59] whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Add Service
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Filter services by visibility"
          className="inline-flex items-center gap-1 rounded-xl border border-[#DCE6F0] bg-white p-1"
        >
          {(
            [
              { id: 'all', label: 'All Services', count: counts.all },
              { id: 'active', label: 'Active', count: counts.active },
              { id: 'inactive', label: 'Inactive', count: counts.inactive },
            ] as const
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#0D223A] text-white'
                    : 'text-[#4E647B] hover:bg-[#F4F8FB] hover:text-[#0D223A]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`tabular-nums ${active ? 'text-white/80' : 'text-[#8499AE]'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-[#6E849C]">
          Only active services appear on the public website and online booking flow.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Services Table */}
      <div className="overflow-hidden rounded-2xl border border-[#DCE6F0] bg-white">
        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-[#F4F8FB]" />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-display text-base font-semibold text-[#0D223A]">
              {services.length === 0 ? 'No dental services added yet' : 'No services in this view'}
            </p>
            <p className="mt-1 text-sm text-[#4E647B]">
              {services.length === 0
                ? 'Create your first service so patients can book visits online.'
                : 'Switch filter tabs or add a new treatment.'}
            </p>
            {services.length === 0 && (
              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#115E59]"
              >
                <Plus className="h-4 w-4" />
                Add First Service
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#EAF2F7] bg-[#FAFDFE] text-xs font-medium text-[#4E647B]">
                <tr>
                  <th className="px-6 py-3.5">Service</th>
                  <th className="px-4 py-3.5 text-right">Duration</th>
                  <th className="px-4 py-3.5 text-right">Price</th>
                  <th className="px-4 py-3.5">Visibility</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF2F7]">
                {filteredServices.map((service) => {
                  const isBusy = togglingId === service.id;
                  return (
                    <tr
                      key={service.id}
                      className={`transition-colors hover:bg-[#FAFDFE] ${
                        !service.is_active ? 'bg-[#FAFBFD]' : ''
                      }`}
                    >
                      <td className="px-6 py-4 max-w-md">
                        <p
                          className={`font-medium ${
                            service.is_active ? 'text-[#0D223A]' : 'text-[#6E849C]'
                          }`}
                        >
                          {service.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[#6E849C] line-clamp-2">
                          {service.description || 'No description provided'}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right font-mono text-xs text-[#0D223A] tabular-nums whitespace-nowrap">
                        {service.duration_minutes} min
                      </td>

                      <td className="px-4 py-4 text-right font-mono text-sm font-medium text-[#0D223A] tabular-nums whitespace-nowrap">
                        {formatCurrencyUSD(service.price)}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                            service.is_active
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-slate-200 bg-slate-100 text-slate-600'
                          }`}
                        >
                          {service.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(service)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE6F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0D223A] transition-colors hover:bg-[#F4F8FB]"
                          >
                            <Pencil className="h-3.5 w-3.5 text-[#4E647B]" />
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleToggleActive(service)}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                              service.is_active
                                ? 'border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
                                : 'border-[#B8DDD5] bg-[#F2FAF8] text-[#0F766E] hover:bg-[#E6F4F1]'
                            }`}
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Power className="h-3.5 w-3.5" />
                            )}
                            {service.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Service Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D223A]/45 p-4 backdrop-blur-[2px]"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#DCE6F0] bg-white p-6 sm:p-7 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#EAF2F7] pb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0D223A]">
                  {editingService ? 'Edit Dental Service' : 'Add New Dental Service'}
                </h2>
                <p className="mt-0.5 text-xs text-[#4E647B]">
                  {editingService
                    ? 'Updates apply immediately across your public site and booking duration calculations.'
                    : 'Active services appear automatically in the online booking flow.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close service form"
                className="rounded-lg p-1.5 text-[#4E647B] hover:bg-[#F4F8FB]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveService} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="service-name"
                  className="block text-sm font-medium text-[#0D223A]"
                >
                  Service name <span className="text-rose-600">*</span>
                </label>
                <input
                  id="service-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Preventive Teeth Cleaning"
                  className="mt-1.5 block w-full rounded-lg border border-[#DCE6F0] px-3.5 py-2.5 text-sm text-[#0D223A] placeholder:text-[#9CB0C4] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="service-description"
                  className="block text-sm font-medium text-[#0D223A]"
                >
                  Description
                </label>
                <textarea
                  id="service-description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what patients can expect during this visit."
                  className="mt-1.5 block w-full rounded-lg border border-[#DCE6F0] px-3.5 py-2.5 text-sm text-[#0D223A] placeholder:text-[#9CB0C4] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="service-duration"
                    className="block text-sm font-medium text-[#0D223A]"
                  >
                    Duration (minutes) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="service-duration"
                    type="number"
                    min={5}
                    max={480}
                    step={5}
                    required
                    value={form.duration_minutes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, duration_minutes: e.target.value }))
                    }
                    className="mt-1.5 block w-full rounded-lg border border-[#DCE6F0] px-3.5 py-2.5 text-sm font-mono text-[#0D223A] tabular-nums focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="service-price"
                    className="block text-sm font-medium text-[#0D223A]"
                  >
                    Price (USD) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="service-price"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={form.price}
                    onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                    className="mt-1.5 block w-full rounded-lg border border-[#DCE6F0] px-3.5 py-2.5 text-sm font-mono text-[#0D223A] tabular-nums focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between rounded-xl border border-[#EAF2F7] bg-[#FAFDFE] px-4 py-3 cursor-pointer">
                <div>
                  <span className="block text-sm font-medium text-[#0D223A]">
                    Active for online booking
                  </span>
                  <span className="block text-xs text-[#6E849C]">
                    Show this service on the public dental website
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-[#B7CBE0] accent-[#0F766E]"
                />
              </label>

              <div className="flex items-center justify-end gap-3 border-t border-[#EAF2F7] pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-[#DCE6F0] bg-white px-4 py-2 text-sm font-medium text-[#0D223A] hover:bg-[#F4F8FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-5 py-2 text-sm font-semibold text-white hover:bg-[#115E59] disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingService ? 'Save Changes' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
