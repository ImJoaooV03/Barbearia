import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Copy, ExternalLink, Calendar, CheckCircle2, LogOut, Settings2, ChevronDown, ChevronUp, HelpCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { isGoogleConfigured, initGoogleAPI } from '@/lib/googleCalendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function Settings() {
  const { tenant, initialize, googleConnected, connectGoogleCalendar, disconnectGoogleCalendar, saveGoogleConfig } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    slug: tenant?.slug || '',
  });

  const [configData, setConfigData] = useState({
    clientId: tenant?.google_config?.clientId || '',
    apiKey: tenant?.google_config?.apiKey || ''
  });

  const isConfigured = isGoogleConfigured();
  const currentOrigin = window.location.origin;

  useEffect(() => {
    if (isConfigured && !googleConnected) {
      initGoogleAPI().catch(err => console.error("Failed to eager init Google API", err));
    }
  }, [isConfigured, googleConnected]);

  const handleSave = async () => {
    if (!tenant) return;
    setIsLoading(true);

    try {
      if (formData.slug !== tenant.slug) {
        const { data: existing } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', formData.slug)
          .single();
        
        if (existing) {
          toast.error("Este link já está em uso. Escolha outro.");
          setIsLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('tenants')
        .update({
          name: formData.name,
          slug: formData.slug
        })
        .eq('id', tenant.id);

      if (error) throw error;

      await initialize();
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar configurações.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!configData.clientId || !configData.apiKey) {
      toast.error("Preencha ambos os campos.");
      return;
    }
    
    try {
      await saveGoogleConfig(configData.clientId, configData.apiKey);
      toast.success("Chaves de API salvas! Agora você pode conectar.");
      setIsConfigOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar chaves.");
    }
  };

  const handleGoogleConnect = async () => {
    if (!isConfigured) {
      toast.error("Configuração pendente. Abra as opções avançadas abaixo.");
      setIsConfigOpen(true);
      return;
    }
    setIsGoogleLoading(true);
    try {
      await connectGoogleCalendar();
    } catch (error) {
      console.error("Google Connect Error:", error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    if (confirm("Tem certeza que deseja desconectar o Google Calendar?")) {
      await disconnectGoogleCalendar();
    }
  };

  // New route format
  const publicUrl = `${window.location.origin}/${tenant?.slug}/agendamento`;

  const copyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">Gerencie os dados da sua barbearia e preferências.</p>
      </div>

      {/* Dados da Barbearia */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da Barbearia</CardTitle>
          <CardDescription>Informações visíveis para seus clientes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-base">Nome do Estabelecimento</Label>
            <Input 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="h-11"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-base">Link de Agendamento (Slug)</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-input focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary">
                  <span className="flex select-none items-center pl-3 text-muted-foreground sm:text-sm">
                    {window.location.origin}/
                  </span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                    className="block flex-1 border-0 bg-transparent py-2.5 pl-1 text-foreground placeholder:text-muted-foreground focus:ring-0 sm:text-sm sm:leading-6"
                  />
                  <span className="flex select-none items-center pr-3 text-muted-foreground sm:text-sm">
                    /agendamento
                  </span>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Este é o link que você enviará para seus clientes agendarem.
            </p>
          </div>

          <div className="space-y-2">
             <div className="flex rounded-md shadow-sm">
                <div className="relative flex-grow focus-within:z-10">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={publicUrl}
                    className="block w-full rounded-none rounded-l-md border-0 py-2.5 pl-10 text-muted-foreground ring-1 ring-inset ring-input placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 bg-muted/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => copyLink(publicUrl)}
                  className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-foreground ring-1 ring-inset ring-input hover:bg-muted"
                >
                  <Copy className="-ml-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  Copiar
                </button>
                <a 
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="relative ml-2 inline-flex items-center gap-x-1.5 rounded-md px-3 py-2 text-sm font-semibold text-foreground ring-1 ring-inset ring-input hover:bg-muted"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[150px]">
          {isLoading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      {/* Google Calendar Integration */}
      <Card className={`border-l-4 ${googleConnected ? 'border-l-green-500 bg-green-950/5' : 'border-l-blue-500 bg-blue-950/5'}`}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className={`w-5 h-5 ${googleConnected ? 'text-green-500' : 'text-blue-500'}`} />
            <CardTitle>Integrações</CardTitle>
          </div>
          <CardDescription>Conecte serviços externos para turbinar sua gestão.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-medium flex items-center gap-2">
                Google Calendar
                {googleConnected ? (
                  <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-500 ring-1 ring-inset ring-green-500/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Ativo
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-zinc-500/10 px-2 py-1 text-xs font-medium text-zinc-500 ring-1 ring-inset ring-zinc-500/20">
                    Inativo
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground max-w-lg">
                {googleConnected 
                  ? "Sua agenda está sincronizada. Novos agendamentos aparecerão no seu Google Calendar." 
                  : "Conecte para sincronizar sua agenda automaticamente e evitar conflitos de horário."}
              </p>
            </div>
            
            {googleConnected ? (
              <Button 
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={handleGoogleDisconnect}
              >
                <LogOut className="w-4 h-4 mr-2" /> Desconectar
              </Button>
            ) : (
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleGoogleConnect}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? 'Conectando...' : 'Conectar Google Calendar'}
              </Button>
            )}
          </div>

          <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen} className="border rounded-md bg-background/50">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full flex justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-2"><Settings2 className="w-3 h-3" /> Configuração Técnica (Admin)</span>
                {isConfigOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 space-y-4 border-t">
              
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-md text-sm text-yellow-500 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <strong>Atenção:</strong> Configure as chaves abaixo para habilitar a integração.
                </div>
              </div>

              <Accordion type="single" collapsible className="w-full border rounded-md bg-background">
                <AccordionItem value="guide" className="border-b">
                  <AccordionTrigger className="px-4 py-2 text-sm hover:no-underline">
                    <span className="flex items-center gap-2 text-primary">
                      <HelpCircle className="w-4 h-4" /> 
                      Passo 1: Configurar URL Autorizada (Erro redirect_uri)
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 text-muted-foreground space-y-3">
                    <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm">
                      <li>Acesse o <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="underline text-primary">Google Cloud Console</a>.</li>
                      <li>Clique no seu <strong>ID do Cliente OAuth 2.0</strong>.</li>
                      <li>Vá até a seção <strong>Origens JavaScript autorizadas</strong>.</li>
                      <li>Clique em "Adicionar URI" e cole exatamente o link abaixo:</li>
                    </ol>
                    
                    <div className="flex gap-2 mt-2">
                      <Input value={currentOrigin} readOnly className="bg-muted font-mono text-xs" />
                      <Button size="icon" variant="outline" onClick={() => copyLink(currentOrigin)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="verification" className="border-none">
                  <AccordionTrigger className="px-4 py-2 text-sm hover:no-underline">
                    <span className="flex items-center gap-2 text-red-500">
                      <ShieldAlert className="w-4 h-4" /> 
                      Passo 2: Erro "Acesso Bloqueado / App em Teste"
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 text-muted-foreground space-y-3">
                    <p className="text-xs sm:text-sm">
                      Se você viu uma tela preta dizendo <strong>"Acesso bloqueado: o app está em fase de testes"</strong>, siga isto:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm">
                      <li>No Google Cloud Console, vá em <strong>"Tela de permissão OAuth"</strong> (OAuth consent screen).</li>
                      <li>Role até <strong>"Usuários de teste"</strong> (Test users).</li>
                      <li>Clique em <strong>"+ ADD USERS"</strong> e adicione seu email (ex: joaovicrengel@gmail.com).</li>
                      <li>Salve e tente conectar novamente.</li>
                    </ol>
                    <p className="text-xs text-zinc-400 mt-2 italic">
                      Alternativa: Clique em "PUBLISH APP" para tornar o app público (pode exigir verificação do Google).
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="grid gap-2">
                <Label className="text-xs">Google Client ID</Label>
                <Input 
                  value={configData.clientId} 
                  onChange={(e) => setConfigData({...configData, clientId: e.target.value})}
                  className="h-8 text-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Google API Key</Label>
                <Input 
                  value={configData.apiKey} 
                  onChange={(e) => setConfigData({...configData, apiKey: e.target.value})}
                  className="h-8 text-xs"
                />
              </div>
              <Button size="sm" onClick={handleSaveConfig} className="w-full">Salvar Chaves</Button>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}
