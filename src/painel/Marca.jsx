import React from "react";
import { API, api, urlArquivo } from "../api.js";
import { MARCA_PADRAO, misturar, useAtualizarMarca } from "../marca.jsx";
import { Cabecalho, Campo, Estado, Upload, useAcao, useApi } from "../ui.jsx";
import { telefone } from "../util.js";

const CAMPOS = ["nome", "nomeCurto", "slogan", "sobre", "logoUrl", "emoji", "corPrincipal", "corDestaque", "cidade", "telefone", "whatsapp", "instagram", "email"];

const PALETAS = [
  ["Latão e vinho (padrão)", "#d4a843", "#c0392b"],
  ["Azul navalha", "#4aa3ff", "#1d4ed8"],
  ["Verde barbearia", "#34d399", "#0f766e"],
  ["Rosa studio", "#f472b6", "#9d174d"],
  ["Laranja vintage", "#f59e0b", "#b45309"],
  ["Prata clássico", "#cbd5e1", "#475569"],
];

function Previa({ f }) {
  const logo = f.logoUrl ? urlArquivo(f.logoUrl) : null;
  return (
    <div className="marca-previa" aria-label="Prévia">
      <div className="marca-previa-topo">
        <span className="marca-logo">{logo ? <img src={logo} alt="" className="marca-logo-img" style={{ height: 28 }} /> : f.emoji || "💈"} {f.nome || "Sua barbearia"}<span style={{ color: f.corDestaque }}>.</span></span>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: ".75rem", background: f.corDestaque, borderRadius: 999, padding: "5px 12px" }}>📅 Agendar</span>
      </div>
      <div className="marca-previa-hero" style={{ background: `linear-gradient(150deg, #0d0b0a 0%, ${misturar(f.corDestaque, -0.4)} 55%, #0d0b0a 100%)` }}>
        <small style={{ color: misturar(f.corPrincipal, 0.45) }}>{f.cidade || "Sua cidade"}</small>
        <h3 style={{ margin: "4px 0", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", color: "#fff" }}>{f.slogan || "Seu slogan aqui"}</h3>
        <span className="btn-previa" style={{ background: f.corPrincipal }}>Agendar agora</span>
      </div>
    </div>
  );
}

