import React from "react";
import { api, qs } from "../api.js";
import { usePainel } from "../contexto.js";
import {
  Cabecalho, Campo, Estado, Grade, Kpi, Modal, Pill, StatusPill, Vazio, useAcao, useApi, useConfirmar, useTabela,
} from "../ui.jsx";
import { baixarCSV, dataBR, dataHora, FORMAS, linkWhatsApp, moeda, primeiroNome, telefone } from "../util.js";
import { AgendamentoForm } from "./Agenda.jsx";

function ClienteForm({ cliente, onClose, onSalvo }) {
  const { unidades } = usePainel();
  const [f, setF] = React.useState({
    nome: cliente?.nome || "", telefone: telefone(cliente?.telefone || ""), email: cliente?.email || "",
    dataNascimento: cliente?.dataNascimento || "", observacoes: cliente?.observacoes || "",
    unidadePreferidaId: cliente?.unidadePreferidaId || "", aceitaMarketing: cliente?.aceitaMarketing ?? true,
  });
  const [executar, ocupado] = useAcao();
  const salvar = async (e) => {
    e.preventDefault();
    const corpo = { ...f, email: f.email || null, dataNascimento: f.dataNascimento || null, unidadePreferidaId: f.unidadePreferidaId || null };
    const r = await executar(() => api(cliente ? "/api/clientes/" + cliente.id : "/api/clientes", { method: cliente ? "PUT" : "POST", body: corpo }),
      cliente ? "Cliente atualizado" : "Cliente cadastrado");
    if (r) onSalvo(r);
  };
  return (
    <Modal titulo={cliente ? "Editar cliente" : "Novo cliente"} onClose={onClose}
           rodape={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" form="f-cli" disabled={ocupado}>Salvar</button></>}>
      <form id="f-cli" onSubmit={salvar}>
        <Grade>
          <Campo label="Nome" largo><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} required minLength={2} /></Campo>
          <Campo label="Celular"><input value={f.telefone} inputMode="tel" onChange={(e) => setF({ ...f, telefone: telefone(e.target.value) })} required /></Campo>
          <Campo label="E-mail"><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Campo>
          <Campo label="Nascimento"><input type="date" value={f.dataNascimento} onChange={(e) => setF({ ...f, dataNascimento: e.target.value })} /></Campo>
          <Campo label="Unidade preferida">
            <select value={f.unidadePreferidaId} onChange={(e) => setF({ ...f, unidadePreferidaId: e.target.value })}>
              <option value="">—</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome.replace("Rede Barbearias — ", "")}</option>)}
            </select>
          </Campo>
          <Campo label="Preferências / observações" largo>
            <textarea value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} placeholder="Ex.: máquina 1 na lateral, alergia a..." />
          </Campo>
          <label className="check campo-largo"><input type="checkbox" checked={f.aceitaMarketing} onChange={(e) => setF({ ...f, aceitaMarketing: e.target.checked })} /> Aceita receber promoções por WhatsApp</label>
        </Grade>
      </form>
    </Modal>
  );
}

