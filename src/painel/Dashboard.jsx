import React from "react";
import { qs } from "../api.js";
import { usePainel } from "../contexto.js";
import { BarrasH, Colunas, Estado, Estrelas, GraficoArea, Kpi, StatusPill, Vazio, useApi } from "../ui.jsx";
import { dataCurta, FORMAS, hora, linkWhatsApp, moeda, numero, primeiroNome, STATUS } from "../util.js";

const SERIES = [
  { chave: "servicos", rotulo: "Serviços", cor: "var(--serie-1)" },
  { chave: "produtos", rotulo: "Produtos", cor: "var(--serie-2)" },
  { chave: "clube", rotulo: "Clube", cor: "var(--serie-3)" },
];

function Proximos({ lista, irPara }) {
  if (!lista?.length) return <Vazio icone="☕" texto="Nenhum cliente aguardando agora." />;
  return (
    <ul className="lista-proximos">
      {lista.map((a) => (
        <li key={a.id}>
          <span className="prox-hora">{hora(a.inicio)}</span>
          <div className="prox-txt"><b>{a.clienteNome}</b><span>{a.servicoNome} · {a.barbeiroNome}</span></div>
          <StatusPill status={a.status} />
        </li>
      ))}
      <li><button className="link-btn" onClick={() => irPara("agenda")}>Abrir agenda completa →</button></li>
    </ul>
  );
}

