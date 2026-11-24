export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  service_id: string;
  appointment_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
}

export interface AppointmentWithService extends Appointment {
  services?: Pick<Service, 'id' | 'name' | 'duration_minutes' | 'price'> | null;
}

export interface BusinessHour {
  id: string;
  weekday: number; // 0 = Sunday ... 6 = Saturday
  is_open: boolean;
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
}

export interface BlockedDate {
  id: string;
  blocked_date: string; // YYYY-MM-DD
  reason: string | null;
  created_at: string;
}

export interface ClinicSettings {
  id: string;
  clinic_name: string;
  clinic_email: string;
  clinic_phone: string;
  clinic_address: string;
  slot_interval_minutes: number;
  booking_notice_hours: number;
  created_at: string;
}

export interface AdminUser {
  id: string;
  user_id: string;
  created_at: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  label: string;
}