export function FichaCliente({ id, onClose, onEditar }) {
  const req = useApi("/api/clientes/" + id + "/ficha");
  const [agendar, setAgendar] = React.useState(false);
  const { unidadeId, unidades } = usePainel();
  if (agendar) return <AgendamentoForm unidadeId={unidadeId || req.dados?.cliente.unidadePreferidaId || unidades[0]?.id} onClose={() => setAgendar(false)} onSalvo={() => { setAgendar(false); req.recarregar(); }} />;
  return (
    <Modal titulo="Ficha do cliente" onClose={onClose} largura={820}>
      <Estado req={req}>
        {(f) => {
          const c = f.cliente;
          return (
            <div className="ficha">
              <div className="ficha-topo">
                <div>
                  <h2>{c.nome}</h2>
                  <p className="texto-fraco">{telefone(c.telefone)}{c.email ? " · " + c.email : ""}{c.dataNascimento ? " · 🎂 " + dataBR(c.dataNascimento) : ""}</p>
                  {c.observacoes && <p className="nota-obs">📝 {c.observacoes}</p>}
                </div>
                <div className="acoes-linha">
                  <a className="btn btn-ghost btn-sm" target="_blank" rel="noreferrer" href={linkWhatsApp(c.telefone, `Olá, ${primeiroNome(c.nome)}! Aqui é da Rede Barbearias 💈`)}>💬 WhatsApp</a>
                  {onEditar && <button className="btn btn-ghost btn-sm" onClick={() => onEditar(c)}>✏️ Editar</button>}
                  <button className="btn btn-primary btn-sm" onClick={() => setAgendar(true)}>+ Agendar</button>
                </div>
              </div>
              <div className="kpi-grid compacto">
                <Kpi icone="💰" rotulo="Gasto total" valor={moeda(f.totalGasto)} />
                <Kpi icone="✂️" rotulo="Atendimentos" valor={f.atendimentos} detalhe={`ticket ${moeda(f.ticketMedio)}`} />
                <Kpi icone="🎁" rotulo="Fidelidade" valor={`${c.pontos}/${f.pontosParaResgate}`} detalhe={f.podeResgatar ? "pode resgatar!" : "pontos"} tom={f.podeResgatar ? "ouro" : undefined} />
                <Kpi icone="⚠️" rotulo="Faltas / cancel." valor={`${f.faltas} / ${f.cancelamentos}`} tom={f.faltas >= 3 ? "alerta" : undefined} />
                <Kpi icone="⭐" rotulo="Clube" valor={f.assinatura ? f.assinatura.planoNome : "—"} detalhe={f.assinatura ? `${f.assinatura.status === "ATIVA" && !f.assinatura.vencida ? "em dia" : "pendente"} · ${f.assinatura.usosRestantes} uso(s)` : "não assinante"} />
              </div>
              {f.servicoFavorito && <p className="texto-fraco">Serviço favorito: <b>{f.servicoFavorito}</b> · última visita: {c.ultimaVisita ? dataHora(c.ultimaVisita) : "—"}</p>}
              <h4>Histórico de atendimentos</h4>
              {!f.agendamentos.length ? <Vazio texto="Sem atendimentos ainda." /> : (
                <div className="tabela-wrap altura-max">
                  <table className="tabela">
                    <thead><tr><th>Data</th><th>Serviço</th><th>Barbeiro</th><th>Status</th><th className="num">Valor</th><th>Nota</th></tr></thead>
                    <tbody>{f.agendamentos.map((a) => (
                      <tr key={a.id}><td>{dataHora(a.inicio)}</td><td>{a.servicoNome}</td><td>{a.barbeiroNome}</td><td><StatusPill status={a.status} /></td>
                        <td className="num">{a.pago ? `${moeda(a.valorFinal)} · ${FORMAS[a.formaPagamento]}` : moeda(a.valorAPagar)}</td><td>{a.nota ? "★".repeat(a.nota) : ""}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
              {f.compras.length > 0 && (
                <>
                  <h4>Compras de produtos</h4>
                  <ul className="lista-simples">
                    {f.compras.map((v) => <li key={v.id}><span>{dataBR(v.dataHora)} · {v.itens.map((i) => `${i.quantidade}× ${i.produtoNome}`).join(", ")}</span><b>{moeda(v.total)}</b></li>)}
                  </ul>
                </>
              )}
            </div>
          );
        }}
      </Estado>
    </Modal>
  );
}

export default function Clientes() {
  const { perms } = usePainel();
  const [busca, setBusca] = React.useState("");
  const [q, setQ] = React.useState("");
  React.useEffect(() => { const t = setTimeout(() => setQ(busca.trim()), 300); return () => clearTimeout(t); }, [busca]);
  const req = useApi("/api/clientes" + qs({ q }));
  const [form, setForm] = React.useState(null);
  const [ficha, setFicha] = React.useState(() => {
    try { const id = sessionStorage.getItem("rb_abrir_cliente"); sessionStorage.removeItem("rb_abrir_cliente"); return id ? Number(id) : null; } catch { return null; }
  });
  const [filtro, setFiltro] = React.useState("todos");
  const confirmar = useConfirmar();
  const [executar] = useAcao();

  const agora = Date.now();
  const lista = (req.dados || []).filter((c) => filtro === "todos"
    || (filtro === "fidelidade" && c.pontos >= 8)
    || (filtro === "sumidos" && c.ultimaVisita && agora - new Date(c.ultimaVisita) > 45 * 864e5)
    || (filtro === "nunca" && !c.ultimaVisita));
  const [pagina, paginacao] = useTabela(lista, 20);

  const excluir = async (c) => {
    if (!(await confirmar(`Excluir ${c.nome}? Só é possível se não houver histórico.`, { perigo: true, ok: "Excluir" }))) return;
    if (await executar(() => api("/api/clientes/" + c.id, { method: "DELETE" }), "Cliente excluído")) req.recarregar();
  };

  return (
    <div>
      <Cabecalho titulo="Clientes" sub={req.dados ? `${req.dados.length} cliente(s) na base` : ""}>
        <button className="btn btn-ghost" disabled={!lista.length} onClick={() => baixarCSV("clientes.csv", [
          { titulo: "Nome", valor: (c) => c.nome }, { titulo: "Telefone", valor: (c) => telefone(c.telefone) },
          { titulo: "E-mail", valor: (c) => c.email }, { titulo: "Nascimento", valor: (c) => c.dataNascimento ? dataBR(c.dataNascimento) : "" },
          { titulo: "Pontos", valor: (c) => c.pontos }, { titulo: "Última visita", valor: (c) => c.ultimaVisita ? dataBR(c.ultimaVisita) : "" },
          { titulo: "Aceita marketing", valor: (c) => c.aceitaMarketing ? "sim" : "não" },
        ], lista)}>⬇️ Exportar</button>
        <button className="btn btn-primary" onClick={() => setForm({})}>+ Novo cliente</button>
      </Cabecalho>
      <div className="filtros">
        <input className="busca" placeholder="🔎 Nome, telefone ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} />
        {[["todos", "Todos"], ["fidelidade", "Perto do resgate"], ["sumidos", "Sumidos +45 dias"], ["nunca", "Nunca atendidos"]].map(([k, r]) => (
          <button key={k} className={"chip" + (filtro === k ? " on" : "")} onClick={() => setFiltro(k)}>{r}</button>
        ))}
      </div>
      <Estado req={req} vazio={<Vazio icone="👥" texto="Nenhum cliente encontrado." />}>
        {() => (
          <>
            <div className="tabela-wrap">
              <table className="tabela">
                <thead><tr><th>Nome</th><th>Contato</th><th>Fidelidade</th><th>Última visita</th><th></th></tr></thead>
                <tbody>
                  {pagina.map((c) => (
                    <tr key={c.id} className="clicavel" onClick={() => setFicha(c.id)}>
                      <td><b>{c.nome}</b>{c.observacoes && <span title={c.observacoes}> 📝</span>}</td>
                      <td>{telefone(c.telefone)}<br /><small className="texto-fraco">{c.email}</small></td>
                      <td>{c.pontos >= 10 ? <Pill tom="ouro">🎁 {c.pontos} pts</Pill> : `${c.pontos} pts`}</td>
                      <td>{c.ultimaVisita ? dataBR(c.ultimaVisita) : <span className="texto-fraco">—</span>}</td>
                      <td className="acoes-celula" onClick={(e) => e.stopPropagation()}>
                        <a className="btn-icone" title="WhatsApp" target="_blank" rel="noreferrer" href={linkWhatsApp(c.telefone, `Olá, ${primeiroNome(c.nome)}!`)}>💬</a>
                        <button className="btn-icone" title="Editar" onClick={() => setForm(c)}>✏️</button>
                        {perms.excluir && <button className="btn-icone" title="Excluir" onClick={() => excluir(c)}>🗑️</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {paginacao}
          </>
        )}
      </Estado>
      {form && <ClienteForm cliente={form.id ? form : null} onClose={() => setForm(null)} onSalvo={() => { setForm(null); req.recarregar(); }} />}
      {ficha && !form && <FichaCliente id={ficha} onClose={() => setFicha(null)} onEditar={(c) => setForm(c)} />}
    </div>
  );
}

