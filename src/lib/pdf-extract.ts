import * as pdfjsLib from 'pdfjs-dist';

// Use CDN worker to avoid bundling issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const MAX_CHARS_PER_PAGE = 4000;
const MAX_CHARS_PER_CHUNK = 40000;

export type TextChunk = {
  startPage: number;
  endPage: number;
  content: string;
};

export type ExtractionProgress = {
  currentPage: number;
  totalPages: number;
  phase: 'extracting' | 'chunking' | 'done';
};

function sanitize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) + '…' : value;
}

export async function extractPdfText(
  file: File,
  onProgress?: (p: ExtractionProgress) => void
): Promise<{ chunks: TextChunk[]; totalPages: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const totalPages = pdf.numPages;

  const chunks: TextChunk[] = [];
  let startPage = 1;
  let endPage = 0;
  let current = '';

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.({ currentPage: pageNum, totalPages, phase: 'extracting' });

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const rawText = textContent.items
      .map((item: any) => item.str ?? '')
      .join(' ');
    const cleaned = truncate(sanitize(rawText), MAX_CHARS_PER_PAGE);
    const pageBlock = `[Página ${pageNum}]\n${cleaned || '[Sem texto extraível nesta página]'}`;

    if (!current) {
      current = pageBlock;
      startPage = pageNum;
      endPage = pageNum;
      continue;
    }

    if (current.length + pageBlock.length + 2 > MAX_CHARS_PER_CHUNK) {
      chunks.push({ startPage, endPage, content: current });
      current = pageBlock;
      startPage = pageNum;
      endPage = pageNum;
      continue;
    }

    current += `\n\n${pageBlock}`;
    endPage = pageNum;
  }

  if (current) {
    chunks.push({ startPage, endPage, content: current });
  }

  onProgress?.({ currentPage: totalPages, totalPages, phase: 'done' });

  return { chunks, totalPages };
}