export default function Dashboard() {
  const { unidadeId, irPara, sessao } = usePainel();
  const req = useApi("/api/dashboard/resumo" + qs({ unidadeId }));

  return (
    <Estado req={req}>
      {(d) => {
        const k = d.kpis;
        const serie = d.faturamento14Dias.map((p) => ({ ...p, rotuloX: dataCurta(p.data) }));
        if (d.tipo === "BARBEIRO") {
          return (
            <div className="dash">
              <div className="kpi-grid">
                <Kpi icone="📅" rotulo="Clientes hoje" valor={k.agendamentosHoje} detalhe={`${k.atendidosHoje} já atendidos`} />
                <Kpi icone="✂️" rotulo="Atendimentos no mês" valor={numero(k.atendimentosMes)} />
                <Kpi icone="💰" rotulo="Faturei no mês" valor={moeda(k.faturamentoMes)} />
                <Kpi icone="🤝" rotulo="Minha comissão no mês" valor={moeda(k.comissaoMes)} tom="ouro" />
                <Kpi icone="⭐" rotulo="Minha nota" valor={k.notaMedia ? k.notaMedia.toFixed(1) : "—"} detalhe={`${k.totalAvaliacoes} avaliações`} />
              </div>
              <div className="dash-colunas">
                <div className="cartao"><h3>Próximos clientes</h3><Proximos lista={d.proximos.slice(0, 6)} irPara={irPara} /></div>
                <div className="cartao"><h3>Meu faturamento — 14 dias</h3>
                  <GraficoArea dados={serie} series={[SERIES[0]]} /></div>
              </div>
              <div className="cartao">
                <h3>Últimas avaliações</h3>
                {!d.ultimasAvaliacoes.length ? <Vazio texto="Ainda sem avaliações." /> : d.ultimasAvaliacoes.map((a) => (
                  <div className="avaliacao-linha" key={a.id}><Estrelas nota={a.nota} tamanho={14} /> <b>{a.clienteNome}</b> — {a.comentario || <i>sem comentário</i>}</div>
                ))}
              </div>
            </div>
          );
        }
        const variacao = k.variacaoMes;
        return (
          <div className="dash">
            <p className="saudacao">Bom trabalho, {primeiroNome(sessao.nome || sessao.username)}. Aqui está o movimento {unidadeId ? "da unidade" : "da rede"} hoje.</p>
            <div className="kpi-grid">
              <Kpi icone="📅" rotulo="Agendados hoje" valor={k.agendamentosHoje} detalhe={`${k.atendidosHoje} atendidos · ${k.aguardandoHoje} aguardando`} />
              <Kpi icone="💵" rotulo="Faturamento hoje" valor={moeda(k.faturamentoHoje)} />
              <Kpi icone="📈" rotulo="Faturamento no mês" valor={moeda(k.faturamentoMes)} tom="ouro"
                   detalhe={variacao === null ? "sem base de comparação" : `${variacao >= 0 ? "▲" : "▼"} ${Math.abs(variacao)}% vs. mesmo período do mês passado`} />
              <Kpi icone="🧾" rotulo="Ticket médio" valor={moeda(k.ticketMedio)} detalhe={`${numero(k.atendimentosMes)} atendimentos no mês`} />
              <Kpi icone="⭐" rotulo="Nota dos clientes" valor={k.notaMedia ? k.notaMedia.toFixed(1) : "—"} detalhe={`${numero(k.totalAvaliacoes)} avaliações`} />
              <Kpi icone="🔁" rotulo="Clube: assinantes ativos" valor={k.assinaturasAtivas} detalhe={`${moeda(k.receitaRecorrenteMensal)}/mês recorrente`} />
              <Kpi icone="🆕" rotulo="Clientes novos no mês" valor={k.novosClientesMes} />
              <Kpi icone="🚫" rotulo="Cancelamentos / faltas" valor={`${k.taxaCancelamento}% / ${k.taxaFalta}%`} tom={k.taxaFalta > 8 ? "alerta" : undefined} />
            </div>

            {(k.produtosEstoqueBaixo > 0 || k.despesasVencidas > 0) && (
              <div className="alertas">
                {k.produtosEstoqueBaixo > 0 && <button className="alerta" onClick={() => irPara("estoque")}>📦 {k.produtosEstoqueBaixo} produto(s) no estoque mínimo — repor</button>}
                {k.despesasVencidas > 0 && <button className="alerta alerta-ruim" onClick={() => irPara("financeiro")}>⏰ {k.despesasVencidas} conta(s) vencida(s) sem pagamento</button>}
              </div>
            )}

            <div className="dash-colunas">
              <div className="cartao cartao-largo">
                <h3>Faturamento dos últimos 14 dias</h3>
                <GraficoArea dados={serie} series={SERIES} />
              </div>
              <div className="cartao">
                <h3>Próximos clientes</h3>
                <Proximos lista={d.proximos.slice(0, 6)} irPara={irPara} />
              </div>
            </div>

            <div className="dash-colunas tres">
              <div className="cartao">
                <h3>Ranking de barbeiros (mês)</h3>
                <BarrasH formatar={moeda} itens={d.rankingBarbeirosMes.slice(0, 7).map((b) => ({ rotulo: b.nome.split(" ")[0] + (b.nota ? ` ★${b.nota}` : ""), valor: b.faturamento }))} />
              </div>
              <div className="cartao">
                <h3>Serviços mais vendidos (mês)</h3>
                <BarrasH formatar={(v) => v + "x"} cor="var(--serie-3)" itens={d.topServicosMes.map((s) => ({ rotulo: s.nome, valor: s.quantidade }))} />
              </div>
              <div className="cartao">
                <h3>Formas de pagamento (mês)</h3>
                <BarrasH formatar={moeda} cor="var(--serie-2)" itens={Object.entries(d.formasPagamentoMes).filter(([, v]) => v > 0)
                  .sort((a, b) => b[1] - a[1]).map(([f, v]) => ({ rotulo: FORMAS[f], valor: v }))} />
              </div>
            </div>

            <div className="dash-colunas tres">
              <div className="cartao">
                <h3>Horários de pico (30 dias)</h3>
                <p className="cartao-sub">Use pra montar a escala dos barbeiros.</p>
                <Colunas itens={d.horariosPico.map((h) => ({ rotulo: h.hora, valor: h.quantidade }))} formatar={(v) => v + " atend."} />
              </div>
              <div className="cartao">
                <h3>🎂 Aniversariantes do mês</h3>
                {!d.aniversariantesMes.length ? <Vazio texto="Ninguém faz aniversário este mês." /> : (
                  <ul className="lista-simples rolavel">
                    {d.aniversariantesMes.map((c) => (
                      <li key={c.id}>
                        <span>{c.hoje ? "🎉 " : ""}<b>dia {c.dia}</b> · {c.nome}</span>
                        <a target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"
                           href={linkWhatsApp(c.telefone, `Feliz aniversário, ${primeiroNome(c.nome)}! 🎉 A Rede Barbearias te deu um presente: 15% de desconto no próximo corte com o cupom NIVER15. 💈`)}>💬</a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="cartao">
                <h3>😴 Clientes sumidos (+45 dias)</h3>
                {!d.clientesSumidos.length ? <Vazio texto="Todo mundo voltou recentemente. 👏" /> : (
                  <ul className="lista-simples rolavel">
                    {d.clientesSumidos.map((c) => (
                      <li key={c.id}>
                        <span>{c.nome} <small className="texto-fraco">há {c.diasSemVir} dias</small></span>
                        <a target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"
                           href={linkWhatsApp(c.telefone, `Oi, ${primeiroNome(c.nome)}! Tá na hora de dar aquele trato no visual 💈 Agende em 1 minuto: ${window.location.origin}/#/agendar`)}>💬</a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="cartao">
              <h3>Situação dos agendamentos do mês</h3>
              <div className="status-resumo">
                {Object.entries(d.statusMes).map(([s, n]) => (
                  <div key={s} className="status-resumo-item"><span className={"pill " + STATUS[s].classe}>{STATUS[s].icone} {STATUS[s].rotulo}</span><b>{numero(n)}</b></div>
                ))}
              </div>
            </div>
          </div>
        );
      }}
    </Estado>
  );
}
