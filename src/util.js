// Formatação, rótulos e pequenas ações (WhatsApp, CSV, agenda) usadas em todo o sistema.

const fmtMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const moeda = (v) => fmtMoeda.format(Number(v || 0));
export const numero = (v) => Number(v || 0).toLocaleString("pt-BR");

const p2 = (n) => String(n).padStart(2, "0");

/** Data local em ISO (YYYY-MM-DD) — nunca usar toISOString, que converte pra UTC. */
export function isoData(d = new Date()) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
export function hojeISO() { return isoData(new Date()); }
export function somarDias(iso, n) {
  const [a, m, d] = iso.split("-").map(Number);
  return isoData(new Date(a, m - 1, d + n));
}
export function primeiroDiaMes(iso = hojeISO()) { return iso.slice(0, 8) + "01"; }
export function parseLocal(s) {
  if (!s) return null;
  if (s.length === 10) { const [a, m, d] = s.split("-").map(Number); return new Date(a, m - 1, d); }
  return new Date(s);
}
export function dataBR(s) {
  const d = parseLocal(s);
  return d ? d.toLocaleDateString("pt-BR") : "—";
}
export function dataCurta(s) {
  const d = parseLocal(s);
  return d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—";
}
export function hora(s) {
  return s ? String(s).slice(11, 16) : "—";
}
export function dataHora(s) {
  const d = parseLocal(s);
  return d ? d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
}
export function diaSemana(iso) {
  return parseLocal(iso).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}
