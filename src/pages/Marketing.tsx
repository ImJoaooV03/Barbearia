import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users, Send, Gift, History } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Customer, MessageTemplate } from '@/types';

const TEMPLATES: MessageTemplate[] = [
  {
    id: '1',
    title: 'Feliz Aniversário',
    content: 'Olá {nome}! A Barbearia deseja um feliz aniversário! 🎂 Venha comemorar com a gente e ganhe 10% de desconto no seu próximo corte.',
    type: 'birthday'
  },
  {
    id: '2',
    title: 'Resgate (30 dias)',
    content: 'Fala {nome}, tudo bem? Faz um tempo que não te vemos! Que tal renovar o visual para o fim de semana? Agende aqui: {link}',
    type: 'recovery'
  },
  {
    id: '3',
    title: 'Promoção Relâmpago',
    content: '🔥 Promoção Relâmpago! Apenas hoje: Corte + Barba por R$ 50,00. Responda "EU QUERO" para garantir seu horário.',
    type: 'promo'
  }
];

export default function Marketing() {
  const { customers, tenant, campaigns, addCampaign } = useStore();
  const [activeTab, setActiveTab] = useState('audience');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate>(TEMPLATES[0]);
  const [customMessage, setCustomMessage] = useState(TEMPLATES[0].content);
  const [isBlastOpen, setIsBlastOpen] = useState(false);

  // Audience Segments
  const birthdayCustomers = customers.filter(c => {
    if (!c.birth_date) return false;
    const bday = parseISO(c.birth_date);
    return isSameMonth(bday, new Date());
  });

  const missingCustomers = customers.filter(c => {
    if (!c.last_visit) return true; // Never visited
    const lastVisit = parseISO(c.last_visit);
    return lastVisit < subDays(new Date(), 30);
  });

  const handleTemplateChange = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setCustomMessage(template.content);
  };

  const generateMessage = (customer: Customer) => {
    let msg = customMessage.replace('{nome}', customer.name.split(' ')[0]);
    msg = msg.replace('{link}', `${window.location.origin}/book/${tenant?.slug}`);
    return encodeURIComponent(msg);
  };

  const handleSendOne = (customer: Customer) => {
    if (!customer.phone) {
      toast.error("Cliente sem telefone cadastrado.");
      return;
    }
    const link = `https://wa.me/55${customer.phone.replace(/\D/g, '')}?text=${generateMessage(customer)}`;
    window.open(link, '_blank');
    
    // Log action (optional)
    toast.success(`WhatsApp aberto para ${customer.name}`);
  };

  const handleCreateCampaign = async () => {
    if (!tenant) return;
    
    try {
      await addCampaign({
        tenant_id: tenant.id,
        name: `Campanha: ${selectedTemplate.title}`,
        type: 'whatsapp',
        status: 'sent',
        sent_count: activeTab === 'audience' ? missingCustomers.length : 0 // Mock count
      });
      setIsBlastOpen(false);
      toast.success("Campanha registrada com sucesso!");
    } catch (error) {
      console.error(error); // Log error to satisfy linter
      toast.error("Erro ao criar campanha.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Marketing</h2>
        <p className="text-muted-foreground">Fidelize seus clientes e aumente a recorrência com campanhas inteligentes.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aniversariantes (Mês)</CardTitle>
            <Gift className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{birthdayCustomers.length}</div>
            <p className="text-xs text-muted-foreground">Clientes para parabenizar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Sumidos (+30d)</CardTitle>
            <History className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{missingCustomers.length}</div>
            <p className="text-xs text-muted-foreground">Oportunidade de resgate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas Enviadas</CardTitle>
            <Send className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground">Histórico total</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="audience" className="space-y-4" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="audience" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Segmentação
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Campanhas
          </TabsTrigger>
        </TabsList>

        {/* AUDIENCE TAB */}
        <TabsContent value="audience" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Left: Lists */}
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Clientes Ausentes (Recuperação)</CardTitle>
                  <CardDescription>Clientes que não visitam a barbearia há mais de 30 dias.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Última Visita</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {missingCustomers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                            Nenhum cliente ausente encontrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        missingCustomers.slice(0, 5).map(c => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell>{c.last_visit ? format(parseISO(c.last_visit), 'dd/MM/yyyy') : 'Nunca'}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => handleSendOne(c)}>
                                <Send className="w-3 h-3 mr-2" /> Enviar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {missingCustomers.length > 5 && (
                    <div className="pt-4 text-center">
                      <Button variant="link">Ver todos ({missingCustomers.length})</Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Aniversariantes de {format(new Date(), 'MMMM', { locale: ptBR })}</CardTitle>
                </CardHeader>
                <CardContent>
                   <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {birthdayCustomers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                            Nenhum aniversariante este mês.
                          </TableCell>
                        </TableRow>
                      ) : (
                        birthdayCustomers.map(c => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell>{c.birth_date ? format(parseISO(c.birth_date), 'dd/MM') : '-'}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => handleSendOne(c)}>
                                <Gift className="w-3 h-3 mr-2" /> Parabenizar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Right: Message Composer */}
            <div className="md:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Disparo Rápido</CardTitle>
                  <CardDescription>Configure a mensagem padrão.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <div className="flex flex-wrap gap-2">
                      {TEMPLATES.map(t => (
                        <Badge 
                          key={t.id} 
                          variant={selectedTemplate.id === t.id ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => handleTemplateChange(t)}
                        >
                          {t.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Mensagem</Label>
                    <Textarea 
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="h-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      Variáveis: {'{nome}'}, {'{link}'}
                    </p>
                  </div>
                  
                  <Dialog open={isBlastOpen} onOpenChange={setIsBlastOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                        <Send className="w-4 h-4 mr-2" /> Criar Campanha em Massa
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirmar Envio</DialogTitle>
                        <DialogDescription>
                          Isso registrará uma nova campanha no sistema. Como este é um MVP, o envio real deve ser feito manualmente ou via API de terceiros.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <p className="font-medium">Resumo:</p>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground mt-2">
                          <li>Público: {missingCustomers.length} clientes ausentes</li>
                          <li>Template: {selectedTemplate.title}</li>
                        </ul>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleCreateCampaign}>Registrar Campanha</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* CAMPAIGNS TAB */}
        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Campanhas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Enviados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma campanha registrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaigns.map((camp) => (
                      <TableRow key={camp.id}>
                        <TableCell>{format(new Date(camp.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell className="font-medium">{camp.name}</TableCell>
                        <TableCell className="capitalize">{camp.type}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                            {camp.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{camp.sent_count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
