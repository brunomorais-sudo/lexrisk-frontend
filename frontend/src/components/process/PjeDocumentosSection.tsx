import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, RefreshCw, Loader2, AlertCircle, Settings, Info, FileSearch } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { usePjeDocumentos } from "@/hooks/usePjeDocumentos";
import type { PjeDocumento } from "@/hooks/usePjeDocumentos";

interface Props { processId: string; processNumber: string; tribunal: string; }

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatData(value: string | null): string {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString("pt-BR"); } catch { return value; }
}

function TipoBadge({ tipo }: { tipo: string }) {
  const t = tipo.toLowerCase();
  if (t.includes("inicial") || t.includes("petição")) return <Badge variant="default" className="text-xs">{tipo}</Badge>;
  if (t.includes("sentença") || t.includes("acordão") || t.includes("acórdão")) return <Badge variant="destructive" className="text-xs">{tipo}</Badge>;
  if (t.includes("certidão") || t.includes("ofício")) return <Badge variant="secondary" className="text-xs">{tipo}</Badge>;
  return <Badge variant="outline" className="text-xs">{tipo || "Documento"}</Badge>;
}

function DocumentoRow({ doc }: { doc: PjeDocumento }) {
  const handleDownload = () => {
    if (doc.storage_path) { window.open(doc.storage_path, "_blank", "noopener,noreferrer"); }
    else { toast.info("Link de download não disponível para este documento"); }
  };
  return (
    <TableRow>
      <TableCell className="font-medium text-sm max-w-[260px] truncate" title={doc.titulo}>
        <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground shrink-0" /><span className="truncate">{doc.titulo || "Sem título"}</span></div>
      </TableCell>
      <TableCell><TipoBadge tipo={doc.tipo} /></TableCell>
      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatData(doc.data_juntada)}</TableCell>
      <TableCell className="text-sm text-muted-foreground text-right whitespace-nowrap">{formatBytes(doc.tamanho_bytes)}</TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleDownload} title={doc.storage_path ? "Baixar documento" : "Download indisponível"} disabled={!doc.storage_path}>
          <Download className="h-4 w-4" /><span className="sr-only">Baixar</span>
        </Button>
      </TableCell>
    </TableRow>
  );
}

interface SectionHeaderProps { tribunal: string; total: number; onBuscar: () => void; isLoading: boolean; hasFetched: boolean; }

function SectionHeader({ tribunal, total, onBuscar, isLoading, hasFetched }: SectionHeaderProps) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="section-title mb-1">Peças Processuais — PJe</h3>
          <p className="text-sm text-muted-foreground">Documentos juntados ao processo no <strong>{tribunal.toUpperCase()}</strong> via API REST do PJe.</p>
          {hasFetched && total > 0 && (<p className="text-xs text-muted-foreground mt-1">{total} documento{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}</p>)}
        </div>
        <Button onClick={onBuscar} disabled={isLoading} variant="outline" className="gap-2 shrink-0">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isLoading ? "Buscando…" : "Buscar Peças"}
        </Button>
      </div>
    </div>
  );
}

export function PjeDocumentosSection({ processId, processNumber, tribunal }: Props) {
  const { documentos, isLoading, status, error, apiMessage, buscarDocumentos, carregarDocumentosSalvos } = usePjeDocumentos();
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    carregarDocumentosSalvos(processId).then((docs) => { if (docs.length > 0) setHasFetched(true); });
  }, [processId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBuscar = async () => {
    if (!tribunal) { toast.error("Tribunal não identificado para este processo"); return; }
    await buscarDocumentos(processId, processNumber, tribunal);
    setHasFetched(true);
  };

  if (status === "unauthorized" && !hasFetched) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <Settings className="h-12 w-12 text-muted-foreground/30" />
          <div><CardTitle className="text-base mb-1">Credenciais PDPJ não configuradas</CardTitle><CardDescription className="max-w-sm">Para buscar as peças processuais diretamente do PJe, configure seu login PDPJ nas Configurações.</CardDescription></div>
          <Button asChild variant="outline" size="sm" className="gap-2"><Link to="/configuracoes"><Settings className="h-4 w-4" />Ir para Configurações</Link></Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "api_not_available") {
    return (
      <div className="space-y-4">
        <SectionHeader tribunal={tribunal} total={0} onBuscar={handleBuscar} isLoading={isLoading} hasFetched={hasFetched} />
        <Alert><Info className="h-4 w-4" /><AlertDescription className="text-sm">{apiMessage ?? "A API REST do PJe não está disponível para este tribunal no momento."}</AlertDescription></Alert>
      </div>
    );
  }

  if (status === "error" && error) {
    return (
      <div className="space-y-4">
        <SectionHeader tribunal={tribunal} total={documentos.length} onBuscar={handleBuscar} isLoading={isLoading} hasFetched={hasFetched} />
        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">{error}</AlertDescription></Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader tribunal={tribunal} total={documentos.length} onBuscar={handleBuscar} isLoading={isLoading} hasFetched={hasFetched} />
      {isLoading && (<Card><CardContent className="flex items-center justify-center gap-3 py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" /><p className="text-sm text-muted-foreground">Buscando peças no PJe…</p></CardContent></Card>)}
      {!isLoading && !hasFetched && documentos.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <FileSearch className="h-12 w-12 text-muted-foreground/30" />
            <div><p className="text-sm font-medium text-muted-foreground">Nenhuma peça carregada ainda</p><p className="text-xs text-muted-foreground mt-1">Clique em "Buscar Peças" para consultar o PJe do tribunal <strong>{tribunal.toUpperCase()}</strong>.</p></div>
          </CardContent>
        </Card>
      )}
      {!isLoading && hasFetched && documentos.length === 0 && status === "success" && (
        <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center"><FileText className="h-10 w-10 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">Nenhum documento encontrado para este processo no PJe.</p></CardContent></Card>
      )}
      {!isLoading && documentos.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Tipo</TableHead><TableHead>Data Juntada</TableHead><TableHead className="text-right">Tamanho</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader>
            <TableBody>{documentos.map((doc, idx) => <DocumentoRow key={doc.id ?? `${doc.document_id}-${idx}`} doc={doc} />)}</TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
