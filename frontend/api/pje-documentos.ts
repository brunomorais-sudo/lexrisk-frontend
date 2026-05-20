import type { VercelRequest, VercelResponse } from "@vercel/node";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", corsHeaders["Access-Control-Allow-Headers"]);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}
function normalizeTribunal(t: string) { return t.toLowerCase().replace(/[^a-z0-9]/g, ""); }
function buildBaseUrl(t: string) { return `https://pje.${t}.jus.br/pje/api`; }

interface PjeDocumento { id: string|number; titulo: string; tipo: string; dataJuntada: string|null; tamanhoBytes: number|null; url: string|null; }

function parseDocumentos(raw: unknown): PjeDocumento[] {
  if (!raw || typeof raw !== "object") return [];
  if (Array.isArray(raw)) return raw.map((item: Record<string,unknown>) => ({
    id: (item.id ?? item.idDocumento ?? "") as string|number,
    titulo: (item.titulo ?? item.descricao ?? item.nome ?? "Sem titulo") as string,
    tipo: (item.tipo ?? item.tipoDocumento ?? "") as string,
    dataJuntada: (item.dataJuntada ?? item.dataCadastro ?? null) as string|null,
    tamanhoBytes: (item.tamanho ?? item.tamanhoBytes ?? null) as number|null,
    url: (item.url ?? item.urlDownload ?? null) as string|null,
  }));
  const obj = raw as Record<string,unknown>;
  for (const key of ["documentos","items","data","content","result"]) {
    if (Array.isArray(obj[key])) return parseDocumentos(obj[key]);
  }
  return [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") { setCors(res); return res.status(200).end(); }
  setCors(res);
  if (req.method !== "POST") return res.status(405).json({ error: "Metodo nao permitido" });
  const { tribunal, process_number, token } = req.body ?? {};
  if (!tribunal || !process_number || !token) return res.status(400).json({ error: "tribunal, process_number e token sao obrigatorios" });
  const tribunalNorm = normalizeTribunal(String(tribunal));
  const baseUrl = buildBaseUrl(tribunalNorm);
  const numLimpo = String(process_number).replace(/\D/g, "");
  const candidateUrls = [
    `${baseUrl}/processos/${numLimpo}/documentos`,
    `${baseUrl}/processo/${numLimpo}/documentos`,
    `${baseUrl}/v1/processos/${numLimpo}/documentos`,
    `${baseUrl}/processos?numero=${numLimpo}`,
  ];
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" };
  for (const url of candidateUrls) {
    try {
      const resp = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (resp.status === 401 || resp.status === 403) return res.status(401).json({ error: "Token expirado ou sem permissao", status: "unauthorized" });
      if (resp.status === 404) continue;
      if (!resp.ok) continue;
      const contentType = resp.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) continue;
      const raw = await resp.json();
      const documentos = parseDocumentos(raw);
      return res.status(200).json({ status: "success", tribunal: tribunalNorm, process_number, total: documentos.length, documentos, source_url: url });
    } catch (_err) { continue; }
  }
  return res.status(200).json({ status: "api_not_available", tribunal: tribunalNorm, process_number, message: "API REST do PJe nao disponivel para este tribunal.", documentos: [] });
}
