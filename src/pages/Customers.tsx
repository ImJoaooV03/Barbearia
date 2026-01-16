import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, User } from 'lucide-react';
import { toast } from 'sonner';

export default function Customers() {
  const { customers, addCustomer, tenant } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleCreate = async () => {
    if (!newCustomer.name || !tenant) return;
    
    try {
      await addCustomer({
        tenant_id: tenant.id,
        name: newCustomer.name,
        phone: newCustomer.phone,
        email: newCustomer.email,
        marketing_consent: true
      });
      setIsCreateOpen(false);
      setNewCustomer({ name: '', phone: '', email: '' });
      toast.success("Cliente cadastrado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao cadastrar cliente.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Cliente</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nome Completo</Label>
                <Input 
                  value={newCustomer.name} 
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} 
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="grid gap-2">
                <Label>Telefone / WhatsApp</Label>
                <Input 
                  value={newCustomer.phone} 
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})} 
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="grid gap-2">
                <Label>Email (Opcional)</Label>
                <Input 
                  value={newCustomer.email} 
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})} 
                  placeholder="cliente@email.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome ou telefone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Visitas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      {customer.name}
                    </TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.email || '-'}</TableCell>
                    <TableCell>{customer.total_visits || 0}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
