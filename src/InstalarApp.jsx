import React from "react";
import { API } from "./api.js";
import { useMarca } from "./marca.jsx";

/**
 * "Instalar o app": no Android/Chrome usa o convite nativo do navegador; no iPhone
 * (Safari não tem esse convite) mostra o passo a passo do "Adicionar à Tela de Início".
 * Já instalado (aberto como app) ou dispensado: não aparece.
 */
let convite = null;
const ouvintes = new Set();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    convite = e;
    ouvintes.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => {
    convite = null;
    ouvintes.forEach((f) => f());
  });
}

export function registrarServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || import.meta.env.DEV) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* sem SW o site funciona igual */ });
  });
}

function jaInstalado() {
  try {
    return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
  } catch { return false; }
}

function ehIphone() {
  const ua = window.navigator.userAgent || "";
  return /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
}

const CHAVE_DISPENSA = "rb_instalar_dispensado";

function dispensadoRecente() {
  try {
    const t = Number(localStorage.getItem(CHAVE_DISPENSA) || 0);
    return Date.now() - t < 14 * 24 * 3600 * 1000;
  } catch { return false; }
}

export function useInstalarApp() {
  const [, forcar] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    ouvintes.add(forcar);
    return () => ouvintes.delete(forcar);
  }, []);
  const disponivel = !jaInstalado() && (!!convite || ehIphone());
  const instalar = async () => {
    if (!convite) return false;
    convite.prompt();
    const escolha = await convite.userChoice.catch(() => null);
    convite = null;
    forcar();
    return escolha?.outcome === "accepted";
  };
  return { disponivel, iphone: !convite && ehIphone(), instalar };
}

/** Faixa flutuante no site/área do cliente. variante="botao" vira só um botão (topo do painel). */
export default function InstalarApp({ variante = "faixa", texto }) {
  const marca = useMarca();
  const { disponivel, iphone, instalar } = useInstalarApp();
  const [fechado, setFechado] = React.useState(() => variante === "faixa" && dispensadoRecente());
  const [passos, setPassos] = React.useState(false);
  if (!disponivel || fechado) return null;

  const clicar = async () => {
    if (iphone) { setPassos((p) => !p); return; }
    await instalar();
  };

  if (variante === "botao") {
    return (
      <>
        <button className="btn btn-ghost btn-sm" onClick={clicar} title="Instalar como app no celular ou computador">📲 Instalar app</button>
        {passos && <PassosIphone onFechar={() => setPassos(false)} flutuante />}
      </>
    );
  }

  const fechar = () => {
    setFechado(true);
    try { localStorage.setItem(CHAVE_DISPENSA, String(Date.now())); } catch { /* ok */ }
  };
  return (
    <div className="instalar-app instalar-flutuante" role="dialog" aria-label="Instalar o app">
      <img src={`${API}/api/publico/icone/192.png?v=${encodeURIComponent(marca.versao || "0")}`} alt="" />
      <div style={{ flex: 1 }}>
        <b>{texto || `Tenha a ${marca.nome} no celular`}</b>
        <p>{iphone ? "Agende em 2 toques, direto da tela inicial." : "Instale grátis — sem loja de aplicativos, ocupa quase nada."}</p>
        {passos && <ListaPassosIphone />}
      </div>
      <button className="btn btn-primary btn-sm" onClick={clicar}>{iphone ? (passos ? "Ok" : "Como?") : "Instalar"}</button>
      <button className="fechar" onClick={fechar} aria-label="Agora não">×</button>
    </div>
  );
}

function ListaPassosIphone() {
  return (
    <ol className="passos-ios">
      <li>Toque em <b style={{ display: "inline" }}>Compartilhar</b> (o quadrado com a seta ⬆️) na barra do Safari</li>
      <li>Escolha <b style={{ display: "inline" }}>Adicionar à Tela de Início</b></li>
      <li>Toque em <b style={{ display: "inline" }}>Adicionar</b> — pronto, o ícone aparece junto dos seus apps</li>
    </ol>
  );
}

function PassosIphone({ onFechar }) {
  return (
    <div className="instalar-app instalar-flutuante" role="dialog" aria-label="Como instalar no iPhone">
      <div style={{ flex: 1 }}>
        <b>Instalar no iPhone</b>
        <ListaPassosIphone />
      </div>
      <button className="fechar" onClick={onFechar} aria-label="Fechar">×</button>
    </div>
  );
}
