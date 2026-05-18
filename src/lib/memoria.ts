/**
 * BLOCO 1 — Rede Neural do LexRisk
 * Fundação de memória + coleta silenciosa de eventos.
 *
 * Camadas:
 *  - individual: por usuário (preferências, teses, feedback de docs)
 *  - escritorio: agregada por law_firm_id (padrões observados em todos os processos)
 *
 * Persistência: localStorage (sem backend nesta etapa).
 * Coleta só ocorre se `user.data_collection_consent === true`.
 */

import type { User } from "@/types";

const STORAGE_KEY = "lexrisk:memoria:v1";
const MAX_EVENTOS = 500;
const MAX_TESES = 100;
const MAX_FEEDBACK = 200;
const MAX_ACORDOS = 200;

export type AcaoFeedbackDoc = "aceito" | "editado" | "rejeitado";

export interface FeedbackDoc {
  tipo_doc: string;
  acao: AcaoFeedbackDoc;
  ts: string;
}

export interface TeseRegistrada {
  texto: string;
  usos: number;
  ultima_ts: string;
}

export interface AcordoRegistrado {
  tipo: string;
  valor: number;
  ts: string;
}

export interface EventoRedeNeural {
  nome: string;
  payload: Record<string, unknown>;
  ts: string;
}

export interface MemoriaIndividual {
  user_id: string;
  feedback_docs: FeedbackDoc[];
  teses: TeseRegistrada[];
  acordos: AcordoRegistrado[];
  eventos: EventoRedeNeural[];
}

export interface MemoriaEscritorio {
  law_firm_id: string;
  eventos: EventoRedeNeural[];
}

interface MemoriaStore {
  individual: Record<string, MemoriaIndividual>;
  escritorio: Record<string, MemoriaEscritorio>;
}

// ---------- Estado interno (em runtime) ----------
let _user: User | null = null;
let _lawFirmId: string | null = null;

export function configurarMemoria(user: User | null, lawFirmId: string | null) {
  _user = user;
  _lawFirmId = lawFirmId;
}

function temConsentimento(): boolean {
  // Opt-in estrito: só coleta se o usuário marcou explicitamente true.
  return _user !== null && _user.data_collection_consent === true;
}

// ---------- I/O ----------
function ler(): MemoriaStore {
  if (typeof localStorage === "undefined") return { individual: {}, escritorio: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { individual: {}, escritorio: {} };
    return JSON.parse(raw) as MemoriaStore;
  } catch {
    return { individual: {}, escritorio: {} };
  }
}

function gravar(store: MemoriaStore) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn("[memoria] falha ao gravar:", e);
  }
}

function getOuCriaIndividual(store: MemoriaStore, userId: string): MemoriaIndividual {
  if (!store.individual[userId]) {
    store.individual[userId] = {
      user_id: userId,
      feedback_docs: [],
      teses: [],
      acordos: [],
      eventos: [],
    };
  }
  return store.individual[userId];
}

function getOuCriaEscritorio(store: MemoriaStore, lawFirmId: string): MemoriaEscritorio {
  if (!store.escritorio[lawFirmId]) {
    store.escritorio[lawFirmId] = { law_firm_id: lawFirmId, eventos: [] };
  }
  return store.escritorio[lawFirmId];
}

function trim<T>(arr: T[], max: number): T[] {
  return arr.length > max ? arr.slice(arr.length - max) : arr;
}

// ---------- API pública ----------

/** Registra reação do usuário a um documento gerado (aceito/editado/rejeitado). */
export function registrarFeedbackDoc(tipo_doc: string, acao: AcaoFeedbackDoc) {
  if (!temConsentimento() || !_user) return;
  const store = ler();
  const ind = getOuCriaIndividual(store, _user.id);
  ind.feedback_docs.push({ tipo_doc, acao, ts: new Date().toISOString() });
  ind.feedback_docs = trim(ind.feedback_docs, MAX_FEEDBACK);
  gravar(store);
}

/** Registra uma tese jurídica que o usuário usou/citou. Incrementa contador se já existir. */
export function registrarTese(texto: string) {
  if (!temConsentimento() || !_user) return;
  const t = (texto || "").trim();
  if (!t) return;
  const store = ler();
  const ind = getOuCriaIndividual(store, _user.id);
  const existente = ind.teses.find((x) => x.texto === t);
  const ts = new Date().toISOString();
  if (existente) {
    existente.usos += 1;
    existente.ultima_ts = ts;
  } else {
    ind.teses.push({ texto: t, usos: 1, ultima_ts: ts });
  }
  ind.teses = trim(
    [...ind.teses].sort((a, b) => b.usos - a.usos),
    MAX_TESES
  );
  gravar(store);
}

/** Registra um acordo realizado (tipo e valor). */
export function registrarAcordo(tipo: string, valor: number) {
  if (!temConsentimento() || !_user) return;
  const store = ler();
  const ind = getOuCriaIndividual(store, _user.id);
  ind.acordos.push({ tipo, valor: Number(valor) || 0, ts: new Date().toISOString() });
  ind.acordos = trim(ind.acordos, MAX_ACORDOS);
  gravar(store);
}

/** Registra um evento genérico (silencioso). Vai para individual + escritório. */
export function registrarEvento(nome: string, payload: Record<string, unknown> = {}) {
  if (!temConsentimento()) return;
  const store = ler();
  const ts = new Date().toISOString();
  const ev: EventoRedeNeural = { nome, payload, ts };

  if (_user) {
    const ind = getOuCriaIndividual(store, _user.id);
    ind.eventos.push(ev);
    ind.eventos = trim(ind.eventos, MAX_EVENTOS);
  }
  if (_lawFirmId) {
    const esc = getOuCriaEscritorio(store, _lawFirmId);
    esc.eventos.push(ev);
    esc.eventos = trim(esc.eventos, MAX_EVENTOS);
  }
  gravar(store);
}

/** Retorna a memória do usuário atual (e do escritório). */
export function getMemoria(): {
  individual: MemoriaIndividual | null;
  escritorio: MemoriaEscritorio | null;
} {
  const store = ler();
  return {
    individual: _user ? store.individual[_user.id] ?? null : null,
    escritorio: _lawFirmId ? store.escritorio[_lawFirmId] ?? null : null,
  };
}

/** Limpa toda a memória do usuário atual. Útil para opt-out. */
export function limparMemoriaUsuario() {
  if (!_user) return;
  const store = ler();
  delete store.individual[_user.id];
  gravar(store);
}
