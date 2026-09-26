import React from "react";
import { qs } from "../api.js";
import { usePainel } from "../contexto.js";
import { Cabecalho, Estado, StatusPill, Vazio, useApi, useTabela } from "../ui.jsx";
import { baixarCSV, dataBR, FORMAS, hojeISO, hora, moeda, ORIGENS, somarDias, STATUS, telefone } from "../util.js";
import { AgendamentoForm, DetalheAgendamento } from "./Agenda.jsx";

/** Lista filtrável de agendamentos (período, status, barbeiro, busca) com exportação. */
export default function Agendamentos() {
  const { unidadeId, perms, unidades } = usePainel();
  const [f, setF] = React.useState({ de: hojeISO(), ate: somarDias(hojeISO(), 7), status: "", barbeiroId: "", busca: "" });
  const barbeiros = useApi("/api/barbeiros" + qs({ unidadeId }));
  const req = useApi("/api/agendamentos" + qs({ de: f.de, ate: f.ate, status: f.status, barbeiroId: f.barbeiroId, unidadeId }));
  const [detalhe, setDetalhe] = React.useState(null);
  const [novo, setNovo] = React.useState(false);

  const filtrados = (req.dados || []).filter((a) => !f.busca || `${a.clienteNome} ${a.clienteTelefone} ${a.codigo} ${a.servicoNome}`.toLowerCase().includes(f.busca.toLowerCase()));
  const [pagina, paginacao] = useTabela(filtrados, 20);
  const total = filtrados.filter((a) => a.pago).reduce((s, a) => s + Number(a.valorFinal || 0), 0);
  const atalho = (de, ate) => setF({ ...f, de, ate });

  const exportar = () => baixarCSV(`agendamentos_${f.de}_a_${f.ate}.csv`, [
    { titulo: "Código", valor: (a) => a.codigo }, { titulo: "Data", valor: (a) => dataBR(a.inicio) },
    { titulo: "Hora", valor: (a) => hora(a.inicio) }, { titulo: "Cliente", valor: (a) => a.clienteNome },
    { titulo: "Telefone", valor: (a) => telefone(a.clienteTelefone) }, { titulo: "Serviço", valor: (a) => a.servicoNome },
    { titulo: "Barbeiro", valor: (a) => a.barbeiroNome }, { titulo: "Unidade", valor: (a) => a.unidadeNome },
    { titulo: "Status", valor: (a) => STATUS[a.status].rotulo }, { titulo: "Origem", valor: (a) => ORIGENS[a.origem] },
    { titulo: "Valor tabela", valor: (a) => String(a.valor).replace(".", ",") },
    { titulo: "Valor pago", valor: (a) => (a.valorFinal ?? "").toString().replace(".", ",") },
    { titulo: "Forma", valor: (a) => FORMAS[a.formaPagamento] || "" },
    { titulo: "Comissão", valor: (a) => (a.comissaoValor ?? "").toString().replace(".", ",") },
  ], filtrados);

  return (
    <div>
      <Cabecalho titulo="Agendamentos" sub={`${filtrados.length} registro(s) · ${moeda(total)} recebidos`}>
        <button className="btn btn-ghost" onClick={exportar} disabled={!filtrados.length}>⬇️ Exportar CSV</button>
        <button className="btn btn-primary" onClick={() => setNovo(true)}>+ Agendar</button>
      </Cabecalho>
      <div className="filtros">
        <label>De <input type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} /></label>
        <label>Até <input type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} /></label>
        <div className="atalhos">
          <button className="chip" onClick={() => atalho(hojeISO(), hojeISO())}>Hoje</button>
          <button className="chip" onClick={() => atalho(somarDias(hojeISO(), 1), somarDias(hojeISO(), 1))}>Amanhã</button>
          <button className="chip" onClick={() => atalho(somarDias(hojeISO(), -7), hojeISO())}>Últimos 7 dias</button>
          <button className="chip" onClick={() => atalho(hojeISO(), somarDias(hojeISO(), 30))}>Próximos 30 dias</button>
        </div>
        <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} aria-label="Status">
          <option value="">Todos os status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
        </select>
        {!perms.barbeiro && (
          <select value={f.barbeiroId} onChange={(e) => setF({ ...f, barbeiroId: e.target.value })} aria-label="Barbeiro">
            <option value="">Todos os barbeiros</option>
            {(barbeiros.dados || []).map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
        )}
        <input className="busca" placeholder="🔎 Cliente, telefone ou código" value={f.busca} onChange={(e) => setF({ ...f, busca: e.target.value })} />
      </div>
      <Estado req={req} vazio={<Vazio icone="📭" texto="Nenhum agendamento nesse filtro." />}>
        {() => (
          <>
            <div className="tabela-wrap">
              <table className="tabela">
                <thead><tr><th>Quando</th><th>Cliente</th><th>Serviço</th><th>Barbeiro</th><th>Status</th><th className="num">Valor</th><th>Origem</th></tr></thead>
                <tbody>
                  {pagina.map((a) => (
                    <tr key={a.id} className="clicavel" onClick={() => setDetalhe(a)}>
                      <td><b>{dataBR(a.inicio)}</b> {hora(a.inicio)}</td>
                      <td>{a.clienteNome}<br /><small className="texto-fraco">{telefone(a.clienteTelefone)}</small></td>
                      <td>{a.servicoNome}{a.cupomCodigo && <small className="texto-fraco"> · 🏷️{a.cupomCodigo}</small>}</td>
                      <td>{a.barbeiroNome}{!unidadeId && unidades.length > 1 && <><br /><small className="texto-fraco">{a.unidadeNome.replace("Rede Barbearias — ", "")}</small></>}</td>
                      <td><StatusPill status={a.status} /></td>
                      <td className="num">{a.pago ? <>{moeda(a.valorFinal)}<br /><small className="texto-fraco">{FORMAS[a.formaPagamento]}</small></> : moeda(a.valorAPagar)}</td>
                      <td>{ORIGENS[a.origem]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {paginacao}
          </>
        )}
      </Estado>
      {detalhe && <DetalheAgendamento ag={detalhe} onClose={() => setDetalhe(null)} onMudou={req.recarregar} />}
      {novo && <AgendamentoForm unidadeId={unidadeId || detalhe?.unidadeId || unidades[0]?.id} onClose={() => setNovo(false)} onSalvo={() => { setNovo(false); req.recarregar(); }} />}
    </div>
  );
}
