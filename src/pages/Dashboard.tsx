import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, Users, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { appointments, customers, services } = useStore();

  // Simple stats calculation
  const todayAppointments = appointments.filter(a => 
    new Date(a.start_time).toDateString() === new Date().toDateString()
  );
  
  const totalRevenue = 12500; // Mocked for MVP
  const activeCustomers = customers.length;
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento (Mês)</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalRevenue.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground">
              +20.1% em relação ao mês passado
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
              4 confirmados, 1 pendente
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCustomers}</div>
            <p className="text-xs text-muted-foreground">
              +3 novos esta semana
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 65,00</div>
            <p className="text-xs text-muted-foreground">
              +R$ 5,00 vs mês passado
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Next Appointments */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Próximos Agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum agendamento para hoje.</p>
              ) : (
                todayAppointments.map((apt) => {
                  const customer = customers.find(c => c.id === apt.customer_id);
                  const service = services.find(s => s.id === apt.service_id);
                  return (
                    <div key={apt.id} className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded bg-primary/10 text-primary">
                          <span className="text-sm font-bold">{format(new Date(apt.start_time), 'HH:mm')}</span>
                        </div>
                        <div>
                          <p className="font-medium">{customer?.name || 'Cliente'}</p>
                          <p className="text-sm text-muted-foreground">{service?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className={`px-2 py-1 text-xs rounded-full border ${
                           apt.status === 'confirmed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                           apt.status === 'finished' ? 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' :
                           'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                         }`}>
                           {apt.status === 'confirmed' ? 'Confirmado' : apt.status === 'finished' ? 'Finalizado' : 'Solicitado'}
                         </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Notifications */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Atalhos & Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-yellow-500">Estoque Baixo</p>
                  <p className="text-xs text-muted-foreground mt-1">Pomada Modeladora (3 unid. restantes)</p>
                  <Button variant="link" className="h-auto p-0 text-xs text-yellow-500 mt-2">Repor estoque</Button>
                </div>
             </div>
             
             <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                <div>
                  <p className="text-sm font-medium text-primary">Aniversariantes do Dia</p>
                  <p className="text-xs text-muted-foreground mt-1">Carlos Eduardo faz 28 anos hoje.</p>
                  <Button variant="link" className="h-auto p-0 text-xs text-primary mt-2">Enviar mensagem</Button>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
