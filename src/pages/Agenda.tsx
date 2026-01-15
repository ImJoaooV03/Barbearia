import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Clock, Calendar as CalendarIcon, User, Scissors } from 'lucide-react';
import { format, addDays, isSameDay, setHours, setMinutes, addMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Appointment } from '@/types';

export default function Agenda() {
  const { 
    appointments, professionals, services, customers, addAppointment, updateAppointment, updateAppointmentStatus, tenant,
    googleConnected, googleEvents, syncGoogleEvents
  } = useStore();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isNewAptOpen, setIsNewAptOpen] = useState(false);
  const [isEditAptOpen, setIsEditAptOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);

  // New/Edit Appointment Form State
  const [formData, setFormData] = useState({
    customer_id: '',
    professional_id: '',
    service_id: '',
    time: '10:00'
  });

  useEffect(() => {
    if (googleConnected) {
      syncGoogleEvents();
    }
  }, [googleConnected, selectedDate]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncGoogleEvents();
    setIsSyncing(false);
    toast.success("Agenda sincronizada!");
  };

  const openNewAptModal = () => {
    setFormData({ customer_id: '', professional_id: '', service_id: '', time: '10:00' });
    setIsNewAptOpen(true);
  };

  const openEditAptModal = (apt: Appointment) => {
    setSelectedApt(apt);
    setFormData({
      customer_id: apt.customer_id,
      professional_id: apt.professional_id,
      service_id: apt.service_id,
      time: format(new Date(apt.start_time), 'HH:mm')
    });
    setIsEditAptOpen(true);
  };

  const handleCreateAppointment = async () => {
    if(!formData.customer_id || !formData.service_id || !formData.professional_id || !tenant) {
      toast.error("Preencha todos os campos");
      return;
    }

    const service = services.find(s => s.id === formData.service_id);
    const [hours, minutes] = formData.time.split(':').map(Number);
    const start = setMinutes(setHours(selectedDate, hours), minutes);
    const end = addMinutes(start, service?.duration_minutes || 30);

    try {
      await addAppointment({
        tenant_id: tenant.id,
        customer_id: formData.customer_id,
        professional_id: formData.professional_id,
        service_id: formData.service_id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: 'confirmed'
      });
      setIsNewAptOpen(false);
      toast.success("Agendamento criado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar agendamento.");
    }
  };

  const handleUpdateAppointment = async () => {
    if (!selectedApt || !tenant) return;

    const service = services.find(s => s.id === formData.service_id);
    const [hours, minutes] = formData.time.split(':').map(Number);
    
    // Maintain original date, just update time
    const originalDate = new Date(selectedApt.start_time);
    const start = setMinutes(setHours(originalDate, hours), minutes);
    const end = addMinutes(start, service?.duration_minutes || 30);

    try {
      await updateAppointment(selectedApt.id, {
        professional_id: formData.professional_id,
        service_id: formData.service_id,
        start_time: start.toISOString(),
        end_time: end.toISOString()
      });
      setIsEditAptOpen(false);
      toast.success("Agendamento atualizado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar agendamento.");
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedApt) return;
    if (confirm("Deseja realmente cancelar este agendamento?")) {
      try {
        await updateAppointmentStatus(selectedApt.id, 'cancelled');
        setIsEditAptOpen(false);
        toast.success("Agendamento cancelado.");
      } catch (error) {
        console.error(error);
        toast.error("Erro ao cancelar.");
      }
    }
  };

  // Filter internal appointments for selected date
  const dailyAppointments = appointments.filter(a => 
    isSameDay(new Date(a.start_time), selectedDate) && a.status !== 'cancelled'
  );

  // Filter Google events for selected date
  const dailyGoogleEvents = googleEvents.filter(e => {
    if (!e.start.dateTime) return false; 
    return isSameDay(parseISO(e.start.dateTime), selectedDate);
  });

  const timeSlots = Array.from({ length: 13 }).map((_, i) => i + 8);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Agenda</h2>
          <div className="flex items-center bg-card border rounded-md p-1">
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-4 font-medium min-w-[140px] text-center">
              {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          {googleConnected && (
            <Button variant="ghost" size="icon" onClick={handleManualSync} disabled={isSyncing} title="Sincronizar Google">
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
        
        <Button onClick={openNewAptModal} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> Novo Agendamento
        </Button>

        {/* CREATE DIALOG */}
        <Dialog open={isNewAptOpen} onOpenChange={setIsNewAptOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Cliente</Label>
                <Select onValueChange={(v) => setFormData({...formData, customer_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Profissional</Label>
                <Select onValueChange={(v) => setFormData({...formData, professional_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione o barbeiro" /></SelectTrigger>
                  <SelectContent>
                    {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Serviço</Label>
                <Select onValueChange={(v) => setFormData({...formData, service_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
                  <SelectContent>
                    {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} - R$ {s.price}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Horário</Label>
                <Input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateAppointment}>Agendar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* EDIT DIALOG */}
        <Dialog open={isEditAptOpen} onOpenChange={setIsEditAptOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes do Agendamento</DialogTitle>
              <DialogDescription>Gerencie ou cancele este agendamento.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Cliente</Label>
                <div className="p-2 border rounded-md bg-muted/50 text-sm">
                  {customers.find(c => c.id === selectedApt?.customer_id)?.name}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Profissional (Reagendar)</Label>
                <Select 
                  value={formData.professional_id} 
                  onValueChange={(v) => setFormData({...formData, professional_id: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Serviço</Label>
                <Select 
                  value={formData.service_id} 
                  onValueChange={(v) => setFormData({...formData, service_id: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Horário</Label>
                <Input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} />
              </div>
            </div>
            <DialogFooter className="flex justify-between sm:justify-between">
              <Button variant="destructive" onClick={handleCancelAppointment}>Cancelar Agendamento</Button>
              <Button onClick={handleUpdateAppointment}>Salvar Alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 border rounded-lg bg-card overflow-hidden flex flex-col">
        {/* Header: Professionals Columns */}
        <div className="flex border-b">
          <div className="w-16 flex-shrink-0 border-r bg-muted/30"></div>
          {professionals.length === 0 ? (
             <div className="flex-1 p-4 text-center text-muted-foreground">Cadastre profissionais para ver a agenda</div>
          ) : (
            professionals.map(prof => (
              <div key={prof.id} className="flex-1 p-3 flex items-center justify-center gap-2 border-r last:border-r-0 bg-muted/10">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={prof.avatar_url} />
                  <AvatarFallback>{prof.name[0]}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">{prof.name}</span>
              </div>
            ))
          )}
        </div>

        {/* Body: Time Slots */}
        <div className="flex-1 overflow-y-auto relative">
          {timeSlots.map(hour => (
            <div key={hour} className="flex min-h-[100px] border-b last:border-b-0">
              {/* Time Label */}
              <div className="w-16 flex-shrink-0 border-r flex flex-col items-center justify-start py-2 bg-muted/5 text-xs text-muted-foreground font-medium">
                {String(hour).padStart(2, '0')}:00
              </div>

              {/* Columns for each professional */}
              {professionals.map(prof => {
                // Internal Appointments
                const profApts = dailyAppointments.filter(a => {
                  const aptDate = new Date(a.start_time);
                  return a.professional_id === prof.id && aptDate.getHours() === hour;
                });

                // Google Events (Overlay on ALL professionals for MVP)
                const gEvents = dailyGoogleEvents.filter(e => {
                  const eDate = parseISO(e.start.dateTime);
                  return eDate.getHours() === hour;
                });

                return (
                  <div key={prof.id} className="flex-1 border-r last:border-r-0 relative p-1 group">
                    
                    {/* Render Google Events */}
                    {gEvents.map(ge => {
                      const start = parseISO(ge.start.dateTime);
                      const end = parseISO(ge.end.dateTime);
                      const durationMins = (end.getTime() - start.getTime()) / 60000;
                      
                      return (
                        <div
                          key={ge.id}
                          className="absolute left-1 right-1 rounded-md p-2 text-xs border border-zinc-700 bg-zinc-800/50 text-zinc-400 z-0 pointer-events-none flex flex-col justify-center"
                          style={{
                            top: `${(start.getMinutes() / 60) * 100}%`,
                            height: `${(durationMins / 60) * 100}%`,
                          }}
                        >
                          <span className="font-bold truncate">Google Calendar</span>
                          <span className="truncate text-[10px]">{ge.summary}</span>
                        </div>
                      )
                    })}

                    {/* Render Internal Appointments */}
                    {profApts.map(apt => {
                      const service = services.find(s => s.id === apt.service_id);
                      const customer = customers.find(c => c.id === apt.customer_id);
                      
                      return (
                        <div 
                          key={apt.id}
                          onClick={() => openEditAptModal(apt)}
                          className={`
                            absolute left-1 right-1 rounded-md p-2 text-xs border shadow-sm cursor-pointer hover:brightness-110 transition-all z-10 flex flex-col justify-center
                            ${apt.status === 'confirmed' ? 'bg-primary text-primary-foreground border-primary' : 
                              apt.status === 'finished' ? 'bg-zinc-700 text-zinc-300 border-zinc-600' : 
                              'bg-secondary text-secondary-foreground border-border'}
                          `}
                          style={{
                            top: `${(new Date(apt.start_time).getMinutes() / 60) * 100}%`,
                            height: `${(service?.duration_minutes || 60) / 60 * 100}%`,
                          }}
                        >
                          <div className="font-bold truncate">{customer?.name}</div>
                          <div className="truncate opacity-90">{service?.name}</div>
                          {apt.google_event_id && (
                            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-400 rounded-full" title="Sincronizado com Google" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
