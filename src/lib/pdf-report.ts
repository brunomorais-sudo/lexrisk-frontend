import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Process, ProcessAnalysis, ClientCompany } from '@/types';

interface GeneratePdfOptions {
  process: Process;
  analysis?: ProcessAnalysis | null;
  clientCompany?: ClientCompany | null;
  responsibleLawyer?: { name: string; email: string; phone?: string } | null;
}

const COLORS = {
  primary: [37, 99, 235] as [number, number, number],
  dark: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  light: [241, 245, 249] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  riskHigh: [220, 38, 38] as [number, number, number],
  riskMedium: [217, 119, 6] as [number, number, number],
  riskLow: [22, 163, 74] as [number, number, number],
};

const FIRM = {
  name: 'Machado, Ferreira & Associados',
  address: 'Av. Paulista, 1500 — 12º andar, São Paulo/SP',
  phone: '+55 (11) 4002-8922',
  email: 'contato@machadoferreira.adv.br',
  website: 'www.machadoferreira.adv.br',
};

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function riskColor(level: string): [number, number, number] {
  if (level === 'alto') return COLORS.riskHigh;
  if (level === 'medio') return COLORS.riskMedium;
  return COLORS.riskLow;
}

function riskLabel(level: string) {
  if (level === 'alto') return 'RISCO ALTO';
  if (level === 'medio') return 'RISCO MÉDIO';
  return 'RISCO BAIXO';
}

function plainRiskExplanation(level: string): string {
  if (level === 'alto') {
    return 'Este processo apresenta risco ELEVADO de condenação. Recomenda-se atenção máxima e considerar estratégias para reduzir o impacto, como acordo.';
  }
  if (level === 'medio') {
    return 'Risco MODERADO. Há argumentos defensivos relevantes, mas também pontos vulneráveis. Recomenda-se monitoramento ativo e preparação criteriosa da defesa.';
  }
  return 'Risco BAIXO. Chances de condenação significativa são reduzidas. Manter acompanhamento até o trânsito em julgado.';
}

function addPageFooter(doc: jsPDF, pageNumber: number, totalPages: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(15, pageHeight - 18, pageWidth - 15, pageHeight - 18);

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text(FIRM.name, 15, pageHeight - 12);
  doc.text(`${FIRM.address} • ${FIRM.phone}`, 15, pageHeight - 8);
  doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('LexRisk', pageWidth - 15, pageHeight - 12, { align: 'right' });
}

function ensureSpace(doc: jsPDF, currentY: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + needed > pageHeight - 25) {
    doc.addPage();
    return 25;
  }
  return currentY;
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  y = ensureSpace(doc, y, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.dark);
  doc.text(title, 15, y);
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.8);
  doc.line(15, y + 1.5, 15 + doc.getTextWidth(title), y + 1.5);
  return y + 8;
}

function paragraph(doc: jsPDF, text: string, y: number, opts: { size?: number; color?: [number, number, number]; bold?: boolean } = {}): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  doc.setFontSize(opts.size ?? 10);
  doc.setTextColor(...(opts.color ?? COLORS.dark));
  const lines = doc.splitTextToSize(text, pageWidth - 30);
  const lineHeight = (opts.size ?? 10) * 0.45;
  const blockHeight = lines.length * lineHeight + 2;
  y = ensureSpace(doc, y, blockHeight);
  doc.text(lines, 15, y);
  return y + blockHeight;
}

