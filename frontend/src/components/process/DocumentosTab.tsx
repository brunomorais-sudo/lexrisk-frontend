import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Trash2, Loader2, Brain, FileSearch, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProcessDocumentos, ProcessDocumento } from '@/hooks/useProcessDocumentos';

interface Props {
  processId: string;
  processNumber: string;
  onDocumentosChange?: (textos: string[]) => void;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentoCard({
  doc,
  onDelete,
  onAnalyze,
}: {
  doc: ProcessDocumento;
  onDelete: (id: string) => void;
  onAnalyze: (doc: ProcessDocumento) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(doc.id);
    setDeleting(false);
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{doc.file_name || 'Documento'}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{formatBytes(doc.file_size)}</span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-xs text-muted-foreground">
                {new Date(doc.created_at).toLocaleDateString('pt-BR')}
              </span>
              {doc.extracted_text ? (
                <Badge variant="secondary" className="text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Texto extraído
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  Sem texto
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {doc.extracted_text && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              onClick={() => onAnalyze(doc)}
            >
              <Brain className="h-3.5 w-3.5" />
              Analisar com IA
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {doc.extracted_text && (
        <div className="mt-3 rounded-lg bg-muted p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <FileSearch className="h-3.5 w-3.5" /> Texto extraído ({doc.extracted_text.length.toLocaleString('pt-BR')} caracteres)
          </p>
          <p className="text-xs text-foreground/70 line-clamp-4 whitespace-pre-wrap">
            {doc.extracted_text.substring(0, 500)}{doc.extracted_text.length > 500 ? '...' : ''}
          </p>
        </div>
      )}
    </div>
  );
}

export function DocumentosTab({ processId, processNumber, onDocumentosChange }: Props) {
  const { documentos, loading, uploading, error, uploadDocumento, deletarDocumento } = useProcessDocumentos(processId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [analyzingDoc, setAnalyzingDoc] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    for (const file of Array.from(files)) {
      if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|docx|txt)$/i)) {
        toast.error(`Formato não suportado: ${file.name}. Use PDF, DOCX ou TXT.`);
        continue;
      }
      await uploadDocumento(file);
      toast.success(`${file.name} importado com sucesso!`);

      // Notifica parent com os textos disponíveis
      if (onDocumentosChange) {
        const textos = documentos
          .filter(d => d.extracted_text)
          .map(d => `[${d.file_name}]\n${d.extracted_text}`);
        onDocumentosChange(textos);
      }
    }
  };

  const handleAnalyze = (doc: ProcessDocumento) => {
    if (!doc.extracted_text) return;
    setAnalyzingDoc(doc.id);
    // Abre aba de análise jurídica com contexto do documento
    toast.info(`Contexto do documento "${doc.file_name}" adicionado à análise. Acesse a aba "Análise Jurídica" e clique em "Analisar com IA".`);
    setTimeout(() => setAnalyzingDoc(null), 2000);
  };

  const handleDelete = async (id: string) => {
    await deletarDocumento(id);
    toast.success('Documento removido');
  };

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        className={`rounded-xl border-2 border-dashed transition-colors p-8 text-center cursor-pointer ${
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Enviando e extraindo texto...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground">PDF, DOCX ou TXT • máximo 20 MB por arquivo</p>
            <Button size="sm" variant="outline" className="mt-2 gap-2" onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>
              <Upload className="h-4 w-4" />
              Importar Documentos
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Lista de documentos */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">
            Documentos Importados
            {documentos.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{documentos.length}</Badge>
            )}
          </h3>
          {documentos.some(d => d.extracted_text) && (
            <Badge variant="outline" className="text-xs gap-1 text-emerald-600 border-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              {documentos.filter(d => d.extracted_text).length} com texto extraído
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">Carregando documentos...</p>
          </div>
        ) : documentos.length === 0 ? (
          <div className="py-8 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">Nenhum documento importado ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Importe petições, contestações, laudos ou qualquer documento do processo.
              A IA extrairá o texto automaticamente para uso nas análises.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documentos.map(doc => (
              <DocumentoCard
                key={doc.id}
                doc={doc}
                onDelete={handleDelete}
                onAnalyze={handleAnalyze}
              />
            ))}
          </div>
        )}
      </div>

      {documentos.some(d => d.extracted_text) && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex items-start gap-2">
          <Brain className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            Os textos extraídos são automaticamente incluídos no contexto das análises de IA deste processo —
            Chat IA, Análise Jurídica e Análise de Risco já utilizam esses documentos.
          </span>
        </div>
      )}
    </div>
  );
}
