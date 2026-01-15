import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { 
  Tenant, User, Professional, Service, Customer, Appointment, Product, Order, GoogleCalendarEvent, Campaign 
} from '@/types';
import { toast } from 'sonner';
import { 
  initGoogleAPI, listUpcomingEvents, createGoogleEvent, 
  deleteGoogleEvent, updateGoogleEvent, checkConnection, handleGoogleLogin, clearToken, isGoogleConfigured, setGoogleConfig
} from './googleCalendar';

interface AppState {
  tenant: Tenant | null;
  user: User | null;
  services: Service[];
  professionals: Professional[];
  customers: Customer[];
  appointments: Appointment[];
  products: Product[];
  orders: Order[];
  campaigns: Campaign[]; // New
  
  // Google Calendar State
  googleConnected: boolean;
  googleEvents: GoogleCalendarEvent[];
  
  isLoading: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  fetchData: () => Promise<void>;
  
  // Google Actions
  connectGoogleCalendar: () => Promise<void>;
  disconnectGoogleCalendar: () => Promise<void>;
  syncGoogleEvents: () => Promise<void>;
  saveGoogleConfig: (clientId: string, apiKey: string) => Promise<void>;

  addAppointment: (apt: Omit<Appointment, 'id' | 'created_at'>) => Promise<void>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => Promise<void>;
  
  addCustomer: (customer: Omit<Customer, 'id' | 'created_at' | 'total_visits'>) => Promise<void>;
  
  addService: (service: Omit<Service, 'id' | 'created_at'>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;

  addProfessional: (professional: Omit<Professional, 'id' | 'created_at'>) => Promise<void>;
  deleteProfessional: (id: string) => Promise<void>;
  
  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  createOrder: (order: any, items: any[]) => Promise<void>;
  
  // Marketing Actions
  addCampaign: (campaign: Omit<Campaign, 'id' | 'created_at'>) => Promise<void>;

  logout: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  tenant: null,
  user: null,
  services: [],
  professionals: [],
  customers: [],
  appointments: [],
  products: [],
  orders: [],
  campaigns: [],
  
  googleConnected: false,
  googleEvents: [],
  
  isLoading: true,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error("Error fetching profile:", profileError);
          set({ user: null, isLoading: false });
          return;
        }

        if (profile) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', profile.tenant_id)
            .single();

          set({ user: { ...profile, email: session.user.email! }, tenant });
          
          if (tenant?.google_config) {
            setGoogleConfig(tenant.google_config);
          }

          if (isGoogleConfigured()) {
            await initGoogleAPI();
            const isGoogleReady = checkConnection();
            set({ googleConnected: isGoogleReady });
          }

          await get().fetchData();
          
