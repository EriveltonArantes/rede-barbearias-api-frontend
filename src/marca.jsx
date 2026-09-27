// Identidade da barbearia (nome, logo, cores): vem do backend e pinta site, painel e app instalado.
import React from "react";
import { API, urlArquivo } from "./api.js";

export const MARCA_PADRAO = {
  nome: "Rede Barbearias", nomeCurto: "Rede Barbear", slogan: "Corte, barba e estilo — agende em 1 minuto", sobre: null,
  logoUrl: null, emoji: "💈", corPrincipal: "#d4a843", corDestaque: "#c0392b", cidade: "Belo Horizonte",
  telefone: null, whatsapp: null, instagram: null, email: null, versao: "0",
};

const CHAVE = "rb_marca";

function lerCache() {
  try {
    const b = localStorage.getItem(CHAVE);
    return b ? { ...MARCA_PADRAO, ...JSON.parse(b) } : null;
  } catch { return null; }
}

function gravarCache(m) {
  try { localStorage.setItem(CHAVE, JSON.stringify(m)); } catch { /* sem storage: busca de novo na próxima visita */ }
}

/** Mistura a cor com branco (fator > 0) ou preto (fator < 0). */
export function misturar(hex, fator) {
  const n = parseInt(String(hex || "#000000").replace("#", ""), 16);
  if (Number.isNaN(n)) return hex;
  const canais = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(fator >= 0 ? c + (255 - c) * fator : c * (1 + fator)));
  return "#" + canais.map((c) => c.toString(16).padStart(2, "0")).join("");
}

function linkNoHead(rel, href, extra = {}) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  Object.entries(extra).forEach(([k, v]) => el.setAttribute(k, v));
  if (el.getAttribute("href") !== href) el.setAttribute("href", href);
}

/** Cores nas variáveis CSS, título da aba, ícone da aba/celular e manifesto do app. */
export function aplicarMarca(m) {
  const raiz = document.documentElement.style;
  raiz.setProperty("--marca-1", m.corPrincipal);
  raiz.setProperty("--marca-1-claro", misturar(m.corPrincipal, 0.45));
  raiz.setProperty("--marca-2", m.corDestaque);
  raiz.setProperty("--marca-2-escuro", misturar(m.corDestaque, -0.4));
  document.title = `${m.nome} — Agende online`;
  const v = encodeURIComponent(m.versao || "0");
  linkNoHead("icon", `${API}/api/publico/icone/192.png?v=${v}`, { type: "image/png" });
  linkNoHead("apple-touch-icon", `${API}/api/publico/icone/180.png?v=${v}`);
  linkNoHead("manifest", `${API}/api/publico/manifest.webmanifest?origem=${encodeURIComponent(window.location.origin)}&v=${v}`);
  let apple = document.head.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (!apple) {
    apple = document.createElement("meta");
    apple.name = "apple-mobile-web-app-title";
    document.head.appendChild(apple);
  }
  apple.content = m.nomeCurto || m.nome;
}

/** Marca atual fora do React (texto de mensagem de WhatsApp montado num clique). */
let atual = MARCA_PADRAO;
export const marcaAtual = () => atual;

export const MarcaCtx = React.createContext({ marca: MARCA_PADRAO, atualizar: () => {} });
export const useMarca = () => React.useContext(MarcaCtx).marca;
export const useAtualizarMarca = () => React.useContext(MarcaCtx).atualizar;

export function MarcaProvider({ children }) {
  const [marca, setMarca] = React.useState(() => lerCache() || MARCA_PADRAO);
  const atualizar = React.useCallback((m) => {
    const nova = { ...MARCA_PADRAO, ...m };
    setMarca(nova);
    gravarCache(nova);
  }, []);
  React.useEffect(() => {
    let vivo = true;
    fetch(API + "/api/publico/marca")
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => { if (vivo && m) atualizar(m); })
      .catch(() => { /* servidor acordando: fica com o cache/padrão */ });
    return () => { vivo = false; };
  }, [atualizar]);
  atual = marca;
  React.useEffect(() => { aplicarMarca(marca); }, [marca]);
  return <MarcaCtx.Provider value={{ marca, atualizar }}>{children}</MarcaCtx.Provider>;
}

/** Logo (imagem enviada) ou emoji + nome, com o pontinho da marca. */
export function Logo({ className = "", mostrarNome = true, tamanho = 30, pontoClasse = "dot" }) {
  const m = useMarca();
  const img = m.logoUrl ? urlArquivo(m.logoUrl) : null;
  return (
    <span className={"marca-logo " + className}>
      {img ? <img src={img} alt={mostrarNome ? "" : m.nome} className="marca-logo-img" style={{ height: tamanho, maxWidth: tamanho * 3 }} />
        : <span aria-hidden="true">{m.emoji || "💈"} </span>}
      {mostrarNome && <span className="marca-logo-nome">{m.nome}<span className={pontoClasse}>.</span></span>}
    </span>
  );
}

/** "Rede Barbearias — Savassi" -> "Savassi" (qualquer marca). */
export function unidadeCurta(nome) {
  return String(nome || "").replace(/^.*? — /, "");
}
