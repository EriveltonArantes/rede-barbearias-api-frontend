import React from "react";
import { api, qs } from "../api.js";
import { usePainel } from "../contexto.js";
import { Abas, Cabecalho, Estado, Pill, StatusPill, Vazio, useAcao, useApi, useConfirmar } from "../ui.jsx";
import { PERIODOS_ESPERA, SINAL, dataExtenso, dataHora, hojeISO, hora, linkWhatsApp, moeda, primeiroNome, somarDias, telefone } from "../util.js";

/** Tabela de sinais numa situação, com a ação da recepção. */
function ListaSinais({ situacao, vazio, acoes }) {
  const { unidadeId } = usePainel();
  const req = useApi("/api/agendamentos/sinais" + qs({ situacao, unidadeId }));
  const [executar, ocupado] = useAcao();
  const confirmar = useConfirmar();
  const agir = async (a, acao, pergunta, ok) => {
    if (pergunta && !(await confirmar(pergunta, { ok }))) return;
    if (await executar(() => api(`/api/agendamentos/${a.id}/sinal?acao=${acao}`, { method: "POST" }), ok)) req.recarregar();
  };
  return (
    <Estado req={req} vazio={<Vazio icone="💠" texto={vazio} />}>
      {(lista) => (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead><tr><th>Horário</th><th>Cliente</th><th>Sinal</th><th>Situação</th><th></th></tr></thead>
            <tbody>{lista.map((a) => (
              <tr key={a.id}>
                <td>{dataExtenso(a.inicio.slice(0, 10))} · {hora(a.inicio)}<br /><small className="texto-fraco">{a.servicoNome} · {a.barbeiroNome.split(" ")[0]} · #{a.codigo}</small></td>
                <td>{a.clienteNome}<br /><small className="texto-fraco">{telefone(a.clienteTelefone)}</small></td>
                <td><b>{moeda(a.sinalValor)}</b>{a.sinalExpiraEm && situacao === "PENDENTE" && <><br /><small className="texto-fraco">prazo {dataHora(a.sinalExpiraEm)}</small></>}</td>
                <td><Pill tom={SINAL[a.sinalSituacao]?.tom}>{SINAL[a.sinalSituacao]?.rotulo}</Pill>{a.status === "CANCELADO" && <><br /><StatusPill status={a.status} /></>}</td>
                <td className="acoes-celula">{acoes(a, agir, ocupado)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </Estado>
  );
}

/** Fila de espera dos próximos dias, com aviso manual pelo WhatsApp. */
function Fila() {
  const { unidadeId } = usePainel();
  const [de, setDe] = React.useState(hojeISO());
  const req = useApi("/api/lista-espera" + qs({ de, ate: somarDias(de, 30), unidadeId }));
  const [executar] = useAcao();
  const [mostrarTodos, setMostrarTodos] = React.useState(false);
  const mudar = async (e, status, ok) => {
    if (await executar(() => api(`/api/lista-espera/${e.id}?status=${status}`, { method: "PATCH" }), ok)) req.recarregar();
  };
  const avisarWhats = (e) => {
    const msg = `Olá, ${primeiroNome(e.clienteNome)}! Aqui é da ${e.unidadeNome.replace(" — ", " ")} 💈 Você estava na lista de espera de ${dataExtenso(e.data)} — abriu um horário! Agende aqui: ${window.location.origin}/#/agendar?unidade=${e.unidadeId}&servico=${e.servicoId}&data=${e.data}`;
    window.open(linkWhatsApp(e.clienteTelefone, msg), "_blank", "noopener");
    mudar(e, "AVISADO");
  };
  return (
    <>
      <div className="filtros">
        <label className="campo"><span className="campo-label">A partir de</span><input type="date" value={de} onChange={(e) => setDe(e.target.value)} /></label>
        <label className="check"><input type="checkbox" checked={mostrarTodos} onChange={(e) => setMostrarTodos(e.target.checked)} /> mostrar quem já agendou / desistiu</label>
      </div>
      <p className="texto-fraco">Quando alguém cancela, os primeiros da fila daquele dia são avisados sozinhos (WhatsApp/e-mail). Aqui dá pra ver a fila e avisar na mão.</p>
      <Estado req={req} vazio={<Vazio icone="⏳" texto="Ninguém na lista de espera nesse período." />}>
        {(lista) => {
          const vis = lista.filter((e) => mostrarTodos || ["AGUARDANDO", "AVISADO"].includes(e.status));
          if (!vis.length) return <Vazio icone="⏳" texto="Ninguém esperando vaga nesse período." />;
          return (
            <div className="tabela-wrap">
              <table className="tabela">
                <thead><tr><th>Dia</th><th>Cliente</th><th>Quer</th><th>Situação</th><th></th></tr></thead>
                <tbody>{vis.map((e) => (
                  <tr key={e.id}>
                    <td>{dataExtenso(e.data)}<br /><small className="texto-fraco">{PERIODOS_ESPERA[e.periodo]}</small></td>
                    <td>{e.clienteNome}<br /><small className="texto-fraco">{telefone(e.clienteTelefone)} · na fila desde {dataHora(e.criadoEm)}</small></td>
                    <td>{e.servicoNome}{e.barbeiroNome ? <> com {e.barbeiroNome.split(" ")[0]}</> : ""}<br /><small className="texto-fraco">{e.unidadeNome.replace(/^.*? — /, "")}</small></td>
                    <td><Pill tom={e.status === "AVISADO" ? "aviso" : e.status === "AGENDOU" ? "bom" : "neutro"}>{e.status.toLowerCase()}</Pill>
                      {e.avisos > 0 && <><br /><small className="texto-fraco">avisado {e.avisos}x · {dataHora(e.avisadoEm)}</small></>}</td>
                    <td className="acoes-celula">
                      {["AGUARDANDO", "AVISADO"].includes(e.status) && <>
                        <button className="btn btn-ghost btn-sm" onClick={() => avisarWhats(e)}>💬 Avisar</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => mudar(e, "DESISTIU", "Removido da fila")}>Tirar da fila</button>
                      </>}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          );
        }}
      </Estado>
    </>
  );
}

export default function SinaisEspera() {
  const [aba, setAba] = React.useState("pendentes");
  return (
    <div>
      <Cabecalho titulo="Sinais e lista de espera" sub="Confira os Pix de sinal, devolva o que for preciso e acompanhe quem está esperando vaga" />
      <Abas abas={[["pendentes", "💠 Sinais a conferir"], ["devolver", "↩️ Sinais a devolver"], ["espera", "⏳ Lista de espera"]]} atual={aba} onChange={setAba} />
      {aba === "pendentes" && (
        <>
          <p className="texto-fraco">Clientes que agendaram online e precisam pagar o sinal. Com Pix estático, confira no app do banco (o identificador é <code>SINAL</code> + código do horário) e clique em “Recebi o Pix”.</p>
          <ListaSinais situacao="PENDENTE" vazio="Nenhum sinal esperando pagamento."
            acoes={(a, agir, ocupado) => a.sinalAutomatico
              ? <small className="texto-fraco">confirma sozinho pelo gateway</small>
              : <button className="btn btn-primary btn-sm" disabled={ocupado} onClick={() => agir(a, "RECEBIDO", `Confirmar que o Pix de ${moeda(a.sinalValor)} de ${a.clienteNome} caiu na conta?`, "Sinal recebido")}>💠 Recebi o Pix</button>} />
        </>
      )}
      {aba === "devolver" && (
        <>
          <p className="texto-fraco">Cancelaram com antecedência (ou a barbearia cancelou): devolva o sinal pelo Pix e marque aqui. Se o cliente preferir deixar como crédito, use “Reter”.</p>
          <ListaSinais situacao="A_DEVOLVER" vazio="Nenhum sinal pra devolver."
            acoes={(a, agir, ocupado) => <>
              <button className="btn btn-primary btn-sm" disabled={ocupado} onClick={() => agir(a, "DEVOLVIDO", `Já devolveu ${moeda(a.sinalValor)} pra ${a.clienteNome}?`, "Marcado como devolvido")}>↩️ Devolvi</button>
              <button className="btn btn-ghost btn-sm" disabled={ocupado} onClick={() => agir(a, "RETER", `Ficar com o sinal de ${a.clienteNome}? Ele entra como receita.`, "Sinal retido")}>Reter</button>
            </>} />
        </>
      )}
      {aba === "espera" && <Fila />}
    </div>
  );
}