export function dataExtenso(iso) {
  return parseLocal(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}
export function minutosDoDia(s) {
  const [h, m] = String(s).slice(11, 16).split(":").map(Number);
  return h * 60 + m;
}
export function hhmmParaMin(t) {
  const [h, m] = String(t).slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}
export function minParaHHMM(m) { return `${p2(Math.floor(m / 60))}:${p2(m % 60)}`; }

export function telefone(v) {
  const d = String(v || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? "(" + d : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
export function telefoneValido(v) {
  const d = String(v || "").replace(/\D/g, "");
  return d.length === 10 || d.length === 11;
}

/** Link de WhatsApp (wa.me) com mensagem pronta — grátis, abre no app do celular ou no WhatsApp Web. */
export function linkWhatsApp(tel, mensagem) {
  let d = String(tel || "").replace(/\D/g, "");
  if (!d) return null;
  if (!d.startsWith("55")) d = "55" + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(mensagem || "")}`;
}

export function primeiroNome(n) { return String(n || "").trim().split(/\s+/)[0] || ""; }
export function iniciais(n) {
  const partes = String(n || "?").trim().split(/\s+/);
  return ((partes[0]?.[0] || "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

export const STATUS = {
  AGENDADO: { rotulo: "Agendado", classe: "st-agendado", icone: "🕓" },
  CONFIRMADO: { rotulo: "Confirmado", classe: "st-confirmado", icone: "✔️" },
  EM_ATENDIMENTO: { rotulo: "Na cadeira", classe: "st-atendimento", icone: "✂️" },
  CONCLUIDO: { rotulo: "Concluído", classe: "st-concluido", icone: "✅" },
  CANCELADO: { rotulo: "Cancelado", classe: "st-cancelado", icone: "✖️" },
  NAO_COMPARECEU: { rotulo: "Faltou", classe: "st-falta", icone: "⚠️" },
};

export const FORMAS = {
  PIX: "Pix", DINHEIRO: "Dinheiro", CARTAO_CREDITO: "Crédito", CARTAO_DEBITO: "Débito",
  ASSINATURA: "Clube", CORTESIA: "Cortesia (fidelidade)",
};
export const FORMAS_PAGAVEIS = ["PIX", "DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO"];

export const ORIGENS = { BALCAO: "Balcão", TELEFONE: "Telefone", WHATSAPP: "WhatsApp", ONLINE: "Site", APP_CLIENTE: "App do cliente" };

export const CATEGORIAS_SERVICO = {
  CORTE: "Corte", BARBA: "Barba", COMBO: "Combo", QUIMICA: "Química", ESTETICA: "Estética", OUTROS: "Outros",
};
export const CATEGORIAS_DESPESA = {
  ALUGUEL: "Aluguel", SALARIOS: "Salários", PRODUTOS: "Produtos/insumos", CONTAS_CONSUMO: "Água, luz, internet",
  MARKETING: "Marketing", MANUTENCAO: "Manutenção", IMPOSTOS: "Impostos", OUTROS: "Outros",
};
export const PAPEIS = {
  ADMIN: "Administrador", GERENTE: "Gerente", RECEPCAO: "Recepção", BARBEIRO: "Barbeiro", CLIENTE: "Cliente",
};
export const DIAS_SEMANA = [
  ["1", "Seg"], ["2", "Ter"], ["3", "Qua"], ["4", "Qui"], ["5", "Sex"], ["6", "Sáb"], ["7", "Dom"],
];
export function diasLegiveis(csv) {
  if (!csv) return "Todos os dias da unidade";
  const set = new Set(String(csv).split(","));
  return DIAS_SEMANA.filter(([n]) => set.has(n)).map(([, r]) => r).join(", ");
}

/** Baixa um CSV (abre certinho no Excel: separador ; e BOM UTF-8). */
export function baixarCSV(nome, colunas, linhas) {
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const conteudo = [colunas.map((c) => esc(c.titulo)).join(";")]
    .concat(linhas.map((l) => colunas.map((c) => esc(c.valor(l))).join(";")))
    .join("\n");
  const blob = new Blob(["﻿" + conteudo], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Link "adicionar ao Google Agenda" pro cliente não esquecer o horário. */
export function linkGoogleAgenda({ titulo, inicio, fim, local, detalhes }) {
  const f = (s) => String(s).slice(0, 16).replace(/[-:]/g, "") + "00";
  const p = new URLSearchParams({
    action: "TEMPLATE", text: titulo, dates: `${f(inicio)}/${f(fim)}`,
    ctz: "America/Sao_Paulo", location: local || "", details: detalhes || "",
  });
  return "https://calendar.google.com/calendar/render?" + p.toString();
}

export function copiar(texto) {
  try { navigator.clipboard.writeText(texto); return true; } catch { return false; }
}

export function mensagemErro(e) {
  if (!e) return "";
  if (e.campos) return Object.entries(e.campos).map(([k, v]) => `${k}: ${v}`).join(" · ");
  return e.message || String(e);
}

/** Situação do sinal por Pix (mesmos nomes do backend). */
export const SINAL = {
  PENDENTE: { rotulo: "aguardando Pix", tom: "aviso" },
  PAGO: { rotulo: "pago", tom: "bom" },
  ABATIDO: { rotulo: "descontado no dia", tom: "bom" },
  A_DEVOLVER: { rotulo: "a devolver", tom: "aviso" },
  DEVOLVIDO: { rotulo: "devolvido", tom: "neutro" },
  RETIDO: { rotulo: "retido (falta/cancelamento tardio)", tom: "ruim" },
  EXPIRADO: { rotulo: "não pago", tom: "neutro" },
};

export const PERIODOS_ESPERA = { QUALQUER: "Qualquer horário", MANHA: "Manhã (até 12h)", TARDE: "Tarde (12h–18h)", NOITE: "Noite (depois das 18h)" };

/** Baixa um objeto como arquivo .json (ex.: "meus dados" da LGPD). */
export function baixarJSON(nome, dados) {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

/** Parâmetros depois do "?" na rota com hash (#/agendar?unidade=1&servico=2). */
export function paramsDoHash() {
  const h = typeof window === "undefined" ? "" : window.location.hash || "";
  return new URLSearchParams(h.includes("?") ? h.slice(h.indexOf("?") + 1) : "");
}
