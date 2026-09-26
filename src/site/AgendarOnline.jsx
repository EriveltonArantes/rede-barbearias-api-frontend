import React from "react";
import { api, qs } from "../api.js";
import { Avatar, Carregando, Estrelas, Erro, useApi } from "../ui.jsx";
import {
  CATEGORIAS_SERVICO, dataExtenso, diaSemana, hojeISO, hora, linkGoogleAgenda, linkWhatsApp, mensagemErro,
  moeda, parseLocal, somarDias, telefone, telefoneValido,
} from "../util.js";

/**
 * Agendamento online em etapas: unidade → serviço → profissional → dia/horário → dados → confirmação.
 * clienteLogado: quando vem da área do cliente, pula a etapa de dados e usa /api/minha-conta.
 */
export default function AgendarOnline({ clienteLogado, onConcluido, onVoltar }) {
  const unidades = useApi("/api/publico/unidades");
  const servicos = useApi("/api/publico/servicos");
  const [passo, setPasso] = React.useState(1);
  const [esc, setEsc] = React.useState({ unidade: null, servico: null, barbeiro: null, data: hojeISO(), slot: null });
  const [dados, setDados] = React.useState({ nome: clienteLogado?.nome || "", telefone: telefone(clienteLogado?.telefone || ""), email: clienteLogado?.email || "", cupom: "", observacao: "" });
  const [cupomInfo, setCupomInfo] = React.useState(null);
  const [erro, setErro] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);
  const [confirmado, setConfirmado] = React.useState(null);

  const barbeiros = useApi(esc.unidade ? "/api/publico/barbeiros" + qs({ unidadeId: esc.unidade.id }) : null);
  const slots = useApi(esc.unidade && esc.servico && passo === 4
    ? "/api/publico/disponibilidade" + qs({ unidadeId: esc.unidade.id, servicoId: esc.servico.id, data: esc.data, barbeiroId: esc.barbeiro?.id })
    : null);

  React.useEffect(() => {
    if (unidades.dados?.length === 1 && !esc.unidade) { setEsc((e) => ({ ...e, unidade: unidades.dados[0] })); setPasso(2); }
  }, [unidades.dados]);

  const escolher = (campo, valor, proximo) => {
    setEsc((e) => ({ ...e, [campo]: valor, ...(campo === "unidade" ? { barbeiro: null, slot: null } : {}), ...(campo !== "slot" ? { slot: null } : {}) }));
    setErro("");
    if (proximo) setPasso(proximo);
  };

  const validarCupom = async () => {
    if (!dados.cupom.trim()) { setCupomInfo(null); return; }
    try {
      setCupomInfo(await api(`/api/publico/cupons/${encodeURIComponent(dados.cupom.trim())}` + qs({ valor: esc.servico?.preco })));
    } catch (e) { setCupomInfo({ valido: false, mensagem: e.message }); }
  };

  const confirmar = async () => {
    setErro("");
    if (!clienteLogado) {
      if (dados.nome.trim().length < 3) return setErro("Informe seu nome completo.");
      if (!telefoneValido(dados.telefone)) return setErro("Informe um celular com DDD.");
    }
    setEnviando(true);
    try {
      const corpo = {
        unidadeId: esc.unidade.id, servicoId: esc.servico.id, barbeiroId: esc.barbeiro?.id ?? esc.slot.barbeiroId ?? null,
        inicio: esc.slot.inicio, nome: dados.nome || clienteLogado?.nome, telefone: dados.telefone || clienteLogado?.telefone,
        email: dados.email || null, cupom: cupomInfo?.valido ? dados.cupom.trim() : null, observacao: dados.observacao || null,
      };
      const r = await api(clienteLogado ? "/api/minha-conta/agendamentos" : "/api/publico/agendamentos", { method: "POST", body: corpo });
      setConfirmado(r);
      setPasso(6);
      onConcluido && onConcluido(r);
    } catch (e) {
      setErro(mensagemErro(e));
      if (e.status === 409) { setPasso(4); slots.recarregar(); }
    } finally {
      setEnviando(false);
    }
  };

  const dias = Array.from({ length: 21 }, (_, i) => somarDias(hojeISO(), i))
    .filter((d) => !esc.unidade || esc.unidade.diasFuncionamento.split(",").includes(String(((parseLocal(d).getDay() + 6) % 7) + 1)))
    .slice(0, 14);

  const etapas = ["Unidade", "Serviço", "Profissional", "Horário", clienteLogado ? "Revisão" : "Seus dados"];

  if (unidades.erro) return <Erro texto={unidades.erro} onTentar={unidades.recarregar} />;

  return (
    <div className="agendar">
      {passo < 6 && (
        <ol className="etapas">
          {etapas.map((e, i) => (
            <li key={e} className={passo === i + 1 ? "atual" : passo > i + 1 ? "feita" : ""}>
              <button type="button" disabled={passo <= i + 1} onClick={() => setPasso(i + 1)}>
                <span>{passo > i + 1 ? "✓" : i + 1}</span>{e}
              </button>
            </li>
          ))}
        </ol>
      )}

      {esc.unidade && passo > 1 && passo < 6 && (
        <div className="resumo-escolha">
          <span>📍 {esc.unidade.nome.replace("Rede Barbearias — ", "")}</span>
          {esc.servico && <span>✂️ {esc.servico.nome} · {moeda(esc.servico.preco)}</span>}
          {passo > 3 && <span>💈 {esc.barbeiro ? (esc.barbeiro.apelido || esc.barbeiro.nome) : "Sem preferência"}</span>}
          {esc.slot && <span>🗓️ {dataExtenso(esc.data)} às {esc.slot.hora}</span>}
        </div>
      )}

      {passo === 1 && (
        <section>
          <h3 className="agendar-titulo">Em qual unidade?</h3>
          {unidades.carregando ? <Carregando /> : (
            <div className="opcoes-grid">
              {unidades.dados.map((u) => (
                <button key={u.id} className="opcao" onClick={() => escolher("unidade", u, 2)}>
                  <b>{u.nome.replace("Rede Barbearias — ", "")}</b>
                  <span>{u.endereco} · {u.bairro}</span>
                  <small>{u.horaAbertura.slice(0, 5)}–{u.horaFechamento.slice(0, 5)}</small>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {passo === 2 && (
        <section>
          <h3 className="agendar-titulo">Qual serviço?</h3>
          {servicos.carregando ? <Carregando /> : Object.entries(CATEGORIAS_SERVICO).map(([cat, rot]) => {
            const lista = (servicos.dados || []).filter((s) => s.categoria === cat);
            if (!lista.length) return null;
            return (
              <div key={cat} className="grupo-servicos">
                <h4>{rot}</h4>
                <div className="opcoes-grid">
                  {lista.map((s) => (
                    <button key={s.id} className={"opcao" + (esc.servico?.id === s.id ? " sel" : "")} onClick={() => escolher("servico", s, 3)}>
                      <b>{s.nome}</b>
                      <span>{s.descricao}</span>
                      <small>{moeda(s.preco)} · {s.duracaoMinutos} min</small>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {passo === 3 && (
        <section>
          <h3 className="agendar-titulo">Com quem?</h3>
          {barbeiros.carregando ? <Carregando /> : (
            <div className="opcoes-grid">
              <button className="opcao opcao-barbeiro" onClick={() => escolher("barbeiro", null, 4)}>
                <span className="avatar avatar-ini" style={{ width: 48, height: 48 }}>⚡</span>
                <div><b>Sem preferência</b><span>Mostra mais horários: o primeiro barbeiro livre atende você.</span></div>
              </button>
              {(barbeiros.dados || []).map((b) => (
                <button key={b.id} className="opcao opcao-barbeiro" onClick={() => escolher("barbeiro", b, 4)}>
                  <Avatar nome={b.nome} foto={b.fotoUrl} tamanho={48} />
                  <div>
                    <b>{b.nome}{b.apelido ? ` (${b.apelido})` : ""}</b>
                    <span>{b.especialidades}</span>
                    {b.notaMedia && <small><Estrelas nota={Math.round(b.notaMedia)} tamanho={12} /> {b.notaMedia.toFixed(1)} · {b.totalAvaliacoes} avaliações</small>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {passo === 4 && (
        <section>
          <h3 className="agendar-titulo">Escolha o dia e o horário</h3>
          <div className="dias-scroll" role="listbox" aria-label="Dias">
            {dias.map((d) => (
              <button key={d} className={"dia-btn" + (d === esc.data ? " sel" : "")} onClick={() => escolher("data", d)} aria-selected={d === esc.data}>
                <small>{d === hojeISO() ? "hoje" : diaSemana(d)}</small>
                <b>{d.slice(8)}</b>
                <small>{parseLocal(d).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</small>
              </button>
            ))}
          </div>
          {slots.carregando ? <Carregando texto="Buscando horários livres..." /> :
            slots.erro ? <Erro texto={slots.erro} onTentar={slots.recarregar} /> :
            !slots.dados?.length ? <div className="estado-vazio">Nenhum horário livre nesse dia. Tente outro dia{esc.barbeiro ? " ou \"sem preferência\"" : ""}.</div> : (
              <div className="slots">
                {["Manhã", "Tarde", "Noite"].map((periodo) => {
                  const lista = slots.dados.filter((s) => {
                    const h = Number(s.hora.slice(0, 2));
                    return periodo === "Manhã" ? h < 12 : periodo === "Tarde" ? h >= 12 && h < 18 : h >= 18;
                  });
                  if (!lista.length) return null;
                  return (
                    <div key={periodo} className="slots-periodo">
                      <h4>{periodo}</h4>
                      <div className="slots-grid">
                        {lista.map((s) => (
                          <button key={s.hora} className={"slot" + (esc.slot?.hora === s.hora ? " sel" : "")}
                                  onClick={() => { setEsc((e) => ({ ...e, slot: { hora: s.hora, inicio: s.inicio } })); setPasso(5); }}>
                            {s.hora}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          {erro && <p className="texto-erro">{erro}</p>}
        </section>
      )}

      {passo === 5 && (
        <section className="agendar-dados">
          <h3 className="agendar-titulo">{clienteLogado ? "Confira e confirme" : "Seus dados"}</h3>
          {!clienteLogado && (
            <div className="form-grade">
              <label className="campo campo-largo"><span className="campo-label">Nome completo</span>
                <input value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} autoComplete="name" /></label>
              <label className="campo"><span className="campo-label">Celular (WhatsApp)</span>
                <input value={dados.telefone} inputMode="tel" autoComplete="tel" placeholder="(31) 99999-9999"
                       onChange={(e) => setDados({ ...dados, telefone: telefone(e.target.value) })} /></label>
              <label className="campo"><span className="campo-label">E-mail — receba a confirmação e o lembrete no dia</span>
                <input type="email" value={dados.email} autoComplete="email" onChange={(e) => setDados({ ...dados, email: e.target.value })} /></label>
            </div>
          )}
          <div className="form-grade">
            <label className="campo"><span className="campo-label">Cupom de desconto</span>
              <div className="linha-input">
                <input value={dados.cupom} placeholder="Ex.: BEMVINDO10" onChange={(e) => { setDados({ ...dados, cupom: e.target.value.toUpperCase() }); setCupomInfo(null); }} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={validarCupom}>Aplicar</button>
              </div>
              {cupomInfo && <span className={cupomInfo.valido ? "texto-ok" : "texto-erro"}>{cupomInfo.mensagem}</span>}
            </label>
            <label className="campo"><span className="campo-label">Observação (opcional)</span>
              <input value={dados.observacao} maxLength={500} placeholder="Ex.: quero manter o comprimento em cima"
                     onChange={(e) => setDados({ ...dados, observacao: e.target.value })} /></label>
          </div>
          <div className="total-agendar">
            <span>{esc.servico.nome}</span>
            {cupomInfo?.valido ? <b><s>{moeda(esc.servico.preco)}</s> {moeda(cupomInfo.valorFinal)}</b> : <b>{moeda(esc.servico.preco)}</b>}
            <small>Pagamento na barbearia: Pix, cartão ou dinheiro.</small>
          </div>
          {erro && <p className="texto-erro">{erro}</p>}
          <div className="agendar-acoes">
            <button className="btn btn-ghost" onClick={() => setPasso(4)}>← Trocar horário</button>
            <button className="btn btn-primary btn-lg" disabled={enviando} onClick={confirmar}>{enviando ? "Confirmando..." : "Confirmar agendamento"}</button>
          </div>
        </section>
      )}

      {passo === 6 && confirmado && (
        <section className="confirmado">
          <div className="confirmado-ico">✅</div>
          <h3>Horário marcado, {confirmado.clientePrimeiroNome}!</h3>
          <p className="confirmado-quando">{dataExtenso(confirmado.inicio.slice(0, 10))} às {hora(confirmado.inicio)}</p>
          <p>{confirmado.servicoNome} com <b>{confirmado.barbeiroNome}</b><br />{confirmado.unidadeNome} — {confirmado.unidadeEndereco}</p>
          <div className="codigo-box">Código do agendamento<b>{confirmado.codigo}</b><small>Guarde pra consultar ou cancelar.</small></div>
          <div className="agendar-acoes centro">
            <a className="btn btn-ghost" target="_blank" rel="noreferrer" href={linkGoogleAgenda({
              titulo: `${confirmado.servicoNome} — Rede Barbearias`, inicio: confirmado.inicio, fim: confirmado.fim,
              local: `${confirmado.unidadeNome}, ${confirmado.unidadeEndereco}`, detalhes: `Código ${confirmado.codigo} com ${confirmado.barbeiroNome}`,
            })}>📅 Salvar na agenda</a>
            {confirmado.unidadeWhatsapp && (
              <a className="btn btn-ghost" target="_blank" rel="noreferrer"
                 href={linkWhatsApp(confirmado.unidadeWhatsapp, `Olá! Acabei de agendar ${confirmado.servicoNome} (código ${confirmado.codigo}).`)}>💬 WhatsApp da unidade</a>
            )}
            {!clienteLogado && <a className="btn btn-ghost" href={"#/meu-horario/" + confirmado.codigo}>🔎 Ver / cancelar</a>}
            {onVoltar && <button className="btn btn-primary" onClick={onVoltar}>Concluir</button>}
          </div>
        </section>
      )}
    </div>
  );
}
