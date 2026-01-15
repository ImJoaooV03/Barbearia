export type Role = 'owner' | 'manager' | 'receptionist' | 'barber';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  created_at: string;
  google_config?: {
    clientId: string;
    apiKey: string;
  } | null;
}

export interface User {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  role: Role;
  avatar_url?: string;
}

export interface Professional {
  id: string;
  tenant_id: string;
  user_id?: string;
  name: string;
  specialties: string[];
  commission_rate: number;
  avatar_url?: string;
  active: boolean;
}

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
  buffer_minutes: number;
  active: boolean;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  email?: string;
  birth_date?: string; // YYYY-MM-DD
  notes?: string;
  marketing_consent: boolean;
  total_visits: number;
  last_visit?: string;
  created_at: string;
}

export type AppointmentStatus = 'requested' | 'confirmed' | 'waiting' | 'in_progress' | 'finished' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  tenant_id: string;
  customer_id: string;
  professional_id: string;
  service_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes?: string;
  google_event_id?: string;
  created_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  min_stock_alert: number;
}

export type PaymentMethod = 'credit_card' | 'debit_card' | 'cash' | 'pix';

export interface Order {
  id: string;
  tenant_id: string;
  customer_id?: string;
  appointment_id?: string;
  items: OrderItem[];
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  status: 'open' | 'paid' | 'cancelled';
  payment_method?: PaymentMethod;
  created_at: string;
}

export interface OrderItem {
  id: string;
  type: 'service' | 'product';
  item_id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  htmlLink?: string;
}

// Marketing Types
export interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  type: 'whatsapp' | 'email';
  status: 'draft' | 'sent' | 'scheduled';
  sent_count: number;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  type: 'reminder' | 'birthday' | 'promo' | 'recovery';
}
