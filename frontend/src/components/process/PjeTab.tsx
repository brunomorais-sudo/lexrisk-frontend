import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2, AlertCircle, Clock, CheckCircle2, Building2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PjeDocumentosSection } from './PjeDocumentosSection';

interface Movimento {
  data: string;
  dataISO: string;
  codigo: number;
  nome: string;
  complemento?: string | null;
}

interface GrauData {
  grau: string;
  grauLabel: string;
  classeProcessual: string;
  assuntos: string;
  orgaoJulgador: string;
  valorCausa: number | null;
  lastUpdate: string | null;
  phase: string;
  reclamantes: Array<{ nome: string; tipo: string; advogados: Array<{ nome: string; oab: string | null }> }>;
  reclamados: Array<{ nome: string; tipo: string; advogados: Array<{ nome: string; oab: string | null }> }>;
  movimentosSummary: string;
  movimentos: Movimento[];
  totalMovimentos: number;
}

interface Props {
  processId: string;
  processNumber: string;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

function MovimentoTimeline({ movimentos }: { movimentos: Movimento[] }) {
  if (!movimentos?.length) return <p className="text-sm text-muted-foreground">Sem movimentações registradas.</p>;
  return (
    <div className="space-y-0 max-h-[500px] overflow-y-auto pr-2">
      {movimentos.map((m, i) => (
        <div key={i} className="flex gap-4 pb-5 last:pb-0">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            {i < movimentos.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          <div className="flex-1 pt-0.5">
            <p className="text-sm font-semibold text-foreground">{m.nome}</p>
            <p className="text-xs text-muted-foreground">{m.data}</p>
            {m.complemento && (
              <p className="text-xs text-muted-foreground mt-0.5">• {m.complemento}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PartesList({ partes, label }: { partes: Array<{ nome: string; tipo: string; advogados: Array<{ nome: string; oab: string | null }> }>; label: string }) {
  if (!partes?.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      {partes.map((p, i) => (
        <div key={i} className="mb-2">
          <p className="text-sm font-medium">{p.nome}</p>
          {p.advogados?.map((a, j) => (
            <p key={j} className="text-xs text-muted-foreground ml-2">
              ↳ {a.nome}{a.oab ? ` — OAB ${a.oab}` : ''}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

function GrauCard({ data }: { data: GrauData }) {
  const [showAll, setShowAll] = useState(false);
  const movToShow = showAll ? data.movimentos : data.movimentos.slice(0, 10);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{data.grauLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs capitalize">{data.phase}</Badge>
          <Badge variant="secondary" className="text-xs">{data.totalMovimentos} movimentos</Badge>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Metadados */}
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          {data.orgaoJulgador && (
            <div className="col-span-2 md:col-span-1">
              <dt className="text-muted-foreground text-xs">Órgão Julgador</dt>
              <dd className="font-medium text-sm">{data.orgaoJulgador}</dd>
            </div>
          )}
          {data.classeProcessual && (
            <div>
              <dt className="text-muted-foreground text-xs">Classe</dt>
              <dd className="font-medium text-sm">{data.classeProcessual}</dd>
            </div>
          )}
          {data.valorCausa && (
            <div>
              <dt className="text-muted-foreground text-xs">Valor da Causa</dt>
              <dd className="font-medium text-sm">{formatCurrency(data.valorCausa)}</dd>
            </div>
          )}
          {data.lastUpdate && (
            <div>
              <dt className="text-muted-foreground text-xs">Última Atualização</dt>
              <dd className="font-medium text-sm">{new Date(data.lastUpdate).toLocaleDateString('pt-BR')}</dd>
            </div>
          )}
          {data.assuntos && (
            <div className="col-span-2 md:col-span-3">
              <dt className="text-muted-foreground text-xs">Assuntos</dt>
              <dd className="font-medium text-sm">{data.assuntos}</dd>
            </div>
          )}
        </dl>

        {/* Partes */}
        {(data.reclamantes?.length > 0 || data.reclamados?.length > 0) && (
          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                <PartesList partes={data.reclamantes} label="Reclamante(s)" />
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                <PartesList partes={data.reclamados} label="Reclamado(s)" />
              </div>
            </div>
          </div>
        )}

        {/* Movimentações */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Andamentos Processuais</p>
            {data.totalMovimentos > 10 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-xs text-primary hover:underline"
              >
                {showAll ? 'Mostrar menos' : `Ver todos (${data.totalMovimentos})`}
              </button>
            )}
          </div>
          <MovimentoTimeline movimentos={movToShow} />
        </div>
      </div>
    </div>
  );
}

export function PjeTab({ processId, processNumber }: Props) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [graus, setGraus] = useState<GrauData[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Carregar dados já salvos no banco
  const loadSavedData = async () => {
    setLoading(true);
    try {
      const { data: docs } = await supabase
        .from('process_documents' as any)
        .select('*')
        .eq('process_id', processId)
        .in('document_type', ['pje_g1', 'pje_g2', 'datajud_enrichment'])
        .order('fetched_at', { ascending: false }) as any;

      if (docs && docs.length > 0) {
        const grausData: GrauData[] = [];
        for (const doc of docs) {
          try {
            const content = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
            if (content && content.movimentos) {
              grausData.push(content as GrauData);
            }
          } catch { /* ignore parse errors */ }
        }
        setGraus(grausData);
        setLastSync(docs[0].fetched_at);
        setNotFound(grausData.length === 0);
      } else {
        setNotFound(false); // não sincronizado ainda, não "not found"
      }
    } catch (err) {
      console.error('Erro ao carregar dados PJe:', err);
    } finally {
      setLoading(false);
    }
  };

  // Disparar nova busca no PJe
  const handleSync = async () => {
    setSyncing(true);
    setNotFound(false);
    try {
      const resp = await fetch('/api/buscar-pje', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ process_id: processId, process_number: processNumber }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        toast.error(data?.error || 'Erro ao consultar PJe');
        return;
      }

      if (data.status === 'not_found') {
        toast.info('Processo não encontrado no DataJud/PJe');
        setNotFound(true);
        return;
      }

      toast.success(
        `PJe sincronizado — ${data.grausEncontrados?.join(' + ')} encontrado(s), ` +
        `${Object.values(data.movimentosPorGrau || {}).reduce((a: number, b) => a + (b as number), 0)} andamentos`
      );

      // Recarregar dados salvos
      await loadSavedData();
    } catch (err) {
      toast.error('Falha de conexão com o PJe');
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadSavedData();
  }, [processId]);

  return (
    <div className="space-y-4">
      {/* Header com botão de atualização */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="section-title mb-1">Consulta PJe / DataJud (CNJ)</h3>
            <p className="text-sm text-muted-foreground">
              Andamentos oficiais em <strong>1º grau</strong> (Vara do Trabalho) e{' '}
              <strong>2º grau</strong> (TRT) via base pública do CNJ.
            </p>
            {lastSync && (
              <p className="text-xs text-muted-foreground mt-1">
                Última sincronização: {new Date(lastSync).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
          <Button
            onClick={handleSync}
            disabled={syncing || loading}
            variant="outline"
            className="gap-2 shrink-0"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncing ? 'Consultando...' : 'Atualizar PJe'}
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">Carregando dados...</p>
        </div>
      )}

      {/* Sem dados e não sincronizado */}
      {!loading && graus.length === 0 && !notFound && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Clock className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">Sem dados do PJe ainda</p>
          <p className="text-xs text-muted-foreground mt-1">
            Clique em "Atualizar PJe" para buscar os andamentos no DataJud/CNJ.
          </p>
          <Button onClick={handleSync} disabled={syncing} className="mt-4 gap-2">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Buscar agora
          </Button>
        </div>
      )}

      {/* Não encontrado */}
      {!loading && notFound && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">Processo não encontrado no DataJud</p>
          <p className="text-xs text-muted-foreground mt-1">
            O número <code className="font-mono bg-muted px-1 rounded">{processNumber}</code> não retornou resultados.
            O processo pode ainda não estar indexado ou o número pode estar incorreto.
          </p>
        </div>
      )}

      {/* Dados por grau */}
      {!loading && graus.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">
              {graus.length === 2 ? '1º e 2º grau encontrados' : graus.length === 1 ? `${graus[0].grauLabel} encontrado` : 'Dados encontrados'}
            </span>
          </div>
          {graus.map((g) => (
            <GrauCard key={g.grau} data={g} />
          ))}
        </>
      )}

      {/* Peças Processuais via PJe */}
      <PjeDocumentosSection
        processId={processId}
        processNumber={processNumber}
        tribunal={inferTribunal(processNumber)}
     