export async function generateProcessReportPDF(options: GeneratePdfOptions) {
  const { process: proc, analysis, clientCompany, responsibleLawyer } = options;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const today = new Date();

  // ============== CAPA ==============
  // Header band
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, pageWidth, 75, 'F');

  // Logo "LexRisk"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...COLORS.white);
  doc.text('LexRisk', 15, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(200, 210, 225);
  doc.text('Inteligência jurídica para risco trabalhista', 15, 38);

  // Document title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.white);
  doc.text('Relatório Executivo', 15, 60);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Análise de risco processual', 15, 68);

  // Card with main info
  let y = 95;
  doc.setFillColor(...COLORS.light);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(15, y, pageWidth - 30, 75, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE', 22, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.dark);
  doc.text(clientCompany?.business_name ?? proc.defendant_name, 22, y + 19);

  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'bold');
  doc.text('NÚMERO DO PROCESSO', 22, y + 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.dark);
  doc.text(proc.process_number, 22, y + 39);

  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'bold');
  doc.text('TRIBUNAL / VARA', 22, y + 52);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.dark);
  doc.text(`${proc.tribunal || '—'} • ${proc.vara || '—'}`, 22, y + 59);

  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'bold');
  doc.text('GERADO EM', pageWidth - 22, y + 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.dark);
  doc.text(fmtDate(today), pageWidth - 22, y + 19, { align: 'right' });

  // Confidential notice
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Documento confidencial. Uso restrito ao cliente e equipe jurídica responsável.',
    pageWidth / 2,
    pageHeight - 30,
    { align: 'center' },
  );

  // ============== PÁGINA 2: RESUMO EXECUTIVO ==============
  doc.addPage();
  y = 25;

  y = sectionTitle(doc, '1. Resumo Executivo', y);

  // Risk badge box
  const level = analysis?.risk_level || 'medio';
  const score = analysis?.risk_score_numeric || 50;
  const rc = riskColor(level);

  doc.setFillColor(...rc);
  doc.roundedRect(15, y, pageWidth - 30, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.white);
  doc.text(riskLabel(level), 22, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Score de risco: ${score}/100`, 22, y + 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(`${score}`, pageWidth - 22, y + 15, { align: 'right' });
  y += 28;

  y = paragraph(doc, plainRiskExplanation(level), y);
  y += 2;

  // Key metrics table
  const exposure = analysis?.case_value_identified || proc.estimated_financial_exposure_base || 0;
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    head: [['Indicador', 'Valor']],
    body: [
      ['Reclamante', proc.claimant_name],
      ['Reclamada', proc.defendant_name],
      ['Objeto principal', proc.subject_main],
      ['Fase atual', proc.phase.charAt(0).toUpperCase() + proc.phase.slice(1)],
      ['Valor pleiteado', fmtCurrency(proc.claim_value)],
      ['Exposição estimada', fmtCurrency(exposure)],
      ['Confiança da análise', (analysis?.confidence_level || 'média').toUpperCase()],
    ],
    headStyles: { fillColor: COLORS.dark, textColor: COLORS.white, fontSize: 10 },
    bodyStyles: { fontSize: 10, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: COLORS.light },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    margin: { left: 15, right: 15 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  if (analysis?.executive_summary) {
    y = sectionTitle(doc, '2. Análise do Caso', y);
    y = paragraph(doc, analysis.executive_summary, y);
    y += 2;
  }

  // ============== ANÁLISE DE RISCO ==============
  y = sectionTitle(doc, '3. Argumentos Favoráveis e Desfavoráveis', y);

  const pros = analysis?.pros || [];
  const cons = analysis?.cons || [];

  if (pros.length > 0) {
    y = ensureSpace(doc, y, 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.riskLow);
    doc.text('✓ Argumentos favoráveis (defesa)', 15, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      theme: 'striped',
      head: [['Argumento', 'Peso', 'Fundamento']],
      body: pros.map(p => [p.title, `${p.weight}/10`, p.description]),
      headStyles: { fillColor: COLORS.riskLow, textColor: COLORS.white, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: COLORS.dark },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 18, halign: 'center' } },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  if (cons.length > 0) {
    y = ensureSpace(doc, y, 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.riskHigh);
    doc.text('✗ Argumentos desfavoráveis (riscos)', 15, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      theme: 'striped',
      head: [['Argumento', 'Peso', 'Fundamento']],
      body: cons.map(c => [c.title, `${c.weight}/10`, c.description]),
      headStyles: { fillColor: COLORS.riskHigh, textColor: COLORS.white, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: COLORS.dark },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 18, halign: 'center' } },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Recomendação
  y = sectionTitle(doc, '4. Recomendação do Advogado', y);
  const reco = analysis?.justification_text
    ? analysis.justification_text
    : level === 'alto'
      ? 'Recomenda-se avaliar proposta de acordo e reforçar a produção de provas defensivas.'
      : level === 'medio'
        ? 'Acompanhar de perto e preparar bem testemunhas e documentos para a instrução.'
        : 'Manter acompanhamento padrão e monitorar próximas movimentações processuais.';
  y = paragraph(doc, reco, y);
  y += 2;

  // Próximos passos
  y = sectionTitle(doc, '5. Próximos Passos e Prazos', y);
  const nextSteps = analysis?.next_steps && analysis.next_steps.length > 0
    ? analysis.next_steps
    : ['Aguardar próxima movimentação processual.', 'Reunir documentação complementar.'];

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    body: nextSteps.map((s, i) => [`${i + 1}.`, s]),
    bodyStyles: { fontSize: 10, textColor: COLORS.dark, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 8, fontStyle: 'bold', textColor: COLORS.primary } },
    margin: { left: 15, right: 15 },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  doc.setFillColor(...COLORS.light);
  doc.roundedRect(15, y, pageWidth - 30, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text('PRAZO MAIS PRÓXIMO', 22, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.dark);
  doc.text(proc.current_status || 'Sem prazo crítico identificado no momento.', 22, y + 11);
  y += 20;

  // Contato do escritório
  y = sectionTitle(doc, '6. Escritório Responsável', y);
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(FIRM.name, 15, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  y += 5;
  doc.text(FIRM.address, 15, y); y += 4;
  doc.text(`Telefone: ${FIRM.phone}`, 15, y); y += 4;
  doc.text(`E-mail: ${FIRM.email}`, 15, y); y += 4;
  doc.text(`Site: ${FIRM.website}`, 15, y); y += 4;

  if (responsibleLawyer) {
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.text(`Advogado(a) responsável: ${responsibleLawyer.name}`, 15, y); y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(`${responsibleLawyer.email}${responsibleLawyer.phone ? ' • ' + responsibleLawyer.phone : ''}`, 15, y);
  }

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageFooter(doc, i, totalPages);
  }

  // Save
  const fileName = `LexRisk_${proc.process_number.replace(/[^\w]/g, '_')}_${today.toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
