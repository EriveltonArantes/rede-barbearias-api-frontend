import React from "react";
import { api, qs } from "../api.js";
import { usePainel } from "../contexto.js";
import { Abas, Cabecalho, Campo, Estado, Grade, Kpi, Modal, Pill, Vazio, useAcao, useApi, useConfirmar } from "../ui.jsx";
import { dataBR, FORMAS, FORMAS_PAGAVEIS, linkWhatsApp, moeda, primeiroNome, telefone } from "../util.js";

function PlanoForm({ plano, onClose, onSalvo }) {
  const servicos = useApi("/api/servicos?ativos=true");
  const [f, setF] = React.useState({
    nome: plano?.nome || "", descricao: plano?.descricao || "", precoMensal: plano?.precoMensal ?? "", usosPorMes: plano?.usosPorMes ?? 4,
    servicoIds: new Set((plano?.servicos || []).map((s) => s.id)), ativo: plano?.ativo ?? true,
  });
  const [executar, ocupado] = useAcao();
  const alternar = (id) => { const s = new Set(f.servicoIds); s.has(id) ? s.delete(id) : s.add(id); setF({ ...f, servicoIds: s }); };
  const valorAvulso = (servicos.dados || []).filter((s) => f.servicoIds.has(s.id)).reduce((m, s) => Math.max(m, Number(s.preco)), 0) * Number(f.usosPorMes || 0);
  const salvar = async (e) => {
    e.preventDefault();
    const r = await executar(() => api(plano ? "/api/clube/planos/" + plano.id : "/api/clube/planos", { method: plano ? "PUT" : "POST", body: { ...f, servicoIds: [...f.servicoIds] } }), "Plano salvo");
    if (r) onSalvo();
  };
  return (
    <Modal titulo={plano ? "Editar plano" : "Novo plano"} onClose={onClose} largura={600}
           rodape={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" form="f-plano" disabled={ocupado || !f.servicoIds.size}>Salvar</button></>}>
      <form id="f-plano" onSubmit={salvar}>
        <Grade>
          <Campo label="Nome" largo><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} required /></Campo>
          <Campo label="Mensalidade (R$)"><input type="number" step="0.01" min="0.01" value={f.precoMensal} onChange={(e) => setF({ ...f, precoMensal: e.target.value })} required /></Campo>
          <Campo label="Atendimentos por mês"><input type="number" min="1" max="60" value={f.usosPorMes} onChange={(e) => setF({ ...f, usosPorMes: e.target.value })} required /></Campo>
          <Campo label="Descrição" largo><textarea value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></Campo>
          <div className="campo-largo">
            <span className="campo-label">Serviços incluídos</span>
            <div className="checks">
              {(servicos.dados || []).map((s) => (
                <label key={s.id} className="check"><input type="checkbox" checked={f.servicoIds.has(s.id)} onChange={() => alternar(s.id)} /> {s.nome} <small className="texto-fraco">{moeda(s.preco)}</small></label>
              ))}
            </div>
            {valorAvulso > 0 && f.precoMensal && <p className="campo-dica">Se usar tudo, o cliente economiza até {moeda(valorAvulso - f.precoMensal)} por mês em relação ao avulso.</p>}
          </div>
          {plano && <label className="check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Aceitando novas assinaturas</label>}
        </Grade>
      </form>
    </Modal>
  );
}

function AssinarModal({ onClose, onFeito }) {
  const { unidades, unidadeId } = usePainel();
  const planos = useApi("/api/clube/planos?ativos=true");
  const [busca, setBusca] = React.useState("");
  const [sugestoes, setSugestoes] = React.useState([]);
  const [cliente, setCliente] = React.useState(null);
  const [f, setF] = React.useState({ planoId: "", unidadeId: unidadeId || unidades[0]?.id || "", formaPagamento: "PIX" });
  const [executar, ocupado] = useAcao();
  React.useEffect(() => {
    if (busca.trim().length < 2) { setSugestoes([]); return; }
    const t = setTimeout(() => api("/api/clientes" + qs({ q: busca.trim() })).then((l) => setSugestoes(l.slice(0, 6))), 250);
    return () => clearTimeout(t);
  }, [busca]);
  const plano = planos.dados?.find((p) => String(p.id) === String(f.planoId));
  const salvar = async () => {
    const r = await executar(() => api("/api/clube/assinaturas", { method: "POST", body: { clienteId: cliente.id, planoId: Number(f.planoId), unidadeId: Number(f.unidadeId), formaPagamento: f.formaPagamento } }), "Assinatura criada ⭐");
    if (r) onFeito();
  };
  return (
    <Modal titulo="Nova assinatura" onClose={onClose}
           rodape={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!cliente || !f.planoId || ocupado} onClick={salvar}>Receber {plano ? moeda(plano.precoMensal) : ""} e ativar</button></>}>
      <Grade>
        <Campo label="Cliente" largo>
          {cliente ? <div className="linha-input"><input readOnly value={`${cliente.nome} · ${telefone(cliente.telefone)}`} /><button className="btn btn-ghost btn-sm" onClick={() => setCliente(null)}>Trocar</button></div> : (
            <div className="autocomplete">
              <input placeholder="Buscar cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus />
              {sugestoes.length > 0 && <ul className="sugestoes">{sugestoes.map((c) => <li key={c.id}><button type="button" onClick={() => { setCliente(c); setSugestoes([]); }}><b>{c.nome}</b> <span>{telefone(c.telefone)}</span></button></li>)}</ul>}
            </div>
          )}
        </Campo>
        <Campo label="Plano">
          <select value={f.planoId} onChange={(e) => setF({ ...f, planoId: e.target.value })}>
            <option value="">Selecione...</option>
            {(planos.dados || []).map((p) => <option key={p.id} value={p.id}>{p.nome} — {moeda(p.precoMensal)}/mês</option>)}
          </select>
        </Campo>
        <Campo label="Unidade que recebe"><select value={f.unidadeId} onChange={(e) => setF({ ...f, unidadeId: e.target.value })}>{unidades.map((u) => <option key={u.id} value={u.id}>{u.nome.replace(/^.*? — /, "")}</option>)}</select></Campo>
        <Campo label="Pagamento do 1º mês" largo>
          <div className="formas">{FORMAS_PAGAVEIS.map((fp) => <button type="button" key={fp} className={"forma" + (f.formaPagamento === fp ? " sel" : "")} onClick={() => setF({ ...f, formaPagamento: fp })}>{FORMAS[fp]}</button>)}</div>
        </Campo>
      </Grade>
    </Modal>
  );
}

