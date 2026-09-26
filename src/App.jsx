import React from "react";
import { api, getSessao, setSessao } from "./api.js";
import { PainelCtx, permissoes } from "./contexto.js";
import { ConfirmProvider, ToastProvider } from "./ui.jsx";
import { PAPEIS } from "./util.js";
import Site, { PaginaAgendar, PaginaMeuHorario } from "./site/Site.jsx";
import Login from "./Login.jsx";
import Dashboard from "./painel/Dashboard.jsx";
import Agenda from "./painel/Agenda.jsx";
import Agendamentos from "./painel/Agendamentos.jsx";
import Clientes from "./painel/Clientes.jsx";
import Vendas from "./painel/Vendas.jsx";
import Estoque from "./painel/Estoque.jsx";
import Financeiro from "./painel/Financeiro.jsx";
import Clube from "./painel/Clube.jsx";
import Marketing from "./painel/Marketing.jsx";
import Avaliacoes from "./painel/Avaliacoes.jsx";
import Equipe from "./painel/Equipe.jsx";
import Cadastros from "./painel/Cadastros.jsx";
import Usuarios from "./painel/Usuarios.jsx";
import Notificacoes from "./painel/Notificacoes.jsx";
import MinhaConta from "./painel/MinhaConta.jsx";
import AreaCliente from "./cliente/AreaCliente.jsx";

