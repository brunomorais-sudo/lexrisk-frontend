import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, AlertTriangle, TrendingUp, Scale, FileText, Target, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

function RiskBar({ alto, medio, baixo, semAnalise }: { alto: number; medio: number; baixo: number; semAnalise: number }) {
  const total = alto + medio + baixo + semAnalise;
  if (total === 0) return null;
  return (
    <div className="flex h-3 rounded-full overflow-hidden w-full">
      {alto > 0 && <div style={{ width: `${(alto / total) * 100}%` }} className="bg-red-500" />}
      {medio > 0 && <div style={{ width: `${(medio / total) * 100}%` }} className="bg-amber-400" />}
      {baixo > 0 && <div style={{ width: `${(baixo / total) * 100}%` }} className="bg-green-500" />}
      {semAnalise > 0 && <div style={{ width: `${(semAnalise / total) * 100}%` }} className="bg-muted" />}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color || 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function RelatorioPage() {
  const [searchParams] = useSearchParams();
  const empresaId = searchParams.get('empresa');
  const empresaNome = searchParams.get('nome') || 'Empresa';
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    if (!empresaId) { toast.error('ID da empresa não informado'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-relatorio', { body: { company_id: empresaId } });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      setReport(data);
      setGenerated(true);
      toast.success('Relatório gerado com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar relatório');
    } finally { setLoading(false); }
  };

  const handleDownloadPDF = async () => {
    if (!report) return;
    toast.info('Gerando PDF...');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210; const margin = 20; const contentW = pageW - margin * 2;
    let y = 0;
    const addPage = () => { doc.addPage(); y = 20; };
    const checkY = (n = 10) => { if (y + n > 270) addPage(); };

    // Capa
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(11);
    doc.text('LEXRISK TRABALHISTA', margin, 40);
    doc.setFontSize(28); doc.text('Relatório Executivo', margin, 85);
    doc.text('de Passivo Trabalhista', margin, 100);
    doc.setFontSize(16); doc.setTextColor(148, 163, 184);
    doc.text(report.company.trade_name, margin, 125);
    doc.setFontSize(10); doc.text(`CNPJ: ${report.company.cnpj}`, margin, 135);
    doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    doc.text(`Gerado em ${new Date(report.generated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`, margin, 270);
    doc.text(`${report.stats.totalProcesses} processos analisados`, margin, 277);

    // Stats
    addPage();
    doc.setTextColor(15, 23, 42); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('Resumo Financeiro', margin, y); y += 12;
    const { financeiro, byRisk } = report.stats;
    const cards = [
      { label: 'Valor Total das Causas', value: formatCurrency(financeiro.totalExposure) },
      { label: 'Exposição Base (IA)', value: formatCurrency(financeiro.exposureBase) },
      { label: 'Exposição Mínima', value: formatCurrency(financeiro.exposureMin) },
      { label: 'Exposição Máxima', value: formatCurrency(financeiro.exposureMax) },
    ];
    for (let i = 0; i < cards.length; i++) {
      const col = i % 2; const row = Math.floor(i / 2);
      const x = margin + col * (contentW / 2 + 5); const cy = y + row * 22;
      doc.setFillColor(248, 250, 252); doc.roundedRect(x, cy, contentW / 2 - 3, 18, 2, 2, 'F');
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
      doc.text(cards[i].label, x + 4, cy + 6);
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
      doc.text(cards[i].value, x + 4, cy + 13);
    }
    y += 50;
    const riskItems = [
      { label: 'Alto Risco', count: byRisk.alto, color: [239,68,68] as [number,number,number] },
      { label: 'Médio Risco', count: byRisk.medio, color: [251,191,36] as [number,number,number] },
      { label: 'Baixo Risco', count: byRisk.baixo, color: [34,197,94] as [number,number,number] },
    ];
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(15,23,42);
    doc.text('Distribuição por Risco', margin, y); y += 8;
    for (const item of riskItems) {
      doc.setFillColor(...item.color); doc.roundedRect(margin, y, 3, 7, 1, 1, 'F');
      doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(15,23,42);
      doc.text(`${item.label}: ${item.count} processos`, margin + 6, y + 5); y += 10;
    }
    y += 5;
    doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.text('Temas Recorrentes', margin, y); y += 8;
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    for (const { subject, count } of (report.stats.topSubjects || []).slice(0, 8)) {
      checkY(7); doc.setTextColor(71,85,105); doc.text(`• ${subject}: ${count}x`, margin + 4, y); y += 7;
    }

    // AI Analysis
    addPage();
    doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(15,23,42);
    doc.text('Análise Executiva — Dr. Hélio Marques', margin, y); y += 12;
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(30,41,59);
    const cleanText = report.aiAnalysis.replace(/### /g, '\n\n').replace(/\*\*/g,'').replace(/\*/g,'');
    for (const para of cleanText.split('\n\n').filter((p: string) => p.trim())) {
      const trimmed = para.trim();
      checkY(14);
      const isHeader = ['Sumário','Análise','Mapa','Temas','Alertas','Estratégia','Próximos'].some(h => trimmed.startsWith(h));
      if (isHeader) {
        y += 4; doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(15,23,42);
        const lines = doc.splitTextToSize(trimmed, contentW); doc.text(lines, margin, y); y += lines.length * 6 + 3;
        doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(30,41,59);
      } else {
        const lines = doc.splitTextToSize(trimmed, contentW);
        for (const line of lines) { checkY(6); doc.text(line, margin, y); y += 5.5; }
        y += 3;
      }
    }

    // Top processes table
    if (report.topRiskProcesses?.length) {
      addPage();
      doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(15,23,42);
      doc.text('Processos de Maior Exposição', margin, y); y += 10;
      doc.setFillColor(15,23,42); doc.rect(margin, y, contentW, 8, 'F');
      doc.setTextColor(255,255,255); doc.setFontSize(7); doc.setFont('helvetica','bold');
      doc.text('Nº Processo', margin+2, y+5.5); doc.text('Reclamante', margin+50, y+5.5);
      doc.text('Valor', margin+110, y+5.5); doc.text('Risco', margin+135, y+5.5); doc.text('TRT', margin+155, y+5.5);
      y += 8; doc.setFont('helvetica','normal'); doc.setFontSize(7);
      for (let i = 0; i < report.topRiskProcesses.length; i++) {
        const p = report.topRiskProcesses[i];
        checkY(8);
        doc.setFillColor(...(i%2===0?[248,250,252]:[255,255,255]) as [number,number,number]);
        doc.rect(margin, y, contentW, 7, 'F');
        doc.setTextColor(30,41,59);
        doc.text((p.process_number||'').substring(0,28), margin+2, y+4.5);
        doc.text((p.claimant_name||'').substring(0,18), margin+50, y+4.5);
        doc.text(formatCurrency(p.claim_value||0), margin+110, y+4.5);
        const rc: Record<string,[number,number,number]> = { alto:[239,68,68], medio:[251,191,36], baixo:[34,197,94] };
        doc.setTextColor(...(rc[p.risk_level]||[148,163,184]));
        doc.text((p.risk_level||'—').toUpperCase(), margin+135, y+4.5);
        doc.setTextColor(30,41,59); doc.text(p.tribunal||'—', margin+155, y+4.5);
        y += 7;
      }
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i); doc.setFontSize(7); doc.setTextColor(148,163,184);
      doc.text(`LexRisk Trabalhista — ${report.company.trade_name} — Confidencial`, margin, 290);
      doc.text(`Página ${i} de ${pageCount}`, pageW - margin - 20, 290);
    }
    doc.save(`Relatorio_${report.company.trade_name.replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF salvo!');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to={`/processos?empresa=${empresaId}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3 w-3" /> {empresaNome}
            </Link>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-medium">Relatório Geral</span>
          </div>
          <h1 className="page-header">Relatório Executivo de Passivo</h1>
          <p className="mt-1 text-sm text-muted-foreground">{empresaNome}</p>
        </div>
        <div className="flex gap-2">
          {generated && <Button variant="outline" className="gap-2" onClick={handleDownloadPDF}><Download className="h-4 w-4" /> Baixar PDF</Button>}
          <Button onClick={handleGenerate} disabled={loading} className="gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</> : <><FileText className="h-4 w-4" /> {generated ? 'Regenerar' : 'Gerar Relatório'}</>}
          </Button>
        </div>
      </div>

      {!generated && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <Scale className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Relatório Executivo de Passivo Trabalhista</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-6">Análise consolidada com mapa de risco, temas recorrentes, alertas críticos e estratégia — pelo Dr. Hélio Marques.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-left max-w-lg mb-8">
            {[
              { icon: TrendingUp, text: 'Exposição financeira min/base/máx' },
              { icon: Target, text: 'Mapa de risco e score do portfólio' },
              { icon: AlertTriangle, text: 'Alertas de penhora e processos críticos' },
              { icon: FileText, text: 'Temas e teses recorrentes' },
              { icon: Clock, text: 'Plano de ação para 90 dias' },
              { icon: Download, text: 'PDF profissional para o cliente' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border bg-card p-3">
                <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-xs text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
          <Button onClick={handleGenerate} size="lg" className="gap-2"><FileText className="h-4 w-4" /> Gerar Relatório Agora</Button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Dr. Hélio Marques analisando {empresaNome}...</p>
          <p className="text-xs text-muted-foreground">Consolidando dados, calculando exposição e redigindo parecer executivo</p>
        </div>
      )}

      {generated && report && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total de Processos" value={report.stats.totalProcesses} />
            <StatCard label="Exposição Base (IA)" value={formatCurrency(report.stats.financeiro.exposureBase)} sub="estimativa realista" />
            <StatCard label="Alto Risco" value={report.stats.byRisk.alto} sub={`${Math.round(report.stats.byRisk.alto/report.stats.totalProcesses*100)}% do portfólio`} color="text-red-500" />
            <StatCard label="Score Médio de Risco" value={`${report.stats.avgRiskScore}/100`} sub={report.stats.avgRiskScore>=70?'Portfólio crítico':report.stats.avgRiskScore>=40?'Risco moderado':'Risco controlado'} />
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Faixa de Exposição Financeira</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-xs text-muted-foreground mb-1">Mínima</p><p className="text-lg font-bold text-green-600">{formatCurrency(report.stats.financeiro.exposureMin)}</p></div>
              <div className="border-x px-4"><p className="text-xs text-muted-foreground mb-1">Base (mais provável)</p><p className="text-xl font-bold">{formatCurrency(report.stats.financeiro.exposureBase)}</p></div>
              <div><p className="text-xs text-muted-foreground mb-1">Máxima</p><p className="text-lg font-bold text-red-500">{formatCurrency(report.stats.financeiro.exposureMax)}</p></div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">Distribuição de Risco</h3>
              <RiskBar alto={report.stats.byRisk.alto} medio={report.stats.byRisk.medio} baixo={report.stats.byRisk.baixo} semAnalise={report.stats.byRisk.sem_analise} />
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500"/>Alto: {report.stats.byRisk.alto}</div>
                <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400"/>Médio: {report.stats.byRisk.medio}</div>
                <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500"/>Baixo: {report.stats.byRisk.baixo}</div>
                <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground"/>Sem análise: {report.stats.byRisk.sem_analise}</div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">Temas Mais Recorrentes</h3>
              <div className="space-y-2">
                {(report.stats.topSubjects||[]).slice(0,6).map(({subject,count}:any)=>(
                  <div key={subject} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground truncate flex-1 mr-2">{subject}</span>
                    <span className="text-xs font-semibold">{count}x</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><Scale className="h-5 w-5"/></div>
              <div><h3 className="text-sm font-semibold">Dr. Hélio Marques</h3><p className="text-xs text-muted-foreground">Ex-Ministro do TST • Parecer Executivo</p></div>
            </div>
            <div className="prose prose-sm max-w-none text-foreground [&>h3]:text-base [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-2 [&>p]:text-sm [&>p]:text-muted-foreground [&>p]:leading-relaxed">
              <ReactMarkdown>{report.aiAnalysis}</ReactMarkdown>
            </div>
          </div>

          {report.topRiskProcesses?.length > 0 && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b"><h3 className="text-sm font-semibold">Processos de Maior Exposição</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Nº Processo</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Reclamante</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Valor</th>
                      <th className="text-center px-4 py-3 text-muted-foreground font-medium">Risco</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Tribunal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topRiskProcesses.map((p:any,i:number)=>(
                      <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-muted-foreground">{p.process_number}</td>
                        <td className="px-4 py-3">{p.claimant_name}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(p.claim_value||0)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.risk_level==='alto'?'bg-red-100 text-red-700':p.risk_level==='medio'?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700'}`}>{p.risk_level||'—'}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.tribunal||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" className="gap-2" onClick={handleDownloadPDF}><Download className="h-4 w-4"/> Baixar PDF Completo</Button>
          </div>
        </div>
      )}
    </div>
  );
}
