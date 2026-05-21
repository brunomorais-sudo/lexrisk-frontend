import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = { api: { bodyParser: false, responseLimit: false } };

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // Usa pdf-parse para extração
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(buffer);
    return data.text?.trim() || '';
  } catch {
    return '';
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const form = formidable({ maxFileSize: 50 * 1024 * 1024 }); // 50MB
    const [fields, files] = await form.parse(req);

    const processId = Array.isArray(fields.process_id) ? fields.process_id[0] : fields.process_id;
    const uploadedBy = Array.isArray(fields.uploaded_by) ? fields.uploaded_by[0] : fields.uploaded_by;

    if (!processId) return res.status(400).json({ error: 'process_id obrigatório' });

    const fileArray = files.file;
    if (!fileArray || fileArray.length === 0) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const file = fileArray[0];
    const buffer = fs.readFileSync(file.filepath);
    const fileName = file.originalFilename || 'documento';
    const mimeType = file.mimetype || 'application/octet-stream';
    const fileSize = file.size;

    // Extrai texto se for PDF
    let extractedText = '';
    if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      extractedText = await extractTextFromPdf(buffer);
    }

    // Salva no Supabase Storage
    const storagePath = `process-docs/${processId}/${Date.now()}-${fileName}`;
    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

    // Se storage falhar, continua sem salvar o arquivo binário (salva só o texto)
    const finalStoragePath = storageError ? null : storagePath;

    // Registra na tabela process_documents
    const { data, error } = await supabase
      .from('process_documents')
      .insert({
        process_id: processId,
        document_type: 'upload_usuario',
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType,
        storage_path: finalStoragePath,
        extracted_text: extractedText || null,
        uploaded_by: uploadedBy || null,
        fetched_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Erro ao salvar documento no banco' });
    }

    // Limpa arquivo temporário
    try { fs.unlinkSync(file.filepath); } catch { /* ignore */ }

    return res.status(200).json({
      id: data.id,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
      extracted_text_length: extractedText.length,
      has_text: extractedText.length > 0,
      storage_path: finalStoragePath,
    });

  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Erro interno no upload' });
  }
}
