import React from "react";
import { api, qs } from "../api.js";
import { usePainel } from "../contexto.js";
import {
  Abas, BarrasH, Cabecalho, Campo, Estado, GraficoArea, Grade, Kpi, Modal, Pill, Upload, Vazio, useAcao, useApi, useConfirmar,
} from "../ui.jsx";
import { baixarCSV, CATEGORIAS_DESPESA, dataBR, dataCurta, FORMAS, hojeISO, hora, moeda, primeiroDiaMes, somarDias } from "../util.js";

const SERIES = [
  { chave: "servicos", rotulo: "Serviços", cor: "var(--serie-1)" },
  { chave: "produtos", rotulo: "Produtos", cor: "var(--serie-2)" },
  { chave: "clube", rotulo: "Clube", cor: "var(--serie-3)" },
];

function Periodo({ p, setP }) {
  const hoje = hojeISO();
  const mesPassadoIni = primeiroDiaMes(somarDias(primeiroDiaMes(hoje), -1));
  return (
    <div className="filtros">
      <label>De <input type="date" value={p.de} onChange={(e) => setP({ ...p, de: e.target.value })} /></label>
      <label>Até <input type="date" value={p.ate} onChange={(e) => setP({ ...p, ate: e.target.value })} /></label>
      <button className="chip" onClick={() => setP({ de: hoje, ate: hoje })}>Hoje</button>
      <button className="chip" onClick={() => setP({ de: somarDias(hoje, -6), ate: hoje })}>7 dias</button>
      <button className="chip" onClick={() => setP({ de: primeiroDiaMes(hoje), ate: hoje })}>Este mês</button>
      <button className="chip" onClick={() => setP({ de: mesPassadoIni, ate: somarDias(primeiroDiaMes(hoje), -1) })}>Mês passado</button>
      <button className="chip" onClick={() => setP({ de: somarDias(hoje, -89), ate: hoje })}>90 dias</button>
    </div>
  );
}