function RenovarModal({ assinatura, onClose, onFeito }) {
  const { unidades, unidadeId } = usePainel();
  const [f, setF] = React.useState({ unidadeId: unidadeId || unidades[0]?.id || "", formaPagamento: "PIX" });
  const [executar, ocupado] = useAcao();
  const salvar = async () => {
    const r = await executar(() => api(`/api/clube/assinaturas/${assinatura.id}/renovar`, { method: "POST", body: { unidadeId: Number(f.unidadeId), formaPagamento: f.formaPagamento } }), "Mensalidade recebida");
    if (r) onFeito();
  };
  return (
    <Modal titulo={`Renovar — ${assinatura.clienteNome}`} onClose={onClose}
           rodape={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={ocupado} onClick={salvar}>Receber {moeda(assinatura.precoMensal)}</button></>}>
      <p>{assinatura.planoNome} · válido até {dataBR(assinatura.validaAte)}. A renovação abre um novo ciclo de {assinatura.usosPorMes} atendimentos.</p>
      <Grade>
        <Campo label="Unidade"><select value={f.unidadeId} onChange={(e) => setF({ ...f, unidadeId: e.target.value })}>{unidades.map((u) => <option key={u.id} value={u.id}>{u.nome.replace(/^.*? — /, "")}</option>)}</select></Campo>
        <Campo label="Forma"><select value={f.formaPagamento} onChange={(e) => setF({ ...f, formaPagamento: e.target.value })}>{FORMAS_PAGAVEIS.map((fp) => <option key={fp} value={fp}>{FORMAS[fp]}</option>)}</select></Campo>
      </Grade>
    </Modal>
  );
}

