import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, addDays, setHours, setMinutes, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, MapPin, Scissors, User, Calendar as CalendarIcon, Phone } from 'lucide-react';
import { Tenant, Service, Professional } from '@/types';
import { cn } from '@/lib/utils';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!slug) return;
      
      try {
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('slug', slug)
          .single();

        if (tenantError || !tenantData) throw new Error("Barbearia não encontrada");
        setTenant(tenantData);

        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('tenant_id', tenantData.id)
          .eq('active', true);
        setServices(servicesData || []);

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

    setIsSubmitting(true);
    try {
      // 1. Create or Get Customer
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
          status: 'requested',
          notes: 'Agendamento Online'
        });

      if (aptError) throw aptError;

      setStep('confirmation');
      toast.success("Agendamento realizado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao realizar agendamento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate Time Slots
  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="w-full max-w-2xl mb-8 text-center space-y-4">
        <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
          <span className="text-3xl font-bold text-primary">{tenant.name.charAt(0)}</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{tenant.name}</h1>
          <div className="flex items-center justify-center gap-2 text-zinc-400 mt-2">
            <MapPin className="w-4 h-4" />
            <span>Agendamento Online</span>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-2xl bg-zinc-900/50 border-zinc-800 shadow-xl backdrop-blur-sm overflow-hidden">
        {/* Progress Bar */}
        {step !== 'confirmation' && (
          <div className="w-full bg-zinc-800/50 h-1">
            <div 
              className="bg-primary h-full transition-all duration-500 ease-in-out"
              style={{ 
                width: step === 'service' ? '25%' : 
                       step === 'professional' ? '50%' : 
                       step === 'datetime' ? '75%' : '100%' 
              }}
            />
          </div>
        )}

        <CardContent className="p-6 sm:p-8">
          {/* Step 1: Services */}
          {step === 'service' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-primary" />
                  Selecione o Serviço
                </h2>
                <p className="text-zinc-400 text-sm">Escolha o procedimento que deseja realizar.</p>
              </div>

              <div className="grid gap-3">
                {services.map(service => (
                  <button
                    key={service.id}
                    onClick={() => { setSelectedService(service); setStep('professional'); }}
                    className="group relative flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-primary hover:bg-zinc-800 transition-all duration-200 text-left"
                  >
                    <div className="space-y-1">
                      <div className="font-medium text-zinc-100 group-hover:text-primary transition-colors">
                        {service.name}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {service.duration_minutes} min
                        </span>
                      </div>
                    </div>
                    <div className="font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full text-sm">
                      R$ {service.price.toFixed(2)}
                    </div>
                  </button>
                ))}
                {services.length === 0 && (
                  <div className="text-center py-12 text-zinc-500 bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800">
                    Nenhum serviço disponível no momento.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Professional */}
          {step === 'professional' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setStep('service')} className="rounded-full hover:bg-zinc-800">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Escolha o Profissional
                  </h2>
                  <p className="text-zinc-400 text-sm">Quem vai te atender hoje?</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {professionals.map(prof => (
                  <button
                    key={prof.id}
                    onClick={() => { setSelectedProf(prof); setStep('datetime'); }}
                    className="group flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-primary hover:bg-zinc-800 transition-all duration-200 text-left"
                  >
                    <Avatar className="w-12 h-12 border-2 border-zinc-800 group-hover:border-primary transition-colors">
                      <AvatarImage src={prof.avatar_url} />
                      <AvatarFallback className="bg-zinc-800 text-zinc-400">{prof.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-zinc-100 group-hover:text-primary transition-colors">
                        {prof.name}
                      </div>
                      <div className="text-xs text-zinc-500">Barbeiro</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Date & Time */}
          {step === 'datetime' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setStep('professional')} className="rounded-full hover:bg-zinc-800">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    Data e Horário
                  </h2>
                  <p className="text-zinc-400 text-sm">Quando você quer vir?</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex justify-center bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={ptBR}
                    className="rounded-md"
                    disabled={(date) => date < addDays(new Date(), -1)}
                    classNames={{
                      head_cell: "text-zinc-500 font-normal text-[0.8rem]",
                      cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-primary/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-zinc-800 rounded-md transition-colors",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-zinc-800 text-zinc-100",
                    }}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-zinc-400">Horários Disponíveis</Label>
                  <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {timeSlots.map(time => (
                      <button
                        key={time}
                        onClick={() => { setSelectedTime(time); setStep('details'); }}
                        className={cn(
                          "py-2 px-1 text-sm rounded-lg border transition-all duration-200",
                          selectedTime === time 
                            ? "bg-primary text-primary-foreground border-primary font-medium shadow-lg shadow-primary/20" 
                            : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                        )}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Customer Details */}
          {step === 'details' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setStep('datetime')} className="rounded-full hover:bg-zinc-800">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Seus Dados
                  </h2>
                  <p className="text-zinc-400 text-sm">Para confirmarmos seu agendamento.</p>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                    <div className="space-y-1">
                      <p className="text-sm text-zinc-400">Serviço</p>
                      <p className="font-medium text-zinc-100">{selectedService?.name}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm text-zinc-400">Valor</p>
                      <p className="font-medium text-primary">R$ {selectedService?.price.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-zinc-400">Profissional</p>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={selectedProf?.avatar_url} />
                          <AvatarFallback className="text-[10px]">{selectedProf?.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{selectedProf?.name}</span>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm text-zinc-400">Data e Hora</p>
                      <p className="text-sm font-medium">
                        {selectedDate && format(selectedDate, "dd 'de' MMM", { locale: ptBR })} às {selectedTime}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                      <Input 
                        id="name"
                        value={customerData.name}
                        onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                        placeholder="Digite seu nome"
                        className="pl-10 bg-zinc-950 border-zinc-800 focus:border-primary h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Celular / WhatsApp</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                      <Input 
                        id="phone"
                        value={customerData.phone}
                        onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                        placeholder="(00) 00000-0000"
                        className="pl-10 bg-zinc-950 border-zinc-800 focus:border-primary h-11"
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full h-12 text-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                  onClick={handleBooking}
                  disabled={isSubmitting || !customerData.name || customerData.phone.length < 10}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Confirmando...
                    </div>
                  ) : (
                    'Confirmar Agendamento'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Confirmation */}
          {step === 'confirmation' && (
            <div className="text-center space-y-8 py-8 animate-in zoom-in-95 duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
                <div className="relative w-24 h-24 bg-green-500/10 text-green-500 rounded-full mx-auto flex items-center justify-center border border-green-500/20">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">Agendamento Confirmado!</h2>
                <p className="text-zinc-400 max-w-xs mx-auto">
                  Tudo certo, {customerData.name.split(' ')[0]}.<br/>
                  Te esperamos em breve!
                </p>
              </div>

              <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800 max-w-sm mx-auto space-y-4">
                 <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                   <span className="text-zinc-400">Data</span>
                   <span className="font-medium">{selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span>
                 </div>
                 <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                   <span className="text-zinc-400">Horário</span>
                   <span className="font-medium text-xl text-primary">{selectedTime}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-zinc-400">Profissional</span>
                   <span className="font-medium">{selectedProf?.name}</span>
                 </div>
              </div>

              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="mt-8 border-zinc-700 hover:bg-zinc-800"
              >
                Fazer outro agendamento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="mt-8 text-center text-xs text-zinc-600">
        <p>Powered by BarberOS</p>
      </div>
    </div>
  );
}
