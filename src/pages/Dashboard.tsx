import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, Users, DollarSign, Check, X, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { AppointmentStatus } from '@/types';
import { toast } from 'sonner';

// Helper for status translation
const getStatusLabel = (status: AppointmentStatus) => {
  switch (status) {
    case 'requested': return { label: 'Solicitado', class: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
    case 'confirmed': return { label: 'Confirmado', class: 'bg-green-500/10 text-green-500 border-green-500/20' };
    case 'waiting': return { label: 'Aguardando', class: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
    case 'in_progress': return { label: 'Em Atendimento', class: 'bg-purple-500/10 text-purple-500 border-purple-500/20' };
    case 'finished': return { label: 'Finalizado', class: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' };
    case 'cancelled': return { label: 'Cancelado', class: 'bg-red-500/10 text-red-500 border-red-500/20' };
    case 'no_show': return { label: 'Não Compareceu', class: 'bg-red-900/10 text-red-700 border-red-900/20' };
    default: return { label: status, class: 'bg-zinc-500/10 text-zinc-500' };
  }
};

export default function Dashboard() {
  const { appointments, customers, services, orders, updateAppointmentStatus } = useStore();

  // 1. Agendamentos de Hoje
  const todayAppointments = appointments.filter(a => 
    new Date(a.start_time).toDateString() === new Date().toDateString()
  );

  // 0. Solicitações Pendentes (Status 'requested')
  const pendingRequests = appointments.filter(a => a.status === 'requested');
  
  // 2. Faturamento do Mês Atual
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyOrders = orders.filter(o => {
    const d = new Date(o.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && o.status === 'paid';
  });

  const monthlyRevenue = monthlyOrders.reduce((acc, order) => acc + order.final_amount, 0);

  // 3. Ticket Médio (Geral)
  const paidOrders = orders.filter(o => o.status === 'paid');
  const totalRevenue = paidOrders.reduce((acc, o) => acc + o.final_amount, 0);
  const ticketAverage = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

  // 4. Clientes Ativos
  const activeCustomers = customers.length;

  const handleApprove = async (id: string) => {
    try {
      await updateAppointmentStatus(id, 'confirmed');
      toast.success("Agendamento confirmado!");
    } catch (error) {
      toast.error("Erro ao confirmar.");
    }
  };

  const handleReject = async (id: string) => {
    if (confirm("Tem certeza que deseja recusar este agendamento?")) {
      try {
        await updateAppointmentStatus(id, 'cancelled');
        toast.info("Agendamento recusado.");
      } catch (error) {
        toast.error("Erro ao recusar.");
      }
    }
  };
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            Dashboard
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs font-medium border border-green-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Ao vivo
            </span>
          </h2>
          <p className="text-muted-foreground">Visão geral da sua barbearia hoje.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/pos">Nova Comanda</Link>
          </Button>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/agenda">Novo Agendamento</Link>
          </Button>
        </div>
      </div>

      {/* Pending Requests Alert Section */}
      {pendingRequests.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-yellow-500">Solicitações Pendentes ({pendingRequests.length})</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {pendingRequests.map(apt => {
              const customer = customers.find(c => c.id === apt.customer_id);
              const service = services.find(s => s.id === apt.service_id);
              return (
                <div key={apt.id} className="bg-background/50 p-3 rounded-md border flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{customer?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {format(new Date(apt.start_time), 'dd/MM HH:mm')} - {service?.name}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10" onClick={() => handleApprove(apt.id)} title="Aprovar">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleReject(apt.id)} title="Recusar">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento (Mês)</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              {monthlyOrders.length} vendas este mês
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments.length}</div>
            <p className="text-xs text-muted-foreground">
              {todayAppointments.filter(a => a.status === 'confirmed').length} confirmados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Totais</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Base de clientes cadastrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {ticketAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Média por atendimento
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Próximos Agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Calendar className="h-8 w-8 mb-2 opacity-50" />
                  <p>Nenhum agendamento para hoje.</p>
                </div>
              ) : (
                todayAppointments
                  .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                  .map((apt) => {
                    const customer = customers.find(c => c.id === apt.customer_id);
                    const service = services.find(s => s.id === apt.service_id);
                    const statusInfo = getStatusLabel(apt.status);
                    
                    return (
                      <div key={apt.id} className="flex items-center justify-between p-4 border rounded-lg bg-card/50 hover:bg-card transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center justify-center w-12 h-12 rounded bg-primary/10 text-primary border border-primary/20">
                            <span className="text-sm font-bold">{format(new Date(apt.start_time), 'HH:mm')}</span>
                          </div>
                          <div>
                            <p className="font-medium">{customer?.name || 'Cliente'}</p>
                            <p className="text-sm text-muted-foreground">{service?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className={`px-2 py-1 text-xs rounded-full border ${statusInfo.class}`}>
                             {statusInfo.label}
                           </span>
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Atalhos & Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-yellow-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-500">Estoque Baixo</p>
                  <p className="text-xs text-muted-foreground mt-1">Pomada Modeladora (3 unid. restantes)</p>
                  <Button variant="link" className="h-auto p-0 text-xs text-yellow-500 mt-2">Repor estoque</Button>
                </div>
             </div>
             
             <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-primary">Aniversariantes do Dia</p>
                  <p className="text-xs text-muted-foreground mt-1">Nenhum aniversariante hoje.</p>
                </div>
             </div>

             <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-500">Marketing</p>
                  <p className="text-xs text-muted-foreground mt-1">3 campanhas ativas neste mês.</p>
                  <Button asChild variant="link" className="h-auto p-0 text-xs text-blue-500 mt-2">
                    <Link to="/marketing">Ver campanhas</Link>
                  </Button>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