/** Hash de rota: #/agendar, #/meu-horario/CODIGO, #/login, #/painel/agenda ... */
function useHash() {
  const [hash, setHash] = React.useState(window.location.hash || "#/");
  React.useEffect(() => {
    const on = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

const PAGINAS = {
  dashboard: { rotulo: "Início", icone: "📊", comp: Dashboard, papeis: ["ADMIN", "GERENTE", "RECEPCAO", "BARBEIRO"] },
  agenda: { rotulo: "Agenda", icone: "📅", comp: Agenda, papeis: ["ADMIN", "GERENTE", "RECEPCAO", "BARBEIRO"] },
  agendamentos: { rotulo: "Agendamentos", icone: "🗒️", comp: Agendamentos, papeis: ["ADMIN", "GERENTE", "RECEPCAO", "BARBEIRO"] },
  clientes: { rotulo: "Clientes", icone: "👥", comp: Clientes, papeis: ["ADMIN", "GERENTE", "RECEPCAO"] },
  vendas: { rotulo: "Vender produto", icone: "🛒", comp: Vendas, papeis: ["ADMIN", "GERENTE", "RECEPCAO"] },
  estoque: { rotulo: "Estoque", icone: "📦", comp: Estoque, papeis: ["ADMIN", "GERENTE", "RECEPCAO"] },
  financeiro: { rotulo: "Financeiro", icone: "💰", comp: Financeiro, papeis: ["ADMIN", "GERENTE", "RECEPCAO", "BARBEIRO"], rotuloPor: { RECEPCAO: "Caixa do dia", BARBEIRO: "Minhas comissões" } },
  clube: { rotulo: "Clube", icone: "⭐", comp: Clube, papeis: ["ADMIN", "GERENTE", "RECEPCAO"] },
  marketing: { rotulo: "Marketing", icone: "📣", comp: Marketing, papeis: ["ADMIN", "GERENTE"] },
  avaliacoes: { rotulo: "Avaliações", icone: "💬", comp: Avaliacoes, papeis: ["ADMIN", "GERENTE", "RECEPCAO", "BARBEIRO"] },
  equipe: { rotulo: "Equipe e folgas", icone: "💈", comp: Equipe, papeis: ["ADMIN", "GERENTE", "RECEPCAO", "BARBEIRO"], rotuloPor: { BARBEIRO: "Minhas folgas", RECEPCAO: "Folgas" } },
  cadastros: { rotulo: "Unidades e serviços", icone: "🏪", comp: Cadastros, papeis: ["ADMIN", "GERENTE"] },
  notificacoes: { rotulo: "Notificações", icone: "🔔", comp: Notificacoes, papeis: ["ADMIN", "GERENTE"] },
  usuarios: { rotulo: "Usuários", icone: "🔐", comp: Usuarios, papeis: ["ADMIN", "GERENTE"] },
  conta: { rotulo: "Minha conta", icone: "⚙️", comp: MinhaConta, papeis: ["ADMIN", "GERENTE", "RECEPCAO", "BARBEIRO"] },
};

function Painel({ sessao, onSair }) {
  const hash = useHash();
  const papel = sessao.papel;
  const pagina = (hash.match(/^#\/painel\/([a-z]+)/) || [])[1] || "dashboard";
  const def = PAGINAS[pagina] && PAGINAS[pagina].papeis.includes(papel) ? PAGINAS[pagina] : PAGINAS.dashboard;
  const [unidades, setUnidades] = React.useState([]);
  const [unidadeId, setUnidadeIdState] = React.useState(() => {
    try { return localStorage.getItem("rb_unidade") || ""; } catch { return ""; }
  });
  const [menuAberto, setMenuAberto] = React.useState(false);
  const setUnidadeId = (v) => {
    setUnidadeIdState(v);
    try { localStorage.setItem("rb_unidade", v); } catch { /* sem storage */ }
  };
  const perms = permissoes(papel);

  React.useEffect(() => {
    api("/api/unidades").then(setUnidades).catch(() => setUnidades([]));
  }, []);
  React.useEffect(() => { window.scrollTo(0, 0); setMenuAberto(false); }, [pagina]);

  // quem é preso a uma unidade sempre trabalha nela; admin escolhe (vazio = rede toda)
  const unidadeEfetiva = perms.admin ? unidadeId : String(sessao.unidadeId || "");
  const irPara = (p) => { window.location.hash = "#/painel/" + p; };
  const Comp = def.comp;
  const chave = Object.keys(PAGINAS).find((k) => PAGINAS[k] === def);

  return (
    <PainelCtx.Provider value={{ sessao, papel, perms, unidades, unidadeId: unidadeEfetiva, setUnidadeId, irPara }}>
      <div className="app-shell">
        <aside className={"sidebar" + (menuAberto ? " aberta" : "")}>
          <div className="sidebar-logo">💈 Rede Barbearias<span className="dot">.</span></div>
          <nav className="sidebar-nav">
            {Object.entries(PAGINAS).filter(([, p]) => p.papeis.includes(papel)).map(([k, p]) => (
              <a key={k} href={"#/painel/" + k} className={"nav-btn" + (k === chave ? " active" : "")} aria-current={k === chave ? "page" : undefined}>
                <span className="nav-ico" aria-hidden="true">{p.icone}</span>{p.rotuloPor?.[papel] || p.rotulo}
              </a>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <a className="nav-btn" href="#/" onClick={onSair}><span className="nav-ico">🚪</span>Sair</a>
          </div>
        </aside>
        {menuAberto && <div className="sidebar-fundo" onClick={() => setMenuAberto(false)}></div>}
        <main className="main">
          <div className="main-bg-icons" aria-hidden="true">
            {["💈", "✂️", "🪒", "🧔", "💇", "🧴", "🪞"].map((icone, i) => (
              <span key={i} className="main-bg-icon-item" style={{ "--delay": `${i * -1.6}s` }}>{icone}</span>
            ))}
          </div>
          <div className="topbar">
            <button className="btn-icone menu-mobile" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">☰</button>
            <h1>{def.rotuloPor?.[papel] || def.rotulo}</h1>
            <div className="topbar-user">
              {perms.admin ? (
                <select className="sel-unidade" value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)} aria-label="Unidade">
                  <option value="">🏢 Rede inteira</option>
                  {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome.replace("Rede Barbearias — ", "")}</option>)}
                </select>
              ) : sessao.unidadeNome && <span className="topbar-unidade">🏪 {sessao.unidadeNome.replace("Rede Barbearias — ", "")}</span>}
              <span className="topbar-greeting">Olá, {String(sessao.nome || sessao.username).split(" ")[0]}</span>
              <span className="role-badge">{PAPEIS[papel]}</span>
            </div>
          </div>
          <Comp key={chave + unidadeEfetiva} />
        </main>
      </div>
    </PainelCtx.Provider>
  );
}

export default function App() {
  const hash = useHash();
  const [sessao, setSessaoState] = React.useState(getSessao());

  const entrar = (r) => {
    const s = { token: r.token, username: r.username, nome: r.nome, papel: r.papel, unidadeId: r.unidadeId,
      unidadeNome: r.unidadeNome, barbeiroId: r.barbeiroId, clienteId: r.clienteId };
    setSessao(s);
    setSessaoState(s);
    window.location.hash = r.papel === "CLIENTE" ? "#/minha-conta" : "#/painel/dashboard";
  };
  const sair = () => { setSessao(null); setSessaoState(null); };

  React.useEffect(() => {
    const expirou = () => { sair(); window.location.hash = "#/login"; };
    window.addEventListener("rb:sessao-expirada", expirou);
    return () => window.removeEventListener("rb:sessao-expirada", expirou);
  }, []);

  let tela;
  const irLogin = () => { window.location.hash = sessao ? (sessao.papel === "CLIENTE" ? "#/minha-conta" : "#/painel/dashboard") : "#/login"; };
  if (hash.startsWith("#/agendar")) tela = <PaginaAgendar onEntrar={irLogin} />;
  else if (hash.startsWith("#/meu-horario")) tela = <PaginaMeuHorario codigo={hash.split("/")[2] || ""} onEntrar={irLogin} />;
  else if (hash.startsWith("#/login")) tela = sessao ? null : <Login onLogin={entrar} onVoltar={() => { window.location.hash = "#/"; }} />;
  else if ((hash.startsWith("#/painel") || hash.startsWith("#/minha-conta")) && !sessao) tela = <Login onLogin={entrar} onVoltar={() => { window.location.hash = "#/"; }} />;
  else if (hash.startsWith("#/painel") && sessao?.papel !== "CLIENTE") tela = <Painel sessao={sessao} onSair={sair} />;
  else if (hash.startsWith("#/minha-conta") && sessao?.papel === "CLIENTE") tela = <AreaCliente sessao={sessao} onSair={sair} />;
  else tela = <Site onEntrar={irLogin} />;

  React.useEffect(() => {
    if (hash.startsWith("#/login") && sessao) irLogin();
    if (hash.startsWith("#/painel") && sessao?.papel === "CLIENTE") window.location.hash = "#/minha-conta";
    if (hash.startsWith("#/minha-conta") && sessao && sessao.papel !== "CLIENTE") window.location.hash = "#/painel/dashboard";
  }, [hash, sessao]);

  return (
    <ToastProvider>
      <ConfirmProvider>{tela}</ConfirmProvider>
    </ToastProvider>
  );
}
