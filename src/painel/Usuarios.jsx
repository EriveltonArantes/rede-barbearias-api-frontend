import React from "react";
import { api, qs } from "../api.js";
import { usePainel } from "../contexto.js";
import { Abas, Cabecalho, Campo, Estado, Grade, Modal, Pill, Vazio, useAcao, useApi, useConfirmar, useTabela } from "../ui.jsx";
import { dataHora, PAPEIS, telefone } from "../util.js";

function UsuarioForm({ usuario, onClose, onSalvo }) {
  const { unidades, perms, sessao } = usePainel();
  const barbeiros = useApi("/api/barbeiros");
  const [f, setF] = React.useState({
    username: usuario?.username || "", password: "", nome: usuario?.nome || "", papel: usuario?.papel || (perms.admin ? "RECEPCAO" : "RECEPCAO"),
    unidadeId: usuario?.unidadeId || sessao.unidadeId || "", barbeiroId: usuario?.barbeiroId || "", clienteId: usuario?.clienteId || "", ativo: usuario?.ativo ?? true,
  });
  const [buscaCli, setBuscaCli] = React.useState(usuario?.clienteNome || "");
  const [sugestoes, setSugestoes] = React.useState([]);
  const [executar, ocupado] = useAcao();
  React.useEffect(() => {
    if (f.papel !== "CLIENTE" || buscaCli.trim().length < 2 || f.clienteId) { setSugestoes([]); return; }
    const t = setTimeout(() => api("/api/clientes" + qs({ q: buscaCli.trim() })).then((l) => setSugestoes(l.slice(0, 6))), 250);
    return () => clearTimeout(t);
  }, [buscaCli, f.papel, f.clienteId]);
  const papeis = perms.admin ? ["ADMIN", "GERENTE", "RECEPCAO", "BARBEIRO", "CLIENTE"] : ["RECEPCAO", "BARBEIRO"];
  const salvar = async (e) => {
    e.preventDefault();
    const corpo = { ...f, password: f.password || null, unidadeId: f.unidadeId ? Number(f.unidadeId) : null,
      barbeiroId: f.barbeiroId ? Number(f.barbeiroId) : null, clienteId: f.clienteId ? Number(f.clienteId) : null };
    const r = await executar(() => api(usuario ? "/api/usuarios/" + usuario.id : "/api/usuarios", { method: usuario ? "PUT" : "POST", body: corpo }), "Usuário salvo");
    if (r) onSalvo();
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal titulo={usuario ? "Editar usuário" : "Novo usuário"} onClose={onClose}
           rodape={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" form="f-user" disabled={ocupado}>Salvar</button></>}>
      <form id="f-user" onSubmit={salvar}>
        <Grade>
          <Campo label="Usuário (login)"><input value={f.username} onChange={set("username")} required autoComplete="off" /></Campo>
          <Campo label={usuario ? "Nova senha (vazio = manter)" : "Senha"}><input type="password" value={f.password} onChange={set("password")} minLength={6} required={!usuario} autoComplete="new-password" /></Campo>
          <Campo label="Nome"><input value={f.nome} onChange={set("nome")} /></Campo>
          <Campo label="Papel"><select value={f.papel} onChange={set("papel")}>{papeis.map((p) => <option key={p} value={p}>{PAPEIS[p]}</option>)}</select></Campo>
          {(f.papel === "GERENTE" || f.papel === "RECEPCAO") && (
            <Campo label="Unidade"><select value={f.unidadeId} onChange={set("unidadeId")} required disabled={!perms.admin}>
              <option value="">Selecione...</option>{unidades.map((u) => <option key={u.id} value={u.id}>{u.nome.replace("Rede Barbearias — ", "")}</option>)}</select></Campo>
          )}
          {f.papel === "BARBEIRO" && (
            <Campo label="Ficha do barbeiro"><select value={f.barbeiroId} onChange={set("barbeiroId")} required>
              <option value="">Selecione...</option>{(barbeiros.dados || []).map((b) => <option key={b.id} value={b.id}>{b.nome} · {b.unidadeNome.replace("Rede Barbearias — ", "")}</option>)}</select></Campo>
          )}
          {f.papel === "CLIENTE" && (
            <Campo label="Cliente vinculado" largo>
              <div className="autocomplete">
                <input value={buscaCli} onChange={(e) => { setBuscaCli(e.target.value); setF({ ...f, clienteId: "" }); }} placeholder="Buscar cliente..." />
                {sugestoes.length > 0 && <ul className="sugestoes">{sugestoes.map((c) => <li key={c.id}><button type="button" onClick={() => { setF({ ...f, clienteId: c.id }); setBuscaCli(c.nome); setSugestoes([]); }}><b>{c.nome}</b> <span>{telefone(c.telefone)}</span></button></li>)}</ul>}
              </div>
            </Campo>
          )}
          {usuario && <label className="check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Ativo (pode entrar)</label>}
        </Grade>
      </form>
    </Modal>
  );
}

function ListaUsuarios() {
  const { sessao } = usePainel();
  const req = useApi("/api/usuarios");
  const [form, setForm] = React.useState(null);
  const [papel, setPapel] = React.useState("");
  const confirmar = useConfirmar();
  const [executar] = useAcao();
  const lista = (req.dados || []).filter((u) => !papel || u.papel === papel);
  const [pagina, paginacao] = useTabela(lista, 20);
  const excluir = async (u) => {
    if (!(await confirmar(`Excluir o acesso de ${u.username}?`, { perigo: true, ok: "Excluir" }))) return;
    if (await executar(() => api("/api/usuarios/" + u.id, { method: "DELETE" }), "Usuário excluído")) req.recarregar();
  };
  return (
    <>
      <div className="acoes-linha entre">
        <div className="filtros">
          {[["", "Todos"], ...Object.entries(PAPEIS)].map(([k, v]) => <button key={k} className={"chip" + (papel === k ? " on" : "")} onClick={() => setPapel(k)}>{v}</button>)}
        </div>
        <button className="btn btn-primary" onClick={() => setForm({})}>+ Usuário</button>
      </div>
      <Estado req={req} vazio={<Vazio texto="Nenhum usuário." />}>
        {() => (
          <>
            <div className="tabela-wrap">
              <table className="tabela">
                <thead><tr><th>Usuário</th><th>Papel</th><th>Vínculo</th><th>Último acesso</th><th></th></tr></thead>
                <tbody>{pagina.map((u) => (
                  <tr key={u.id} className={u.ativo ? "" : "inativo"}>
                    <td><b>{u.username}</b>{u.nome && <><br /><small className="texto-fraco">{u.nome}</small></>}</td>
                    <td><Pill tom={u.papel === "ADMIN" ? "ouro" : "neutro"}>{PAPEIS[u.papel]}</Pill>{!u.ativo && <> <Pill tom="ruim">bloqueado</Pill></>}</td>
                    <td>{u.barbeiroNome || u.clienteNome || (u.unidadeNome ? u.unidadeNome.replace("Rede Barbearias — ", "") : "Rede inteira")}</td>
                    <td>{u.ultimoLogin ? dataHora(u.ultimoLogin) : <span className="texto-fraco">nunca</span>}</td>
                    <td className="acoes-celula">
                      <button className="btn-icone" title="Editar" onClick={() => setForm(u)}>✏️</button>
                      {u.username !== sessao.username && <button className="btn-icone" title="Excluir" onClick={() => excluir(u)}>🗑️</button>}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {paginacao}
          </>
        )}
      </Estado>
      {form && <UsuarioForm usuario={form.id ? form : null} onClose={() => setForm(null)} onSalvo={() => { setForm(null); req.recarregar(); }} />}
    </>
  );
}

function Auditoria() {
  const req = useApi("/api/auditoria");
  const [busca, setBusca] = React.useState("");
  const lista = (req.dados || []).filter((l) => !busca || `${l.usuario} ${l.acao} ${l.entidade} ${l.detalhe}`.toLowerCase().includes(busca.toLowerCase()));
  const [pagina, paginacao] = useTabela(lista, 25);
  return (
    <>
      <div className="filtros"><input className="busca" placeholder="🔎 Usuário, ação ou detalhe" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
      <Estado req={req} vazio={<Vazio texto="Sem registros ainda." />}>
        {() => (
          <>
            <div className="tabela-wrap">
              <table className="tabela">
                <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>O quê</th><th>Detalhe</th></tr></thead>
                <tbody>{pagina.map((l) => (
                  <tr key={l.id}><td>{dataHora(l.dataHora)}</td><td>{l.usuario}</td><td><Pill tom={["EXCLUIR", "CANCELAR", "ESTORNAR"].includes(l.acao) ? "ruim" : "neutro"}>{l.acao}</Pill></td><td>{l.entidade}{l.entidadeId ? ` #${l.entidadeId}` : ""}</td><td>{l.detalhe}</td></tr>
                ))}</tbody>
              </table>
            </div>
            {paginacao}
          </>
        )}
      </Estado>
    </>
  );
}

export default function Usuarios() {
  const { perms } = usePainel();
  const [aba, setAba] = React.useState("usuarios");
  return (
    <div>
      <Cabecalho titulo="Usuários e acessos" sub={perms.admin ? "Quem entra no sistema e o que pode fazer" : "Contas da recepção e barbeiros da sua unidade"} />
      {perms.admin && <Abas abas={[["usuarios", "Usuários"], ["auditoria", "Auditoria (quem fez o quê)"]]} atual={aba} onChange={setAba} />}
      {aba === "usuarios" ? <ListaUsuarios /> : <Auditoria />}
    </div>
  );
}
