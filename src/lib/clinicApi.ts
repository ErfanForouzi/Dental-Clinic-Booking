import { isSupabaseConfigured, supabase } from './supabase';
import type {
  Appointment,
  AppointmentStatus,
  AppointmentWithService,
  BlockedDate,
  BusinessHour,
  ClinicSettings,
  Service,
} from '../types/database';

function ensureConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.'
    );
  }
}

export interface PublicClinicBundle {
  services: Service[];
  clinicSettings: ClinicSettings | null;
  businessHours: BusinessHour[];
  blockedDates: BlockedDate[];
}

export async function fetchPublicClinicData(): Promise<PublicClinicBundle> {
  ensureConfigured();

  const [servicesRes, settingsRes, hoursRes, blockedRes] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, description, duration_minutes, price, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('clinic_settings')
      .select(
        'id, clinic_name, clinic_email, clinic_phone, clinic_address, slot_interval_minutes, booking_notice_hours, created_at'
      )
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('business_hours')
      .select('id, weekday, is_open, start_time, end_time')
      .order('weekday', { ascending: true }),
    supabase
      .from('blocked_dates')
      .select('id, blocked_date, reason, created_at')
      .order('blocked_date', { ascending: true }),
  ]);

  if (servicesRes.error) throw new Error(servicesRes.error.message);
  if (settingsRes.error) throw new Error(settingsRes.error.message);
  if (hoursRes.error) throw new Error(hoursRes.error.message);
  if (blockedRes.error) throw new Error(blockedRes.error.message);

  return {
    services: (servicesRes.data ?? []).map((row) => ({
      ...row,
      price: Number(row.price),
      duration_minutes: Number(row.duration_minutes),
    })),
    clinicSettings: settingsRes.data
      ? {
          ...settingsRes.data,
          slot_interval_minutes: Number(settingsRes.data.slot_interval_minutes),
          booking_notice_hours: Number(settingsRes.data.booking_notice_hours),
        }
      : null,
    businessHours: hoursRes.data ?? [],
    blockedDates: blockedRes.data ?? [],
  };
}

export async function fetchAppointmentsForDate(
  isoDate: string
): Promise<Pick<Appointment, 'appointment_date' | 'start_time' | 'end_time' | 'status'>[]> {
  ensureConfigured();

  // Prefer the PII-free RPC defined in supabase/schema.sql when available
  const rpcRes = await supabase.rpc('get_booked_slots', { target_date: isoDate });
  if (!rpcRes.error && Array.isArray(rpcRes.data)) {
    return rpcRes.data as Pick<
      Appointment,
      'appointment_date' | 'start_time' | 'end_time' | 'status'
    >[];
  }

  // Fallback for existing Supabase projects using direct table policies
  const { data, error } = await supabase
    .from('appointments')
    .select('appointment_date, start_time, end_time, status')
    .eq('appointment_date', isoDate)
    .neq('status', 'cancelled');

  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface CreateAppointmentInput {
  full_name: string;
  email: string;
  phone: string;
  service_id: string;
  appointment_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  notes: string | null;
}

export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  ensureConfigured();

  const payload = {
    full_name: input.full_name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    service_id: input.service_id,
    appointment_date: input.appointment_date,
    start_time: input.start_time,
    end_time: input.end_time,
    status: 'pending' as AppointmentStatus,
    notes: input.notes?.trim() ? input.notes.trim() : null,
  };

  // Omit .select() so strict admin-only SELECT RLS on appointments never blocks public patient inserts
  const { error } = await supabase.from('appointments').insert(payload);

  if (error) throw new Error(error.message);

  return {
    id: '',
    ...payload,
    created_at: new Date().toISOString(),
  };
}

/* ============================================================================
 * Admin Operations
 * ========================================================================== */

export async function fetchAllAppointments(): Promise<AppointmentWithService[]> {
  ensureConfigured();

  const { data, error } = await supabase
    .from('appointments')
    .select(
      `
      id,
      full_name,
      email,
      phone,
      service_id,
      appointment_date,
      start_time,
      end_time,
      status,
      notes,
      created_at,
      services (
        id,
        name,
        duration_minutes,
        price
      )
    `
    )
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const joinedService = Array.isArray(row.services) ? row.services[0] : row.services;
    return {
      ...row,
      services: joinedService
        ? {
            id: joinedService.id,
            name: joinedService.name,
            duration_minutes: Number(joinedService.duration_minutes),
            price: Number(joinedService.price),
          }
        : null,
    } as AppointmentWithService;
  });
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<Appointment> {
  ensureConfigured();

  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .select(
      'id, full_name, email, phone, service_id, appointment_date, start_time, end_time, status, notes, created_at'
    )
    .single();

  if (error) throw new Error(error.message);
  return data as Appointment;
}

export async function fetchAllServices(): Promise<Service[]> {
  ensureConfigured();

  const { data, error } = await supabase
    .from('services')
    .select('id, name, description, duration_minutes, price, is_active, created_at')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...row,
    price: Number(row.price),
    duration_minutes: Number(row.duration_minutes),
  }));
}

export interface ServiceMutationInput {
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
}

export async function createService(input: ServiceMutationInput): Promise<Service> {
  ensureConfigured();

  const { data, error } = await supabase
    .from('services')
    .insert({
      name: input.name.trim(),
      description: input.description.trim() || null,
      duration_minutes: Math.round(input.duration_minutes),
      price: Number(input.price),
      is_active: input.is_active,
    })
    .select('id, name, description, duration_minutes, price, is_active, created_at')
    .single();

  if (error) throw new Error(error.message);
  return {
    ...data,
    price: Number(data.price),
    duration_minutes: Number(data.duration_minutes),
  };
}