          if (get().googleConnected) {
            get().syncGoogleEvents().catch(() => {
              set({ googleConnected: false });
              clearToken();
            });
          }
        }
      } else {
        set({ user: null, tenant: null });
      }
    } catch (error) {
      console.error("Initialization error:", error);
    } finally {
      set({ isLoading: false });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const { user } = get();
        if (!user) await get().initialize(); 
      } else if (event === 'SIGNED_OUT') {
        set({ 
          user: null, tenant: null, services: [], professionals: [], 
          customers: [], appointments: [], products: [], orders: [], campaigns: [],
          googleConnected: false, googleEvents: []
        });
      }
    });
  },

  fetchData: async () => {
    const { tenant } = get();
    if (!tenant) return;

    try {
      // Parallel fetching for performance
      const [s, p, c, a, prod, o] = await Promise.all([
        supabase.from('services').select('*').eq('tenant_id', tenant.id),
        supabase.from('professionals').select('*').eq('tenant_id', tenant.id),
        supabase.from('customers').select('*').eq('tenant_id', tenant.id),
        supabase.from('appointments').select('*').eq('tenant_id', tenant.id),
        supabase.from('products').select('*').eq('tenant_id', tenant.id),
        supabase.from('orders').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }),
        // Campaigns might not exist in DB yet, so we handle it gracefully if table missing
      ]);

      // Try fetching campaigns separately to avoid breaking everything if table is missing
      let campaignsData: Campaign[] = [];
      try {
        const { data } = await supabase.from('campaigns').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false });
        if (data) campaignsData = data as Campaign[];
      } catch (e) {
        console.warn("Campaigns table might be missing", e);
      }

      set({
        services: s.data || [],
        professionals: p.data || [],
        customers: c.data || [],
        appointments: a.data || [],
        products: prod.data || [],
        orders: o.data || [],
        campaigns: campaignsData
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados.");
    }
  },

  saveGoogleConfig: async (clientId, apiKey) => {
    const { tenant } = get();
    if (!tenant) return;

    const config = { clientId, apiKey };
    
    const { error } = await supabase
      .from('tenants')
      .update({ google_config: config })
      .eq('id', tenant.id);

    if (error) throw error;

    setGoogleConfig(config);
    set({ tenant: { ...tenant, google_config: config } });
    await initGoogleAPI();
  },

  connectGoogleCalendar: async () => {
    try {
      if (!isGoogleConfigured()) {
        toast.error("Integração não configurada. Adicione o CLIENT_ID nas configurações.");
        return;
      }
      await handleGoogleLogin();
      set({ googleConnected: true });
      toast.success("Google Calendar conectado!");
      await get().syncGoogleEvents();
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      if (error.message?.includes("não configurado")) {
        toast.error("Configuração Google pendente no sistema.");
      } else {
        toast.error("Falha ao conectar com Google.");
      }
    }
  },

  disconnectGoogleCalendar: async () => {
    clearToken();
    set({ googleConnected: false, googleEvents: [] });
    toast.success("Google Calendar desconectado.");
  },

  syncGoogleEvents: async () => {
    try {
      if (!get().googleConnected) return;
      const events = await listUpcomingEvents();
      set({ googleEvents: events });
    } catch (error: any) {
      console.error("Sync Error:", error);
      if (error.message === "Sessão expirada") {
        set({ googleConnected: false });
        toast.error("Sessão do Google expirada. Conecte novamente.");
      }
    }
  },

  addAppointment: async (apt) => {
    try {
      let googleEventId = null;
      if (get().googleConnected) {
        const service = get().services.find(s => s.id === apt.service_id);
        const customer = get().customers.find(c => c.id === apt.customer_id);
        const professional = get().professionals.find(p => p.id === apt.professional_id);
        
        try {
          const gEvent = await createGoogleEvent({
            summary: `BarberOS: ${service?.name} - ${customer?.name}`,
            description: `Profissional: ${professional?.name}\nServiço: ${service?.name}`,
            start: apt.start_time,
            end: apt.end_time
          });
          googleEventId = gEvent.id;
        } catch (e) {
          console.error("Failed to create Google Event", e);
          toast.warning("Agendamento criado, mas falha ao sincronizar com Google.");
        }
      }

      const { error } = await supabase.from('appointments').insert([{
        ...apt,
        google_event_id: googleEventId
      }]);
      
      if (error) {
        if (googleEventId) await deleteGoogleEvent(googleEventId);
        throw error;
      }

      await get().fetchData();
      if (get().googleConnected) await get().syncGoogleEvents();
    } catch (error: any) {
      console.error(error);
      throw error;
    }
  },

  updateAppointment: async (id, updates) => {
    const currentApt = get().appointments.find(a => a.id === id);
    if (!currentApt) return;

    if (get().googleConnected && currentApt.google_event_id) {
      if (updates.start_time || updates.end_time) {
        try {
          await updateGoogleEvent(currentApt.google_event_id, {
            start: updates.start_time || currentApt.start_time,
            end: updates.end_time || currentApt.end_time
          });
        } catch (e) {
          console.error("Failed to update Google Event", e);
          toast.warning("Falha ao atualizar no Google Calendar.");
        }
      }
    }

    const { error } = await supabase.from('appointments').update(updates).eq('id', id);
    if (error) throw error;

    await get().fetchData();
    if (get().googleConnected) await get().syncGoogleEvents();
  },

  updateAppointmentStatus: async (id, status) => {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (error) throw error;
    
    if (status === 'cancelled' || status === 'no_show') {
      const apt = get().appointments.find(a => a.id === id);
      if (apt?.google_event_id && get().googleConnected) {
        await deleteGoogleEvent(apt.google_event_id);
      }
    }

    set(state => ({
      appointments: state.appointments.map(a => a.id === id ? { ...a, status } : a)
    }));
    
    if (get().googleConnected) await get().syncGoogleEvents();
  },

  addCustomer: async (customer) => {
    const { error } = await supabase.from('customers').insert([customer]);
    if (error) throw error;
    await get().fetchData();
  },
  
  addService: async (service) => {
    const { error } = await supabase.from('services').insert([service]);
    if (error) throw error;
    await get().fetchData();
  },

  deleteService: async (id) => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) throw error;
    await get().fetchData();
  },

  addProfessional: async (professional) => {
    const { error } = await supabase.from('professionals').insert([professional]);
    if (error) throw error;
    await get().fetchData();
  },

  deleteProfessional: async (id) => {
    const { error } = await supabase.from('professionals').delete().eq('id', id);
    if (error) throw error;
    await get().fetchData();
  },

  addProduct: async (product) => {
    const { error } = await supabase.from('products').insert([product]);
    if (error) throw error;
    await get().fetchData();
  },

  deleteProduct: async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    await get().fetchData();
  },

  createOrder: async (orderData, items) => {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();
      
    if (orderError) throw orderError;

    const itemsWithOrderId = items.map(item => ({
      order_id: order.id,
      item_type: item.type,
      item_id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(itemsWithOrderId);
    if (itemsError) throw itemsError;

    await get().fetchData();
  },

  addCampaign: async (campaign) => {
    // If table doesn't exist, we might fail here, but we can try-catch or use local state for MVP
    try {
      const { error } = await supabase.from('campaigns').insert([campaign]);
      if (error) throw error;
      await get().fetchData();
    } catch (e) {
      console.error("Failed to save campaign", e);
      // Fallback for MVP if table missing: just update local state to show it works
      const newCamp = { ...campaign, id: Math.random().toString(), created_at: new Date().toISOString() } as Campaign;
      set(state => ({ campaigns: [newCamp, ...state.campaigns] }));
      toast.warning("Campanha salva localmente (banco de dados pendente).");
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
  }
}));
