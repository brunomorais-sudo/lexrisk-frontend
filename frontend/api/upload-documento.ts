import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Sem bodyParser customizado — recebe JSON pequeno (apenas metadados)
export const config = { api: { bodyParser: true } };

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(buffer);
    return data.text?.trim() || '';
  } catch {
    return '';
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { process_id, storage_path, file_name, file_size, mime_type, uploaded_by } = req.body;

    if (!process_id) return res.status(400).json({ error: 'process_id obrigatório' });
    if (!storage_path) return res.status(400).json({ error: 'storage_path obrigatório' });

    // Baixa arquivo do Storage para extrair texto
    let extractedText = '';
    const isPdf = mime_type === 'application/pdf' || (file_name || '').toLowerCase().endsWith('.pdf');

    if (isPdf) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(storage_path);

      if (!downloadError && fileData) {
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        extractedText = await extractTextFromPdf(buffer);
      }
    }

    // Registra na tabela process_documents
    const { data, error } = await supabase
      .from('process_documents')
      .insert({
        process_id,
        document_type: 'upload_usuario',
        file_name: file_name || 'documento',
        file_size: file_size || null,
        mime_type: mime_type || 'application/octet-stream',
        storage_path,
        extracted_text: extractedText || null,
        uploaded_by: uploaded_by || null,
        fetched_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Erro ao salvar documento no banco' });
    }

    return res.status(200).json({
      id: data.id,
      file_name,
      file_size,
      mime_type,
      extracted_text_length: extractedText.length,
      has_text: extractedText.length > 0,
      storage_path,
    });

  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Erro interno no upload' });
  }
}
