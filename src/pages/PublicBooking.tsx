import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { CheckCircle2, ChevronLeft, Clock, MapPin, Scissors, User } from 'lucide-react';
import { Tenant, Service, Professional } from '@/types';

type Step = 'service' | 'professional' | 'datetime' | 'details' | 'confirmation';

export default function PublicBooking() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  
  // Booking State
  const [step, setStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProf, setSelectedProf] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState({ name: '', phone: '' });

  useEffect(() => {
    async function loadData() {
      if (!slug) return;
      
      try {
        // Fetch Tenant
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('slug', slug)
          .single();

        if (tenantError || !tenantData) throw new Error("Barbearia não encontrada");
        setTenant(tenantData);

        // Fetch Services
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('tenant_id', tenantData.id)
          .eq('active', true);
        setServices(servicesData || []);

        // Fetch Professionals
        const { data: profsData } = await supabase
          .from('professionals')
          .select('*')
          .eq('tenant_id', tenantData.id)
          .eq('active', true);
        setProfessionals(profsData || []);

      } catch (error) {
        console.error(error);
        toast.error("Barbearia não encontrada ou link inválido.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [slug]);

  const handleBooking = async () => {
    if (!tenant || !selectedService || !selectedProf || !selectedDate || !selectedTime || !customerData.name || !customerData.phone) return;

    setLoading(true);
    try {
      // 1. Create or Get Customer
      // For MVP, simplistic check. In production, use phone number to match.
      let customerId = '';
      
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('phone', customerData.phone)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            tenant_id: tenant.id,
            name: customerData.name,
            phone: customerData.phone,
            marketing_consent: true
          })
          .select()
          .single();
        
        if (createError) throw createError;
        customerId = newCustomer.id;
      }

      // 2. Create Appointment
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startTime = setMinutes(setHours(selectedDate, hours), minutes);
      const endTime = setMinutes(startTime, minutes + selectedService.duration_minutes);

      const { error: aptError } = await supabase
        .from('appointments')
        .insert({
          tenant_id: tenant.id,
          customer_id: customerId,
          professional_id: selectedProf.id,
          service_id: selectedService.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'requested', // Public bookings start as requested
          notes: 'Agendamento Online'
        });

      if (aptError) throw aptError;

      setStep('confirmation');
    } catch (error) {
      console.error(error);
      toast.error("Erro ao realizar agendamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Generate Time Slots (Mocked logic for MVP - doesn't check existing appointments yet)
  const timeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

  if (loading && !tenant) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-primary">Carregando...</div>;
  }

  if (!tenant) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Barbearia não encontrada.</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center p-4">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2 py-6">
          <div className="w-16 h-16 bg-primary rounded-full mx-auto flex items-center justify-center text-primary-foreground text-2xl font-bold">
            {tenant.name[0]}
          </div>
          <h1 className="text-2xl font-bold text-primary">{tenant.name}</h1>
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
            <MapPin className="w-4 h-4" />
            <span>Unidade Matriz</span>
          </div>
        </div>

        {/* Steps Content */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            
            {step === 'service' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-primary" /> Selecione o Serviço
                </h2>
                <div className="grid gap-3">
                  {services.map(service => (
                    <button
                      key={service.id}
                      onClick={() => { setSelectedService(service); setStep('professional'); }}
                      className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 hover:border-primary hover:bg-zinc-800/50 transition-all text-left"
                    >
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-zinc-400">{service.duration_minutes} min</div>
                      </div>
                      <div className="font-semibold text-primary">
                        R$ {service.price.toFixed(2)}
                      </div>
                    </button>
                  ))}
                  {services.length === 0 && <p className="text-center text-zinc-500">Nenhum serviço disponível.</p>}
                </div>
              </div>
            )}

            {step === 'professional' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Button variant="ghost" size="sm" onClick={() => setStep('service')} className="-ml-2">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" /> Selecione o Profissional
                  </h2>
                </div>
                <div className="grid gap-3">
                  {professionals.map(prof => (
                    <button
                      key={prof.id}
                      onClick={() => { setSelectedProf(prof); setStep('datetime'); }}
                      className="flex items-center gap-4 p-4 rounded-lg border border-zinc-800 hover:border-primary hover:bg-zinc-800/50 transition-all text-left"
                    >
                      <Avatar>
                        <AvatarImage src={prof.avatar_url} />
                        <AvatarFallback>{prof.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{prof.name}</div>
                    </button>
                  ))}
                  {professionals.length === 0 && <p className="text-center text-zinc-500">Nenhum profissional disponível.</p>}
                </div>
              </div>
            )}

            {step === 'datetime' && (
              <div className="space-y-4">
                 <div className="flex items-center gap-2 mb-4">
                  <Button variant="ghost" size="sm" onClick={() => setStep('professional')} className="-ml-2">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" /> Data e Hora
                  </h2>
                </div>
                
                <div className="flex justify-center bg-zinc-950 rounded-lg p-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={ptBR}
                    className="rounded-md border-0"
                    disabled={(date) => date < addDays(new Date(), -1)}
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map(time => (
                    <button
                      key={time}
                      onClick={() => { setSelectedTime(time); setStep('details'); }}
                      className={`p-2 text-sm rounded-md border transition-all ${
                        selectedTime === time 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'details' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Button variant="ghost" size="sm" onClick={() => setStep('datetime')} className="-ml-2">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h2 className="text-lg font-semibold">Seus Dados</h2>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input 
                      value={customerData.name}
                      onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                      placeholder="Seu nome"
                      className="bg-zinc-950 border-zinc-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp / Telefone</Label>
                    <Input 
                      value={customerData.phone}
                      onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                      placeholder="(00) 00000-0000"
                      className="bg-zinc-950 border-zinc-800"
                    />
                  </div>
                </div>

                <div className="bg-zinc-950 p-4 rounded-lg space-y-2 text-sm border border-zinc-800 mt-4">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Serviço:</span>
                    <span>{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Profissional:</span>
                    <span>{selectedProf?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Data:</span>
                    <span>{selectedDate && format(selectedDate, 'dd/MM/yyyy')} às {selectedTime}</span>
                  </div>
                  <div className="flex justify-between font-bold text-primary pt-2 border-t border-zinc-800">
                    <span>Total:</span>
                    <span>R$ {selectedService?.price.toFixed(2)}</span>
                  </div>
                </div>

                <Button 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-4"
                  onClick={handleBooking}
                  disabled={loading || !customerData.name || !customerData.phone}
                >
                  {loading ? 'Confirmando...' : 'Confirmar Agendamento'}
                </Button>
              </div>
            )}

            {step === 'confirmation' && (
              <div className="text-center space-y-6 py-8">
                <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">Agendamento Confirmado!</h2>
                  <p className="text-zinc-400">
                    Obrigado, {customerData.name}.<br/>
                    Seu horário está reservado.
                  </p>
                </div>
                <div className="bg-zinc-950 p-4 rounded-lg inline-block text-left min-w-[250px] border border-zinc-800">
                   <p className="text-sm text-zinc-400 mb-1">Detalhes:</p>
                   <p className="font-medium">{selectedService?.name}</p>
                   <p className="text-sm">{format(selectedDate!, 'dd/MM/yyyy')} às {selectedTime}</p>
                   <p className="text-sm text-zinc-400 mt-1">com {selectedProf?.name}</p>
                </div>
                <div>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Novo Agendamento
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        <div className="text-center text-xs text-zinc-600">
          Powered by BarberOS
        </div>
      </div>
    </div>
  );
}
