// Edge function: proxy para a API pública do DataJud (CNJ)
// Docs: https://datajud-wiki.cnj.jus.br/api-publica/
// A API exige header `Authorization: APIKey <chave-publica>` e POST com payload
// no formato Elasticsearch. A chave pública abaixo é divulgada oficialmente
// pelo CNJ no wiki da API e pode ser usada por qualquer cliente.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Chave pública oficial divulgada pelo CNJ no wiki
const DATAJUD_PUBLIC_KEY =
  'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

// Mapeamento Tribunal/Justiça -> alias do índice DataJud.
// Para Justiça do Trabalho usamos os TRTs (api_publica_trt1 ... trt24)
function aliasFromProcessNumber(processNumber: string): string | null {
  // Formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
  // J = segmento da justiça (5 = Trabalho, 4 = Federal, 8 = Estadual, etc.)
  // TR = tribunal
  const clean = processNumber.replace(/\D/g, '');
  if (clean.length !== 20) return null;
  const justiceSegment = clean.substring(13, 14); // J
  const tribunal = clean.substring(14, 16); // TR

  if (justiceSegment === '5') {
    // Justiça do Trabalho
    const n = parseInt(tribunal, 10);
    if (n >= 1 && n <= 24) return `api_publica_trt${n}`;
  }
  if (justiceSegment === '4') {
    // Justiça Federal (TRF)
    const n = parseInt(tribunal, 10);
    if (n >= 1 && n <= 6) return `api_publica_trf${n}`;
  }
  if (justiceSegment === '8') {
    // Justiça Estadual - TJ por UF
    const ufMap: Record<string, string> = {
      '01': 'ac', '02': 'al', '03': 'ap', '04': 'am', '05': 'ba',
      '06': 'ce', '07': 'df', '08': 'es', '09': 'go', '10': 'ma',
      '11': 'mt', '12': 'ms', '13': 'mg', '14': 'pa', '15': 'pb',
      '16': 'pr', '17': 'pe', '18': 'pi', '19': 'rj', '20': 'rn',
      '21': 'rs', '22': 'ro', '23': 'rr', '24': 'sc', '25': 'sp',
      '26': 'se', '27': 'to',
    };
    const uf = ufMap[tribunal];
    if (uf) return `api_publica_tj${uf}`;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const { processNumber } = await req.json();
    if (!processNumber || typeof processNumber !== 'string') {
      return new Response(JSON.stringify({ error: 'processNumber é obrigatório' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const cleanNumber = processNumber.replace(/\D/g, '');
    if (cleanNumber.length !== 20) {
      return new Response(JSON.stringify({
        error: 'Número de processo inválido. Use o formato CNJ (20 dígitos): NNNNNNN-DD.AAAA.J.TT.OOOO',
      }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const alias = aliasFromProcessNumber(cleanNumber);
    if (!alias) {
      return new Response(JSON.stringify({
        error: 'Tribunal não suportado para consulta automática. Apenas Justiça do Trabalho (TRTs), Federal (TRFs) e Estadual (TJs) estão habilitados.',
      }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const url = `https://api-publica.datajud.cnj.jus.br/${alias}/_search`;
    const body = {
      query: { match: { numeroProcesso: cleanNumber } },
      size: 1,
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `APIKey ${DATAJUD_PUBLIC_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error('DataJud erro:', r.status, text);
      return new Response(JSON.stringify({
        error: `DataJud retornou erro ${r.status}. Tente novamente em instantes.`,
      }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const data = await r.json();
    const hit = data?.hits?.hits?.[0]?._source;

    if (!hit) {
      return new Response(JSON.stringify({
        found: false,
        movimentos: [],
        message: 'Processo não encontrado na base do DataJud (CNJ). Pode levar algumas semanas para novos processos serem indexados.',
      }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const movimentos = (hit.movimentos || [])
      .map((m: any) => ({
        codigo: m.codigo,
        nome: m.nome,
        dataHora: m.dataHora,
        complementosTabelados: m.complementosTabelados || [],
      }))
      .sort((a: any, b: any) => (b.dataHora || '').localeCompare(a.dataHora || ''));

    return new Response(JSON.stringify({
      found: true,
      tribunal: hit.tribunal,
      grau: hit.grau,
      classe: hit.classe?.nome,
      orgaoJulgador: hit.orgaoJulgador?.nome,
      dataAjuizamento: hit.dataAjuizamento,
      movimentos,
    }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('Erro inesperado datajud:', e);
    return new Response(JSON.stringify({
      error: 'Erro inesperado ao consultar DataJud. Tente novamente.',
    }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