export async function updateService(id: string, input: ServiceMutationInput): Promise<Service> {
  ensureConfigured();

  const { data, error } = await supabase
    .from('services')
    .update({
      name: input.name.trim(),
      description: input.description.trim() || null,
      duration_minutes: Math.round(input.duration_minutes),
      price: Number(input.price),
      is_active: input.is_active,
    })
    .eq('id', id)
    .select('id, name, description, duration_minutes, price, is_active, created_at')
    .single();

  if (error) throw new Error(error.message);
  return {
    ...data,
    price: Number(data.price),
    duration_minutes: Number(data.duration_minutes),
  };
}

export async function setServiceActive(id: string, isActive: boolean): Promise<Service> {
  ensureConfigured();

  const { data, error } = await supabase
    .from('services')
    .update({ is_active: isActive })
    .eq('id', id)
    .select('id, name, description, duration_minutes, price, is_active, created_at')
    .single();

  if (error) throw new Error(error.message);
  return {
    ...data,
    price: Number(data.price),
    duration_minutes: Number(data.duration_minutes),
  };
}

export async function fetchBusinessHours(): Promise<BusinessHour[]> {
  ensureConfigured();

  const { data, error } = await supabase
    .from('business_hours')
    .select('id, weekday, is_open, start_time, end_time')
    .order('weekday', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface BusinessHourDraft {
  id?: string;
  weekday: number;
  is_open: boolean;
  start_time: string;
  end_time: string;
}

export async function saveBusinessHours(hours: BusinessHourDraft[]): Promise<BusinessHour[]> {
  ensureConfigured();

  for (const row of hours) {
    if (row.id) {
      const { error } = await supabase
        .from('business_hours')
        .update({
          is_open: row.is_open,
          start_time: row.start_time,
          end_time: row.end_time,
        })
        .eq('id', row.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('business_hours').upsert(
        {
          weekday: row.weekday,
          is_open: row.is_open,
          start_time: row.start_time,
          end_time: row.end_time,
        },
        { onConflict: 'weekday' }
      );
      if (error) throw new Error(error.message);
    }
  }

  return fetchBusinessHours();
}

export async function fetchBlockedDates(): Promise<BlockedDate[]> {
  ensureConfigured();

  const { data, error } = await supabase
    .from('blocked_dates')
    .select('id, blocked_date, reason, created_at')
    .order('blocked_date', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createBlockedDate(
  blockedDate: string,
  reason: string
): Promise<BlockedDate> {
  ensureConfigured();

  const { data, error } = await supabase
    .from('blocked_dates')
    .insert({
      blocked_date: blockedDate,
      reason: reason.trim() || null,
    })
    .select('id, blocked_date, reason, created_at')
    .single();

  if (error) throw new Error(error.message);
  return data as BlockedDate;
}

export async function deleteBlockedDate(id: string): Promise<void> {
  ensureConfigured();

  const { error } = await supabase.from('blocked_dates').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchClinicSettings(): Promise<ClinicSettings | null> {
  ensureConfigured();

  const { data, error } = await supabase
    .from('clinic_settings')
    .select(
      'id, clinic_name, clinic_email, clinic_phone, clinic_address, slot_interval_minutes, booking_notice_hours, created_at'
    )
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    ...data,
    slot_interval_minutes: Number(data.slot_interval_minutes),
    booking_notice_hours: Number(data.booking_notice_hours),
  };
}

export interface ClinicSettingsInput {
  clinic_name: string;
  clinic_email: string;
  clinic_phone: string;
  clinic_address: string;
  slot_interval_minutes: number;
  booking_notice_hours: number;
}

export async function saveClinicSettings(
  id: string | null,
  input: ClinicSettingsInput
): Promise<ClinicSettings> {
  ensureConfigured();

  const payload = {
    clinic_name: input.clinic_name.trim(),
    clinic_email: input.clinic_email.trim(),
    clinic_phone: input.clinic_phone.trim(),
    clinic_address: input.clinic_address.trim(),
    slot_interval_minutes: Math.max(5, Math.round(input.slot_interval_minutes)),
    booking_notice_hours: Math.max(0, Math.round(input.booking_notice_hours)),
  };

  if (id) {
    const { data, error } = await supabase
      .from('clinic_settings')
      .update(payload)
      .eq('id', id)
      .select(
        'id, clinic_name, clinic_email, clinic_phone, clinic_address, slot_interval_minutes, booking_notice_hours, created_at'
      )
      .single();

    if (error) throw new Error(error.message);
    return {
      ...data,
      slot_interval_minutes: Number(data.slot_interval_minutes),
      booking_notice_hours: Number(data.booking_notice_hours),
    };
  }

  const { data, error } = await supabase
    .from('clinic_settings')
    .insert(payload)
    .select(
      'id, clinic_name, clinic_email, clinic_phone, clinic_address, slot_interval_minutes, booking_notice_hours, created_at'
    )
    .single();

  if (error) throw new Error(error.message);
  return {
    ...data,
    slot_interval_minutes: Number(data.slot_interval_minutes),
    booking_notice_hours: Number(data.booking_notice_hours),
  };
}
