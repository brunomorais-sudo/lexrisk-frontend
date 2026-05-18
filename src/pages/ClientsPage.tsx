import { useState } from 'react';
import { Link } from 'react-router-dom';
import { clientCompanies as mockCompanies, processes, processAnalyses } from '@/data/mock-data';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

interface NewCompanyForm {
  trade_name: string;
  business_name: string;
  cnpj: string;
  industry: string;
}

export default function ClientsPage() {
  const { role } = useAuth();
  const isClient = role === 'client_user';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localCompanies, setLocalCompanies] = useState<any[]>([]);
  const [form, setForm] = useState<NewCompanyForm>({ trade_name: '', business_name: '', cnpj: '', industry: '' });

  const allCompanies = [...mockCompanies, ...localCompanies];

  const handleSave = async () => {
    if (!form.trade_name.trim() || !form.cnpj.trim()) {
      toast.error('Nome fantasia e CNPJ são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('client_companies')
        .insert({
          trade_name: form.trade_name,
          business_name: form.business_name || form.trade_name,
          cnpj: form.cnpj,
          industry: form.industry,
        })
        .select()
        .single();

      if (error) throw error;

      setLocalCompanies(prev => [...prev, {
        id: data.id,
        organization_id: '',
        responsible_law_firm_id: 'org-1',
        business_name: data.business_name,
        trade_name: data.trade_name,
        cnpj: data.cnpj,
        industry: data.industry,
        created_at: data.created_at,
      }]);

      toast.success('Empresa cadastrada com sucesso!');
      setForm({ trade_name: '', business_name: '', cnpj: '', industry: '' });
      setDialogOpen(false);
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Erro ao cadastrar empresa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-header">Clientes Empresariais</h1>
          <p className="mt-1 text-sm text-muted-foreground">{allCompanies.length} empresas cadastradas</p>
        </div>
        {!isClient && (
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Nova Empresa
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allCompanies.map(company => {
          const companyProcesses = processes.filter(p => p.client_company_id === company.id);
          const highRisk = companyProcesses.filter(p => processAnalyses.find(a => a.process_id === p.id)?.risk_level === 'alto').length;
          const totalExposure = companyProcesses.reduce((s, p) => s + p.claim_value, 0);

          return (
            <Link key={company.id} to={`/processos?empresa=${company.id}`} className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow block">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{company.trade_name}</h3>
                  <p className="text-xs text-muted-foreground">{company.cnpj} • {company.industry}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{companyProcesses.length}</p>
                  <p className="text-xs text-muted-foreground">Processos</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-risk-high">{highRisk}</p>
                  <p className="text-xs text-muted-foreground">Alto risco</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{formatCurrency(totalExposure)}</p>
                  <p className="text-xs text-muted-foreground">Exposição</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* New Company Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Nova Empresa</DialogTitle>
            <DialogDescription>Preencha os dados da empresa cliente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="trade_name">Nome Fantasia *</Label>
              <Input id="trade_name" value={form.trade_name} onChange={e => setForm(f => ({ ...f, trade_name: e.target.value }))} placeholder="Ex: TechBrasil" />
            </div>
            <div>
              <Label htmlFor="business_name">Razão Social</Label>
              <Input id="business_name" value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} placeholder="Ex: TechBrasil Soluções S.A." />
            </div>
            <div>
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input id="cnpj" value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <Label htmlFor="industry">Setor/Indústria</Label>
              <Input id="industry" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} placeholder="Ex: Tecnologia" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
