import { useState } from 'react';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Scissors } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const initialize = useStore(state => state.initialize);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // 1. Sign Up
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (authError) throw authError;
        
        if (authData.user) {
           // Check if session is established (Auto Confirm might be on)
           if (!authData.session) {
             toast.info("Verifique seu email para confirmar o cadastro.");
             setIsSignUp(false);
             setIsLoading(false);
             return;
           }

           // 2. Create Tenant
           const { data: tenant, error: tenantError } = await supabase.from('tenants').insert({
             name: 'Minha Barbearia',
             slug: `barber-${Math.random().toString(36).substr(2, 5)}`
           }).select().single();

           if (tenantError) throw new Error("Erro ao criar barbearia: " + tenantError.message);

           // 3. Create Profile
           const { error: profileError } = await supabase.from('profiles').insert({
             id: authData.user.id,
             tenant_id: tenant.id,
             name: 'Admin',
             role: 'owner'
             // Email is stored in auth.users, not profiles
           });

           if (profileError) throw new Error("Erro ao criar perfil: " + profileError.message);

           toast.success("Conta criada com sucesso! Entrando...");
           
           // Force initialization
           await initialize();
        }
      } else {
        // Login
        // Capture data to use ID for recovery if needed
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        // Initialization is handled by onAuthStateChange in store, but we call it here to be safe
        await initialize();

        // Verify if profile was loaded successfully
        const currentUser = useStore.getState().user;
        
        if (!currentUser) {
          // Auto-recovery: Create missing Tenant/Profile for existing Auth user
          try {
            console.log("Usuário autenticado sem perfil. Iniciando auto-recuperação...");
            
            if (!authData.user) throw new Error("Usuário não identificado na sessão.");

            // 1. Create Tenant
            const { data: tenant, error: tenantError } = await supabase.from('tenants').insert({
              name: 'Minha Barbearia',
              slug: `barber-${Math.random().toString(36).substr(2, 5)}`
            }).select().single();

            if (tenantError) throw tenantError;

            // 2. Create Profile
            const { error: profileError } = await supabase.from('profiles').insert({
              id: authData.user.id,
              tenant_id: tenant.id,
              name: 'Admin',
              role: 'owner'
              // Email is stored in auth.users, not profiles
            });

            if (profileError) throw profileError;

            // 3. Re-initialize to load the new profile
            await initialize();
            
            // Final check
            if (!useStore.getState().user) throw new Error("Falha na recuperação do perfil.");
            
            toast.success("Perfil recriado e recuperado com sucesso!");
          } catch (recoveryError: any) {
            console.error("Recovery failed:", recoveryError);
            await supabase.auth.signOut();
            throw new Error("Perfil não encontrado e não foi possível recriá-lo automaticamente.");
          }
        }

        toast.success("Bem-vindo de volta!");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro na autenticação");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 text-zinc-100">
        <CardHeader className="space-y-1 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-4">
            <Scissors className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">BarberOS</CardTitle>
          <CardDescription className="text-zinc-400">
            {isSignUp ? 'Crie sua conta para começar' : 'Entre para gerenciar sua barbearia'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@barber.os" 
                className="bg-zinc-950 border-zinc-800" 
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-950 border-zinc-800" 
                required
              />
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? 'Carregando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" onClick={() => setIsSignUp(!isSignUp)} className="text-zinc-500">
            {isSignUp ? 'Já tem uma conta? Entrar' : 'Não tem uma conta? Criar conta'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
