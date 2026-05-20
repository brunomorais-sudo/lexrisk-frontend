import type { VercelRequest, VercelResponse } from "@vercel/node";

const PDPJ_SSO_URL = "https://sso.pdpj.jus.br/auth/realms/pje/protocol/openid-connect/token";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", corsHeaders["Access-Control-Allow-Origin"]);
  res.setHeader("Access-Control-Allow-Headers", corsHeaders["Access-Control-Allow-Headers"]);
  res.setHeader("Access-Control-Allow-Methods", corsHeaders["Access-Control-Allow-Methods"]);
}

async function tryAuth(clientId: string, cpf: string, senha: string): Promise<{ access_token: string; expires_in: number } | null> {
  const params = new URLSearchParams({ grant_type: "password", client_id: clientId, username: cpf.replace(/\D/g, ""), password: senha });
  const resp = await fetch(PDPJ_SSO_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (!data.access_token) return null;
  return { access_token: data.access_token as string, expires_in: (data.expires_in as number) ?? 300 };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") { setCors(res); return res.status(200).end(); }
  setCors(res);
  if (req.method !== "POST") return res.status(405).json({ error: "Metodo nao permitido" });
  const { cpf, senha } = req.body ?? {};
  if (!cpf || !senha) return res.status(400).json({ error: "CPF e senha sao obrigatorios" });
  const cpfDigits = String(cpf).replace(/\D/g, "");
  if (cpfDigits.length !== 11) return res.status(400).json({ error: "CPF invalido" });
  try {
    let result = await tryAuth("pje", cpfDigits, String(senha));
    if (!result) result = await tryAuth("pje-login", cpfDigits, String(senha));
    if (!result) return res.status(401).json({ error: "Credenciais invalidas ou PDPJ indisponivel" });
    return res.status(200).json({ token: result.access_token, expires_in: result.expires_in });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return res.status(502).json({ error: "Falha ao conectar no SSO do PDPJ", detail: message });
  }
}
