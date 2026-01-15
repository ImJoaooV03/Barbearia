/*
  # BarberOS Full Schema
  
  ## Query Description:
  Creates the complete database structure for the BarberOS SaaS.
  - Handles Multi-tenancy via `tenants` table.
  - Manages Users via `profiles` linked to `auth.users`.
  - Core entities: Services, Professionals, Customers, Appointments, Products, Orders.
  - RLS enabled on all tables to ensure data isolation.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "High"
  - Requires-Backup: false
  - Reversible: true
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tenants (Barbearias)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Profiles (Users linked to Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id),
    name TEXT,
    email TEXT,
    role TEXT CHECK (role IN ('owner', 'manager', 'receptionist', 'barber')) DEFAULT 'owner',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Professionals (Barbeiros)
CREATE TABLE IF NOT EXISTS public.professionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    user_id UUID REFERENCES public.profiles(id), -- Optional link if they have login
    name TEXT NOT NULL,
    specialties TEXT[] DEFAULT '{}',
    commission_rate NUMERIC(5,2) DEFAULT 0, -- 0 to 100
    avatar_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Services (Cortes, Barba, etc)
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    buffer_minutes INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Customers (Clientes)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    birth_date DATE,
    notes TEXT,
    marketing_consent BOOLEAN DEFAULT false,
    total_visits INTEGER DEFAULT 0,
    last_visit TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Appointments (Agendamentos)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) NOT NULL,
    professional_id UUID REFERENCES public.professionals(id) NOT NULL,
    service_id UUID REFERENCES public.services(id) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT CHECK (status IN ('requested', 'confirmed', 'waiting', 'in_progress', 'finished', 'cancelled', 'no_show')) DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Products (Estoque)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    cost_price NUMERIC(10,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    min_stock_alert INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Orders (Comandas/Vendas)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    customer_id UUID REFERENCES public.customers(id),
    appointment_id UUID REFERENCES public.appointments(id),
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    final_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT CHECK (status IN ('open', 'paid', 'cancelled')) DEFAULT 'open',
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Order Items (Itens da Comanda)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    item_type TEXT CHECK (item_type IN ('service', 'product')) NOT NULL,
    item_id UUID NOT NULL, -- Generic reference to service or product ID
    name TEXT NOT NULL, -- Snapshot of name at time of sale
    price NUMERIC(10,2) NOT NULL, -- Snapshot of price
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS POLICIES ---------------------------------------------------------------

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies

-- Tenants: Users can read their own tenant
CREATE POLICY "Users can view own tenant" ON public.tenants
    FOR SELECT USING (id = get_my_tenant_id());
-- Allow insert for new signups (handled by app logic, but for safety we can allow authenticated to create if they don't have one, or keep it open for now for the signup flow)
CREATE POLICY "Enable insert for authenticated users" ON public.tenants FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Profiles: Users can view profiles in their tenant, and their own profile
CREATE POLICY "Users can view profiles in same tenant" ON public.profiles
    FOR SELECT USING (tenant_id = get_my_tenant_id() OR id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Enable insert for authenticated users" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Professionals
CREATE POLICY "View professionals in tenant" ON public.professionals
    FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Manage professionals in tenant" ON public.professionals
    FOR ALL USING (tenant_id = get_my_tenant_id());

-- Services
CREATE POLICY "View services in tenant" ON public.services
    FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Manage services in tenant" ON public.services
    FOR ALL USING (tenant_id = get_my_tenant_id());

-- Customers
CREATE POLICY "View customers in tenant" ON public.customers
    FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Manage customers in tenant" ON public.customers
    FOR ALL USING (tenant_id = get_my_tenant_id());

-- Appointments
CREATE POLICY "View appointments in tenant" ON public.appointments
    FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Manage appointments in tenant" ON public.appointments
    FOR ALL USING (tenant_id = get_my_tenant_id());

-- Products
CREATE POLICY "View products in tenant" ON public.products
    FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Manage products in tenant" ON public.products
    FOR ALL USING (tenant_id = get_my_tenant_id());

-- Orders
CREATE POLICY "View orders in tenant" ON public.orders
    FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Manage orders in tenant" ON public.orders
    FOR ALL USING (tenant_id = get_my_tenant_id());

-- Order Items
-- Indirectly secured by order_id, but we need a direct check or join. 
-- For simplicity in MVP, we check if the order belongs to the tenant.
CREATE POLICY "View order items in tenant" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND orders.tenant_id = get_my_tenant_id()
        )
    );
CREATE POLICY "Manage order items in tenant" ON public.order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND orders.tenant_id = get_my_tenant_id()
        )
    );
