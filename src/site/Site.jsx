import React from "react";
import { Avatar, Estrelas, useApi } from "../ui.jsx";
import { CATEGORIAS_SERVICO, diasLegiveis, linkWhatsApp, moeda, telefone } from "../util.js";
import AgendarOnline from "./AgendarOnline.jsx";
import Privacidade from "./Privacidade.jsx";
import MeuHorario from "./MeuHorario.jsx";

const MARQUEE = ["💈 Corte Clássico", "🪒 Barba Terapia", "✂️ Degradê na Régua", "🧔 Pigmentação de Barba", "🔥 Platinado",
  "💇‍♂️ Sobrancelha", "⭐ Clube de Assinatura", "📲 Agendamento Online 24h"];

const DIFERENCIAIS = [
  { icone: "📲", nome: "Agende em 1 minuto", cor: "vermelho", descricao: "Escolha unidade, serviço, barbeiro e horário direto pelo site, 24 horas por dia. Sem ligação, sem espera no WhatsApp." },
  { icone: "⭐", nome: "Clube de assinatura", cor: "dourado", descricao: "Cabelo sempre na régua pagando um valor fixo por mês." },
  { icone: "🎁", nome: "Fidelidade", cor: "creme", descricao: "A cada 10 atendimentos, o próximo é por nossa conta." },
  { icone: "💳", nome: "Pague como quiser", cor: "creme", descricao: "Pix, cartão de crédito, débito ou dinheiro." },
  { icone: "🧴", nome: "Produtos profissionais", cor: "dourado", descricao: "Pomadas, óleos e kits de barba das melhores marcas pra levar pra casa." },
];

