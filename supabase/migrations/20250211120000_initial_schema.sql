/*
  # BarberOS Initial Schema
  
  ## Query Description:
  Creates the complete database structure for the multi-tenant Barber SaaS.
  Includes tables for Tenants, Profiles, Customers, Services, Professionals, Appointments, Products, and Orders.
  
  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "High"
  - Requires-Backup: false
  - Reversible: true
  
  ## Structure Details:
  - tenants: Stores barbershop details
  - profiles: Extends auth.users with app-specific data
  - customers: Client database
  - services: Service catalog
  - professionals: Staff members
  - appointments: Scheduling data
  - products: Inventory
  - orders: Financial records/POS
*/

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Tenants (Barbearias)
create table if not exists public.tenants (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Profiles (Users linked to Auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  tenant_id uuid references public.tenants(id),
  name text,
  role text check (role in ('owner', 'manager', 'receptionist', 'barber')),
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Customers
create table if not exists public.customers (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) not null,
  name text not null,
  phone text,
  email text,
  marketing_consent boolean default false,
  total_visits integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Services
create table if not exists public.services (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) not null,
  name text not null,
  price decimal(10,2) not null,
  duration_minutes integer not null,
  buffer_minutes integer default 0,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Professionals
create table if not exists public.professionals (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) not null,
  user_id uuid references auth.users(id), -- Optional link if they login
  name text not null,
  commission_rate decimal(5,2) default 0,
  active boolean default true,
  avatar_url text,
  specialties text[], -- Array of strings
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Appointments
create table if not exists public.appointments (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) not null,
  customer_id uuid references public.customers(id),
  professional_id uuid references public.professionals(id),
  service_id uuid references public.services(id),
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  status text check (status in ('requested', 'confirmed', 'waiting', 'in_progress', 'finished', 'cancelled', 'no_show')) default 'requested',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Products
create table if not exists public.products (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) not null,
  name text not null,
  price decimal(10,2) not null,
  cost_price decimal(10,2) default 0,
  stock_quantity integer default 0,
  min_stock_alert integer default 5,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Orders (Financial/POS)
create table if not exists public.orders (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) not null,
  customer_id uuid references public.customers(id),
  total_amount decimal(10,2) not null,
  discount_amount decimal(10,2) default 0,
  final_amount decimal(10,2) not null,
  status text check (status in ('open', 'paid', 'cancelled')) default 'open',
  payment_method text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Order Items (Details)
create table if not exists public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  item_type text check (item_type in ('service', 'product')),
  item_id uuid not null, -- ID of service or product
  name text not null, -- Snapshot of name at time of purchase
  price decimal(10,2) not null,
  quantity integer default 1
);

-- Enable RLS
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.services enable row level security;
alter table public.professionals enable row level security;
alter table public.appointments enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Create Policies (Simplified for Phase 2: Allow Authenticated Users to Access All Data)
-- In a production environment, we would strictly filter by tenant_id using: using (tenant_id = (select tenant_id from profiles where id = auth.uid()))
create policy "Allow all authenticated access" on public.tenants for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated access" on public.profiles for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated access" on public.customers for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated access" on public.services for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated access" on public.professionals for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated access" on public.appointments for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated access" on public.products for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated access" on public.orders for all using (auth.role() = 'authenticated');
create policy "Allow all authenticated access" on public.order_items for all using (auth.role() = 'authenticated');

-- Insert Default Data for Demo (So the app isn't empty on first run)
insert into public.tenants (id, name, slug) 
values ('d0c36b40-6b06-4444-9999-000000000001', 'Barbearia Demo', 'barbearia-demo')
on conflict do nothing;
