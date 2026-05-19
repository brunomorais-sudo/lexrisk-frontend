import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ClientCompany {
  id: string;
  trade_name: string;
  business_name: string;
  cnpj: string;
  industry: string;
  num_processos: number;
  total_exposure: number;
  high_risk: number;
}

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
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<ClientCompany[]>([]);
  const [form, setForm] = useState<NewCompanyForm>({ trade_name: '', business_name: '', cnpj: '', industry: '' });

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_companies')
        .select(`
          id,
          trade_name,
          business_name,
          cnpj,
          industry
        `)
        .order('trade_name');

      if (error) throw error;

      // For each company, fetch process stats
      const companiesWithStats = await Promise.all((data || []).map(async (cc) => {
        const { data: procs } = await supabase
          .from('processes')
          .select('id, claim_value')
          .eq('client_company_id', cc.id);

        const procList = procs || [];
        const total_exposure = procList.reduce((s: number, p: any) => s + (p.claim_value || 0), 0);

        // Get high risk count from analyses
        const { data: analyses } = await supabase
          .from('process_analyses')
          .select('risk_level, process_id')
          .in('process_id', procList.map((p: any) => p.id))
          .eq('risk_level', 'alto');

        return {
          ...cc,
          num_processos: procList.length,
          total_exposure,
          high_risk: (analyses || []).length,
        };
      }));

      setCompanies(companiesWithStats);
    } catch (err: any) {
      console.error('Fetch companies error:', err);
      toast.error('Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleSave = async () => {
    if (!form.trade_name.trim() || !form.cnpj.trim()) {
      toast.error('Nome fantasia e CNPJ são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('client_companies')
        .insert({
          trade_name: form.trade_name,
          business_name: form.business_name || form.trade_name,
          cnpj: form.cnpj,
          industry: form.industry,
        });

      if (error) throw error;

      toast.success('Empresa cadastrada com sucesso!');
      setForm({ trade_name: '', business_name: '', cnpj: '', industry: '' });
      setDialogOpen(false);
      fetchCompanies();
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
          <p className="mt-1 text-sm text-muted-foreground">{companies.length} empresas cadastradas</p>
        </div>
        {!isClient && (
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Nova Empresa
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companies.map(company => (
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
                  <p className="text-lg font-bold text-foreground">{company.num_processos}</p>
                  <p className="text-xs text-muted-foreground">Processos</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-risk-high">{company.high_risk}</p>
                  <p className="text-xs text-muted-foreground">Alto risco</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{formatCurrency(company.total_exposure)}</p>
                  <p className="text-xs text-muted-foreground">Exposição</p>
                </div>
              </div>
            </Link>
        ))}
      </div>
      )}

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
