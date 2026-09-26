import React from "react";
import { api, qs } from "../api.js";
import { usePainel } from "../contexto.js";
import { Cabecalho, Campo, Estado, Modal, Pill, StatusPill, Vazio, useAcao, useApi, useTabela } from "../ui.jsx";
import { copiar, dataExtenso, dataHora, hojeISO, hora, linkWhatsApp, primeiroNome, telefone } from "../util.js";

export const TIPOS_MSG = {
  CONFIRMACAO: "Confirmação", LEMBRETE: "Lembrete do dia", LEMBRETE_PROXIMO: "Lembrete 1h antes", REAGENDAMENTO: "Horário alterado",
  CANCELAMENTO: "Cancelamento", AVALIACAO: "Pedido de avaliação",
};
const CANAIS = { EMAIL: "✉️ E-mail", WHATSAPP: "💬 WhatsApp" };

/** Mensagens automáticas que esse agendamento já disparou (mostrado no detalhe do horário). */
export function HistoricoMensagens({ agendamentoId }) {
  const { perms } = usePainel();
  const req = useApi("/api/notificacoes/agendamento/" + agendamentoId);
  const [executar, ocupado] = useAcao();
  const reenviar = async () => {
    const r = await executar(() => api(`/api/notificacoes/agendamento/${agendamentoId}/reenviar?tipo=CONFIRMACAO`, { method: "POST" }));
    if (r) req.recarregar();
    return r;
  };
  const lista = req.dados || [];
  return (
    <div className="historico-msgs">
      <div className="acoes-linha entre">
        <h4>Mensagens automáticas</h4>
        {perms.equipe && <button className="btn btn-ghost btn-sm" disabled={ocupado} onClick={reenviar}>{ocupado ? "Enviando..." : "Reenviar confirmação"}</button>}
      </div>
      {req.carregando ? <small className="texto-fraco">Carregando...</small> : !lista.length ? (
        <small className="texto-fraco">Nenhuma mensagem automática ainda (cliente sem e-mail ou canais ainda não configurados).</small>
      ) : (
        <ul className="lista-simples">
          {lista.map((n) => (
            <li key={n.id}>
              <span>{CANAIS[n.canal]} · {TIPOS_MSG[n.tipo]}<br /><small className="texto-fraco">{n.destino} · {dataHora(n.dataHora)}{n.erro ? " · " + n.erro : ""}</small></span>
              {n.status === "ENVIADA" ? <Pill tom="bom">enviada</Pill> : <Pill tom="ruim">falhou</Pill>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Lista dos clientes do dia com o lembrete: automático (e-mail/WhatsApp) ou manual em 1 clique. */
export function LembretesDia({ unidadeId, data, onClose }) {
  const req = useApi("/api/agendamentos" + qs({ de: data, ate: data, unidadeId }));
  const [marcados, setMarcados] = React.useState({});
  const [executar] = useAcao();
  const abertos = (req.dados || []).filter((a) => ["AGENDADO", "CONFIRMADO"].includes(a.status));
  const pendentes = abertos.filter((a) => !a.lembreteEnviado && !marcados[a.id]);
  const enviarManual = async (a) => {
    const quando = data === hojeISO() ? "hoje" : dataExtenso(data);
    const msg = `Olá, ${primeiroNome(a.clienteNome)}! Passando pra lembrar do seu horário ${quando} às ${hora(a.inicio)} com ${a.barbeiroNome.split(" ")[0]} (${a.servicoNome}) na ${a.unidadeNome.replace("Rede Barbearias — ", "Rede Barbearias ")}. Se precisar remarcar, é só responder aqui. Código: ${a.codigo} 💈`;
    window.open(linkWhatsApp(a.clienteTelefone, msg), "_blank", "noopener");
    setMarcados((m) => ({ ...m, [a.id]: true }));
    await executar(() => api(`/api/agendamentos/${a.id}/lembrete`, { method: "PATCH" }));
  };
  return (
    <Modal titulo={`Lembretes — ${dataExtenso(data)}`} onClose={onClose} largura={680}>
      <p className="texto-fraco">
        Com o WhatsApp oficial ligado (ou e-mail cadastrado), o cliente recebe o lembrete sozinho: de manhã e de novo pouco antes do horário.
        Enquanto isso não estiver ligado, clique em 💬: o WhatsApp da barbearia abre com a mensagem pronta, é só apertar enviar.
      </p>
      <Estado req={req} vazio={<Vazio icone="🗓️" texto="Nenhum cliente marcado nesse dia." />}>
        {() => (
          <>
            <p><b>{abertos.length}</b> cliente(s) · <b>{pendentes.length}</b> sem lembrete</p>
            <ul className="lista-simples lembretes">
              {abertos.map((a) => {
                const feito = a.lembreteEnviado || marcados[a.id];
                return (
                  <li key={a.id} className={feito ? "feito" : ""}>
                    <span className="prox-hora">{hora(a.inicio)}</span>
                    <span className="lembrete-txt"><b>{a.clienteNome}</b><small className="texto-fraco">{telefone(a.clienteTelefone)} · {a.servicoNome} · {a.barbeiroNome.split(" ")[0]}</small></span>
                    <StatusPill status={a.status} />
                    {feito ? <Pill tom="bom">✓ lembrado</Pill> : <button className="btn btn-primary btn-sm" onClick={() => enviarManual(a)}>💬 Lembrar</button>}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Estado>
    </Modal>
  );
}

/** Página de configuração: status dos canais, teste, modelos do WhatsApp e histórico. */
export default function Notificacoes() {
  const { perms } = usePainel();
  const cfg = useApi("/api/notificacoes/configuracao");
  const hist = useApi("/api/notificacoes");
  const [teste, setTeste] = React.useState({ email: "", telefone: "" });
  const [resultado, setResultado] = React.useState(null);
  const [copiado, setCopiado] = React.useState("");
  const [executar, ocupado] = useAcao();
  const [pagina, paginacao] = useTabela(hist.dados || [], 20);

  const enviarTeste = async (e) => {
    e.preventDefault();
    const r = await executar(() => api("/api/notificacoes/teste", { method: "POST", body: teste }));
    if (r) setResultado(r.resultado);
  };

  return (
    <div>
      <Cabecalho titulo="Notificações" sub="Confirmação ao agendar, lembrete no dia, aviso de alteração/cancelamento e pedido de avaliação — tudo automático" />
      <Estado req={cfg}>
        {(c) => (
          <>
            <div className="cartoes-grid">
              {c.canais.map((k) => (
                <div key={k.canal} className="cartao">
                  <h3>{CANAIS[k.canal]} {k.configurado ? <Pill tom="bom">ligado</Pill> : <Pill tom="aviso">desligado</Pill>}</h3>
                  <p className="texto-fraco">{k.descricao}</p>
                </div>
              ))}
              <div className="cartao">
                <h3>⏰ Quando sai cada mensagem</h3>
                <ul className="lista-simples">
                  <li><span>Confirmação</span><small className="texto-fraco">na hora do agendamento</small></li>
                  <li><span>Lembrete do dia</span><small className="texto-fraco">no dia, a partir das {c.horarios.horaLembrete}h</small></li>
                  {c.horarios.lembreteAntesMinutos > 0 && <li><span>Lembrete antes do horário</span><small className="texto-fraco">{duracao(c.horarios.lembreteAntesMinutos)} antes</small></li>}
                  <li><span>Alteração / cancelamento</span><small className="texto-fraco">na hora</small></li>
                  <li><span>Avaliação + cartela fidelidade</span><small className="texto-fraco">{duracao(c.horarios.avaliacaoAposMinutos)} depois do pagamento</small></li>
                  <li><span>Resposta automática</span><small className="texto-fraco">quando o cliente escreve no WhatsApp</small></li>
                </ul>
              </div>
            </div>

            {perms.admin && (
              <form className="cartao" onSubmit={enviarTeste} style={{ marginTop: 16 }}>
                <h3>🧪 Enviar mensagem de teste</h3>
                <div className="form-grade">
                  <Campo label="E-mail"><input type="email" value={teste.email} onChange={(e) => setTeste({ ...teste, email: e.target.value })} placeholder="voce@email.com" /></Campo>
                  <Campo label="WhatsApp (se o canal estiver ligado)"><input value={teste.telefone} onChange={(e) => setTeste({ ...teste, telefone: telefone(e.target.value) })} placeholder="(31) 99999-9999" /></Campo>
                </div>
                <button className="btn btn-primary" disabled={ocupado || (!teste.email && !teste.telefone)}>{ocupado ? "Enviando..." : "Enviar teste"}</button>
                {resultado && <ul className="lista-simples">{resultado.map((r) => <li key={r}><span>{r}</span></li>)}</ul>}
              </form>
            )}

            <details className="cartao config-ajuda" style={{ marginTop: 16 }}>
              <summary><b>Como ligar o e-mail (grátis)</b></summary>
              <ol>
                <li>Crie uma conta grátis na <a href="https://www.brevo.com" target="_blank" rel="noreferrer">Brevo</a> (300 e-mails/dia) e confirme o e-mail remetente (ex.: contato@suabarbearia.com.br).</li>
                <li>Em <i>SMTP &amp; API</i>, gere uma chave SMTP.</li>
                <li>No Render, em <i>Environment</i> do serviço <code>rede-barbearias-api</code>, adicione: <code>SMTP_HOST=smtp-relay.brevo.com</code>, <code>SMTP_PORT=587</code>, <code>SMTP_USER</code> (login SMTP), <code>SMTP_PASSWORD</code> (chave) e <code>MAIL_FROM</code> (remetente confirmado).</li>
                <li>Salve (o serviço reinicia) e use o teste acima.</li>
              </ol>
            </details>
            <details className="cartao config-ajuda" style={{ marginTop: 12 }}>
              <summary><b>Como ligar o WhatsApp oficial usando o número que a barbearia já usa</b></summary>
              <ol>
                <li>No celular, use o app <b>WhatsApp Business</b> (grátis). Quem usa o WhatsApp comum pode migrar pro Business: o número e as conversas continuam.</li>
                <li>Crie uma conta no <a href="https://business.facebook.com" target="_blank" rel="noreferrer">Meta Business</a> e um app do tipo <i>Business</i> em <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">developers.facebook.com</a>, com o produto <i>WhatsApp</i>.</li>
                <li>Na hora de adicionar o número, escolha a opção de <b>conectar o número que já está no app WhatsApp Business</b> e confirme pelo celular. Assim o sistema envia as mensagens e a equipe continua respondendo pelo celular, no mesmo número.
                  <br /><small className="texto-fraco">Se essa opção não aparecer pra sua conta, a Meta ainda não liberou: dá pra usar um número separado só pro sistema, ou continuar no modo manual (botão 🔔 Lembretes na Agenda), que já funciona hoje.</small></li>
                <li>Gere um <b>token permanente</b> (usuário do sistema, permissões <code>whatsapp_business_messaging</code> e <code>whatsapp_business_management</code>) e anote o <i>Phone number ID</i>.</li>
                <li>Em <i>Modelos de mensagem</i>, crie os modelos abaixo com o <b>mesmo nome</b>, categoria <b>Utilidade</b>, idioma <b>Português (BR)</b> — é só copiar o texto.</li>
                <li>Em <i>WhatsApp → Configuração → Webhook</i>: URL de callback <WebhookUrl url={c.webhook.url} />, token de verificação = o valor que você colocar em <code>WHATSAPP_VERIFY_TOKEN</code> (invente uma senha), e assine o campo <code>messages</code>.</li>
                <li>No Render, em <i>Environment</i> do serviço <code>rede-barbearias-api</code>: <code>WHATSAPP_TOKEN</code>, <code>WHATSAPP_PHONE_NUMBER_ID</code>, <code>WHATSAPP_VERIFY_TOKEN</code> e <code>WHATSAPP_APP_SECRET</code> (em <i>Configurações do app → Básico → Chave secreta</i>).</li>
                <li>Pronto. Se a barbearia usava a "mensagem de saudação" do próprio app, desligue lá pra o cliente não receber duas boas-vindas.</li>
              </ol>
              <div className="modelos-wpp">
                {Object.entries(c.modelosWhatsApp).map(([nome, texto]) => (
                  <div key={nome} className="modelo-wpp">
                    <div className="acoes-linha entre">
                      <code>{nome}</code>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { copiar(texto); setCopiado(nome); setTimeout(() => setCopiado(""), 1500); }}>{copiado === nome ? "Copiado ✓" : "Copiar texto"}</button>
                    </div>
                    <pre>{texto}</pre>
                  </div>
                ))}
              </div>
            </details>
          </>
        )}
      </Estado>

      <AtendimentoAutomatico webhook={cfg.dados?.webhook} />

      <h3 className="secao-titulo">Últimas mensagens enviadas</h3>
      <Estado req={hist} vazio={<Vazio icone="📭" texto="Nenhuma mensagem automática enviada ainda." />}>
        {() => (
          <>
            <div className="tabela-wrap">
              <table className="tabela">
                <thead><tr><th>Quando</th><th>Cliente</th><th>Mensagem</th><th>Canal</th><th>Destino</th><th>Situação</th></tr></thead>
                <tbody>{pagina.map((n) => (
                  <tr key={n.id}>
                    <td>{dataHora(n.dataHora)}</td><td>{n.clienteNome}<br /><small className="texto-fraco">#{n.codigo}</small></td>
                    <td>{TIPOS_MSG[n.tipo]}</td><td>{CANAIS[n.canal]}</td><td>{n.destino}</td>
                    <td>{n.status === "ENVIADA" ? <Pill tom="bom">enviada</Pill> : <Pill tom="ruim" >falhou</Pill>}{n.erro && <><br /><small className="texto-erro">{n.erro}</small></>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {paginacao}
          </>
        )}
      </Estado>
    </div>
  );
}

function duracao(min) {
  if (min % 60 === 0) return min === 60 ? "1 hora" : `${min / 60} horas`;
  if (min > 60) return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;
  return `${min} minutos`;
}

function WebhookUrl({ url }) {
  const [ok, setOk] = React.useState(false);
  if (!url) return <code>https://SEU-SERVIDOR/api/whatsapp/webhook</code>;
  return (
    <>
      <code>{url}</code>{" "}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { copiar(url); setOk(true); setTimeout(() => setOk(false), 1500); }}>{ok ? "Copiado ✓" : "Copiar"}</button>
    </>
  );
}

/** Balão no estilo do WhatsApp: mostra exatamente o que o cliente vai ler. */
function BalaoWhatsApp({ texto, lado = "recebida" }) {
  const partes = String(texto || "").split(/(https?:\/\/\S+)/g);
  return (
    <div className={"balao-wpp " + lado}>
      {partes.map((p, i) => /^https?:\/\//.test(p) ? <a key={i} href={p} target="_blank" rel="noreferrer">{p}</a> : <React.Fragment key={i}>{p}</React.Fragment>)}
    </div>
  );
}

/** Resposta automática: cliente escreve no WhatsApp da barbearia e recebe na hora o link de agendamento. */
function AtendimentoAutomatico({ webhook: w }) {
  const { perms } = usePainel();
  const atend = useApi("/api/notificacoes/atendimento");
  const conv = useApi("/api/notificacoes/atendimento/conversas");
  const [form, setForm] = React.useState(null);
  const [sim, setSim] = React.useState({ nome: "João", telefone: "", texto: "Oi, tem horário amanhã?" });
  const [resposta, setResposta] = React.useState("");
  const [executar, ocupado] = useAcao();
  const [executarSim, simulando] = useAcao();

  React.useEffect(() => { if (atend.dados) setForm(atend.dados); }, [atend.dados]);

  const salvar = async (e) => {
    e.preventDefault();
    const r = await executar(() => api("/api/notificacoes/atendimento", { method: "PUT", body: form }), "Resposta automática salva");
    if (r) { setForm(r); simular(); }
  };
  const simular = async (e) => {
    if (e) e.preventDefault();
    const r = await executarSim(() => api("/api/notificacoes/atendimento/simular", { method: "POST", body: { nome: sim.nome, telefone: sim.telefone } }));
    if (r) setResposta(r.resposta);
  };
  React.useEffect(() => { if (atend.dados) simular(); /* previa inicial */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atend.dados]);

  const lista = conv.dados || [];
  const podeEditar = perms.admin;

  return (
    <section className="atendimento-auto">
      <h3 className="secao-titulo">🤖 Resposta automática no WhatsApp</h3>
      <p className="texto-fraco">
        O cliente manda mensagem no WhatsApp da barbearia e recebe na hora as boas-vindas com o link pra agendar.
        Se ele já tem horário marcado, a resposta traz o horário e o link pra ver ou cancelar, e a cartela de fidelidade dele.
        Depois disso o sistema fica quieto e a conversa segue com a equipe, no próprio celular.
      </p>
      {w && (
        <div className={"aviso-faixa " + (w.pronto ? "bom" : "aviso")}>
          {w.pronto ? "✅ Ligado: o WhatsApp oficial está conectado e o webhook está configurado."
            : <>⚠️ Ainda não está ligado no servidor — falta: {[!w.whatsappConfigurado && "token e número do WhatsApp", !w.verifyTokenConfigurado && "WHATSAPP_VERIFY_TOKEN", !w.appSecretConfigurado && "WHATSAPP_APP_SECRET"].filter(Boolean).join(", ")}. Veja o passo a passo acima. A mensagem já pode ser configurada e testada aqui.</>}
        </div>
      )}
      <div className="atendimento-grid">
        <Estado req={atend}>
          {() => form && (
            <form className="cartao" onSubmit={salvar}>
              <h3>Mensagem de boas-vindas</h3>
              <label className="check-linha">
                <input type="checkbox" checked={form.respostaAutomatica} disabled={!podeEditar} onChange={(e) => setForm({ ...form, respostaAutomatica: e.target.checked })} />
                Responder automaticamente quem mandar mensagem
              </label>
              <Campo label="Texto" dica="Use {nome} (primeiro nome do cliente) e {link_agendar} (link do agendamento online — obrigatório).">
                <textarea rows={9} value={form.saudacao} disabled={!podeEditar} maxLength={1000} onChange={(e) => setForm({ ...form, saudacao: e.target.value })} />
              </Campo>
              <div className="form-grade">
                <Campo label="Responder o mesmo cliente de novo depois de">
                  <select value={form.intervaloHoras} disabled={!podeEditar} onChange={(e) => setForm({ ...form, intervaloHoras: Number(e.target.value) })}>
                    {[1, 3, 6, 12, 24, 48, 72, 168].map((h) => <option key={h} value={h}>{h < 24 ? `${h} hora${h > 1 ? "s" : ""}` : h === 168 ? "1 semana" : `${h / 24} dia${h > 24 ? "s" : ""}`}</option>)}
                  </select>
                </Campo>
                <Campo label="Cliente com horário marcado">
                  <label className="check-linha">
                    <input type="checkbox" checked={form.mostrarProximoHorario} disabled={!podeEditar} onChange={(e) => setForm({ ...form, mostrarProximoHorario: e.target.checked })} />
                    mostrar o horário e a cartela fidelidade
                  </label>
                </Campo>
              </div>
              {podeEditar ? (
                <div className="acoes-linha">
                  <button className="btn btn-primary" disabled={ocupado}>{ocupado ? "Salvando..." : "Salvar"}</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setForm({ ...form, saudacao: TEXTO_PADRAO })}>Voltar ao texto padrão</button>
                </div>
              ) : <small className="texto-fraco">Só o administrador altera a mensagem.</small>}
            </form>
          )}
        </Estado>

        <form className="cartao simulador-wpp" onSubmit={simular}>
          <h3>📱 Teste: como o cliente vai receber</h3>
          <div className="form-grade">
            <Campo label="Nome no WhatsApp"><input value={sim.nome} onChange={(e) => setSim({ ...sim, nome: e.target.value })} /></Campo>
            <Campo label="Telefone (opcional)" dica="De um cliente cadastrado, pra ver com o horário dele"><input value={sim.telefone} onChange={(e) => setSim({ ...sim, telefone: telefone(e.target.value) })} placeholder="(31) 99999-9999" /></Campo>
          </div>
          <Campo label="Mensagem do cliente"><input value={sim.texto} onChange={(e) => setSim({ ...sim, texto: e.target.value })} /></Campo>
          <button className="btn btn-ghost" disabled={simulando}>{simulando ? "Gerando..." : "Simular conversa"}</button>
          <div className="tela-wpp">
            {sim.texto && <BalaoWhatsApp texto={sim.texto} lado="enviada" />}
            {resposta && <BalaoWhatsApp texto={resposta} />}
          </div>
          <small className="texto-fraco">A prévia usa o texto salvo. Nada é enviado.</small>
        </form>
      </div>

      <h3 className="secao-titulo">💬 Quem mandou mensagem</h3>
      <Estado req={conv} vazio={<Vazio icone="💬" texto="Ninguém escreveu ainda — as conversas aparecem aqui assim que o WhatsApp oficial estiver ligado." />}>
        {() => (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead><tr><th>Última mensagem</th><th>Contato</th><th>Mensagem</th><th>Resposta automática</th><th></th></tr></thead>
              <tbody>{lista.map((c) => (
                <tr key={c.id}>
                  <td>{dataHora(c.ultimaRecebidaEm)}<br /><small className="texto-fraco">{c.totalRecebidas} msg</small></td>
                  <td>{c.nome || "—"}<br /><small className="texto-fraco">{telefone(c.telefone.replace(/^55/, ""))}</small>{c.clienteId && <><br /><Pill tom="bom">cliente</Pill></>}</td>
                  <td className="celula-msg">{c.ultimaMensagem}</td>
                  <td>{c.ultimaRespostaEm ? <><Pill tom="bom">respondida</Pill><br /><small className="texto-fraco">{dataHora(c.ultimaRespostaEm)}</small></>
                    : c.erroResposta ? <><Pill tom="ruim">não enviada</Pill><br /><small className="texto-erro">{c.erroResposta}</small></> : <Pill>—</Pill>}</td>
                  <td><a className="btn btn-ghost btn-sm" href={linkWhatsApp(c.telefone.replace(/^55/, ""), "")} target="_blank" rel="noreferrer">Abrir conversa</a></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Estado>
    </section>
  );
}

const TEXTO_PADRAO = `Olá, {nome}! 💈 Seja bem-vindo(a) à Rede Barbearias.

Pra agendar seu horário é rapidinho: escolha a unidade, o barbeiro e o horário por aqui 👇
{link_agendar}

Se preferir falar com a gente, é só mandar sua mensagem que já te respondemos 😉`;
