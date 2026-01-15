import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, User, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function ServicesAndTeam() {
  const { 
    services, addService, deleteService, 
    professionals, addProfessional, deleteProfessional,
    tenant 
  } = useStore();
  
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [isProfOpen, setIsProfOpen] = useState(false);
  
  const [newService, setNewService] = useState({
    name: '',
    price: '',
    duration: '30',
  });

  const [newProf, setNewProf] = useState({
    name: '',
    commission: '0',
  });

  const handleCreateService = async () => {
    if (!newService.name || !newService.price || !tenant) return;
    
    try {
      await addService({
        tenant_id: tenant.id,
        name: newService.name,
        price: parseFloat(newService.price),
        duration_minutes: parseInt(newService.duration),
        buffer_minutes: 5,
        active: true
      });
      setIsServiceOpen(false);
      setNewService({ name: '', price: '', duration: '30' });
      toast.success("Serviço adicionado!");
    } catch (error) {
      toast.error("Erro ao adicionar serviço.");
    }
  };

  const handleCreateProf = async () => {
    if (!newProf.name || !tenant) return;
    
    try {
      await addProfessional({
        tenant_id: tenant.id,
        name: newProf.name,
        commission_rate: parseFloat(newProf.commission),
        specialties: [],
        active: true
      });
      setIsProfOpen(false);
      setNewProf({ name: '', commission: '0' });
      toast.success("Profissional adicionado!");
    } catch (error) {
      toast.error("Erro ao adicionar profissional.");
    }
  };

  const handleDeleteService = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este serviço?")) {
      await deleteService(id);
      toast.success("Serviço removido.");
    }
  };

  const handleDeleteProf = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este profissional?")) {
      await deleteProfessional(id);
      toast.success("Profissional removido.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Catálogo & Equipe</h2>
        <p className="text-muted-foreground">Gerencie seus serviços e a equipe da barbearia.</p>
      </div>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Scissors className="w-4 h-4" /> Serviços
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <User className="w-4 h-4" /> Profissionais
          </TabsTrigger>
        </TabsList>

        {/* SERVICES TAB */}
        <TabsContent value="services" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isServiceOpen} onOpenChange={setIsServiceOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" /> Novo Serviço
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Serviço</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Nome do Serviço</Label>
                    <Input 
                      value={newService.name} 
                      onChange={(e) => setNewService({...newService, name: e.target.value})} 
                      placeholder="Ex: Corte Degradê"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Preço (R$)</Label>
                      <Input 
                        type="number"
                        value={newService.price} 
                        onChange={(e) => setNewService({...newService, price: e.target.value})} 
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Duração (min)</Label>
                      <Input 
                        type="number"
                        value={newService.duration} 
                        onChange={(e) => setNewService({...newService, duration: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateService}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum serviço cadastrado.</TableCell>
                    </TableRow>
                  ) : (
                    services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>{service.duration_minutes} min</TableCell>
                        <TableCell>R$ {service.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteService(service.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEAM TAB */}
        <TabsContent value="team" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isProfOpen} onOpenChange={setIsProfOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" /> Novo Profissional
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Profissional</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Nome Completo</Label>
                    <Input 
                      value={newProf.name} 
                      onChange={(e) => setNewProf({...newProf, name: e.target.value})} 
                      placeholder="Ex: Carlos Silva"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Comissão (%)</Label>
                    <Input 
                      type="number"
                      value={newProf.commission} 
                      onChange={(e) => setNewProf({...newProf, commission: e.target.value})} 
                      placeholder="50"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateProf}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {professionals.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                Nenhum profissional cadastrado.
              </div>
            ) : (
              professionals.map((prof) => (
                <Card key={prof.id}>
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={prof.avatar_url} />
                      <AvatarFallback>{prof.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-base">{prof.name}</CardTitle>
                      <CardDescription>Comissão: {prof.commission_rate}%</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteProf(prof.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-500 ring-1 ring-inset ring-green-500/20">
                        Ativo
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
