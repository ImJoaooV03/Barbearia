import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, ShoppingCart, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export default function POS() {
  const { services, products, customers, createOrder, tenant } = useStore();
  
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [cart, setCart] = useState<Array<{
    id: string;
    type: 'service' | 'product';
    name: string;
    price: number;
    quantity: number;
  }>>([]);

  const addToCart = (item: any, type: 'service' | 'product') => {
    setCart([...cart, {
      id: item.id,
      type,
      name: item.name,
      price: item.price,
      quantity: 1
    }]);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0 || !tenant) return;
    
    try {
      await createOrder({
        tenant_id: tenant.id,
        customer_id: selectedCustomer || null,
        total_amount: total,
        discount_amount: 0,
        final_amount: total,
        status: 'paid',
        payment_method: 'credit_card' // Hardcoded for MVP
      }, cart);

      toast.success(`Venda de R$ ${total.toFixed(2)} finalizada!`);
      setCart([]);
      setSelectedCustomer('');
    } catch (error) {
      toast.error("Erro ao finalizar venda.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
      {/* Left: Product/Service Selection */}
      <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-2">
        <Card>
          <CardHeader>
            <CardTitle>Serviços</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {services.map(service => (
              <Button 
                key={service.id} 
                variant="outline" 
                className="h-24 flex flex-col items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
                onClick={() => addToCart(service, 'service')}
              >
                <span className="font-semibold">{service.name}</span>
                <span className="text-sm text-muted-foreground">R$ {service.price}</span>
              </Button>
            ))}
            {services.length === 0 && <p className="text-muted-foreground col-span-3 text-center">Nenhum serviço cadastrado.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {products.map(product => (
              <Button 
                key={product.id} 
                variant="outline" 
                className="h-24 flex flex-col items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
                onClick={() => addToCart(product, 'product')}
              >
                <span className="font-semibold">{product.name}</span>
                <span className="text-sm text-muted-foreground">R$ {product.price}</span>
              </Button>
            ))}
             {products.length === 0 && <p className="text-muted-foreground col-span-3 text-center">Nenhum produto cadastrado.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Right: Cart & Checkout */}
      <div className="lg:col-span-1">
        <Card className="h-full flex flex-col border-primary/20 shadow-lg shadow-primary/5">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Comanda
            </CardTitle>
          </CardHeader>
          
          <div className="p-4 border-b">
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar Cliente (Opcional)" />
              </SelectTrigger>
              <SelectContent>
                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <CardContent className="flex-1 overflow-y-auto p-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <p>Comanda vazia</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">R$</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {item.name}
                        <div className="text-xs text-muted-foreground capitalize">{item.type}</div>
                      </TableCell>
                      <TableCell className="text-right">{item.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(idx)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>

          <div className="p-4 bg-muted/10 space-y-4 border-t">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
            <Button 
              className="w-full h-12 text-lg bg-primary text-primary-foreground hover:bg-primary/90" 
              disabled={cart.length === 0}
              onClick={handleCheckout}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Finalizar Venda
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