function Resumo({ unidadeId }) {
  const [p, setP] = React.useState({ de: primeiroDiaMes(), ate: hojeISO() });
  const req = useApi("/api/financeiro/resumo" + qs({ ...p, unidadeId }));
  return (
    <>
      <Periodo p={p} setP={setP} />
      <Estado req={req}>
        {(r) => (
          <div className="dash">
            <div className="kpi-grid">
              <Kpi icone="💵" rotulo="Receita total" valor={moeda(r.receitaTotal)} tom="ouro" detalhe={`${r.atendimentos} atendimentos · ${r.vendasProdutos} vendas`} />
              <Kpi icone="🤝" rotulo="Comissões" valor={moeda(r.comissoes)} />
              <Kpi icone="🧾" rotulo="Despesas" valor={moeda(r.despesas)} detalhe={`${moeda(r.despesasAPagar)} a pagar`} />
              <Kpi icone="📦" rotulo="Custo dos produtos" valor={moeda(r.custoProdutos)} />
              <Kpi icone={Number(r.lucroEstimado) >= 0 ? "📈" : "📉"} rotulo="Lucro estimado" valor={moeda(r.lucroEstimado)}
                   detalhe={`margem ${r.margemPercentual}%`} tom={Number(r.lucroEstimado) >= 0 ? "bom" : "alerta"} />
              <Kpi icone="🎯" rotulo="Ticket médio" valor={moeda(r.ticketMedio)} detalhe={`descontos: ${moeda(r.descontosConcedidos)}`} />
            </div>
            <div className="cartao">
              <h3>Receita por dia</h3>
              <GraficoArea dados={r.serieDiaria.map((d) => ({ ...d, rotuloX: dataCurta(d.data) }))} series={SERIES} altura={240} />
            </div>
            <div className="dash-colunas tres">
              <div className="cartao">
                <h3>DRE simplificado</h3>
                <table className="dre">
                  <tbody>
                    <tr><td>Serviços</td><td>{moeda(r.receitaServicos)}</td></tr>
                    <tr><td>Produtos</td><td>{moeda(r.receitaProdutos)}</td></tr>
                    <tr><td>Clube (mensalidades)</td><td>{moeda(r.receitaClube)}</td></tr>
                    <tr className="dre-total"><td>Receita bruta</td><td>{moeda(r.receitaTotal)}</td></tr>
                    <tr><td>(−) Comissões</td><td>{moeda(r.comissoes)}</td></tr>
                    <tr><td>(−) Custo dos produtos</td><td>{moeda(r.custoProdutos)}</td></tr>
                    <tr><td>(−) Despesas</td><td>{moeda(r.despesas)}</td></tr>
                    <tr className={"dre-total " + (Number(r.lucroEstimado) >= 0 ? "texto-ok" : "texto-erro")}><td>Resultado</td><td>{moeda(r.lucroEstimado)}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="cartao">
                <h3>Por forma de pagamento</h3>
                <BarrasH formatar={moeda} itens={Object.entries(r.porFormaPagamento).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([f, v]) => ({ rotulo: FORMAS[f], valor: v }))} />
              </div>
              <div className="cartao">
                <h3>Despesas por categoria</h3>
                <BarrasH formatar={moeda} cor="var(--serie-2)" itens={Object.entries(r.despesasPorCategoria).sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ rotulo: CATEGORIAS_DESPESA[c], valor: v }))} />
              </div>
            </div>
            {r.porUnidade && (
              <div className="cartao">
                <h3>Comparativo entre unidades</h3>
                <table className="tabela">
                  <thead><tr><th>Unidade</th><th className="num">Atendimentos</th><th className="num">Receita</th><th className="num">Despesas</th><th className="num">Receita − despesas</th></tr></thead>
                  <tbody>{r.porUnidade.map((u) => (
                    <tr key={u.unidadeId}><td>{u.unidadeNome.replace("Rede Barbearias — ", "")}</td><td className="num">{u.atendimentos}</td><td className="num">{moeda(u.receita)}</td><td className="num">{moeda(u.despesas)}</td><td className="num"><b>{moeda(u.receita - u.despesas)}</b></td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Estado>
    </>
  );
}

function Caixa({ unidadeId }) {
  const [dia, setDia] = React.useState(hojeISO());
  const req = useApi("/api/financeiro/caixa" + qs({ data: dia, unidadeId }));
  return (
    <>
      <div className="filtros">
        <button className="chip" onClick={() => setDia(somarDias(dia, -1))}>‹ Dia anterior</button>
        <input type="date" value={dia} onChange={(e) => e.target.value && setDia(e.target.value)} />
        <button className="chip" onClick={() => setDia(hojeISO())}>Hoje</button>
        <button className="chip" onClick={() => window.print()}>🖨️ Imprimir fechamento</button>
      </div>
      <Estado req={req}>
        {(c) => (
          <div className="dash imprimivel">
            <div className="kpi-grid">
              <Kpi icone="💰" rotulo={`Entradas em ${dataBR(c.data)}`} valor={moeda(c.totalEntradas)} tom="ouro" detalhe={`${c.lancamentos.length} lançamentos`} />
              {Object.entries(c.porFormaPagamento).filter(([, v]) => v > 0).map(([f, v]) => <Kpi key={f} icone={f === "PIX" ? "⚡" : f === "DINHEIRO" ? "💵" : f.startsWith("CARTAO") ? "💳" : "⭐"} rotulo={FORMAS[f]} valor={moeda(v)} />)}
            </div>
            {!c.lancamentos.length ? <Vazio icone="🧾" texto="Nenhum lançamento nesse dia." /> : (
              <div className="tabela-wrap">
                <table className="tabela">
                  <thead><tr><th>Hora</th><th>Tipo</th><th>Descrição</th><th>Forma</th><th className="num">Valor</th></tr></thead>
                  <tbody>{c.lancamentos.map((l, i) => (
                    <tr key={i}><td>{hora(l.dataHora)}</td><td><Pill>{l.tipo}</Pill></td><td>{l.descricao}{!unidadeId && <small className="texto-fraco"> · {l.unidade.replace("Rede Barbearias — ", "")}</small>}</td><td>{FORMAS[l.formaPagamento]}</td><td className="num">{moeda(l.valor)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Estado>
    </>
  );
}

function Comissoes({ unidadeId }) {
  const [p, setP] = React.useState({ de: primeiroDiaMes(), ate: hojeISO() });
  const req = useApi("/api/financeiro/comissoes" + qs({ ...p, unidadeId }));
  return (
    <>
      <Periodo p={p} setP={setP} />
      <Estado req={req} vazio={<Vazio texto="Sem comissões no período." />}>
        {(l) => (
          <>
            <div className="acoes-linha direita">
              <button className="btn btn-ghost" onClick={() => baixarCSV(`comissoes_${p.de}_a_${p.ate}.csv`, [
                { titulo: "Barbeiro", valor: (x) => x.barbeiroNome }, { titulo: "Unidade", valor: (x) => x.unidadeNome },
                { titulo: "Atendimentos", valor: (x) => x.atendimentos }, { titulo: "Pelo clube", valor: (x) => x.atendimentosClube },
                { titulo: "Faturamento serviços", valor: (x) => String(x.faturamentoServicos).replace(".", ",") },
                { titulo: "Comissão serviços", valor: (x) => String(x.comissaoServicos).replace(".", ",") },
                { titulo: "Vendas produtos", valor: (x) => String(x.faturamentoProdutos).replace(".", ",") },
                { titulo: "Comissão produtos", valor: (x) => String(x.comissaoProdutos).replace(".", ",") },
                { titulo: "Total a pagar", valor: (x) => String(x.totalComissao).replace(".", ",") },
              ], l)}>⬇️ Exportar folha de comissão</button>
            </div>
            <div className="tabela-wrap">
              <table className="tabela">
                <thead><tr><th>Barbeiro</th><th className="num">Atend.</th><th className="num">Faturou (serviços)</th><th className="num">Comissão serviços</th><th className="num">Produtos</th><th className="num">Comissão produtos</th><th className="num">Total a pagar</th></tr></thead>
                <tbody>{l.map((x) => (
                  <tr key={x.barbeiroId}>
                    <td><b>{x.barbeiroNome}</b><br /><small className="texto-fraco">{x.unidadeNome.replace("Rede Barbearias — ", "")} · {x.percentualServico}% / {x.percentualProduto}%</small></td>
                    <td className="num">{x.atendimentos}{x.atendimentosClube ? <small className="texto-fraco"><br />{x.atendimentosClube} clube</small> : ""}</td>
                    <td className="num">{moeda(x.faturamentoServicos)}</td><td className="num">{moeda(x.comissaoServicos)}</td>
                    <td className="num">{moeda(x.faturamentoProdutos)}</td><td className="num">{moeda(x.comissaoProdutos)}</td>
                    <td className="num"><b>{moeda(x.totalComissao)}</b></td>
                  </tr>
                ))}</tbody>
                {l.length > 1 && <tfoot><tr><td>Total</td><td className="num">{l.reduce((s, x) => s + x.atendimentos, 0)}</td><td className="num">{moeda(l.reduce((s, x) => s + x.faturamentoServicos, 0))}</td><td></td><td></td><td></td><td className="num"><b>{moeda(l.reduce((s, x) => s + x.totalComissao, 0))}</b></td></tr></tfoot>}
              </table>
            </div>
            <p className="campo-dica">Atendimentos do clube e cortesias de fidelidade pagam comissão sobre o preço de tabela do serviço.</p>
          </>
        )}
      </Estado>
    </>
  );
}

function DespesaForm({ despesa, unidadeId, onClose, onSalvo }) {
  const { unidades } = usePainel();
  const [f, setF] = React.useState({
    unidadeId: despesa?.unidadeId || unidadeId || unidades[0]?.id || "", descricao: despesa?.descricao || "", categoria: despesa?.categoria || "OUTROS",
    valor: despesa?.valor ?? "", vencimento: despesa?.vencimento || hojeISO(), paga: despesa?.paga ?? false, fornecedor: despesa?.fornecedor || "", comprovanteUrl: despesa?.comprovanteUrl || "",
  });
  const [executar, ocupado] = useAcao();
  const [repetir, setRepetir] = React.useState(1);
  const salvar = async (e) => {
    e.preventDefault();
    const ok = await executar(async () => {
      if (despesa) return api("/api/despesas/" + despesa.id, { method: "PUT", body: { ...f, unidadeId: Number(f.unidadeId) } });
      // despesa recorrente: cria uma por mês
      for (let i = 0; i < repetir; i++) {
        const [a, m, d] = f.vencimento.split("-").map(Number);
        const mes = new Date(a, m - 1 + i, 1);
        const diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
        const venc = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}-${String(Math.min(d, diasNoMes)).padStart(2, "0")}`;
        await api("/api/despesas", { method: "POST", body: { ...f, unidadeId: Number(f.unidadeId), vencimento: venc, paga: i === 0 && f.paga } });
      }
      return true;
    }, "Despesa salva");
    if (ok) onSalvo();
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal titulo={despesa ? "Editar despesa" : "Nova despesa"} onClose={onClose}
           rodape={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" form="f-desp" disabled={ocupado}>Salvar</button></>}>
      <form id="f-desp" onSubmit={salvar}>
        <Grade>
          <Campo label="Descrição" largo><input value={f.descricao} onChange={set("descricao")} required /></Campo>
          <Campo label="Unidade"><select value={f.unidadeId} onChange={set("unidadeId")}>{unidades.map((u) => <option key={u.id} value={u.id}>{u.nome.replace("Rede Barbearias — ", "")}</option>)}</select></Campo>
          <Campo label="Categoria"><select value={f.categoria} onChange={set("categoria")}>{Object.entries(CATEGORIAS_DESPESA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Campo>
          <Campo label="Valor (R$)"><input type="number" step="0.01" min="0.01" value={f.valor} onChange={set("valor")} required /></Campo>
          <Campo label="Vencimento"><input type="date" value={f.vencimento} onChange={set("vencimento")} required /></Campo>
          <Campo label="Fornecedor"><input value={f.fornecedor} onChange={set("fornecedor")} /></Campo>
          {!despesa && <Campo label="Repetir por (meses)" dica="Pra aluguel, internet, salários..."><input type="number" min="1" max="12" value={repetir} onChange={(e) => setRepetir(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} /></Campo>}
          <Campo label="Comprovante / boleto" largo><Upload valor={f.comprovanteUrl} onChange={(u) => setF({ ...f, comprovanteUrl: u })} rotulo="Anexar arquivo" /></Campo>
          <label className="check"><input type="checkbox" checked={f.paga} onChange={(e) => setF({ ...f, paga: e.target.checked })} /> Já está paga</label>
        </Grade>
      </form>
    </Modal>
  );
}

function Despesas({ unidadeId }) {
  const hoje = hojeISO();
  const ultimoDia = (() => { const d = new Date(); return `${hoje.slice(0, 8)}${new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()}`; })();
  const [p, setP] = React.useState({ de: primeiroDiaMes(), ate: ultimoDia });
  const req = useApi("/api/despesas" + qs({ ...p, unidadeId }));
  const [form, setForm] = React.useState(null);
  const confirmar = useConfirmar();
  const [executar] = useAcao();
  const l = req.dados || [];
  const total = l.reduce((s, d) => s + Number(d.valor), 0);
  const aPagar = l.filter((d) => !d.paga).reduce((s, d) => s + Number(d.valor), 0);
  const pagar = async (d) => { if (await executar(() => api(`/api/despesas/${d.id}/pagar`, { method: "POST" }), "Marcada como paga")) req.recarregar(); };
  const excluir = async (d) => {
    if (!(await confirmar(`Excluir "${d.descricao}"?`, { perigo: true, ok: "Excluir" }))) return;
    if (await executar(() => api("/api/despesas/" + d.id, { method: "DELETE" }), "Despesa excluída")) req.recarregar();
  };
  return (
    <>
      <div className="acoes-linha entre">
        <Periodo p={p} setP={setP} />
        <button className="btn btn-primary" onClick={() => setForm({})}>+ Despesa</button>
      </div>
      <div className="kpi-grid compacto">
        <Kpi icone="🧾" rotulo="Total no período" valor={moeda(total)} />
        <Kpi icone="⏳" rotulo="A pagar" valor={moeda(aPagar)} tom={aPagar > 0 ? "alerta" : undefined} />
        <Kpi icone="⏰" rotulo="Vencidas" valor={l.filter((d) => d.vencida).length} tom={l.some((d) => d.vencida) ? "alerta" : undefined} />
      </div>
      <Estado req={req} vazio={<Vazio icone="🧾" texto="Nenhuma despesa no período." />}>
        {() => (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead><tr><th>Vencimento</th><th>Descrição</th><th>Categoria</th><th>Unidade</th><th className="num">Valor</th><th>Situação</th><th></th></tr></thead>
              <tbody>{l.map((d) => (
                <tr key={d.id}>
                  <td>{dataBR(d.vencimento)}</td><td>{d.descricao}{d.fornecedor && <small className="texto-fraco"><br />{d.fornecedor}</small>}</td>
                  <td>{CATEGORIAS_DESPESA[d.categoria]}</td><td>{d.unidadeNome.replace("Rede Barbearias — ", "")}</td><td className="num">{moeda(d.valor)}</td>
                  <td>{d.paga ? <Pill tom="bom">✓ paga {d.pagaEm ? dataBR(d.pagaEm) : ""}</Pill> : d.vencida ? <Pill tom="ruim">vencida</Pill> : <Pill tom="aviso">a pagar</Pill>}</td>
                  <td className="acoes-celula">
                    {!d.paga && <button className="btn btn-ghost btn-sm" onClick={() => pagar(d)}>Pagar</button>}
                    <button className="btn-icone" title="Editar" onClick={() => setForm(d)}>✏️</button>
                    <button className="btn-icone" title="Excluir" onClick={() => excluir(d)}>🗑️</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Estado>
      {form && <DespesaForm despesa={form.id ? form : null} unidadeId={unidadeId} onClose={() => setForm(null)} onSalvo={() => { setForm(null); req.recarregar(); }} />}
    </>
  );
}

export default function Financeiro() {
  const { unidadeId, perms } = usePainel();
  const abas = [
    ...(perms.gestao ? [["resumo", "Resultado"]] : []),
    ...(perms.equipe ? [["caixa", "Caixa do dia"]] : []),
    ...(perms.gestao || perms.barbeiro ? [["comissoes", perms.barbeiro ? "Minhas comissões" : "Comissões"]] : []),
    ...(perms.gestao ? [["despesas", "Despesas"]] : []),
  ];
  const [aba, setAba] = React.useState(abas[0][0]);
  return (
    <div>
      <Cabecalho titulo={perms.barbeiro ? "Minhas comissões" : "Financeiro"} sub={unidadeId ? "" : perms.admin ? "Visão da rede inteira — escolha uma unidade no topo pra filtrar" : ""} />
      {abas.length > 1 && <Abas abas={abas} atual={aba} onChange={setAba} />}
      {aba === "resumo" && <Resumo unidadeId={unidadeId} />}
      {aba === "caixa" && <Caixa unidadeId={unidadeId} />}
      {aba === "comissoes" && <Comissoes unidadeId={unidadeId} />}
      {aba === "despesas" && <Despesas unidadeId={unidadeId} />}
    </div>
  );
}
