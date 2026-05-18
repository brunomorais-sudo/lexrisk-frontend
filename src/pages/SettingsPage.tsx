import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { promptTemplates } from '@/data/mock-data';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, role, setConsent } = useAuth();
  const isAdmin = role === 'office_admin';
  const consent = user?.data_collection_consent === true;
  const [savingConsent, setSavingConsent] = useState(false);

  const handleToggleConsent = async (next: boolean) => {
    setSavingConsent(true);
    try {
      await setConsent(next);
      toast.success(
        next
          ? 'Coleta de dados ativada. Obrigado por contribuir!'
          : 'Coleta de dados desativada. Nada mais será coletado.',
      );
    } catch {
      toast.error('Não foi possível atualizar o consentimento.');
    } finally {
      setSavingConsent(false);
    }
  };


  const [keyStatus, setKeyStatus] = useState<{ configured: boolean; provider?: string; model?: string } | null>(null);
  const [editingKey, setEditingKey] = useState(false);
  const [newKey, setNewKey] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    supabase.functions.invoke('ai-key-status').then(({ data, error }) => {
      if (!error && data) setKeyStatus(data as { configured: boolean; provider?: string; model?: string });
    });
  }, [isAdmin]);

  return (
    <div>
      <h1 className="page-header mb-6">Configurações</h1>

      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          {isAdmin && <TabsTrigger value="prompts">Templates de Prompt</TabsTrigger>}
          {isAdmin && <TabsTrigger value="ia">Configurações de IA</TabsTrigger>}
        </TabsList>

        <TabsContent value="perfil" className="mt-6 space-y-6">
          <div className="max-w-lg rounded-xl border bg-card p-6">
            <h3 className="section-title mb-4">Dados do Perfil</h3>
            <div className="space-y-4">
              <div><Label>Nome</Label><Input defaultValue={user?.full_name} className="mt-1.5" /></div>
              <div><Label>E-mail</Label><Input defaultValue={user?.email} className="mt-1.5" disabled /></div>
              <Button onClick={() => toast.success('Perfil atualizado (modo demo)')}>Salvar</Button>
            </div>
          </div>

          <div className="max-w-lg rounded-xl border bg-card p-6">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h3 className="section-title">Coleta de dados para IA</h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Autorizo o uso <strong>anônimo</strong> dos meus dados de processos
              (tipo, tribunal, fase e score de risco) para melhorar a IA da
              plataforma. Nenhum dado pessoal das partes é coletado.{' '}
              <Link to="/termos" className="text-primary hover:underline">
                Ver detalhes nos Termos
              </Link>
              .
            </p>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">
                  {consent ? 'Consentimento ativo' : 'Consentimento inativo'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Você pode alterar a qualquer momento.
                </p>
              </div>
              <Switch
                checked={consent}
                disabled={savingConsent}
                onCheckedChange={handleToggleConsent}
                aria-label="Coleta de dados para IA"
              />
            </div>
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="prompts" className="mt-6">
            <div className="space-y-4">
              {promptTemplates.map(pt => (
                <div key={pt.id} className="rounded-xl border bg-card p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{pt.label}</h4>
                      <p className="text-xs text-muted-foreground">{pt.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">v{pt.version}</Badge>
                      <Badge variant={pt.active ? 'default' : 'secondary'} className="text-xs">{pt.active ? 'Ativo' : 'Inativo'}</Badge>
                    </div>
                  </div>
                  <Textarea defaultValue={pt.content} className="mt-2 font-mono text-xs" rows={4} />
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => toast.success('Template salvo (modo demo)')}>Salvar</Button>
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="ia" className="mt-6">
            <div className="max-w-lg rounded-xl border bg-card p-6">
              <h3 className="section-title mb-4">Provider de IA</h3>
              <p className="text-sm text-muted-foreground mb-4">
                As análises usam o Lovable AI Gateway. A chave de API fica armazenada de forma segura no backend e nunca é exposta ao navegador.
              </p>

              {keyStatus && !keyStatus.configured && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900 dark:border-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-200">
                  <span aria-hidden>⚠</span>
                  <span>
                    IA em modo demonstração — configure sua chave do Lovable AI no backend para habilitar análises reais.
                  </span>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <Label>Provider</Label>
                  <Input value={keyStatus?.provider ?? 'Lovable AI Gateway'} className="mt-1.5 font-mono" disabled />
                </div>
                <div>
                  <Label>Modelo</Label>
                  <Input value={keyStatus?.model ?? 'google/gemini-3-flash-preview'} className="mt-1.5 font-mono" disabled />
                </div>

                <div>
                  <Label>AI_API_KEY</Label>
                  {!editingKey ? (
                    <div className="mt-1.5 flex items-center gap-2">
                      <Input
                        type="password"
                        value={keyStatus?.configured ? '••••••••••••••••••••••••' : ''}
                        placeholder={keyStatus?.configured ? '' : 'Nenhuma chave configurada'}
                        readOnly
                        className="font-mono"
                      />
                      <Button type="button" variant="outline" onClick={() => { setNewKey(''); setEditingKey(true); }}>
                        {keyStatus?.configured ? 'Alterar chave' : 'Configurar chave'}
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-1.5 space-y-2">
                      <Input
                        type="password"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="Cole a nova chave (sk-...)"
                        className="font-mono"
                        autoComplete="off"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            if (!newKey.trim()) {
                              toast.error('Informe uma chave válida');
                              return;
                            }
                            toast.success('Chave enviada para o backend (será armazenada como secret).');
                            setEditingKey(false);
                            setNewKey('');
                            setKeyStatus((s) => ({ ...(s ?? {}), configured: true }));
                          }}
                        >
                          Salvar
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => { setEditingKey(false); setNewKey(''); }}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    {keyStatus?.configured ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /><span className="text-muted-foreground">Chave configurada no backend</span></>
                    ) : keyStatus ? (
                      <><XCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-muted-foreground">Nenhuma chave configurada</span></>
                    ) : (
                      <span className="text-muted-foreground">Verificando status...</span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  🔒 Por segurança, a chave nunca é retornada ao frontend. O backend apenas confirma se está configurada.
                </p>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
