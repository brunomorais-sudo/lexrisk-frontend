import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { FileArchive, FileText, Upload, Brain, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { ImportState, ImportPhase } from '@/hooks/useImportJob';

interface ImportDialogProps {
  state: ImportState;
  onClose: () => void;
  onRetry: () => void;
}

function getDescription(phase: ImportPhase) {
  switch (phase) {
    case 'uploading': return 'Enviando arquivo...';
    case 'extracting': return 'Extraindo texto do PDF...';
    case 'analyzing_chunks': return 'Analisando documentos com IA especialista...';
    case 'consolidating': return 'Consolidando análise final...';
    case 'completed': return 'Importação e análise concluídas!';
    case 'failed': return 'Erro na importação';
    default: return '';
  }
}

export default function ImportDialog({ state, onClose, onRetry }: ImportDialogProps) {
  const { phase, progress, fileName, chunksProcessed, totalChunks, extractionProgress, error, resultData } = state;
  const isProcessing = phase === 'uploading' || phase === 'extracting' || phase === 'analyzing_chunks' || phase === 'consolidating';

  return (
    <Dialog open={state.dialogOpen} onOpenChange={(open) => { if (!open && !isProcessing) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5 text-primary" />
            Importar Processo
          </DialogTitle>
          <DialogDescription>{getDescription(phase)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/50">
            {fileName.toLowerCase().endsWith('.pdf')
              ? <FileText className="h-8 w-8 text-muted-foreground" />
              : <FileArchive className="h-8 w-8 text-muted-foreground" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground">
                {fileName.toLowerCase().endsWith('.pdf') ? 'Arquivo PDF' : 'Arquivo ZIP'}
              </p>
            </div>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {phase === 'uploading' && (
                  <><Upload className="h-3 w-3 animate-pulse" /><span>Enviando arquivo...</span></>
                )}
                {phase === 'extracting' && extractionProgress && (
                  <><Brain className="h-3 w-3 animate-pulse text-primary" /><span>Extraindo texto: página {extractionProgress.currentPage} de {extractionProgress.totalPages}...</span></>
                )}
                {phase === 'analyzing_chunks' && totalChunks > 0 && (
                  <><Brain className="h-3 w-3 animate-pulse text-primary" /><span>Analisando bloco {chunksProcessed} de {totalChunks}...</span></>
                )}
                {phase === 'analyzing_chunks' && totalChunks === 0 && (
                  <><Brain className="h-3 w-3 animate-pulse text-primary" /><span>Preparando análise...</span></>
                )}
                {phase === 'consolidating' && (
                  <><Brain className="h-3 w-3 animate-pulse text-primary" /><span>Consolidando análise final com fundamentação jurídica...</span></>
                )}
              </div>
            </div>
          )}

          {phase === 'completed' && resultData && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Processo importado e analisado com sucesso!</span>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">{resultData.process_data?.process_number}</p>
                <p className="text-xs text-muted-foreground">
                  {resultData.process_data?.claimant_name} vs. {resultData.process_data?.defendant_name}
                </p>
                <p className="text-xs text-muted-foreground">{resultData.process_data?.subject_main}</p>
                {resultData.process_data?.risk_analysis && (
                  <div className="mt-2 border-t pt-2">
                    <p className="text-xs font-medium text-foreground">
                      Risco: <span className={`font-bold ${
                        resultData.process_data.risk_analysis.risk_level === 'alto' ? 'text-destructive'
                        : resultData.process_data.risk_analysis.risk_level === 'medio' ? 'text-yellow-600'
                        : 'text-green-600'
                      }`}>
                        {resultData.process_data.risk_analysis.risk_level?.toUpperCase()}
                      </span>
                      {resultData.process_data.risk_analysis.risk_score && ` (${resultData.process_data.risk_analysis.risk_score}/100)`}
                    </p>
                  </div>
                )}
                {resultData.process_data?.executive_summary && (
                  <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                    {resultData.process_data.executive_summary.slice(0, 300)}...
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>{resultData.files_count} arquivo(s) analisado(s)</span>
              </div>
            </div>
          )}

          {phase === 'failed' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Erro na importação</span>
              </div>
              <p className="text-xs text-muted-foreground">{error}</p>
              {error?.includes('Créditos') && (
                <p className="text-xs text-muted-foreground bg-muted rounded-md p-2">
                  💡 Seus créditos de IA acabaram. Adicione mais créditos em <strong>Settings → Workspace → Usage</strong> no painel do Lovable.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            {(phase === 'completed' || phase === 'failed') && (
              <Button variant="outline" onClick={onClose}>Fechar</Button>
            )}
            {phase === 'failed' && (
              <Button onClick={onRetry}>Tentar Novamente</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
