import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2,
  ArrowRight, BarChart3, AlertTriangle, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/importacao-lote`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Phase =
  | 'idle'
  | 'parsing'
  | 'mapping'
  | 'processing'
  | 'done';

interface RowResult {
  index: number;
  process_number: string;
  status: 'pending' | 'processing' | 'success' | 'duplicate' | 'error';
  risk_level?: string;
  risk_score?: number;
  process_id?: string;
  error?: string;
}

async function callEdge(body: Record<string, unknown>) {
  const resp = await fetch(EDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }
  return resp.json();
}

function parseFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!json.length) return reject(new Error('Planilha vazia ou sem dados'));
        const headers = Object.keys(json[0]);
        resolve({ headers, rows: json });
      } catch (err: any) {
        reject(new Error(`Erro ao ler planilha: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

function parseCSV(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target!.result as string;
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) return reject(new Error('CSV vazio ou sem dados'));
        const headers = lines[0].split(/[;,]/).map(h => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1).map(line => {
          const vals = line.split(/[;,]/).map(v => v.trim().replace(/^"|"$/g, ''));
          return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']));
        });
        resolve({ headers, rows });
      } catch (err: any) {
        reject(new Error(`Erro ao ler CSV: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file, 'UTF-8');
  });
}

const riskColors: Record<string, string> = {
  alto: 'bg-red-100 text-red-700 border-red-200',
  medio: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  baixo: 'bg-green-100 text-green-700 border-green-200',
};

export default function ImportacaoLotePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [fileName, setFileName] = useState('');
  const [totalRows, setTotalRows] = useState(0);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [results, setResults] = useState<RowResult[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const dupCount = results.filter(r => r.status === 'duplicate').length;
  const progress = totalRows > 0 ? Math.round((processedCount / totalRows) * 100) : 0;

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isXlsx = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    if (!isXlsx && !isCsv) {
      toast.error('Selecione um arquivo .xlsx, .xls ou .csv');
      return;
    }

    setFileName(file.name);
    setPhase('parsing');
    setResults([]);
    setProcessedCount(0);

    try {
      // 1. Parse file
      const parsed = isXlsx ? await parseFile(file) : await parseCSV(file);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setTotalRows(parsed.rows.length);

      toast.info(`${parsed.rows.length} linhas detectadas. Mapeando colunas com IA...`);

      // 2. Map columns via Claude
      setPhase('mapping');
      const { mapping } = await callEdge({
        action: 'map-columns',
        headers: parsed.headers,
        rows: parsed.rows.slice(0, 5),
      });
      setColumnMapping(mapping);

      // 3. Initialize result rows
      const initialResults: RowResult[] = parsed.rows.map((row, i) => ({
        index: i,
        process_number: row[Object.keys(mapping).find(k => mapping[k] === 'process_number') || ''] || `Linha ${i + 1}`,
        status: 'pending',
      }));
      setResults(initialResults);

      toast.success(`Colunas mapeadas! Iniciando análise de ${parsed.rows.length} processos...`);

      // 4. Process rows sequentially (rate-limit friendly)
      setPhase('processing');
      let processed = 0;

      for (let i = 0; i < parsed.rows.length; i++) {
        setResults(prev => prev.map(r => r.index === i ? { ...r, status: 'processing' } : r));

        try {
          const result = await callEdge({
            action: 'process-row',
            rows: parsed.rows,
            rowIndex: i,
            columnMapping: mapping,
            userId: user?.id && /^[0-9a-f-]{36}$/i.test(user.id) ? user.id : null,
          });

          setResults(prev => prev.map(r => r.index === i ? {
            ...r,
            status: result.status === 'duplicate' ? 'duplicate' : 'success',
            risk_level: result.risk_level,
            risk_score: result.risk_score,
            process_id: result.process_id,
            process_number: result.process_number || r.process_number,
          } : r));

          // Disparar busca PJe em background (fire-and-forget via Vercel API)
          const processNumber = result.process_number || results.find(r => r.index === i)?.process_number;
          if (result.process_id && result.status !== 'duplicate' && processNumber) {
            fetch('/api/buscar-pje', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                process_id: result.process_id,
                process_number: processNumber,
              }),
            }).catch((err) => console.warn('buscar-pje bg error:', err));
          }
        } catch (err: any) {
          setResults(prev => prev.map(r => r.index === i ? {
            ...r, status: 'error', error: err.message,
          } : r));
        }

        processed++;
        setProcessedCount(processed);
      }

      setPhase('done');
      toast.success(`Importação concluída! ${successCount + 1} processos salvos.`);

    } catch (err: any) {
      toast.error(err.message || 'Erro na importação');
      setPhase('idle');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [user]);

  const reset = () => {
    setPhase('idle');
    setFileName('');
    setTotalRows(0);
    setResults([]);
    setProcessedCount(0);
    setRows([]);
    setHeaders([]);
    setColumnMapping({});
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importação em Lote</h1>
        <p className="text-muted-foreground mt-1">
          Importe centenas de processos de uma planilha. A IA mapeia as colunas automaticamente e analisa o risco de cada processo.
        </p>
      </div>

      {/* Upload Zone */}
      {phase === 'idle' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary hover:bg-accent/30 transition-all group"
        >
          <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground group-hover:text-primary transition-colors mb-4" />
          <p className="text-lg font-medium text-foreground">Arraste ou clique para selecionar</p>
          <p className="text-sm text-muted-foreground mt-1">Suporta .xlsx, .xls e .csv — qualquer estrutura de colunas</p>
          <Button className="mt-4" variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Selecionar Planilha
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileSelected}
          />
        </div>
      )}

      {/* How it works */}
      {phase === 'idle' && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Upload da planilha', desc: 'Excel ou CSV — qualquer formato da sua ferramenta de controle' },
            { step: '2', title: 'IA mapeia as colunas', desc: 'Claude identifica número do processo, partes, valores automaticamente' },
            { step: '3', title: 'Análise e salvamento', desc: 'Cada processo recebe análise de risco e entra na carteira' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="rounded-lg border border-border p-4 space-y-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">{step}</div>
              <p className="font-medium text-sm">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Progress */}
      {(phase === 'parsing' || phase === 'mapping' || phase === 'processing') && (
        <div className="rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium">
                {phase === 'parsing' && 'Lendo planilha...'}
                {phase === 'mapping' && 'IA mapeando colunas...'}
                {phase === 'processing' && `Analisando processos (${processedCount}/${totalRows})`}
              </p>
              <p className="text-sm text-muted-foreground">{fileName}</p>
            </div>
          </div>

          {phase === 'processing' && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{progress}%</p>
            </div>
          )}

          {/* Column mapping preview */}
          {phase !== 'parsing' && Object.keys(columnMapping).length > 0 && (
            <div className="rounded-lg bg-muted/40 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Mapeamento de colunas</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(columnMapping).filter(([, v]) => v !== 'IGNORAR').map(([orig, mapped]) => (
                  <div key={orig} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground truncate">{orig}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-foreground">{mapped}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results list */}
      {results.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="bg-muted/40 px-4 py-3 flex items-center justify-between border-b border-border">
            <p className="text-sm font-medium">Processos ({results.length})</p>
            {phase === 'done' && (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-green-600 font-medium">✓ {successCount} salvos</span>
                {dupCount > 0 && <span className="text-yellow-600">⚠ {dupCount} duplicados</span>}
                {errorCount > 0 && <span className="text-red-600">✗ {errorCount} erros</span>}
              </div>
            )}
          </div>
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {results.map(row => (
              <div key={row.index} className="flex items-center gap-3 px-4 py-3">
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {row.status === 'pending' && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
                  {row.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  {row.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {row.status === 'duplicate' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                  {row.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                </div>

                {/* Process info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{row.process_number}</p>
                  {row.status === 'error' && (
                    <p className="text-xs text-red-500 truncate">{row.error}</p>
                  )}
                  {row.status === 'duplicate' && (
                    <p className="text-xs text-yellow-600">Processo já existe na carteira</p>
                  )}
                </div>

                {/* Risk badge */}
                {row.risk_level && (
                  <Badge variant="outline" className={cn('text-xs capitalize flex-shrink-0', riskColors[row.risk_level])}>
                    {row.risk_level === 'alto' ? 'Alto Risco' : row.risk_level === 'medio' ? 'Médio Risco' : 'Baixo Risco'}
                  </Badge>
                )}

                {/* Link to process */}
                {row.process_id && row.status === 'success' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-shrink-0 h-7 px-2 text-xs"
                    onClick={() => navigate(`/processos/${row.process_id}`)}
                  >
                    Ver <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Done summary */}
      {phase === 'done' && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">Importação concluída!</p>
              <p className="text-sm text-green-700">
                {successCount} processo{successCount !== 1 ? 's' : ''} analisado{successCount !== 1 ? 's' : ''} e salvo{successCount !== 1 ? 's' : ''} na carteira.
                {dupCount > 0 && ` ${dupCount} já existiam.`}
                {errorCount > 0 && ` ${errorCount} com erro.`}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => navigate('/processos')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Ver carteira completa
            </Button>
            <Button variant="outline" onClick={reset}>
              <Upload className="h-4 w-4 mr-2" />
              Importar nova planilha
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
