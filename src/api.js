// Cliente HTTP único do sistema: base da API, token, erros legíveis e sessão expirada.
export const API = (import.meta.env.VITE_API_URL || "https://rede-barbearias-api.onrender.com").replace(/\/$/, "");

const CHAVE_SESSAO = "rb_sessao";

function ler(chave) {
  try { return localStorage.getItem(chave); } catch { return null; }
}
function gravar(chave, valor) {
  try {
    if (valor === null) localStorage.removeItem(chave);
    else localStorage.setItem(chave, valor);
  } catch { /* navegador sem storage: a sessão vale só enquanto a aba estiver aberta */ }
}

let sessaoMemoria = null;

export function getSessao() {
  if (sessaoMemoria) return sessaoMemoria;
  const bruto = ler(CHAVE_SESSAO);
  try { sessaoMemoria = bruto ? JSON.parse(bruto) : null; } catch { sessaoMemoria = null; }
  return sessaoMemoria;
}

export function setSessao(s) {
  sessaoMemoria = s;
  gravar(CHAVE_SESSAO, s ? JSON.stringify(s) : null);
}

/** Monta a query string ignorando valores vazios. */
export function qs(params) {
  const p = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, v);
  });
  const s = p.toString();
  return s ? "?" + s : "";
}

/**
 * Chamada à API. Lança Error com a mensagem do backend (campo "erro").
 * 401 com sessão ativa dispara o evento "rb:sessao-expirada" (o App volta pro login).
 */
export async function api(caminho, { method = "GET", body, form } = {}) {
  const headers = {};
  const s = getSessao();
  if (s?.token) headers.Authorization = "Bearer " + s.token;
  let corpo;
  if (form) corpo = form;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    corpo = JSON.stringify(body);
  }
  let r;
  try {
    r = await fetch(API + caminho, { method, headers, body: corpo });
  } catch {
    throw new Error("Sem conexão com o servidor. Se o sistema estava parado, ele pode levar até 1 minuto pra acordar — tente de novo.");
  }
  if (r.status === 204) return null;
  const texto = await r.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  if (!r.ok) {
    if (r.status === 401 && s?.token && !caminho.startsWith("/api/auth/login")) {
      window.dispatchEvent(new Event("rb:sessao-expirada"));
    }
    const msg = (dados && typeof dados === "object" && (dados.erro || dados.message)) || "Erro " + r.status;
    const e = new Error(msg);
    e.status = r.status;
    e.campos = dados?.erros;
    throw e;
  }
  return dados;
}

/** URL absoluta de um arquivo enviado (o backend devolve "/api/arquivos/12"). */
export function urlArquivo(u) {
  if (!u) return null;
  return u.startsWith("/") ? API + u : u;
}

export async function enviarArquivo(file) {
  const form = new FormData();
  form.append("arquivo", file);
  const r = await api("/api/upload", { method: "POST", form });
  return r.url;
}
