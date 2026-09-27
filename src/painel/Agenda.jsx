import React from "react";
import { api, qs } from "../api.js";
import { usePainel } from "../contexto.js";
import {
  Avatar, Campo, Carregando, Erro, Grade, Modal, Pill, PixCobranca, StatusPill, useAcao, useApi, useConfirmar,
} from "../ui.jsx";
import { HistoricoMensagens, LembretesDia } from "./Notificacoes.jsx";
import {
  dataExtenso, FORMAS, FORMAS_PAGAVEIS, hhmmParaMin, hojeISO, hora, linkWhatsApp, minParaHHMM, minutosDoDia, moeda,
  ORIGENS, primeiroNome, SINAL, somarDias, STATUS, telefone,
} from "../util.js";

const PX_POR_MIN = 1.6;

// ------------------------------------------------------------------ formulário novo / reagendar

export function AgendamentoForm({ unidadeId, inicial = {}, editar, onClose, onSalvo }) {
  const { sessao } = usePainel();
  const barbeiros = useApi("/api/barbeiros" + qs({ unidadeId, ativos: true }));
  const servicos = useApi("/api/servicos?ativos=true");
  const [f, setF] = React.useState(() => editar ? {
    clienteId: editar.clienteId, clienteRotulo: `${editar.clienteNome} · ${telefone(editar.clienteTelefone)}`,
    servicoId: String(editar.servicoId), barbeiroId: String(editar.barbeiroId), data: editar.inicio.slice(0, 10),
    hora: hora(editar.inicio), origem: editar.origem, observacao: editar.observacao || "", cupom: "",
  } : {
    clienteId: null, clienteRotulo: "", novoNome: "", novoTel: "", novoEmail: "", servicoId: "", barbeiroId: String(inicial.barbeiroId || sessao.barbeiroId || ""),
    data: inicial.data || hojeISO(), hora: inicial.hora || "", origem: "BALCAO", observacao: "", cupom: "",
  });
  const [busca, setBusca] = React.useState("");
  const [sugestoes, setSugestoes] = React.useState([]);
  const [novoCliente, setNovoCliente] = React.useState(false);
  const [executar, ocupado] = useAcao();

  React.useEffect(() => {
    if (busca.trim().length < 2) { setSugestoes([]); return; }
    const t = setTimeout(() => api("/api/clientes" + qs({ q: busca.trim() })).then((l) => setSugestoes(l.slice(0, 8))).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [busca]);

  const livres = useApi(f.servicoId && f.data
    ? "/api/agendamentos/disponibilidade" + qs({ unidadeId, servicoId: f.servicoId, data: f.data, barbeiroId: f.barbeiroId || undefined })
    : null);

  const salvar = async (e) => {
    e.preventDefault();
    const corpo = {
      barbeiroId: Number(f.barbeiroId), servicoId: Number(f.servicoId), clienteId: f.clienteId,
      clienteNome: novoCliente ? f.novoNome : null, clienteTelefone: novoCliente ? f.novoTel : null, clienteEmail: novoCliente && f.novoEmail ? f.novoEmail : null,
      inicio: `${f.data}T${f.hora}:00`, origem: f.origem, observacao: f.observacao || null, cupom: f.cupom || null,
    };
    const r = await executar(() => editar
      ? api("/api/agendamentos/" + editar.id, { method: "PUT", body: corpo })
      : api("/api/agendamentos", { method: "POST", body: corpo }), editar ? "Agendamento atualizado" : "Agendamento criado");
    if (r) onSalvo(r);
  };

  const servicoSel = servicos.dados?.find((s) => String(s.id) === f.servicoId);
  const pronto = f.servicoId && f.barbeiroId && f.data && f.hora && (f.clienteId || (novoCliente && f.novoNome && f.novoTel));

  return (
    <Modal titulo={editar ? "Reagendar / editar" : "Novo agendamento"} onClose={onClose} largura={640}
           rodape={<>
             <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
             <button className="btn btn-primary" form="form-ag" disabled={!pronto || ocupado}>{ocupado ? "Salvando..." : "Salvar"}</button>
           </>}>
      <form id="form-ag" onSubmit={salvar}>
        <Grade>
          <Campo label="Cliente" largo>
            {f.clienteId ? (
              <div className="linha-input">
                <input value={f.clienteRotulo} readOnly />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setF({ ...f, clienteId: null, clienteRotulo: "" })}>Trocar</button>
              </div>
            ) : novoCliente ? (
              <div className="linha-input">
                <input placeholder="Nome" value={f.novoNome} onChange={(e) => setF({ ...f, novoNome: e.target.value })} autoFocus />
                <input placeholder="Celular" value={f.novoTel} inputMode="tel" onChange={(e) => setF({ ...f, novoTel: telefone(e.target.value) })} />
                <input placeholder="E-mail (lembrete)" type="email" value={f.novoEmail} onChange={(e) => setF({ ...f, novoEmail: e.target.value })} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNovoCliente(false)}>Buscar</button>
              </div>
            ) : (
              <div className="autocomplete">
                <div className="linha-input">
                  <input placeholder="Buscar por nome ou telefone..." value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setNovoCliente(true); setF({ ...f, novoNome: /\d/.test(busca) ? "" : busca, novoTel: /\d/.test(busca) ? telefone(busca) : "" }); }}>+ Novo</button>
                </div>
                {sugestoes.length > 0 && (
                  <ul className="sugestoes">
                    {sugestoes.map((c) => (
                      <li key={c.id}><button type="button" onClick={() => { setF({ ...f, clienteId: c.id, clienteRotulo: `${c.nome} · ${telefone(c.telefone)}` }); setBusca(""); setSugestoes([]); }}>
                        <b>{c.nome}</b> <span>{telefone(c.telefone)}{c.pontos ? ` · ${c.pontos} pts` : ""}</span>
                      </button></li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Campo>
          <Campo label="Serviço">
            <select value={f.servicoId} onChange={(e) => setF({ ...f, servicoId: e.target.value })} required>
              <option value="">Selecione...</option>
              {(servicos.dados || []).map((s) => <option key={s.id} value={s.id}>{s.nome} — {moeda(s.preco)} · {s.duracaoMinutos}min</option>)}
            </select>
          </Campo>
          <Campo label="Barbeiro">
            <select value={f.barbeiroId} onChange={(e) => setF({ ...f, barbeiroId: e.target.value })} required disabled={!!sessao.barbeiroId}>
              <option value="">Selecione...</option>
              {(barbeiros.dados || []).map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Dia"><input type="date" value={f.data} min={hojeISO()} onChange={(e) => setF({ ...f, data: e.target.value })} required /></Campo>
          <Campo label="Horário" dica="Escolha um horário livre abaixo ou digite um encaixe.">
            <input type="time" step="300" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} required />
          </Campo>
          {f.servicoId && f.barbeiroId && (
            <div className="campo-largo">
              {livres.carregando ? <small className="texto-fraco">Buscando horários livres...</small> :
                !livres.dados?.length ? <small className="texto-fraco">Nenhum horário livre nesse dia pra esse barbeiro.</small> : (
                  <div className="slots-grid compacto">
                    {livres.dados.slice(0, 48).map((s) => (
                      <button type="button" key={s.hora} className={"slot" + (f.hora === s.hora ? " sel" : "")} onClick={() => setF({ ...f, hora: s.hora })}>{s.hora}</button>
                    ))}
                  </div>
                )}
            </div>
          )}
          <Campo label="Origem">
            <select value={f.origem} onChange={(e) => setF({ ...f, origem: e.target.value })}>
              {Object.entries(ORIGENS).filter(([k]) => k !== "APP_CLIENTE").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Campo>
          {!editar && <Campo label="Cupom (opcional)"><input value={f.cupom} onChange={(e) => setF({ ...f, cupom: e.target.value.toUpperCase() })} /></Campo>}
          <Campo label="Observação" largo><input value={f.observacao} onChange={(e) => setF({ ...f, observacao: e.target.value })} placeholder="Ex.: quer manter o topete" /></Campo>
        </Grade>
        {servicoSel && f.hora && (
          <p className="resumo-linha">⏱️ {f.hora} às {minParaHHMM(hhmmParaMin(f.hora) + servicoSel.duracaoMinutos)} · {moeda(servicoSel.preco)}</p>
        )}
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------------ finalizar (pagamento)

export function FinalizarModal({ ag, onClose, onFeito }) {
  const ficha = useApi("/api/clientes/" + ag.clienteId + "/ficha");
  const [modo, setModo] = React.useState("pagar");
  const [forma, setForma] = React.useState("PIX");
  const [extra, setExtra] = React.useState("");
  const [executar, ocupado] = useAcao();
  const aPagar = Math.max(0, Number(ag.valorAPagar) - Number(extra || 0));
  const f = ficha.dados;
  const assinaturaCobre = f?.assinatura && f.assinatura.status === "ATIVA" && !f.assinatura.vencida && f.assinatura.usosRestantes > 0;

  const confirmar = async () => {
    const corpo = modo === "clube" ? { usarAssinatura: true } : modo === "fidelidade" ? { usarFidelidade: true }
      : { formaPagamento: forma, descontoExtra: Number(extra || 0) };
    const r = await executar(() => api(`/api/agendamentos/${ag.id}/finalizar`, { method: "POST", body: corpo }), "Atendimento finalizado 💈");
    if (r) onFeito(r);
  };

  return (
    <Modal titulo="Finalizar atendimento" onClose={onClose} largura={560}
           rodape={<>
             <button className="btn btn-ghost" onClick={onClose}>Voltar</button>
             <button className="btn btn-primary" onClick={confirmar} disabled={ocupado}>
               {ocupado ? "Registrando..." : modo === "pagar" ? `Receber ${moeda(aPagar)}` : "Confirmar"}
             </button>
           </>}>
      <div className="finalizar-topo">
        <div><b>{ag.clienteNome}</b><span>{ag.servicoNome} · {ag.barbeiroNome}</span></div>
        <div className="finalizar-valor">{Number(ag.desconto) > 0 && <s>{moeda(ag.valor)}</s>}{moeda(ag.valorAPagar)}</div>
      </div>
      {ag.cupomCodigo && <p className="texto-ok">Cupom {ag.cupomCodigo} aplicado: −{moeda(ag.desconto)}</p>}
      {ag.sinalSituacao === "PAGO" && <p className="texto-ok">💠 Sinal de {moeda(ag.sinalValor)} já pago pelo Pix — já descontado do valor acima (se usar clube/cortesia, ele fica pra devolver).</p>}
      {ag.sinalSituacao === "PENDENTE" && <p className="texto-erro">💠 O sinal de {moeda(ag.sinalValor)} não foi confirmado. Se o cliente pagou, marque “Recebi o Pix” no detalhe antes de finalizar.</p>}
      {ficha.carregando ? <Carregando /> : (
        <div className="modo-pagto">
          <button className={"modo" + (modo === "pagar" ? " sel" : "")} onClick={() => setModo("pagar")}>💳 Cobrar</button>
          <button className={"modo" + (modo === "clube" ? " sel" : "")} disabled={!assinaturaCobre} onClick={() => setModo("clube")}
                  title={assinaturaCobre ? "" : "Cliente sem assinatura ativa com saldo"}>
            ⭐ Usar clube {f?.assinatura ? <small>{f.assinatura.planoNome} · {f.assinatura.usosRestantes} restante(s)</small> : <small>sem assinatura</small>}
          </button>
          <button className={"modo" + (modo === "fidelidade" ? " sel" : "")} disabled={!f?.podeResgatar} onClick={() => setModo("fidelidade")}>
            🎁 Resgatar fidelidade <small>{f?.cliente.pontos ?? 0}/{f?.pontosParaResgate ?? 10} pontos</small>
          </button>
        </div>
      )}
      {modo === "pagar" && (
        <>
          <div className="formas">
            {FORMAS_PAGAVEIS.map((fp) => (
              <button key={fp} className={"forma" + (forma === fp ? " sel" : "")} onClick={() => setForma(fp)}>{FORMAS[fp]}</button>
            ))}
          </div>
          <Campo label="Desconto extra (R$)"><input type="number" min="0" step="0.5" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="0,00" /></Campo>
          {forma === "PIX" && aPagar > 0 && <PixCobranca valor={aPagar.toFixed(2)} unidadeId={ag.unidadeId} referencia={"AG" + ag.id} />}
        </>
      )}
      {modo === "clube" && <p className="texto-ok">Vai consumir 1 uso do {f.assinatura.planoNome}. O cliente não paga nada agora.</p>}
      {modo === "fidelidade" && <p className="texto-ok">Troca {f.pontosParaResgate} pontos por este atendimento gratuito.</p>}
    </Modal>
  );
}

// ------------------------------------------------------------------ detalhe

export function DetalheAgendamento({ ag: inicial, onClose, onMudou, unidadeId }) {
  const { perms, irPara } = usePainel();
  const [ag, setAg] = React.useState(inicial);
  const [finalizando, setFinalizando] = React.useState(false);
  const [editando, setEditando] = React.useState(false);
  const [executar, ocupado] = useAcao();
  const confirmar = useConfirmar();

  const status = async (novo) => {
    let motivo = null;
    if (novo === "CANCELADO") {
      if (!(await confirmar(`Cancelar o horário de ${ag.clienteNome}? O horário fica livre na agenda.`, { perigo: true, ok: "Cancelar horário" }))) return;
      motivo = "Cancelado pela recepção";
    }
    const r = await executar(() => api(`/api/agendamentos/${ag.id}/status`, { method: "PATCH", body: { status: novo, motivo } }), STATUS[novo].rotulo);
    if (r) { setAg(r); onMudou(); }
  };
  const lembrete = async () => {
    const msg = `Olá, ${primeiroNome(ag.clienteNome)}! Passando pra lembrar do seu horário na ${ag.unidadeNome}: ${dataExtenso(ag.inicio.slice(0, 10))} às ${hora(ag.inicio)} com ${ag.barbeiroNome} (${ag.servicoNome}). Se precisar remarcar, responda esta mensagem. Código: ${ag.codigo} 💈`;
    window.open(linkWhatsApp(ag.clienteTelefone, msg), "_blank", "noopener");
    const r = await executar(() => api(`/api/agendamentos/${ag.id}/lembrete`, { method: "PATCH" }));
    if (r) { setAg(r); onMudou(); }
  };
  const sinal = async (acao, ok, pergunta) => {
    if (pergunta && !(await confirmar(pergunta, { ok }))) return;
    const r = await executar(() => api(`/api/agendamentos/${ag.id}/sinal?acao=${acao}`, { method: "POST" }), ok);
    if (r) { setAg(r); onMudou(); }
  };
  const excluir = async () => {
    if (!(await confirmar("Excluir definitivamente este agendamento? (use cancelar pra manter o histórico)", { perigo: true, ok: "Excluir" }))) return;
    const r = await executar(() => api("/api/agendamentos/" + ag.id, { method: "DELETE" }), "Agendamento excluído");
    if (r) { onMudou(); onClose(); }
  };

  if (finalizando) return <FinalizarModal ag={ag} onClose={() => setFinalizando(false)} onFeito={(r) => { setAg(r); setFinalizando(false); onMudou(); }} />;
  if (editando) return <AgendamentoForm unidadeId={unidadeId || ag.unidadeId} editar={ag} onClose={() => setEditando(false)} onSalvo={(r) => { setAg(r); setEditando(false); onMudou(); }} />;

  const aberto = !["CONCLUIDO", "CANCELADO", "NAO_COMPARECEU"].includes(ag.status);
  const passou = new Date(ag.inicio) < new Date();
  const hojeOuAntes = ag.inicio.slice(0, 10) <= hojeISO();

  return (
    <Modal titulo={`${hora(ag.inicio)} · ${ag.clienteNome}`} onClose={onClose} largura={560}>
      <div className="detalhe-topo"><StatusPill status={ag.status} /><span className="codigo-mini">#{ag.codigo}</span></div>
      <dl className="detalhe">
        <dt>Quando</dt><dd>{dataExtenso(ag.inicio.slice(0, 10))}, {hora(ag.inicio)}–{hora(ag.fim)}</dd>
        <dt>Serviço</dt><dd>{ag.servicoNome} ({ag.duracaoMinutos} min)</dd>
        <dt>Barbeiro</dt><dd>{ag.barbeiroNome} · {ag.unidadeNome.replace(/^.*? — /, "")}</dd>
        <dt>Cliente</dt><dd>{ag.clienteNome} · {telefone(ag.clienteTelefone)}</dd>
        <dt>Valor</dt><dd>{moeda(ag.valorAPagar)}{Number(ag.desconto) > 0 && <small className="texto-fraco"> (tabela {moeda(ag.valor)}, desconto {moeda(ag.desconto)})</small>}</dd>
        {ag.pago && <><dt>Pago</dt><dd>{moeda(ag.valorFinal)} · {FORMAS[ag.formaPagamento]} · comissão {moeda(ag.comissaoValor)}</dd></>}
        {ag.sinalSituacao && <><dt>Sinal</dt><dd>
          {moeda(ag.sinalValor)} <Pill tom={SINAL[ag.sinalSituacao]?.tom}>{SINAL[ag.sinalSituacao]?.rotulo}</Pill>
          {!perms.barbeiro && ag.sinalSituacao === "PENDENTE" && !ag.sinalAutomatico && <button className="link-btn" onClick={() => sinal("RECEBIDO", "Sinal recebido", `Confirmar que o Pix de ${moeda(ag.sinalValor)} caiu na conta?`)}>💠 Recebi o Pix</button>}
          {!perms.barbeiro && ag.sinalSituacao === "A_DEVOLVER" && <>
            <button className="link-btn" onClick={() => sinal("DEVOLVIDO", "Marcado como devolvido", `Já devolveu ${moeda(ag.sinalValor)} pro cliente?`)}>↩️ Devolvi</button>
            <button className="link-btn" onClick={() => sinal("RETER", "Sinal retido", "Ficar com o sinal? Ele entra como receita.")}>Reter</button>
          </>}
        </dd></>}
        <dt>Origem</dt><dd>{ORIGENS[ag.origem]}{ag.lembreteEnviado ? " · lembrete enviado ✓" : ""}</dd>
        {ag.observacao && <><dt>Obs.</dt><dd>{ag.observacao}</dd></>}
        {ag.motivoCancelamento && <><dt>Motivo</dt><dd>{ag.motivoCancelamento}</dd></>}
        {ag.nota && <><dt>Avaliação</dt><dd>{"★".repeat(ag.nota)}</dd></>}
      </dl>
      {aberto && (
        <div className="acoes-detalhe">
          {hojeOuAntes && <button className="btn btn-primary" onClick={() => setFinalizando(true)} disabled={ocupado}>💰 Finalizar e receber</button>}
          {ag.status === "AGENDADO" && <button className="btn btn-ghost" onClick={() => status("CONFIRMADO")} disabled={ocupado}>✔️ Confirmar</button>}
          {ag.status !== "EM_ATENDIMENTO" && hojeOuAntes && <button className="btn btn-ghost" onClick={() => status("EM_ATENDIMENTO")} disabled={ocupado}>✂️ Na cadeira</button>}
          <button className="btn btn-ghost" onClick={lembrete} disabled={ocupado}>💬 Lembrete WhatsApp</button>
          <button className="btn btn-ghost" onClick={() => setEditando(true)} disabled={ocupado}>🔁 Reagendar</button>
          {passou && <button className="btn btn-ghost" onClick={() => status("NAO_COMPARECEU")} disabled={ocupado}>⚠️ Faltou</button>}
          {!perms.barbeiro && <button className="btn btn-danger" onClick={() => status("CANCELADO")} disabled={ocupado}>✖️ Cancelar</button>}
        </div>
      )}
      <HistoricoMensagens agendamentoId={ag.id} />
      <div className="acoes-detalhe secundarias">
        {perms.equipe && <button className="link-btn" onClick={() => { onClose(); irPara("clientes"); sessionStorage.setItem("rb_abrir_cliente", ag.clienteId); }}>Ver ficha do cliente →</button>}
        {perms.excluir && !ag.pago && <button className="link-btn texto-erro" onClick={excluir}>Excluir registro</button>}
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ grade da agenda

export default function Agenda() {
  const { unidades, unidadeId, perms, sessao } = usePainel();
  const [data, setData] = React.useState(hojeISO());
  const [unidadeLocal, setUnidadeLocal] = React.useState("");
  const un = unidadeId || unidadeLocal || (unidades[0] ? String(unidades[0].id) : "");
  const unidade = unidades.find((u) => String(u.id) === String(un)) || (perms.barbeiro || !perms.admin ? unidades.find((u) => u.id === sessao.unidadeId) : null);
  const barbeiros = useApi(un ? "/api/barbeiros" + qs({ unidadeId: un, ativos: true }) : null);
  const ags = useApi(un ? "/api/agendamentos" + qs({ de: data, ate: data, unidadeId: un }) : null);
  const bloqueios = useApi(un ? "/api/bloqueios" + qs({ unidadeId: un }) : null);
  const [novo, setNovo] = React.useState(null);
  const [detalhe, setDetalhe] = React.useState(null);
  const [lembretes, setLembretes] = React.useState(false);
  const [agora, setAgora] = React.useState(new Date());
  React.useEffect(() => { const t = setInterval(() => setAgora(new Date()), 60000); return () => clearInterval(t); }, []);
  React.useEffect(() => { const t = setInterval(() => ags.recarregar(), 90000); return () => clearInterval(t); }, [un, data]);

  if (!unidade) return <Carregando />;
  const abre = hhmmParaMin(unidade.horaAbertura);
  const fecha = hhmmParaMin(unidade.horaFechamento);
  const altura = (fecha - abre) * PX_POR_MIN;
  const colunas = (barbeiros.dados || []).filter((b) => !perms.barbeiro || b.id === sessao.barbeiroId);
  const lista = (ags.dados || []).filter((a) => a.status !== "CANCELADO");
  const cancelados = (ags.dados || []).filter((a) => a.status === "CANCELADO").length;
  const diaDaSemana = String(((new Date(data + "T12:00").getDay() + 6) % 7) + 1);
  const abertoNoDia = unidade.diasFuncionamento.split(",").includes(diaDaSemana);
  const bloqsDia = (bloqueios.dados || []).filter((b) => b.inicio.slice(0, 10) <= data && b.fim.slice(0, 10) >= data);
  const minAgora = data === hojeISO() ? agora.getHours() * 60 + agora.getMinutes() : null;
  const totalDia = lista.reduce((s, a) => s + Number(a.pago ? a.valorFinal : a.valorAPagar), 0);

  const clicarGrade = (e, b) => {
    if (e.target !== e.currentTarget) return;
    const y = e.nativeEvent.offsetY;
    const min = abre + Math.floor(y / PX_POR_MIN / 15) * 15;
    setNovo({ barbeiroId: b.id, data, hora: minParaHHMM(min) });
  };
  const recarregar = () => { ags.recarregar(); };

  return (
    <div>
      <div className="agenda-barra">
        <div className="agenda-nav">
          <button className="btn btn-ghost btn-sm" onClick={() => setData(somarDias(data, -1))} aria-label="Dia anterior">‹</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setData(hojeISO())}>Hoje</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setData(somarDias(data, 1))} aria-label="Próximo dia">›</button>
          <input type="date" value={data} onChange={(e) => e.target.value && setData(e.target.value)} aria-label="Data" />
          <b className="agenda-data">{dataExtenso(data)}</b>
        </div>
        <div className="agenda-nav">
          {perms.admin && !unidadeId && (
            <select value={un} onChange={(e) => setUnidadeLocal(e.target.value)} aria-label="Unidade da agenda">
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome.replace(/^.*? — /, "")}</option>)}
            </select>
          )}
          <span className="agenda-resumo">{lista.length} horários · {moeda(totalDia)}{cancelados ? ` · ${cancelados} cancelado(s)` : ""}</span>
          {!perms.barbeiro && <button className="btn btn-ghost" onClick={() => setLembretes(true)}>🔔 Lembretes</button>}
          <button className="btn btn-primary" onClick={() => setNovo({ data })}>+ Agendar</button>
        </div>
      </div>

      <div className="legenda-status">
        {["AGENDADO", "CONFIRMADO", "EM_ATENDIMENTO", "CONCLUIDO", "NAO_COMPARECEU"].map((s) => (
          <span key={s}><i className={"leg-cor " + STATUS[s].classe}></i>{STATUS[s].rotulo}</span>
        ))}
        <span><i className="leg-cor leg-bloqueio"></i>Folga/bloqueio</span>
      </div>

      {ags.erro && <Erro texto={ags.erro} onTentar={ags.recarregar} />}
      {!abertoNoDia && <div className="aviso">🔒 A unidade não abre neste dia da semana.</div>}

      {barbeiros.carregando ? <Carregando /> : (
        <div className="agenda-grade-wrap">
          <div className="agenda-grade" style={{ gridTemplateColumns: `56px repeat(${colunas.length}, minmax(150px, 1fr))` }}>
            <div className="agenda-canto"></div>
            {colunas.map((b) => (
              <div className="agenda-cab" key={b.id}>
                <Avatar nome={b.nome} foto={b.fotoUrl} tamanho={30} />
                <div><b>{b.apelido || b.nome.split(" ")[0]}</b><small>{lista.filter((a) => a.barbeiroId === b.id).length} clientes</small></div>
              </div>
            ))}
            <div className="agenda-horas" style={{ height: altura }}>
              {Array.from({ length: Math.ceil((fecha - abre) / 60) + 1 }, (_, i) => abre + i * 60).filter((m) => m <= fecha).map((m) => (
                <span key={m} style={{ top: (m - abre) * PX_POR_MIN }}>{minParaHHMM(m)}</span>
              ))}
            </div>
            {colunas.map((b) => (
              <div key={b.id} className={"agenda-col" + (abertoNoDia ? "" : " fechado")} style={{ height: altura }}
                   onClick={(e) => abertoNoDia && clicarGrade(e, b)} title="Clique num espaço vazio pra agendar">
                {Array.from({ length: Math.ceil((fecha - abre) / 30) }, (_, i) => (
                  <span key={i} className={"linha-meia" + (i % 2 ? " meia" : "")} style={{ top: i * 30 * PX_POR_MIN }}></span>
                ))}
                {bloqsDia.filter((x) => !x.barbeiroId || x.barbeiroId === b.id).map((x) => {
                  const ini = x.inicio.slice(0, 10) < data ? abre : Math.max(abre, minutosDoDia(x.inicio));
                  const fim = x.fim.slice(0, 10) > data ? fecha : Math.min(fecha, minutosDoDia(x.fim));
                  if (fim <= ini) return null;
                  return <div key={x.id} className="bloco-bloqueio" style={{ top: (ini - abre) * PX_POR_MIN, height: (fim - ini) * PX_POR_MIN }}>🚫 {x.motivo}</div>;
                })}
                {lista.filter((a) => a.barbeiroId === b.id).map((a) => {
                  const ini = minutosDoDia(a.inicio), fim = minutosDoDia(a.fim);
                  const h = Math.max(22, (fim - ini) * PX_POR_MIN - 2);
                  return (
                    <button key={a.id} className={"bloco-ag " + STATUS[a.status].classe} style={{ top: (ini - abre) * PX_POR_MIN + 1, height: h }}
                            onClick={() => setDetalhe(a)} title={`${hora(a.inicio)} ${a.clienteNome} — ${a.servicoNome}`}>
                      <b>{hora(a.inicio)} {primeiroNome(a.clienteNome)}</b>
                      {h > 34 && <span>{a.servicoNome}</span>}
                      {h > 50 && <span>{a.pago ? "✅ " + moeda(a.valorFinal) : moeda(a.valorAPagar)}{a.origem === "ONLINE" ? " · 🌐" : ""}</span>}
                    </button>
                  );
                })}
                {minAgora !== null && minAgora >= abre && minAgora <= fecha && (
                  <span className="linha-agora" style={{ top: (minAgora - abre) * PX_POR_MIN }}></span>
                )}
              </div>
            ))}
          </div>
          {!colunas.length && <div className="estado-vazio">Nenhum barbeiro ativo nessa unidade.</div>}
        </div>
      )}

      {novo && <AgendamentoForm unidadeId={un} inicial={novo} onClose={() => setNovo(null)} onSalvo={(r) => { setNovo(null); if (r.inicio.slice(0, 10) !== data) setData(r.inicio.slice(0, 10)); recarregar(); }} />}
      {lembretes && <LembretesDia unidadeId={un} data={data} onClose={() => { setLembretes(false); ags.recarregar(); }} />}
      {detalhe && <DetalheAgendamento ag={detalhe} unidadeId={un} onClose={() => setDetalhe(null)} onMudou={recarregar} />}
    </div>
  );
}
