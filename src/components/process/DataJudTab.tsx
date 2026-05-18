import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Movimento {
  codigo: number;
  nome: string;
  dataHora: string;
  complementosTabelados?: Array<{ nome?: string; descricao?: string; valor?: number }>;
}

interface DataJudResult {
  found: boolean;
  tribunal?: string;
  grau?: string;
  classe?: string;
  orgaoJulgador?: string;
  dataAjuizamento?: string;
  movimentos: Movimento[];
  message?: string;
}

const CNJ_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

function maskCNJ(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 20);
  if (d.length <= 7) return d;
  if (d.length <= 9) return `${d.slice(0, 7)}-${d.slice(7)}`;
  if (d.length <= 13) return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9)}`;
  if (d.length <= 14) return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13)}`;
  if (d.length <= 16)
    return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14)}`;
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16, 20)}`;
}

interface Props {
  initialNumber?: string;
}

export function DataJudTab({ initialNumber }: Props) {
  const [number, setNumber] = useState(initialNumber ? maskCNJ(initialNumber) : '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DataJudResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/datajud-consulta`;

  const handleSearch = async () => {
    setError(null);
    setResult(null);

    if (!CNJ_REGEX.test(number)) {
      setError('Informe o número no formato CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ processNumber: number }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data?.error || 'Não foi possível consultar o DataJud no momento.');
        return;
      }

      setResult(data);
      if (data.found) {
        toast.success(`${data.movimentos.length} andamento(s) encontrado(s)`);
      } else {
        toast.info(data.message || 'Processo não encontrado no DataJud');
      }
    } catch (e) {
      console.error('DataJud fetch error:', e);
      setError('Falha de conexão com o DataJud. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5">
        <h3 className="section-title mb-2">Consulta DataJud (CNJ)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Consulte os andamentos oficiais do processo na base pública do Conselho Nacional de
          Justiça. Suportado: TRTs, TRFs e TJs.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="0000000-00.0000.0.00.0000"
            value={number}
            onChange={(e) => setNumber(maskCNJ(e.target.value))}
            className="font-mono"
            maxLength={25}
          />
          <Button onClick={handleSearch} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? 'Consultando...' : 'Buscar no DataJud'}
          </Button>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {result && !result.found && (
        <div className="rounded-xl border bg-card p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            {result.message || 'Nenhum andamento encontrado.'}
          </p>
        </div>
      )}

      {result && result.found && (
        <>
          <div className="rounded-xl border bg-card p-5">
            <h4 className="section-title mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-risk-low" /> Dados Oficiais (CNJ)
            </h4>
            <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div>
                <dt className="text-muted-foreground text-xs">Tribunal</dt>
                <dd className="font-medium">{result.tribunal || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Grau</dt>
                <dd className="font-medium">{result.grau || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Classe</dt>
                <dd className="font-medium">{result.classe || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Órgão Julgador</dt>
                <dd className="font-medium">{result.orgaoJulgador || '—'}</dd>
              </div>
              {result.dataAjuizamento && (
                <div>
                  <dt className="text-muted-foreground text-xs">Ajuizamento</dt>
                  <dd className="font-medium">
                    {new Date(result.dataAjuizamento).toLocaleDateString('pt-BR')}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="section-title">Andamentos Processuais</h4>
              <Badge variant="secondary" className="text-xs">
                {result.movimentos.length} movimento(s)
              </Badge>
            </div>
            {result.movimentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum andamento registrado.</p>
            ) : (
              <div className="space-y-0 max-h-[600px] overflow-y-auto scrollbar-thin pr-2">
                {result.movimentos.map((m, i) => (
                  <div key={i} className="flex gap-4 pb-5 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Clock className="h-4 w-4" />
                      </div>
                      {i < result.movimentos.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{m.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.dataHora
                          ? new Date(m.dataHora).toLocaleString('pt-BR')
                          : 'Data não informada'}
                      </p>
                      {m.complementosTabelados && m.complementosTabelados.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {m.complementosTabelados.map((c, j) => (
                            <li key={j} className="text-xs text-muted-foreground">
                              • {c.nome}: {c.descricao}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
