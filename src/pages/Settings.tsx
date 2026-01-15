import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Copy, ExternalLink, Calendar, CheckCircle2, AlertCircle, LogOut, Settings2, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
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

  // FIX: Eagerly initialize Google API to prevent browser popup blocking
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
      // Error handled in store, but we ensure loading state is reset
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    if (confirm("Tem certeza que deseja desconectar o Google Calendar?")) {
      await disconnectGoogleCalendar();
    }
  };

  const publicUrl = `${window.location.origin}/book/${tenant?.slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado para a área de transferência!");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">Gerencie os dados da sua barbearia e preferências.</p>
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
              {!isConfigured && !googleConnected && (
                <p className="text-xs text-yellow-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" /> Configuração de API pendente.
                </p>
              )}
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

          {/* Advanced Config Section - Only show if not configured or explicitly opened */}
          <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen} className="border rounded-md bg-background/50">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full flex justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-2"><Settings2 className="w-3 h-3" /> Configuração Técnica (Admin)</span>
                {isConfigOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 space-y-4 border-t">
              <div className="text-xs text-muted-foreground bg-yellow-500/10 p-3 rounded border border-yellow-500/20">
                <strong>Atenção:</strong> Esta área é para configuração técnica. Se você é o dono da barbearia, peça ao suporte as chaves de integração ou insira suas próprias chaves do Google Cloud Console.
              </div>

              {/* Step by Step Guide */}
              <Accordion type="single" collapsible className="w-full border rounded-md bg-background">
                <AccordionItem value="guide" className="border-none">
                  <AccordionTrigger className="px-4 py-2 text-sm hover:no-underline">
                    <span className="flex items-center gap-2 text-primary">
                      <HelpCircle className="w-4 h-4" /> 
                      Passo a passo: Como obter as chaves do Google?
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 text-muted-foreground space-y-3">
                    <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm">
                      <li>
                        Acesse o <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline">Google Cloud Console</a> e crie um novo projeto.
                      </li>
                      <li>
                        No menu lateral, vá em <strong>APIs e Serviços &gt; Biblioteca</strong>. Pesquise por <strong>"Google Calendar API"</strong> e clique em <strong>Ativar</strong>.
                      </li>
                      <li>
                        Vá em <strong>Tela de permissão OAuth</strong>. Selecione <strong>Externo</strong>, preencha o nome do app e emails de suporte. Salve e continue.
                      </li>
                      <li>
                        Vá em <strong>Credenciais</strong> e clique em <strong>Criar Credenciais</strong>:
                        <ul className="list-disc list-inside pl-4 mt-1 space-y-1">
                          <li>
                            <strong>Chave de API:</strong> Copie a chave gerada e cole no campo "Google API Key" abaixo.
                          </li>
                          <li>
                            <strong>ID do cliente OAuth:</strong> Escolha "Aplicativo da Web".
                            <div className="mt-1 p-2 bg-muted rounded border border-border">
                              <span className="font-semibold">Importante:</span> Em "Origens JavaScript autorizadas", adicione exatamente a URL do seu sistema: <br/>
                              <code className="text-xs bg-zinc-950 p-0.5 rounded text-zinc-300">{window.location.origin}</code>
                            </div>
                            Copie o "ID do Cliente" e cole no campo "Google Client ID" abaixo.
                          </li>
                        </ul>
                      </li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="grid gap-2">
                <Label className="text-xs">Google Client ID</Label>
                <Input 
                  value={configData.clientId} 
                  onChange={(e) => setConfigData({...configData, clientId: e.target.value})}
                  placeholder="ex: 123456-abcdef.apps.googleusercontent.com"
                  className="h-8 text-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Google API Key</Label>
                <Input 
                  value={configData.apiKey} 
                  onChange={(e) => setConfigData({...configData, apiKey: e.target.value})}
                  placeholder="ex: AIzaSy..."
                  className="h-8 text-xs"
                />
              </div>
              <Button size="sm" onClick={handleSaveConfig} className="w-full">Salvar Chaves</Button>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Barbearia</CardTitle>
          <CardDescription>Informações visíveis para seus clientes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Nome do Estabelecimento</Label>
            <Input 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="grid gap-2">
            <Label>Link de Agendamento (Slug)</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm whitespace-nowrap hidden md:block">
                {window.location.origin}/book/
              </span>
              <Input 
                value={formData.slug}
                onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Este é o link que você enviará para seus clientes agendarem.
            </p>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg border flex items-center justify-between gap-4 mt-2">
            <div className="flex-1 truncate text-sm text-muted-foreground">
              {publicUrl}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="w-4 h-4 mr-2" /> Copiar
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {isLoading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </div>
  );
}
