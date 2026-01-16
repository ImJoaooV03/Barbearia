import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Download, Calendar as CalendarIcon, DollarSign, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval, parseISO, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// Cores do Tema (Gold & Variations)
const COLORS = ['#d48f18', '#e4bd5d', '#b86e12', '#7a3e14', '#3a1a08'];

type TimeRange = 'today' | 'week' | 'month' | 'year' | 'all';

export default function Reports() {
  const { orders, appointments, services, professionals, customers, tenant } = useStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  // --- Lógica de Filtragem ---
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (timeRange) {
      case 'today': return { start: now, end: now };
      case 'week': return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'year': return { start: startOfYear(now), end: endOfYear(now) };
      case 'all': return { start: new Date(2020, 0, 1), end: now };
    }
  }, [timeRange]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.status !== 'paid') return false;
      const date = new Date(o.created_at);
      return isWithinInterval(date, dateRange);
    });
  }, [orders, dateRange]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      const date = new Date(a.start_time);
      return isWithinInterval(date, dateRange);
    });
  }, [appointments, dateRange]);

  // --- Cálculos de KPI ---
  const totalRevenue = filteredOrders.reduce((acc, o) => acc + o.final_amount, 0);
  const totalAppointments = filteredAppointments.length;
  const completedAppointments = filteredAppointments.filter(a => a.status === 'finished' || a.status === 'confirmed').length;
  const canceledAppointments = filteredAppointments.filter(a => a.status === 'cancelled' || a.status === 'no_show').length;
  
  const averageTicket = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;
  
  // Taxa de Cancelamento
  const cancelRate = totalAppointments > 0 ? (canceledAppointments / totalAppointments) * 100 : 0;

  // --- Dados para Gráficos ---

  // 1. Faturamento por Dia (Area Chart)
  const revenueData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredOrders.forEach(o => {
      const dateKey = format(new Date(o.created_at), 'dd/MM');
      data[dateKey] = (data[dateKey] || 0) + o.final_amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  // 2. Serviços Mais Populares (Pie Chart)
  const serviceData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAppointments.forEach(a => {
      const serviceName = services.find(s => s.id === a.service_id)?.name || 'Desconhecido';
      counts[serviceName] = (counts[serviceName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5
  }, [filteredAppointments, services]);

  // 3. Performance por Profissional (Bar Chart)
  const professionalData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAppointments.forEach(a => {
      const profName = professionals.find(p => p.id === a.professional_id)?.name || 'Desconhecido';
      counts[profName] = (counts[profName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, atendimentos]) => ({ name, atendimentos }));
  }, [filteredAppointments, professionals]);

  // 4. Métodos de Pagamento (Pie Chart)
  const paymentData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOrders.forEach(o => {
      const method = o.payment_method === 'credit_card' ? 'Crédito' :
                     o.payment_method === 'debit_card' ? 'Débito' :
                     o.payment_method === 'pix' ? 'Pix' : 'Dinheiro';
      counts[method] = (counts[method] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);


  // --- Exportação CSV ---
  const handleExport = () => {
    const headers = ['Data', 'Cliente', 'Valor', 'Status', 'Metodo'];
    const rows = filteredOrders.map(o => [
      format(new Date(o.created_at), 'dd/MM/yyyy'),
      customers.find(c => c.id === o.customer_id)?.name || 'Cliente Final',
      o.final_amount.toFixed(2),
      o.status,
      o.payment_method
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_barberos_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Relatório baixado com sucesso!");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Relatórios Gerenciais</h2>
          <p className="text-muted-foreground">Análise detalhada do desempenho da sua barbearia.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-[180px]">
              <CalendarIcon className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
              <SelectItem value="all">Todo o Período</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              No período selecionado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Por atendimento
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendimentos</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedAppointments} / {totalAppointments}</div>
            <p className="text-xs text-muted-foreground">
              Realizados vs Agendados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Cancelamento</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cancelRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {canceledAppointments} cancelamentos/no-show
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="operational">Operacional</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-7">
            {/* Main Chart: Revenue */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Evolução do Faturamento</CardTitle>
                <CardDescription>Receita diária no período selecionado.</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d48f18" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#d48f18" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
                      <YAxis className="text-xs" tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#d48f18' }}
                        formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Faturamento']}
                      />
                      <Area type="monotone" dataKey="value" stroke="#d48f18" fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Side Chart: Services */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Serviços Mais Realizados</CardTitle>
                <CardDescription>Top 5 serviços por volume.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {serviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: OPERATIONAL */}
        <TabsContent value="operational" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Desempenho da Equipe</CardTitle>
              <CardDescription>Quantidade de atendimentos por profissional.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={professionalData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                    <XAxis type="number" className="text-xs" hide />
                    <YAxis dataKey="name" type="category" width={100} className="text-xs font-medium" tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}
                    />
                    <Bar dataKey="atendimentos" fill="#d48f18" radius={[0, 4, 4, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: FINANCIAL */}
        <TabsContent value="financial" className="space-y-4">
           <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Meios de Pagamento</CardTitle>
                  <CardDescription>Preferência dos clientes.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {paymentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resumo Financeiro</CardTitle>
                  <CardDescription>Detalhamento do período.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-muted-foreground">Faturamento Bruto</span>
                      <span className="font-bold">R$ {totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-muted-foreground">Ticket Médio</span>
                      <span>R$ {averageTicket.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-muted-foreground">Vendas Realizadas</span>
                      <span>{filteredOrders.length}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-muted-foreground">Projeção (Fim do Mês)</span>
                      <span className="text-primary font-bold">
                        {timeRange === 'month' 
                          ? `R$ ${(averageTicket * (totalAppointments + 5)).toFixed(2)}` // Projeção simples
                          : '-'
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
