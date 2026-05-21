import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProcessById, getAnalysisForProcess, getDocumentsForProcess, getEventsForProcess, getEvidenceForProcess, getChatThreadsForProcess, getGeneratedDocsForProcess } from '@/data/mock-data';
import { RiskBadge, ConfidenceBadge, PhaseBadge } from '@/components/badges/RiskBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, FileText, Scale, Brain, MessageSquare, Clock, Shield, DollarSign, History, ThumbsUp, ThumbsDown, Minus, Send, Download, AlertTriangle, CheckCircle2, ChevronRight, Calculator, CalendarIcon, Pencil } from 'lucide-react';
import { FinancialImpactTab } from '@/components/process/FinancialImpactTab';
import { FinancialPlanningTab } from '@/components/process/FinancialPlanningTab';
import { ClientExecutiveSummary } from '@/components/process/ClientExecutiveSummary';
import { DataJudTab } from '@/components/process/DataJudTab';
import { PjeTab } from '@/components/process/PjeTab';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '@/types';
import { fetchProcessById } from '@/lib/persist-process';
import { supabase } from '@/integrations/supabase/client';
import { registrarEvento, registrarFeedbackDoc } from '@/lib/memoria';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAnalisarRisco } from '@/hooks/useAnalisarRisco';
import { useAnalisarJuridico } from '@/hooks/useAnalisarJuridico';
import { DocumentosTab } from '@/components/process/DocumentosTab';
import { useProcessDocumentos } from '@/hooks/useProcessDocumentos';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