export default function Clube() {
  const { perms } = usePainel();
  const [aba, setAba] = React.useState("assinaturas");
  const planos = useApi("/api/clube/planos");
  const assin = useApi("/api/clube/assinaturas");
  const [planoForm, setPlanoForm] = React.useState(null);
  const [assinar, setAssinar] = React.useState(false);
  const [renovar, setRenovar] = React.useState(null);
  const [filtro, setFiltro] = React.useState("ATIVA");
  const confirmar = useConfirmar();
  const [executar] = useAcao();

  const lista = (assin.dados || []).filter((a) => filtro === "todas" || (filtro === "vencidas" ? a.vencida || a.status === "SUSPENSA" : a.status === filtro));
  const ativas = (assin.dados || []).filter((a) => a.status === "ATIVA");
  const mrr = ativas.reduce((s, a) => s + Number(a.precoMensal), 0);
  const cancelar = async (a) => {
    if (!(await confirmar(`Cancelar a assinatura de ${a.clienteNome}?`, { perigo: true, ok: "Cancelar assinatura" }))) return;
    if (await executar(() => api(`/api/clube/assinaturas/${a.id}/cancelar`, { method: "POST" }), "Assinatura cancelada")) assin.recarregar();
  };
  const excluirPlano = async (p) => {
    if (!(await confirmar(`Excluir o plano ${p.nome}?`, { perigo: true, ok: "Excluir" }))) return;
    if (await executar(() => api("/api/clube/planos/" + p.id, { method: "DELETE" }), "Plano excluído")) planos.recarregar();
  };

  return (
    <div>
      <Cabecalho titulo="Clube de assinatura" sub="Receita recorrente: o cliente paga por mês e usa os serviços do plano">
        <button className="btn btn-primary" onClick={() => setAssinar(true)}>+ Nova assinatura</button>
      </Cabecalho>
      <div className="kpi-grid compacto">
        <Kpi icone="⭐" rotulo="Assinantes ativos" valor={ativas.length} />
        <Kpi icone="🔁" rotulo="Receita recorrente mensal" valor={moeda(mrr)} tom="ouro" />
        <Kpi icone="⏰" rotulo="Vencidas / suspensas" valor={(assin.dados || []).filter((a) => a.vencida || a.status === "SUSPENSA").length} tom="alerta" />
      </div>
      <Abas abas={[["assinaturas", "Assinaturas"], ["planos", "Planos"]]} atual={aba} onChange={setAba} />
      {aba === "assinaturas" && (
        <>
          <div className="filtros">
            {[["ATIVA", "Ativas"], ["vencidas", "Vencidas/suspensas"], ["CANCELADA", "Canceladas"], ["todas", "Todas"]].map(([k, r]) => (
              <button key={k} className={"chip" + (filtro === k ? " on" : "")} onClick={() => setFiltro(k)}>{r}</button>
            ))}
          </div>
          <Estado req={assin} vazio={<Vazio icone="⭐" texto="Nenhuma assinatura ainda." />}>
            {() => (
              <div className="tabela-wrap">
                <table className="tabela">
                  <thead><tr><th>Cliente</th><th>Plano</th><th>Uso no ciclo</th><th>Válida até</th><th>Situação</th><th></th></tr></thead>
                  <tbody>{lista.map((a) => (
                    <tr key={a.id}>
                      <td><b>{a.clienteNome}</b><br /><small className="texto-fraco">{telefone(a.clienteTelefone)}</small></td>
                      <td>{a.planoNome}<br /><small className="texto-fraco">{moeda(a.precoMensal)}/mês</small></td>
                      <td><div className="uso"><span style={{ width: (a.usosNoCiclo / a.usosPorMes) * 100 + "%" }}></span></div><small>{a.usosNoCiclo}/{a.usosPorMes}</small></td>
                      <td>{dataBR(a.validaAte)}</td>
                      <td>{a.status === "CANCELADA" ? <Pill tom="neutro">cancelada</Pill> : a.status === "SUSPENSA" ? <Pill tom="ruim">suspensa</Pill> : a.vencida ? <Pill tom="aviso">vencida</Pill> : <Pill tom="bom">em dia</Pill>}</td>
                      <td className="acoes-celula">
                        {a.status !== "CANCELADA" && <button className="btn btn-ghost btn-sm" onClick={() => setRenovar(a)}>Receber mês</button>}
                        {(a.vencida || a.status === "SUSPENSA") && <a className="btn-icone" title="Cobrar no WhatsApp" target="_blank" rel="noreferrer"
                          href={linkWhatsApp(a.clienteTelefone, `Oi, ${primeiroNome(a.clienteNome)}! Sua mensalidade do ${a.planoNome} (${moeda(a.precoMensal)}) venceu em ${dataBR(a.validaAte)}. Quer que eu te mande o Pix? 💈`)}>💬</a>}
                        {perms.gestao && a.status !== "CANCELADA" && <button className="btn-icone" title="Cancelar" onClick={() => cancelar(a)}>✖️</button>}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Estado>
        </>
      )}
      {aba === "planos" && (
        <>
          {perms.admin && <div className="acoes-linha direita"><button className="btn btn-primary" onClick={() => setPlanoForm({})}>+ Plano</button></div>}
          <Estado req={planos} vazio={<Vazio texto="Nenhum plano criado." />}>
            {(l) => (
              <div className="cartoes-grid">
                {l.map((p) => (
                  <div className={"cartao plano" + (p.ativo ? "" : " inativo")} key={p.id}>
                    <h3>{p.nome} {!p.ativo && <Pill>inativo</Pill>}</h3>
                    <div className="plano-preco">{moeda(p.precoMensal)}<small>/mês</small></div>
                    <p className="texto-fraco">{p.descricao}</p>
                    <p>{p.usosPorMes} atendimentos/mês · {p.servicos.map((s) => s.nome).join(", ")}</p>
                    <p><b>{p.assinantesAtivos}</b> assinante(s) ativo(s)</p>
                    {perms.admin && <div className="acoes-linha"><button className="btn btn-ghost btn-sm" onClick={() => setPlanoForm(p)}>Editar</button><button className="btn btn-ghost btn-sm" onClick={() => excluirPlano(p)}>Excluir</button></div>}
                  </div>
                ))}
              </div>
            )}
          </Estado>
        </>
      )}
      {planoForm && <PlanoForm plano={planoForm.id ? planoForm : null} onClose={() => setPlanoForm(null)} onSalvo={() => { setPlanoForm(null); planos.recarregar(); }} />}
      {assinar && <AssinarModal onClose={() => setAssinar(false)} onFeito={() => { setAssinar(false); assin.recarregar(); planos.recarregar(); }} />}
      {renovar && <RenovarModal assinatura={renovar} onClose={() => setRenovar(null)} onFeito={() => { setRenovar(null); assin.recarregar(); }} />}
    </div>
  );
}