/** Nome, logo, cores e contatos da barbearia: muda site, painel, app no celular e as mensagens. */
export default function MarcaPagina() {
  const req = useApi("/api/configuracoes/marca");
  const atualizarMarca = useAtualizarMarca();
  const [f, setF] = React.useState(null);
  const [executar, ocupado] = useAcao();
  const [versaoIcone, setVersaoIcone] = React.useState(Date.now());
  React.useEffect(() => {
    if (req.dados) {
      const m = {};
      CAMPOS.forEach((k) => { m[k] = req.dados[k] ?? ""; });
      m.whatsapp = telefone(m.whatsapp || "");
      setF(m);
    }
  }, [req.dados]);
  const set = (k) => (e) => {
    const v = e && e.target ? e.target.value : e;
    setF((x) => ({ ...x, [k]: k === "whatsapp" ? telefone(v) : v }));
  };

  const salvar = async (e) => {
    e.preventDefault();
    const corpo = {};
    CAMPOS.forEach((k) => { corpo[k] = f[k] === "" ? null : f[k]; });
    corpo.nome = f.nome;
    const r = await executar(() => api("/api/configuracoes/marca", { method: "PUT", body: corpo }), "Marca salva — o site e o app já estão com a cara nova");
    if (r) {
      const publica = await api("/api/publico/marca?t=" + Date.now()).catch(() => null);
      atualizarMarca(publica || { ...MARCA_PADRAO, ...r });
      setVersaoIcone(Date.now());
    }
  };

  return (
    <div>
      <Cabecalho titulo="Marca e aparência" sub="Nome, logo, cores e contatos. Muda o site, o painel, o app no celular e as mensagens de WhatsApp/e-mail." />
      <Estado req={req}>
        {() => f && (
          <form onSubmit={salvar} className="regras">
            <div className="dash-colunas">
              <section className="cartao">
                <h3>🏷️ Identidade</h3>
                <div className="form-grade">
                  <Campo label="Nome da barbearia"><input value={f.nome} onChange={set("nome")} required minLength={2} maxLength={80} /></Campo>
                  <Campo label="Nome curto (embaixo do ícone no celular)" dica="Até 12 letras cabe sem cortar"><input value={f.nomeCurto} onChange={set("nomeCurto")} maxLength={20} placeholder={f.nome.slice(0, 12)} /></Campo>
                  <Campo label="Slogan" largo><input value={f.slogan} onChange={set("slogan")} maxLength={120} /></Campo>
                  <Campo label="Sobre (rodapé do site)" largo><textarea rows={3} value={f.sobre} onChange={set("sobre")} maxLength={600} /></Campo>
                  <Campo label="Cidade"><input value={f.cidade} onChange={set("cidade")} maxLength={80} /></Campo>
                  <Campo label="Emoji (quando não tem logo)"><input value={f.emoji} onChange={set("emoji")} maxLength={8} style={{ width: 90 }} /></Campo>
                </div>
                <b className="rotulo-bloco">Logo</b>
                <p className="texto-fraco">PNG com fundo transparente fica melhor. Ela vira também o ícone do app no celular.</p>
                <Upload valor={f.logoUrl} onChange={(url) => setF((x) => ({ ...x, logoUrl: url || "" }))} rotulo="Enviar logo" />
              </section>
              <section className="cartao">
                <h3>🎨 Cores</h3>
                <div className="form-grade">
                  <Campo label="Cor principal (botões, destaques)">
                    <div className="cores-linha"><input type="color" value={f.corPrincipal} onChange={set("corPrincipal")} aria-label="Cor principal" /><input value={f.corPrincipal} onChange={set("corPrincipal")} maxLength={7} /></div>
                  </Campo>
                  <Campo label="Cor de destaque (fundo do topo, detalhes)">
                    <div className="cores-linha"><input type="color" value={f.corDestaque} onChange={set("corDestaque")} aria-label="Cor de destaque" /><input value={f.corDestaque} onChange={set("corDestaque")} maxLength={7} /></div>
                  </Campo>
                </div>
                <div className="filtros" style={{ flexWrap: "wrap" }}>
                  {PALETAS.map(([nome, a, b]) => (
                    <button type="button" key={nome} className="chip" onClick={() => setF((x) => ({ ...x, corPrincipal: a, corDestaque: b }))}>
                      <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 4, background: a, marginRight: 4 }}></span>
                      <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 4, background: b, marginRight: 6 }}></span>{nome}
                    </button>
                  ))}
                </div>
                <b className="rotulo-bloco" style={{ marginTop: 14 }}>Prévia</b>
                <Previa f={f} />
                <div className="acoes-linha" style={{ marginTop: 12, alignItems: "center" }}>
                  <img className="marca-previa-icone" src={`${API}/api/publico/icone/192.png?v=${versaoIcone}`} alt="Ícone do app" />
                  <small className="texto-fraco">Ícone do app no celular (atualiza depois de salvar).</small>
                </div>
              </section>
            </div>
            <section className="cartao">
              <h3>📞 Contatos (site e rodapé)</h3>
              <div className="form-grade">
                <Campo label="WhatsApp da barbearia"><input value={f.whatsapp} onChange={set("whatsapp")} inputMode="tel" placeholder="(31) 99999-0000" /></Campo>
                <Campo label="Telefone fixo"><input value={f.telefone} onChange={set("telefone")} /></Campo>
                <Campo label="Instagram" dica="Só o @ ou o link do perfil"><input value={f.instagram} onChange={set("instagram")} placeholder="@suabarbearia" /></Campo>
                <Campo label="E-mail"><input type="email" value={f.email} onChange={set("email")} /></Campo>
              </div>
            </section>
            <div className="acoes-linha"><button className="btn btn-primary" disabled={ocupado}>{ocupado ? "Salvando..." : "Salvar marca"}</button></div>
          </form>
        )}
      </Estado>
    </div>
  );
}
