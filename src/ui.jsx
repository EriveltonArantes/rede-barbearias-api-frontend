import React from "react";
import { api, urlArquivo, enviarArquivo } from "./api.js";
import { iniciais, moeda, STATUS, mensagemErro } from "./util.js";

// ------------------------------------------------------------------ dados

/** Carrega um endpoint e recarrega quando as dependências mudam. */
export function useApi(caminho, deps = []) {
  const [estado, setEstado] = React.useState({ dados: null, carregando: true, erro: "" });
  const [versao, setVersao] = React.useState(0);
  React.useEffect(() => {
    if (!caminho) { setEstado({ dados: null, carregando: false, erro: "" }); return; }
    let vivo = true;
    setEstado((e) => ({ ...e, carregando: true, erro: "" }));
    api(caminho)
      .then((d) => vivo && setEstado({ dados: d, carregando: false, erro: "" }))
      .catch((e) => vivo && setEstado({ dados: null, carregando: false, erro: mensagemErro(e) }));
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caminho, versao, ...deps]);
  return { ...estado, recarregar: () => setVersao((v) => v + 1) };
}

// ------------------------------------------------------------------ avisos

const ToastCtx = React.createContext(() => {});
export function ToastProvider({ children }) {
  const [itens, setItens] = React.useState([]);
  const avisar = React.useCallback((texto, tipo = "ok") => {
    const id = Math.random();
    setItens((l) => [...l, { id, texto, tipo }]);
    setTimeout(() => setItens((l) => l.filter((x) => x.id !== id)), tipo === "erro" ? 6500 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={avisar}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {itens.map((t) => (
          <div key={t.id} className={"toast toast-" + t.tipo}>{t.tipo === "erro" ? "⚠️ " : "✓ "}{t.texto}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => React.useContext(ToastCtx);

/** Executa uma ação com aviso de sucesso/erro e trava de clique duplo. */
export function useAcao() {
  const avisar = useToast();
  const [ocupado, setOcupado] = React.useState(false);
  const executar = async (fn, sucesso) => {
    if (ocupado) return undefined;
    setOcupado(true);
    try {
      const r = await fn();
      if (sucesso) avisar(sucesso);
      return r ?? true;
    } catch (e) {
      avisar(mensagemErro(e), "erro");
      return undefined;
    } finally {
      setOcupado(false);
    }
  };
  return [executar, ocupado];
}

// ------------------------------------------------------------------ estrutura

export function Modal({ titulo, onClose, children, largura, rodape }) {
  React.useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" style={largura ? { width: largura } : undefined} onMouseDown={(e) => e.stopPropagation()}
           role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-cabeca">
          <h3>{titulo}</h3>
          <button className="btn-icone" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="modal-corpo">{children}</div>
        {rodape && <div className="modal-rodape">{rodape}</div>}
      </div>
    </div>
  );
}

const ConfirmCtx = React.createContext(async () => false);
export function ConfirmProvider({ children }) {
  const [pedido, setPedido] = React.useState(null);
  const confirmar = React.useCallback((texto, { perigo = false, ok = "Confirmar" } = {}) =>
    new Promise((resolve) => setPedido({ texto, perigo, ok, resolve })), []);
  const fechar = (v) => { pedido?.resolve(v); setPedido(null); };
  return (
    <ConfirmCtx.Provider value={confirmar}>
      {children}
      {pedido && (
        <Modal titulo="Confirmar" onClose={() => fechar(false)} largura={400}
               rodape={<>
                 <button className="btn btn-ghost" onClick={() => fechar(false)}>Voltar</button>
                 <button className={"btn " + (pedido.perigo ? "btn-danger" : "btn-primary")} onClick={() => fechar(true)} autoFocus>{pedido.ok}</button>
               </>}>
          <p className="texto-confirmar">{pedido.texto}</p>
        </Modal>
      )}
    </ConfirmCtx.Provider>
  );
}
export const useConfirmar = () => React.useContext(ConfirmCtx);

export function Campo({ label, children, dica, largo }) {
  return (
    <label className={"campo" + (largo ? " campo-largo" : "")}>
      <span className="campo-label">{label}</span>
      {children}
      {dica && <span className="campo-dica">{dica}</span>}
    </label>
  );
}

export function Grade({ children }) {
  return <div className="form-grade">{children}</div>;
}

export function Cabecalho({ titulo, sub, children }) {
  return (
    <div className="panel-header">
      <div>
        <h2>{titulo}</h2>
        {sub && <p className="panel-sub">{sub}</p>}
      </div>
      <div className="panel-header-right">{children}</div>
    </div>
  );
}

export function Abas({ abas, atual, onChange }) {
  return (
    <div className="abas" role="tablist">
      {abas.map(([id, rotulo]) => (
        <button key={id} role="tab" aria-selected={atual === id} className={"aba" + (atual === id ? " ativa" : "")}
                onClick={() => onChange(id)}>{rotulo}</button>
      ))}
    </div>
  );
}

export function Carregando({ texto = "Carregando..." }) {
  return <div className="estado-vazio"><span className="spinner" aria-hidden="true"></span>{texto}</div>;
}
export function Vazio({ icone = "🗂️", texto, children }) {
  return <div className="estado-vazio"><div className="estado-ico">{icone}</div><div>{texto}</div>{children}</div>;
}
export function Erro({ texto, onTentar }) {
  return (
    <div className="estado-vazio estado-erro">
      <div className="estado-ico">⚠️</div><div>{texto}</div>
      {onTentar && <button className="btn btn-ghost btn-sm" onClick={onTentar}>Tentar de novo</button>}
    </div>
  );
}

/** Mostra carregando/erro/vazio e só renderiza o conteúdo quando há dados. */
export function Estado({ req, vazio, children }) {
  if (req.carregando && !req.dados) return <Carregando />;
  if (req.erro) return <Erro texto={req.erro} onTentar={req.recarregar} />;
  if (vazio && (!req.dados || (Array.isArray(req.dados) && req.dados.length === 0))) return vazio;
  return children(req.dados);
}

// ------------------------------------------------------------------ peças

export function Kpi({ icone, rotulo, valor, detalhe, tom }) {
  return (
    <div className={"kpi" + (tom ? " kpi-" + tom : "")}>
      <div className="kpi-ico" aria-hidden="true">{icone}</div>
      <div className="kpi-txt">
        <span className="kpi-valor">{valor}</span>
        <span className="kpi-rotulo">{rotulo}</span>
        {detalhe && <span className="kpi-detalhe">{detalhe}</span>}
      </div>
    </div>
  );
}

export function StatusPill({ status }) {
  const s = STATUS[status] || { rotulo: status, classe: "" };
  return <span className={"pill " + s.classe}>{s.icone} {s.rotulo}</span>;
}

export function Pill({ children, tom = "neutro" }) {
  return <span className={"pill pill-" + tom}>{children}</span>;
}

export function Avatar({ nome, foto, tamanho = 40 }) {
  const url = urlArquivo(foto);
  const [falhou, setFalhou] = React.useState(false);
  const estilo = { width: tamanho, height: tamanho, fontSize: tamanho * 0.38 };
  if (url && !falhou) return <img className="avatar" src={url} alt={nome} style={estilo} onError={() => setFalhou(true)} />;
  return <span className="avatar avatar-ini" style={estilo} aria-hidden="true">{iniciais(nome)}</span>;
}

export function Estrelas({ nota, onChange, tamanho = 18 }) {
  return (
    <span className="estrelas" role={onChange ? "radiogroup" : "img"} aria-label={nota ? `${nota} de 5 estrelas` : "sem nota"}>
      {[1, 2, 3, 4, 5].map((n) => (
        onChange ? (
          <button key={n} type="button" onClick={() => onChange(n)} style={{ fontSize: tamanho }}
                  className={"estrela" + (n <= (nota || 0) ? " cheia" : "")} aria-label={`${n} estrela${n > 1 ? "s" : ""}`}>★</button>
        ) : (
          <span key={n} style={{ fontSize: tamanho }} className={"estrela" + (n <= (nota || 0) ? " cheia" : "")} aria-hidden="true">★</span>
        )
      ))}
    </span>
  );
}

export function Upload({ valor, onChange, rotulo = "Enviar foto" }) {
  const [executar, ocupado] = useAcao();
  const escolher = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const url = await executar(() => enviarArquivo(f), "Arquivo enviado");
    if (url) onChange(url);
  };
  return (
    <div className="upload">
      {valor && <img src={urlArquivo(valor)} alt="" className="upload-previa" />}
      <label className="btn btn-ghost btn-sm">
        {ocupado ? "Enviando..." : valor ? "Trocar" : rotulo}
        <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" hidden onChange={escolher} />
      </label>
      {valor && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange("")}>Remover</button>}
    </div>
  );
}

export function SeletorDias({ valor, onChange }) {
  const set = new Set(String(valor || "").split(",").filter(Boolean));
  const alternar = (n) => {
    set.has(n) ? set.delete(n) : set.add(n);
    onChange([...set].sort().join(","));
  };
  return (
    <div className="dias-sel">
      {[["1", "Seg"], ["2", "Ter"], ["3", "Qua"], ["4", "Qui"], ["5", "Sex"], ["6", "Sáb"], ["7", "Dom"]].map(([n, r]) => (
        <button type="button" key={n} className={"dia-chip" + (set.has(n) ? " on" : "")} onClick={() => alternar(n)}
                aria-pressed={set.has(n)}>{r}</button>
      ))}
    </div>
  );
}

/** Pix: QR Code + copia-e-cola gerados pelo backend. */
export function PixCobranca({ valor, unidadeId, referencia }) {
  const [pix, setPix] = React.useState(null);
  const [erro, setErro] = React.useState("");
  const [copiado, setCopiado] = React.useState(false);
  React.useEffect(() => {
    if (!valor || Number(valor) <= 0) return;
    setPix(null); setErro("");
    api("/api/pix/gerar", { method: "POST", body: { valor, unidadeId, referencia, descricao: "Rede Barbearias" } })
      .then(setPix).catch((e) => setErro(e.message));
  }, [valor, unidadeId, referencia]);
  if (!valor || Number(valor) <= 0) return null;
  if (erro) return <p className="texto-erro">{erro}</p>;
  if (!pix) return <Carregando texto="Gerando Pix..." />;
  return (
    <div className="pix-box">
      <img className="pix-qr" src={pix.qrCodeBase64} alt={"QR Code Pix de " + moeda(pix.valor)} />
      <div className="pix-info">
        <b>{moeda(pix.valor)}</b>
        <span>Recebedor: {pix.recebedor}</span>
        <span>Chave: {pix.chave}</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
          navigator.clipboard?.writeText(pix.payload); setCopiado(true); setTimeout(() => setCopiado(false), 2000);
        }}>{copiado ? "Copiado ✓" : "Copiar Pix copia-e-cola"}</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ gráficos (SVG, sem biblioteca)

/**
 * Área/linha de 1 a 3 séries empilhadas com crosshair e tooltip.
 * series: [{ chave, rotulo, cor }]; dados: [{ rotuloX, [chave]: número }]
 */
export function GraficoArea({ dados, series, altura = 220, formatar = moeda }) {
  const [hover, setHover] = React.useState(null);
  const ref = React.useRef(null);
  const [largura, setLargura] = React.useState(600);
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(260, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  if (!dados?.length) return <Vazio texto="Sem dados no período." />;
  const m = { t: 12, r: 12, b: 26, l: 56 };
  const w = largura - m.l - m.r, h = altura - m.t - m.b;
  const totais = dados.map((d) => series.reduce((s, x) => s + Number(d[x.chave] || 0), 0));
  // degraus "redondos" no eixo (1, 2, 2,5 ou 5 × 10^n) em vez de valores quebrados
  const bruto = Math.max(1, ...totais) / 4;
  const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
  const passo = [1, 2, 2.5, 5, 10].map((f) => f * potencia).find((v) => v >= bruto);
  const max = passo * 4;
  const x = (i) => m.l + (dados.length === 1 ? w / 2 : (i * w) / (dados.length - 1));
  const y = (v) => m.t + h - (v / max) * h;
  const acumulado = dados.map(() => 0);
  const camadas = series.map((s) => {
    const base = [...acumulado];
    dados.forEach((d, i) => { acumulado[i] += Number(d[s.chave] || 0); });
    const topo = [...acumulado];
    const linha = topo.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
    const area = linha + " " + base.map((v, i) => `L${x(base.length - 1 - i)},${y(base[base.length - 1 - i])}`).join(" ") + " Z";
    return { ...s, linha, area };
  });
  const ticks = [0, 1, 2, 3, 4].map((i) => i * passo);
  const passoRotulo = Math.ceil(dados.length / Math.max(2, Math.floor(w / 70)));
  const mover = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left - m.l;
    const i = Math.round((px / w) * (dados.length - 1));
    setHover(Math.max(0, Math.min(dados.length - 1, i)));
  };
  return (
    <div className="grafico" ref={ref}>
      {series.length > 1 && (
        <div className="legenda">
          {series.map((s) => <span key={s.chave}><i style={{ background: s.cor }}></i>{s.rotulo}</span>)}
        </div>
      )}
      <svg width={largura} height={altura} onMouseMove={mover} onMouseLeave={() => setHover(null)} role="img"
           aria-label={"Gráfico: " + series.map((s) => s.rotulo).join(", ")}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={m.l} x2={m.l + w} y1={y(t)} y2={y(t)} className="grade-linha" />
            <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="eixo-txt">
              {t >= 1000 ? (t / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "k" : Math.round(t)}
            </text>
          </g>
        ))}
        {camadas.map((c) => (
          <g key={c.chave}>
            <path d={c.area} fill={c.cor} opacity={series.length > 1 ? 0.55 : 0.22} />
            <path d={c.linha} fill="none" stroke={c.cor} strokeWidth="2" strokeLinejoin="round" />
          </g>
        ))}
        {dados.map((d, i) => (i % passoRotulo === 0 || i === dados.length - 1) && (
          <text key={i} x={x(i)} y={altura - 6} textAnchor="middle" className="eixo-txt">{d.rotuloX}</text>
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + h} className="crosshair" />
            <circle cx={x(hover)} cy={y(totais[hover])} r="5" fill={series[series.length - 1].cor} stroke="var(--card)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="tooltip" style={{ left: Math.min(x(hover) + 12, largura - 170), top: 8 }}>
          <b>{dados[hover].rotuloX}</b>
          {series.map((s) => (
            <div key={s.chave}><i style={{ background: s.cor }}></i>{s.rotulo}: {formatar(dados[hover][s.chave])}</div>
          ))}
          {series.length > 1 && <div className="tooltip-total">Total: {formatar(totais[hover])}</div>}
        </div>
      )}
    </div>
  );
}

/** Barras horizontais com rótulo e valor — rankings e comparações. */
export function BarrasH({ itens, formatar = (v) => v, cor = "var(--serie-1)" }) {
  if (!itens?.length) return <Vazio texto="Sem dados no período." />;
  const max = Math.max(1, ...itens.map((i) => Number(i.valor) || 0));
  return (
    <div className="barras-h">
      {itens.map((i) => (
        <div className="barra-linha" key={i.rotulo} title={`${i.rotulo}: ${formatar(i.valor)}`}>
          <span className="barra-rotulo">{i.rotulo}</span>
          <span className="barra-trilho"><span className="barra" style={{ width: (Number(i.valor) / max) * 100 + "%", background: i.cor || cor }}></span></span>
          <span className="barra-valor">{formatar(i.valor)}</span>
        </div>
      ))}
    </div>
  );
}

/** Colunas verticais simples (1 série) com tooltip por barra. */
export function Colunas({ itens, formatar = (v) => v, altura = 160 }) {
  const [hover, setHover] = React.useState(null);
  if (!itens?.length) return <Vazio texto="Sem dados." />;
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <div className="colunas" style={{ height: altura }}>
      {itens.map((i, k) => (
        <div className="coluna" key={i.rotulo} onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover(null)}>
          {hover === k && <span className="coluna-tip">{formatar(i.valor)}</span>}
          <span className="coluna-barra" style={{ height: (i.valor / max) * 100 + "%" }}></span>
          <span className="coluna-rotulo">{i.rotulo}</span>
        </div>
      ))}
    </div>
  );
}

export function useTabela(linhas, porPagina = 15) {
  const [pagina, setPagina] = React.useState(1);
  const total = Math.max(1, Math.ceil((linhas?.length || 0) / porPagina));
  const atual = Math.min(pagina, total);
  React.useEffect(() => { setPagina(1); }, [linhas?.length]);
  const fatia = (linhas || []).slice((atual - 1) * porPagina, atual * porPagina);
  const paginacao = total > 1 ? (
    <div className="pagination">
      <button className="btn btn-ghost btn-sm" disabled={atual === 1} onClick={() => setPagina(atual - 1)}>← Anterior</button>
      <span className="pagination-info">Página {atual} de {total} · {linhas.length} registros</span>
      <button className="btn btn-ghost btn-sm" disabled={atual === total} onClick={() => setPagina(atual + 1)}>Próxima →</button>
    </div>
  ) : null;
  return [fatia, paginacao];
}