export default function ProcessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const isClient = role === 'client_user';

  const mockProcess = getProcessById(id || '');
  const mockAnalysis = getAnalysisForProcess(id || '');
  const documents = getDocumentsForProcess(id || '');
  const events = getEventsForProcess(id || '');
  const mockEvidence = getEvidenceForProcess(id || '');
  const chatThreads = getChatThreadsForProcess(id || '');
  const generatedDocs = getGeneratedDocsForProcess(id || '');

  const [dbProcess, setDbProcess] = useState<any>(null);
  const [dbEvidence, setDbEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(!mockProcess);

  // If not found in mock data, try DB
  useEffect(() => {
    if (!mockProcess && id) {
      setLoading(true);
      fetchProcessById(id)
        .then(p => setDbProcess(p))
        .finally(() => setLoading(false));

      (supabase.from('evidence' as any).select('*').eq('process_id', id) as any)
        .then(({ data }: any) => {
          if (data) {
            // Normaliza para o mesmo shape usado pelo mock (title, favors_side, description)
            const mapped = data.map((e: any, idx: number) => ({
              id: e.id || `db-evi-${idx}`,
              process_id: e.process_id || id,
              title: e.title || 'Prova',
              evidence_type: e.evidence_type || 'Documental',
              description: e.description || '',
              favors_side: e.favors_side === 'reclamada' ? 'reclamada' : 'neutro',
              source_document_id: e.source_document_id,
              excerpt: e.excerpt || '',
              relevance_score: e.relevance_score ?? 5,
              created_at: e.created_at || new Date().toISOString(),
            }));
            setDbEvidence(mapped);
          }
        });
    }
  }, [id, mockProcess]);

  const process = mockProcess || dbProcess;
  const analysis = mockAnalysis || dbProcess?.latest_analysis || null;

  // Evidence: mock data if available; otherwise prefer DB-stored evidence,
  // falling back to evidence derived from analysis arguments.
  // IMPORTANTE: a plataforma defende exclusivamente a reclamada. Provas marcadas
  // originalmente como "favorece reclamante" (mock antigo) são reclassificadas como
  // 'neutro' (risco a mitigar), pois nunca representamos o polo ativo.
  const normalizeForReclamada = (arr: any[]) =>
    (arr || []).map((e: any) => ({
      ...e,
      favors_side: e.favors_side === 'reclamada' ? 'reclamada' : 'neutro',
    }));

  const evidence = mockProcess
    ? normalizeForReclamada(mockEvidence)
    : dbEvidence.length > 0
      ? dbEvidence
      : (() => {
          if (!analysis) return [];
          // A plataforma defende exclusivamente a reclamada. Pros = provas que fortalecem a defesa.
          // Cons = vulnerabilidades/riscos da defesa (NUNCA mapear como "favorece reclamante",
          // pois não representamos esse polo). Mapeamos como 'neutro' (risco a mitigar).
          const fromArgs = (arr: any[], kind: 'pro' | 'con') =>
            (arr || [])
              .filter((a: any) => a.evidence_basis && a.evidence_basis.trim())
              .map((a: any, idx: number) => ({
                id: `${kind}-evi-${a.id || idx}`,
                process_id: process?.id || '',
                title: a.title || 'Prova',
                evidence_type: a.category || 'Documental',
                description: a.evidence_basis,
                favors_side: 'reclamada' as any,
                excerpt: a.description || '',
                relevance_score: a.weight || 5,
                created_at: a.created_at || new Date().toISOString(),
              }));
          return [...fromArgs(analysis.pros, 'pro'), ...fromArgs(analysis.cons, 'con')];
        })();

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(chatThreads[0]?.messages || []);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [localGeneratedDocs, setLocalGeneratedDocs] = useState(generatedDocs);
  const riskAI = useAnalisarRisco();
  const legalAI = useAnalisarJuridico();
  const processDocumentos = useProcessDocumentos(id || '');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Rede Neural: registra visualização de processo analisado
  useEffect(() => {
    if (process && analysis) {
      registrarEvento('processo_analisado', {
        process_id: process.id,
        tribunal: process.tribunal,
        fase: process.phase,
        score_risco: analysis.risk_score_numeric,
        risk_level: analysis.risk_level,
      });
    }
  }, [process?.id, analysis?.id]);

  const buildProcessContext = () => {
    const parts: string[] = [];
    parts.push(`Processo: ${process.process_number}`);
    parts.push(`Reclamante: ${process.claimant_name} | Reclamada: ${process.defendant_name}`);
    parts.push(`Fase: ${process.phase} | Tribunal: ${process.tribunal} | Vara: ${process.vara}`);
    parts.push(`Tema: ${process.subject_main} | Valor da causa: R$ ${process.claim_value?.toLocaleString('pt-BR')}`);
    if (analysis) {
      parts.push(`\nRESUMO EXECUTIVO: ${analysis.executive_summary}`);
      parts.push(`RISCO: ${analysis.risk_level} (${analysis.risk_score_numeric}/100) | Confiança: ${analysis.confidence_level}`);
      parts.push(`JUSTIFICATIVA: ${analysis.justification_text}`);
      parts.push(`IMPACTO FINANCEIRO: ${analysis.financial_impact_summary}`);
      if (analysis.pros?.length) {
        parts.push(`\nPRÓS DO CASO:`);
        analysis.pros.forEach(p => parts.push(`- ${p.title}: ${p.description} (Base legal: ${p.legal_basis})`));
      }
      if (analysis.cons?.length) {
        parts.push(`\nCONTRAS DO CASO:`);
        analysis.cons.forEach(c => parts.push(`- ${c.title}: ${c.description} (Base legal: ${c.legal_basis})`));
      }
      if (analysis.next_steps?.length) {
        parts.push(`\nPRÓXIMOS PASSOS: ${analysis.next_steps.join('; ')}`);
      }
    }
    if (evidence.length) {
      parts.push(`\nPROVAS MAPEADAS:`);
      evidence.forEach(e => parts.push(`- ${e.title} (favorece: ${e.favors_side}) - ${e.description}`));
    }
    if (documents.length) {
      parts.push(`\nDOCUMENTOS: ${documents.map(d => `${d.title} (${d.document_type})`).join(', ')}`);
    }
    // Inclui textos extraídos dos documentos importados pelo usuário
    const docsComTexto = processDocumentos.documentos.filter(d => d.extracted_text);
    if (docsComTexto.length > 0) {
      parts.push(`\n\nDOCUMENTOS IMPORTADOS (${docsComTexto.length} arquivo(s)):`);
      docsComTexto.forEach(d => {
        parts.push(`\n--- ${d.file_name} ---`);
        parts.push(d.extracted_text!.substring(0, 8000)); // limita por doc para não estourar contexto
      });
    }
    return parts.join('\n');
  };

  const getPedidos = () => {
    const fromTags = process.subject_tags?.map((tag: string) => tag.replace(/_/g, ' ')) || [];
    const fromAnalysis = [
      ...(analysis?.cons || []).map((item) => item.title),
      ...(analysis?.pros || []).map((item) => item.title),
    ];
    return Array.from(new Set([...fromTags, ...fromAnalysis].filter(Boolean)));
  };

  const handleAnalisarRisco = async () => {
    try {
      await riskAI.analisar({
        valor_causa: process.claim_value,
        data_ajuizamento: (process as { distribution_date?: string; created_at?: string }).distribution_date || process.created_at?.slice(0, 10),
        pedidos: getPedidos(),
        valor_provisionado: process.estimated_financial_exposure_base || process.claim_value,
      });
      toast.success('Análise de risco concluída');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao analisar risco com IA');
    }
  };

  const handleAnalisarJuridico = async () => {
    try {
      await legalAI.analisar({
        cargo: process.subject_main,
        data_admissao: '',
        salario_base: undefined,
        regime_trabalho: process.phase,
        jornada_contratual: '',
        pedidos: getPedidos(),
        descricao_fatos: [
          buildProcessContext(),
          ...documents.map((doc) => `${doc.title}: ${doc.extracted_text || ''}`),
        ].join('\n\n'),
      });
      toast.success('Análise jurídica concluída');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao analisar juridicamente com IA');
    }
  };

  const DOC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerar-documento`;
  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-especialista`;

  const handleGenerateDoc = async (type: string, label: string) => {
    setGeneratingDoc(type);
    setGeneratedContent('');
    try {
      const resp = await fetch(DOC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ type, processContext: buildProcessContext() }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        toast.error(err.error || 'Erro ao gerar documento');
        setGeneratingDoc(null);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) { toast.error('Erro de streaming'); setGeneratingDoc(null); return; }

      const decoder = new TextDecoder();
      let fullContent = '';
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              setGeneratedContent(fullContent);
            }
          } catch { /* partial json */ }
        }
      }

      // Save to local state
      const newDoc = {
        id: `gen-${Date.now()}`,
        process_id: id || '',
        type: type as any,
        title: `${label} - ${new Date().toLocaleDateString('pt-BR')}`,
        content: fullContent,
        generated_by: 'ai',
        created_at: new Date().toISOString(),
      };
      setLocalGeneratedDocs(prev => [newDoc, ...prev]);
      setGeneratedContent('');
      toast.success(`${label} gerado com sucesso!`);
    } catch (e) {
      console.error('Doc generation error:', e);
      toast.error('Erro ao gerar documento');
    } finally {
      setGeneratingDoc(null);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { id: `msg-${Date.now()}`, thread_id: 'thread-new', role: 'user', content: chatInput, created_at: new Date().toISOString() };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);

    const apiMessages = updatedMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          processContext: buildProcessContext(),
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error('Stream não disponível');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const finalContent = assistantContent;
              setChatMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && last.thread_id === 'thread-streaming') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: finalContent } : m);
                }
                return [...prev, { id: `msg-ai-${Date.now()}`, thread_id: 'thread-streaming', role: 'assistant', content: finalContent, created_at: new Date().toISOString() }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      const message = err instanceof Error ? err.message : 'Erro ao se comunicar com a IA';
      toast.error(message);
      setChatMessages(prev => [...prev, {
        id: `msg-err-${Date.now()}`, thread_id: 'thread-new', role: 'assistant',
        content: `⚠️ Erro: ${message || 'Não foi possível obter resposta da IA.'}`,
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">Carregando processo...</div>;
  }

  if (!process) {
    return <div className="py-20 text-center text-muted-foreground">Processo não encontrado.</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/processos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar aos processos
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="page-header font-mono text-xl">{process.process_number}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {process.claimant_name} <span className="text-muted-foreground/50">vs.</span> {process.defendant_name}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <PhaseBadge phase={process.phase} />
              <Badge variant="outline" className="text-xs">{process.tribunal} • {process.vara}</Badge>
              {analysis && <RiskBadge level={analysis.risk_level} score={analysis.risk_score_numeric} />}
              {analysis && <ConfidenceBadge level={analysis.confidence_level} />}
            </div>
          </div>
          <div className="flex gap-2">
            {!isClient && <Button variant="outline" size="sm" className="gap-2"><Brain className="h-4 w-4" /> Rodar Análise IA</Button>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={isClient ? 'resumo-cliente' : 'visao-geral'} className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1 bg-muted p-1">
          {isClient && <TabsTrigger value="resumo-cliente" className="text-xs">Resumo Executivo</TabsTrigger>}
          <TabsTrigger value="visao-geral" className="text-xs">Visão Geral</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs">Linha do Tempo</TabsTrigger>
          <TabsTrigger value="documentos" className="text-xs">Documentos</TabsTrigger>
          <TabsTrigger value="provas" className="text-xs">Provas</TabsTrigger>
          <TabsTrigger value="pros-contras" className="text-xs">Prós e Contras</TabsTrigger>
          <TabsTrigger value="jurisprudencia" className="text-xs">Análise Jurídica</TabsTrigger>
          <TabsTrigger value="score" className="text-xs">Análise de Risco</TabsTrigger>
          <TabsTrigger value="financeiro" className="text-xs">Impacto Financeiro</TabsTrigger>
          <TabsTrigger value="planejamento" className="text-xs">Planejamento Financeiro</TabsTrigger>
          <TabsTrigger value="chat" className="text-xs">Chat IA</TabsTrigger>
          <TabsTrigger value="documentos-gerados" className="text-xs">Gerar Documentos</TabsTrigger>
          <TabsTrigger value="pje" className="text-xs">PJe / Andamentos</TabsTrigger>
          {!isClient && <TabsTrigger value="auditoria" className="text-xs">Auditoria</TabsTrigger>}
        </TabsList>

        {/* TAB: Resumo Executivo (cliente) */}
        {isClient && (
          <TabsContent value="resumo-cliente">
            <ClientExecutiveSummary process={process} analysis={analysis} />
          </TabsContent>
        )}

        {/* TAB: Visão Geral */}
        <TabsContent value="visao-geral">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5">
                <h3 className="section-title mb-3">Resumo Executivo</h3>
                <p className="prose-legal">{analysis?.executive_summary || 'Análise ainda não realizada. Clique em "Rodar Análise IA" para gerar.'}</p>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <h3 className="section-title mb-3">Dados do Processo</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-muted-foreground">Empresa</dt><dd className="font-medium">{process.client_company?.trade_name}</dd></div>
                  <div><dt className="text-muted-foreground">Tema Principal</dt><dd className="font-medium">{process.subject_main}</dd></div>
                  <div><dt className="text-muted-foreground">Polo</dt><dd className="font-medium">{process.procedural_pole === 'reu' ? 'Réu' : 'Autor'}</dd></div>
                  <div><dt className="text-muted-foreground">Status</dt><dd className="font-medium">{process.current_status}</dd></div>
                  <div>
                    <dt className="text-muted-foreground">Data de Distribuição</dt>
                    <dd className="font-medium flex items-center gap-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className={cn("h-auto p-1 gap-1 text-sm font-medium", !process.distribution_date && "text-muted-foreground")}>
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {process.distribution_date
                              ? format(new Date(process.distribution_date + 'T00:00:00'), "dd/MM/yyyy")
                              : 'Selecionar data'}
                            <Pencil className="h-3 w-3 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={process.distribution_date ? new Date(process.distribution_date + 'T00:00:00') : undefined}
                            onSelect={async (date) => {
                              if (!date || !id) return;
                              const dateStr = format(date, 'yyyy-MM-dd');
                              // Update in DB if it's a DB process
                              const { error } = await supabase
                                .from('processes')
                                .update({ distribution_date: dateStr })
                                .eq('id', id);
                              if (error) {
                                toast.error('Erro ao salvar data de distribuição');
                                console.error(error);
                                return;
                              }
                              // Update local state
                              if (dbProcess) {
                                setDbProcess({ ...dbProcess, distribution_date: dateStr });
                              }
                              toast.success('Data de distribuição atualizada');
                            }}
                            locale={ptBR}
                            disabled={(date) => date > new Date()}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5">
                <h3 className="section-title mb-3">Valor e Exposição</h3>
                <div className="text-3xl font-bold text-foreground">{formatCurrency(process.claim_value)}</div>
                <p className="text-sm text-muted-foreground mt-1">Valor da causa</p>
                {process.estimated_financial_exposure_base && (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-risk-low-bg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Mínima</p>
                      <p className="font-semibold text-sm">{formatCurrency(process.estimated_financial_exposure_min || 0)}</p>
                    </div>
                    <div className="rounded-lg bg-risk-medium-bg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Base</p>
                      <p className="font-semibold text-sm">{formatCurrency(process.estimated_financial_exposure_base)}</p>
                    </div>
                    <div className="rounded-lg bg-risk-high-bg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Máxima</p>
                      <p className="font-semibold text-sm">{formatCurrency(process.estimated_financial_exposure_max || 0)}</p>
                    </div>
                  </div>
                )}
              </div>
              {analysis && (
                <div className="rounded-xl border bg-card p-5">
                  <h3 className="section-title mb-3">Próximos Passos</h3>
                  <ul className="space-y-2">
                    {analysis.next_steps.map((step, i) => (
                      <li key={i} className="flex gap-2 text-sm"><ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB: Timeline */}
        <TabsContent value="timeline" className="space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="section-title mb-4">Linha do Tempo Processual</h3>
            {events.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p> : (
              <div className="relative space-y-0">
                {events.map((evt, i) => (
                  <div key={evt.id} className="flex gap-4 pb-6 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Clock className="h-4 w-4" /></div>
                      {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{evt.event_type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(evt.event_date).toLocaleDateString('pt-BR')}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{evt.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Andamentos PJe (DataJud CNJ) inline na Linha do Tempo */}
          {process.id && !mockProcess ? (
            <PjeTab processId={process.id} processNumber={process.process_number} />
          ) : (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="section-title mb-1">Consulta DataJud (CNJ)</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Importe andamentos oficiais diretamente da API pública do CNJ.
              </p>
              <DataJudTab initialNumber={process.process_number} />
            </div>
          )}
        </TabsContent>

        {/* TAB: Documentos */}
        <TabsContent value="documentos">
          {process.id && !mockProcess ? (
            <DocumentosTab
              processId={process.id}
              processNumber={process.process_number}
            />
          ) : (
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-title">Documentos do Processo</h3>
              </div>
              {documents.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum documento.</p> : (
                <div className="space-y-3">
                  {documents.map(doc => (
                    <div key={doc.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{doc.document_type.replace(/_/g, ' ')} • {doc.mime_type}</p>
                        </div>
                        <Button size="sm" variant="ghost"><Download className="h-4 w-4" /></Button>
                      </div>
                      {doc.extracted_text && (
                        <div className="mt-3 rounded-lg bg-muted p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Texto extraído:</p>
                          <p className="text-xs text-foreground/80 line-clamp-4">{doc.extracted_text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* TAB: Provas */}
        <TabsContent value="provas">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="section-title mb-4">Provas Mapeadas</h3>
            {evidence.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma prova mapeada.</p> : (
              <div className="space-y-3">
                {evidence.map(evi => (
                  <div key={evi.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{evi.title}</p>
                          <Badge variant="outline" className={
                            evi.favors_side === 'reclamada' ? 'risk-badge-low text-xs border-0' :
                            'risk-badge-medium text-xs border-0'
                          }>
                            {evi.favors_side === 'reclamada' ? '✓ Favorece a defesa' : '⚠ Risco a mitigar'}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{evi.description}</p>
                        {evi.excerpt && <p className="mt-2 text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-3">"{evi.excerpt}"</p>}
                      </div>
                      <div className="ml-4 text-center">
                        <p className="text-xs text-muted-foreground">Relevância</p>
                        <p className="text-lg font-bold text-foreground">{evi.relevance_score}/10</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB: Prós e Contras - OBRIGATÓRIO ANTES DO SCORE */}
        <TabsContent value="pros-contras">
          {!analysis ? (
            <div className="rounded-xl border bg-card p-8 text-center">
              <Brain className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 text-muted-foreground">Análise ainda não realizada.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* PRÓS */}
              <div>
                <h3 className="flex items-center gap-2 section-title mb-4"><ThumbsUp className="h-5 w-5 text-risk-low" /> Prós do Caso (Defesa)</h3>
                <div className="space-y-3">
                  {(analysis.pros || []).map((pro, i) => (
                    <motion.div key={pro.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
                      className="rounded-lg border border-risk-low/20 bg-risk-low-bg/30 p-4">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-semibold text-foreground">{pro.title}</p>
                        <Badge variant="outline" className="text-xs">{pro.category}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{pro.description}</p>
                      {pro.legal_basis && <p className="mt-2 text-xs text-primary"><strong>Fundamento:</strong> {pro.legal_basis}</p>}
                      {pro.evidence_basis && <p className="mt-1 text-xs text-muted-foreground"><strong>Base probatória:</strong> {pro.evidence_basis}</p>}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Peso: {pro.weight}/10</span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-risk-low" style={{ width: `${pro.weight * 10}%` }} /></div>
                      </div>
                    </motion.div>
                  ))}
                  {(analysis.pros || []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum pró identificado.</p>}
                </div>
              </div>
              {/* CONTRAS */}
              <div>
                <h3 className="flex items-center gap-2 section-title mb-4"><ThumbsDown className="h-5 w-5 text-risk-high" /> Contras do Caso</h3>
                <div className="space-y-3">
                  {(analysis.cons || []).map((con, i) => (
                    <motion.div key={con.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
                      className="rounded-lg border border-risk-high/20 bg-risk-high-bg/30 p-4">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-semibold text-foreground">{con.title}</p>
                        <Badge variant="outline" className="text-xs">{con.category}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{con.description}</p>
                      {con.legal_basis && <p className="mt-2 text-xs text-destructive"><strong>Fundamento:</strong> {con.legal_basis}</p>}
                      {con.evidence_basis && <p className="mt-1 text-xs text-muted-foreground"><strong>Base probatória:</strong> {con.evidence_basis}</p>}
                      {con.source_excerpt && <p className="mt-1 text-xs italic text-muted-foreground border-l-2 border-destructive/30 pl-3">"{con.source_excerpt}"</p>}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Peso: {con.weight}/10</span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-risk-high" style={{ width: `${con.weight * 10}%` }} /></div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Relevância: {con.relevance_score}/10</span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-risk-high" style={{ width: `${con.relevance_score * 10}%` }} /></div>
                      </div>
                    </motion.div>
                  ))}
                  {(analysis.cons || []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum contra identificado.</p>}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

             </motion.div>
                  ))}
                  {(analysis.cons || []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum contra identificado.</p>}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB: Jurisprudência */}
        <TabsContent value="jurisprudencia">
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="section-title">Análise Jurídica com IA</h3>
                  <p className="text-sm text-muted-foreground">Parecer com fundamentação CLT/TST/OJ-SDI1 e tese de defesa.</p>
                </div>
                <Button onClick={handleAnalisarJuridico} disabled={legalAI.loading} className="gap-2">
                  {legalAI.loading ? <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Scale className="h-4 w-4" />}
                  {legalAI.loading ? 'Analisando...' : 'Analisar com IA'}
                </Button>
              </div>
              {legalAI.error && <p className="mt-3 text-sm text-destructive">{legalAI.error}</p>}
              {legalAI.data && (
                <div className="mt-5 space-y-4">
                  <p className="text-sm text-muted-foreground">{legalAI.data.resumoProcesso}</p>
                  <div className="space-y-3">
                    {legalAI.data.pedidos.map((pedido, i) => (
                      <div key={`${pedido.descricao}-${i}`} className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{pedido.descricao}</p>
                          <Badge variant="outline">{pedido.probabilidade}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground"><strong>Fundamentação:</strong> {pedido.fundamentacao}</p>
                        <p className="mt-2 text-sm text-muted-foreground"><strong>Tese de defesa:</strong> {pedido.estrategiaDefesa}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                    <p><strong className="text-foreground">Estratégia geral:</strong> {legalAI.data.estrategiaGeral}</p>
                    <p className="mt-2"><strong className="text-foreground">Recomendação:</strong> {legalAI.data.recomendacao}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-title">Jurisprudência Relacionada</h3>
                <Badge variant="secondary" className="text-xs">Modo Demo</Badge>
              </div>
              {analysis?.jurisprudence && analysis.jurisprudence.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
                  {analysis.jurisprudence.map(j => (
                    <div key={j.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-xs font-mono text-muted-foreground">{j.case_number}</p>
                          <p className="text-sm font-semibold text-foreground mt-1">{j.court} • {j.chamber}</p>
                          <p className="text-xs text-muted-foreground">{j.judge_rapporteur} • {new Date(j.judgment_date).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <Badge variant="outline" className={
                          j.tendency_for_case === 'favoravel' ? 'risk-badge-low text-xs border-0' :
                          j.tendency_for_case === 'desfavoravel' ? 'risk-badge-high text-xs border-0' :
                          'text-xs'
                        }>
                          {j.tendency_for_case === 'favoravel' ? 'Favorável' : j.tendency_for_case === 'desfavoravel' ? 'Desfavorável' : 'Neutro'}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{j.summary}</p>
                      <p className="mt-1 text-xs text-primary">{j.similarity_reason}</p>
                      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                        <span>Similaridade: {Math.round(j.similarity_score * 100)}%</span>
                        <span>Recência: {Math.round(j.recency_score * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">Nenhuma jurisprudência disponível.</p>}
            </div>
          </div>
        </TabsContent>

        {/* TAB: Score de Risco */}
        <TabsContent value="score">
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="section-title">Análise de Risco com IA</h3>
                  <p className="text-sm text-muted-foreground">Score financeiro, SELIC e projeção de 12 meses.</p>
                </div>
                <Button onClick={handleAnalisarRisco} disabled={riskAI.loading} className="gap-2">
                  {riskAI.loading ? <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Brain className="h-4 w-4" />}
                  {riskAI.loading ? 'Analisando...' : 'Analisar com IA'}
                </Button>
              </div>
              {riskAI.error && <p className="mt-3 text-sm text-destructive">{riskAI.error}</p>}
              {riskAI.data && (
                <div className="mt-5 space-y-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-lg border bg-muted p-3"><p className="text-xs text-muted-foreground">Risco</p><p className="text-xl font-bold text-foreground">{riskAI.data.risco}</p></div>
                    <div className="rounded-lg border bg-muted p-3"><p className="text-xs text-muted-foreground">Score financeiro</p><p className="text-xl font-bold text-foreground">{riskAI.data.scoreFinanceiro ?? riskAI.data.score}/100</p></div>
                    <div className="rounded-lg border bg-muted p-3"><p className="text-xs text-muted-foreground">SELIC acumulada</p><p className="text-xl font-bold text-foreground">{((Number(riskAI.data.selicAcumulada) || 0) * 100).toFixed(2)}%</p></div>
                    <div className="rounded-lg border bg-muted p-3"><p className="text-xs text-muted-foreground">Valor atualizado</p><p className="text-xl font-bold text-foreground">{formatCurrency(riskAI.data.valorAtualizado)}</p></div>
                  </div>
                  <p className="text-sm text-muted-foreground">{riskAI.data.justificativaRisco}</p>
                  {!!riskAI.data.nivelRiscoPorPedido?.length && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">Nível de risco por pedido</h4>
                      {riskAI.data.nivelRiscoPorPedido.map((pedido, i) => (
                        <div key={`${pedido.descricao}-${i}`} className="rounded-lg border p-3 text-sm">
                          <div className="flex items-center justify-between gap-3"><span className="font-medium text-foreground">{pedido.descricao}</span><Badge variant="outline">{pedido.nivel}</Badge></div>
                          {pedido.justificativa && <p className="mt-1 text-muted-foreground">{pedido.justificativa}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {!!(riskAI.data.projecao12Meses ?? riskAI.data.provisionamento ?? []).length && (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground"><tr><th className="p-2 text-left">Mês</th><th className="p-2 text-left">Dívida</th><th className="p-2 text-left">Aplicação</th><th className="p-2 text-left">Diferença</th></tr></thead>
                        <tbody>{(riskAI.data.projecao12Meses ?? riskAI.data.provisionamento ?? []).map((linha) => (<tr key={linha.mes} className="border-t"><td className="p-2">{linha.mes}</td><td className="p-2">{formatCurrency(linha.valorDivida)}</td><td className="p-2">{formatCurrency(linha.valorAplicacao)}</td><td className="p-2">{formatCurrency(linha.diferenca)}</td></tr>))}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!analysis ? (
              <div className="rounded-xl border bg-card p-8 text-center">
                <p className="text-muted-foreground">Execute a análise para ver o score de risco.</p>
              </div>
            ) : (
              <>
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground"><AlertTriangle className="h-4 w-4" /> Decisão assistida — não é decisão automática</div>
                <div className="flex items-center gap-6">
                  <div className={`flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold ${
                    analysis.risk_level === 'alto' ? 'bg-risk-high-bg text-risk-high' :
                    analysis.risk_level === 'medio' ? 'bg-risk-medium-bg text-risk-medium' :
                    'bg-risk-low-bg text-risk-low'
                  }`}>
                    {analysis.risk_score_numeric}
                  </div>
                  <div>
                    <RiskBadge level={analysis.risk_level} score={analysis.risk_score_numeric} className="text-base px-4 py-2" />
                    <ConfidenceBadge level={analysis.confidence_level} className="ml-2" />
                    <p className="mt-3 text-sm text-muted-foreground max-w-xl">{analysis.justification_text}</p>
                  </div>
                </div>
              </div>
              {analysis.missing_information.length > 0 && (
                <div className="rounded-xl border bg-card p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Informações Faltantes</h4>
                  <ul className="space-y-1">
                    {analysis.missing_information.map((info, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground"><Minus className="h-4 w-4 text-risk-medium flex-shrink-0" />{info}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!isClient && (
                <div className="rounded-xl border bg-card p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Revisão Humana do Score</h4>
                  <Textarea placeholder="Justificativa para revisão do score..." className="mb-3" />
                  <Button size="sm" onClick={() => toast.success('Revisão salva (modo demo)')}>Salvar Revisão</Button>
                </div>
              )}
              </>
            )}
          </div>
        </TabsContent>

        {/* TAB: Impacto Financeiro */}
        <TabsContent value="financeiro">
          <FinancialImpactTab process={process} analysis={analysis} />
        </TabsContent>

        {/* TAB: Planejamento Financeiro */}
        <TabsContent value="planejamento">
          <FinancialPlanningTab process={process} />
        </TabsContent>

        {/* TAB: Chat IA */}
        <TabsContent value="chat">
          <div className="rounded-xl border bg-card flex flex-col" style={{ height: '600px' }}>
            <div className="border-b p-4"><h3 className="section-title">Chat Especialista Trabalhista</h3><p className="text-xs text-muted-foreground">Converse com a IA sobre este processo</p></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  }`}>
                    {msg.role === 'assistant' ? <div className="prose prose-sm max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div> : msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && !chatMessages.some(m => m.thread_id === 'thread-streaming') && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-4 py-3 text-sm text-muted-foreground animate-pulse">Analisando...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t p-4 flex gap-2">
              <Textarea
                value={chatInput} onChange={e => setChatInput(e.target.value)}
                placeholder="Pergunte sobre este processo..."
                className="min-h-[44px] max-h-[120px] resize-none"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
              />
              <Button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} size="icon"><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </TabsContent>

        {/* TAB: Gerar Documentos */}
        <TabsContent value="documentos-gerados">
          <div className="space-y-6">
            {!isClient && (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { type: 'peticao', label: 'Minuta de Petição', icon: FileText },
                  { type: 'recurso', label: 'Minuta de Recurso', icon: Scale },
                  { type: 'email_cliente', label: 'E-mail ao Cliente', icon: MessageSquare },
                  { type: 'resumo_executivo', label: 'Resumo Executivo', icon: FileText },
                ].map(item => (
                  <Button
                    key={item.type}
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    disabled={generatingDoc !== null}
                    onClick={() => handleGenerateDoc(item.type, item.label)}
                  >
                    {generatingDoc === item.type ? (
                      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <item.icon className="h-6 w-6" />
                    )}
                    <span className="text-sm">{generatingDoc === item.type ? 'Gerando...' : item.label}</span>
                  </Button>
                ))}
              </div>
            )}

            {generatingDoc && generatedContent && (
              <div className="rounded-xl border border-primary/30 bg-card p-5">
                <h3 className="section-title mb-3 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary animate-pulse" />
                  Gerando documento...
                </h3>
                <div className="prose prose-sm max-w-none bg-muted rounded-lg p-4 max-h-[400px] overflow-y-auto">
                  <ReactMarkdown>{generatedContent}</ReactMarkdown>
                </div>
              </div>
            )}

            <div className="rounded-xl border bg-card p-5">
              <h3 className="section-title mb-4">Documentos Gerados</h3>
              {localGeneratedDocs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum documento gerado ainda.</p> : (
                <div className="space-y-3">
                  {localGeneratedDocs.map(doc => (
                    <div key={doc.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-foreground">{doc.title}</p>
                        <Badge variant="secondary" className="text-xs">{doc.type.replace(/_/g, ' ')}</Badge>
                      </div>
                      <div className="prose prose-sm max-w-none bg-muted rounded-lg p-4 max-h-[200px] overflow-y-auto">
                        <ReactMarkdown>{doc.content}</ReactMarkdown>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(doc.content); registrarFeedbackDoc(doc.type, 'aceito'); toast.success('Copiado!'); }}>Copiar</Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${doc.title.replace(/[^a-zA-Z0-9À-ú\s-]/g, '').replace(/\s+/g, '_')}.md`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          registrarFeedbackDoc(doc.type, 'aceito');
                          toast.success('Download iniciado!');
                        }}><Download className="h-4 w-4 mr-1" /> Baixar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB: Auditoria */}
        {!isClient && (
          <TabsContent value="auditoria">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="section-title mb-4">Histórico e Auditoria</h3>
              <div className="space-y-3">
                <div className="rounded-lg border p-3 flex items-center gap-3">
                  <History className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Análise v1 executada</p>
                    <p className="text-xs text-muted-foreground">por Dra. Camila Ferreira • {new Date().toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="rounded-lg border p-3 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-risk-low" />
                  <div>
                    <p className="text-sm font-medium">Revisão humana: Aprovado</p>
                    <p className="text-xs text-muted-foreground">Confiança confirmada pela analista</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        )}

        {/* TAB: PJe / Andamentos */}
        <TabsContent value="pje">
          {process.id && !mockProcess ? (
            <PjeTab processId={process.id} processNumber={process.process_number} />
          ) : (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="section-title mb-1">Consulta DataJud (CNJ)</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Importe andamentos oficiais diretamente da API pública do CNJ.
              </p>
              <DataJudTab initialNumber={process.process_number} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