function Navegacao({ irPara, onEntrar }) {
  const [aberto, setAberto] = React.useState(false);
  const ir = (id) => { setAberto(false); irPara(id); };
  const links = [["servicos", "Serviços"], ["equipe", "Equipe"], ["clube", "Clube"], ["unidades", "Unidades"], ["avaliacoes", "Avaliações"]];
  return (
    <nav className="site-nav navbar navbar-expand-lg sticky-top">
      <div className="container">
        <a className="site-brand" href="#/" onClick={(e) => { e.preventDefault(); ir("topo"); }}>💈 Rede Barbearias<span className="site-brand-dot">.</span></a>
        <button className="navbar-toggler site-toggler" type="button" onClick={() => setAberto((m) => !m)} aria-label="Abrir menu" aria-expanded={aberto}>
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className={"collapse navbar-collapse" + (aberto ? " show" : "")}>
          <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-4">
            {links.map(([id, r]) => (
              <li className="nav-item" key={id}><a className="site-nav-link" href={"#" + id} onClick={(e) => { e.preventDefault(); ir(id); }}>{r}</a></li>
            ))}
            <li className="nav-item"><a className="site-nav-link" href="#/meu-horario">Meu horário</a></li>
            <li className="nav-item"><button className="site-btn-entrar site-btn-ghost" onClick={onEntrar}>Entrar</button></li>
            <li className="nav-item"><a className="site-btn-entrar" href="#/agendar">📅 Agendar</a></li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

function Rodape({ unidades, onEntrar }) {
  const principal = unidades?.[0];
  return (
    <footer id="contato" className="site-footer">
      <div className="container">
        <div className="site-footer-grid">
          <div>
            <div className="site-brand site-footer-brand">💈 Rede Barbearias<span className="site-brand-dot">.</span></div>
            <p className="site-footer-texto">Estilo e navalha em cada unidade. Agende online a qualquer hora.</p>
            <a className="site-btn-entrar" href="#/agendar">📅 Agendar horário</a>
          </div>
          <div>
            <h4>Unidades</h4>
            {(unidades || []).map((u) => <p key={u.id}>📍 {u.nome.replace("Rede Barbearias — ", "")} · {u.telefone}</p>)}
            {principal?.email && <p>✉️ {principal.email}</p>}
          </div>
          <div>
            <h4>Acesso</h4>
            <p><a className="site-link-claro" href="#/meu-horario">Consultar ou cancelar meu horário</a></p>
            <p><a className="site-link-claro" href="#/privacidade">Política de privacidade</a></p>
            <p className="site-footer-texto">Clientes: acompanhe pontos e o clube. Equipe: agenda, caixa e gestão.</p>
            <button className="site-btn-entrar" onClick={onEntrar}>Entrar no sistema</button>
          </div>
        </div>
        <hr className="site-footer-linha" />
        <p className="site-footer-copyright">© {new Date().getFullYear()} Rede Barbearias — Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}

/** Página interna do site (agendar / meu horário) com o mesmo cabeçalho e rodapé. */
export function PaginaSite({ titulo, sub, onEntrar, children }) {
  const unidades = useApi("/api/publico/unidades");
  React.useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="site-institucional">
      <Navegacao irPara={(id) => { window.location.hash = "#/"; setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 80); }} onEntrar={onEntrar} />
      <section className="site-pagina">
        <div className="container">
          <span className="site-eyebrow">Rede Barbearias</span>
          <h1 className="site-section-titulo">{titulo}</h1>
          {sub && <p className="site-section-texto">{sub}</p>}
          <div className="site-pagina-card">{children}</div>
        </div>
      </section>
      <Rodape unidades={unidades.dados} onEntrar={onEntrar} />
    </div>
  );
}

export function PaginaAgendar({ onEntrar }) {
  return (
    <PaginaSite titulo="Agende seu horário" sub="Leva menos de um minuto. Você recebe um código pra consultar ou cancelar quando quiser." onEntrar={onEntrar}>
      <AgendarOnline />
    </PaginaSite>
  );
}

export function PaginaPrivacidade({ onEntrar }) {
  return (
    <PaginaSite titulo="Política de privacidade" sub="Quais dados guardamos, pra quê, e como ver ou apagar os seus." onEntrar={onEntrar}>
      <Privacidade />
    </PaginaSite>
  );
}

export function PaginaMeuHorario({ codigo, onEntrar }) {
  return (
    <PaginaSite titulo="Meu horário" sub="Digite o código que você recebeu ao agendar." onEntrar={onEntrar}>
      <MeuHorario codigoInicial={codigo} />
    </PaginaSite>
  );
}

export default function Site({ onEntrar }) {
  const [scrollPct, setScrollPct] = React.useState(0);
  const unidades = useApi("/api/publico/unidades");
  const servicos = useApi("/api/publico/servicos");
  const barbeiros = useApi("/api/publico/barbeiros");
  const planos = useApi("/api/publico/planos");
  const avaliacoes = useApi("/api/publico/avaliacoes");
  const [unidadeMapa, setUnidadeMapa] = React.useState(0);

  React.useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setScrollPct(max > 0 ? (el.scrollTop / max) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const irPara = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const listaUnidades = unidades.dados || [];
  const mapa = listaUnidades[unidadeMapa];
  const totalBarbeiros = (barbeiros.dados || []).length;
  const notaGeral = (() => {
    const b = (barbeiros.dados || []).filter((x) => x.notaMedia);
    const tot = b.reduce((s, x) => s + x.totalAvaliacoes, 0);
    return tot ? { media: b.reduce((s, x) => s + x.notaMedia * x.totalAvaliacoes, 0) / tot, total: tot } : null;
  })();

  return (
    <div className="site-institucional">
      <div className="site-bb-scroll-bar" style={{ width: scrollPct + "%" }}></div>
      <Navegacao irPara={irPara} onEntrar={onEntrar} />

      <header id="topo" className="site-bb-hero">
        <span className="site-bb-listras" aria-hidden="true"></span>
        <span className="site-bb-blob site-bb-blob-a" aria-hidden="true"></span>
        <span className="site-bb-blob site-bb-blob-b" aria-hidden="true"></span>
        <span className="site-bb-blob site-bb-blob-c" aria-hidden="true"></span>
        <div className="container site-bb-hero-inner">
          <div className="site-bb-hero-texto">
            <span className="site-bb-badge">💈 {listaUnidades.length || 3} unidades em Belo Horizonte</span>
            <h1 className="site-bb-hero-titulo">Onde todo <span className="site-bb-destaque">corte</span> vira uma experiência de respeito</h1>
            <p className="site-bb-hero-sub">Barbeiros de mão cheia, horário marcado sem fila e um clube que deixa seu cabelo sempre na régua. Agende online em menos de um minuto.</p>
            <div className="site-bb-hero-cta">
              <a className="site-btn-bb-primario" href="#/agendar">📅 Agendar agora</a>
              <button className="site-btn-bb-secundario" onClick={() => irPara("servicos")}>Ver serviços e preços</button>
            </div>
            <div className="site-bb-stats">
              <div className="site-bb-stat"><span>{totalBarbeiros || "7"}</span>barbeiros</div>
              <div className="site-bb-stat"><span>{notaGeral ? notaGeral.media.toFixed(1) + "★" : "4.8★"}</span>{notaGeral ? `${notaGeral.total} avaliações` : "avaliação"}</div>
              <div className="site-bb-stat"><span>24h</span>agendamento online</div>
            </div>
          </div>
          <div className="site-bb-hero-arte" aria-hidden="true">
            <div className="site-bb-mascote-wrap">
              <div className="site-bb-balao">Bem-vindo à casa do corte! ✂️</div>
              <div className="site-bb-mascote">💈</div>
              <div className="site-bb-sombra"></div>
            </div>
            <div className="site-bb-sticker site-bb-sticker-1">✂️</div>
            <div className="site-bb-sticker site-bb-sticker-2">🪒</div>
            <div className="site-bb-sticker site-bb-sticker-3">🧔</div>
            <div className="site-bb-sticker site-bb-sticker-4">🔥</div>
          </div>
        </div>
        <svg className="site-bb-wave" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,32 C240,90 480,0 720,24 C960,48 1200,96 1440,40 L1440,100 L0,100 Z"></path>
        </svg>
      </header>

      <div className="site-bb-marquee">
        <div className="site-bb-marquee-track">
          {MARQUEE.concat(MARQUEE).map((m, i) => <span key={i}>{m}</span>)}
        </div>
      </div>

      <section id="servicos" className="site-section">
        <div className="container">
          <div className="text-center site-section-header">
            <span className="site-eyebrow">Serviços</span>
            <h2 className="site-section-titulo">Cardápio da casa</h2>
            <p className="site-section-texto">Preços iguais em todas as unidades. Pagamento na hora, do jeito que você preferir.</p>
          </div>
          <div className="site-cardapio">
            {Object.entries(CATEGORIAS_SERVICO).map(([cat, rot]) => {
              const lista = (servicos.dados || []).filter((s) => s.categoria === cat);
              if (!lista.length) return null;
              return (
                <div className="site-cardapio-grupo" key={cat}>
                  <h3>{rot}</h3>
                  {lista.map((s) => (
                    <div className="site-cardapio-item" key={s.id}>
                      <div><b>{s.nome}</b><span>{s.descricao}</span></div>
                      <span className="site-pontilhado" aria-hidden="true"></span>
                      <div className="site-cardapio-preco"><b>{moeda(s.preco)}</b><small>{s.duracaoMinutos} min</small></div>
                    </div>
                  ))}
                </div>
              );
            })}
            {servicos.carregando && <p className="site-section-texto">Carregando serviços...</p>}
          </div>
          <div className="text-center"><a className="site-btn-bb-primario" href="#/agendar">Escolher meu horário</a></div>
        </div>
      </section>

      <section id="diferenciais" className="site-section site-section-alt">
        <div className="container">
          <div className="text-center site-section-header">
            <span className="site-eyebrow">Por que a Rede</span>
            <h2 className="site-section-titulo">Barbearia de verdade, do agendamento ao acabamento</h2>
          </div>
          <div className="site-bb-bento">
            {DIFERENCIAIS.map((e, i) => (
              <div className={"site-bb-card site-bb-card-" + e.cor + (i === 0 ? " site-bb-card-destaque" : "")} key={e.nome}>
                {i === 0 && <span className="site-bb-card-tag">⭐ Destaque</span>}
                <span className="site-bb-card-ico">{e.icone}</span>
                <h3>{e.nome}</h3>
                <p>{e.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="equipe" className="site-section">
        <div className="container">
          <div className="text-center site-section-header">
            <span className="site-eyebrow">Equipe</span>
            <h2 className="site-section-titulo">Quem vai cuidar de você</h2>
          </div>
          <div className="site-equipe">
            {(barbeiros.dados || []).map((b) => (
              <a className="site-barbeiro" key={b.id} href="#/agendar">
                <Avatar nome={b.nome} foto={b.fotoUrl} tamanho={84} />
                <b>{b.nome}{b.apelido ? ` “${b.apelido}”` : ""}</b>
                <span className="site-barbeiro-esp">{b.especialidades}</span>
                <span className="site-barbeiro-un">📍 {b.unidadeNome.replace("Rede Barbearias — ", "")}</span>
                {b.notaMedia && <span><Estrelas nota={Math.round(b.notaMedia)} tamanho={14} /> {b.notaMedia.toFixed(1)}</span>}
                {b.bio && <p>{b.bio}</p>}
              </a>
            ))}
          </div>
        </div>
      </section>

      {(planos.dados || []).length > 0 && (
        <section id="clube" className="site-section site-section-alt">
          <div className="container">
            <div className="text-center site-section-header">
              <span className="site-eyebrow">Clube de assinatura</span>
              <h2 className="site-section-titulo">Pague uma vez por mês, ande sempre na régua</h2>
              <p className="site-section-texto">Assine em qualquer unidade. Sem fidelidade: cancele quando quiser.</p>
            </div>
            <div className="site-planos">
              {planos.dados.map((p, i) => (
                <div className={"site-plano" + (i === 1 ? " site-plano-destaque" : "")} key={p.id}>
                  {i === 1 && <span className="site-bb-card-tag">Mais escolhido</span>}
                  <h3>{p.nome}</h3>
                  <div className="site-plano-preco">{moeda(p.precoMensal)}<small>/mês</small></div>
                  <p>{p.descricao}</p>
                  <ul>
                    <li>✓ {p.usosPorMes} atendimentos por mês</li>
                    {p.servicos.map((s) => <li key={s.id}>✓ {s.nome} <small>(avulso {moeda(s.preco)})</small></li>)}
                  </ul>
                  {listaUnidades[0]?.whatsapp && (
                    <a className="site-btn-bb-primario" target="_blank" rel="noreferrer"
                       href={linkWhatsApp(listaUnidades[0].whatsapp, `Olá! Quero assinar o ${p.nome}.`)}>Quero assinar</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {(avaliacoes.dados || []).length > 0 && (
        <section id="avaliacoes" className="site-section">
          <div className="container">
            <div className="text-center site-section-header">
              <span className="site-eyebrow">Avaliações reais</span>
              <h2 className="site-section-titulo">Quem senta na cadeira, volta</h2>
            </div>
            <div className="site-depoimentos">
              {avaliacoes.dados.slice(0, 6).map((a) => (
                <figure className="site-depoimento" key={a.id}>
                  <Estrelas nota={a.nota} tamanho={16} />
                  <blockquote>“{a.comentario}”</blockquote>
                  <figcaption><b>{a.clienteNome}</b> · {a.servicoNome} com {a.barbeiroNome.split(" ")[0]}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="unidades" className="site-section site-section-alt">
        <div className="container">
          <div className="text-center site-section-header">
            <span className="site-eyebrow">Unidades</span>
            <h2 className="site-section-titulo">Sua cadeira está esperando</h2>
          </div>
          <div className="site-bb-comochegar-wrap">
            <div className="site-bb-mapa-frame">
              <span className="site-bb-tape site-bb-tape-a"></span>
              <span className="site-bb-tape site-bb-tape-b"></span>
              {mapa && (
                <iframe title={"Mapa " + mapa.nome} className="site-mapa" loading="lazy"
                        src={`https://www.google.com/maps?q=${encodeURIComponent(`${mapa.endereco}, ${mapa.bairro}, ${mapa.cidade || ""}`)}&output=embed`}></iframe>
              )}
            </div>
            <div className="site-unidades-lista">
              {listaUnidades.map((u, i) => (
                <button key={u.id} className={"site-unidade" + (i === unidadeMapa ? " sel" : "")} onClick={() => setUnidadeMapa(i)}>
                  <b>{u.nome.replace("Rede Barbearias — ", "")}</b>
                  <span>📍 {u.endereco} — {u.bairro}</span>
                  <span>🕐 {diasLegiveis(u.diasFuncionamento)} · {u.horaAbertura.slice(0, 5)} às {u.horaFechamento.slice(0, 5)}</span>
                  <span>📞 {u.telefone}{u.whatsapp ? " · 💬 " + telefone(u.whatsapp) : ""}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="site-bb-cta-band">
        <span className="site-bb-confete c1">✂️</span><span className="site-bb-confete c2">🪒</span>
        <span className="site-bb-confete c3">🔥</span><span className="site-bb-confete c4">⭐</span>
        <div className="container site-bb-cta-band-inner">
          <div>
            <h2>Pronto pra marcar seu horário?</h2>
            <p>Escolha o barbeiro, o dia e a hora. A gente cuida do resto.</p>
          </div>
          <a className="site-btn-bb-primario" href="#/agendar">📅 Agendar agora</a>
        </div>
      </section>

      <Rodape unidades={listaUnidades} onEntrar={onEntrar} />
    </div>
  );
}
