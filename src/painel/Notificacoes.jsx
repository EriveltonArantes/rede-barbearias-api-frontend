import React from "react";
import { api, qs } from "../api.js";
import { usePainel } from "../contexto.js";
import { Cabecalho, Campo, Estado, Modal, Pill, StatusPill, Vazio, useAcao, useApi, useTabela } from "../ui.jsx";
import { copiar, dataExtenso, dataHora, hojeISO, hora, linkWhatsApp, primeiroNome, telefone } from "../util.js";

export const TIPOS_MSG = {
  CONFIRMACAO: "Confirmação", LEMBRETE: "Lembrete do dia", REAGENDAMENTO: "Horário alterado",
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
        Clientes com e-mail (ou com WhatsApp oficial ligado) recebem o lembrete sozinhos pela manhã.
        Pros demais, clique em 💬: o WhatsApp abre com a mensagem pronta, é só apertar enviar.
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
                  <li><span>Lembrete</span><small className="texto-fraco">no dia, a partir das 7h</small></li>
                  <li><span>Alteração / cancelamento</span><small className="texto-fraco">na hora</small></li>
                  <li><span>Pedido de avaliação</span><small className="texto-fraco">1h30 depois do pagamento</small></li>
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
              <summary><b>Como ligar o WhatsApp oficial</b></summary>
              <ol>
                <li>No <a href="https://business.facebook.com" target="_blank" rel="noreferrer">Meta Business</a>, crie um app do tipo <i>Business</i> e adicione o produto <i>WhatsApp</i>.</li>
                <li>Cadastre um número exclusivo da barbearia (ele deixa de funcionar no app comum) e gere um <b>token permanente</b> de usuário do sistema.</li>
                <li>Em <i>Modelos de mensagem</i>, crie os 5 modelos abaixo com o <b>mesmo nome</b>, categoria <b>Utilidade</b>, idioma <b>Português (BR)</b> — copie o texto.</li>
                <li>No Render, adicione <code>WHATSAPP_TOKEN</code> e <code>WHATSAPP_PHONE_NUMBER_ID</code>. Pronto: as mensagens passam a sair também por WhatsApp.</li>
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
