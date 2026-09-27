import React from "react";
import { api, qs } from "../api.js";
import { usePainel } from "../contexto.js";
import {
  Abas, Avatar, Cabecalho, Campo, Estado, Estrelas, Grade, Modal, Pill, SeletorDias, Upload, Vazio, useAcao, useApi, useConfirmar,
} from "../ui.jsx";
import { dataHora, diasLegiveis, hojeISO, linkWhatsApp, telefone } from "../util.js";

function BarbeiroForm({ barbeiro, onClose, onSalvo }) {
  const { unidades, unidadeId, sessao, perms } = usePainel();
  const [f, setF] = React.useState({
    unidadeId: barbeiro?.unidadeId || unidadeId || sessao.unidadeId || unidades[0]?.id || "", nome: barbeiro?.nome || "", apelido: barbeiro?.apelido || "",
    telefone: telefone(barbeiro?.telefone || ""), email: barbeiro?.email || "", especialidades: barbeiro?.especialidades || "", bio: barbeiro?.bio || "",
    fotoUrl: barbeiro?.fotoUrl || "", comissaoServico: barbeiro?.comissaoServico ?? 40, comissaoProduto: barbeiro?.comissaoProduto ?? 10,
    diasTrabalho: barbeiro?.diasTrabalho || "", ativo: barbeiro?.ativo ?? true,
  });
  const [executar, ocupado] = useAcao();
  const set = (k) => (e) => setF({ ...f, [k]: k === "telefone" ? telefone(e.target.value) : e.target.value });
  const salvar = async (e) => {
    e.preventDefault();
    const corpo = { ...f, unidadeId: Number(f.unidadeId), email: f.email || null, telefone: f.telefone.replace(/\D/g, "") || null };
    const r = await executar(() => api(barbeiro ? "/api/barbeiros/" + barbeiro.id : "/api/barbeiros", { method: barbeiro ? "PUT" : "POST", body: corpo }), "Barbeiro salvo");
    if (r) onSalvo();
  };
  return (
    <Modal titulo={barbeiro ? "Editar barbeiro" : "Novo barbeiro"} onClose={onClose} largura={640}
           rodape={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" form="f-barb" disabled={ocupado}>Salvar</button></>}>
      <form id="f-barb" onSubmit={salvar}>
        <Grade>
          <Campo label="Foto" largo><Upload valor={f.fotoUrl} onChange={(u) => setF({ ...f, fotoUrl: u })} /></Campo>
          <Campo label="Nome"><input value={f.nome} onChange={set("nome")} required /></Campo>
          <Campo label="Apelido (aparece no site)"><input value={f.apelido} onChange={set("apelido")} /></Campo>
          <Campo label="Unidade">
            <select value={f.unidadeId} onChange={set("unidadeId")} disabled={!perms.admin}>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome.replace(/^.*? — /, "")}</option>)}
            </select>
          </Campo>
          <Campo label="Celular"><input value={f.telefone} onChange={set("telefone")} inputMode="tel" /></Campo>
          <Campo label="E-mail"><input type="email" value={f.email} onChange={set("email")} /></Campo>
          <Campo label="Comissão em serviços (%)"><input type="number" min="0" max="100" step="0.5" value={f.comissaoServico} onChange={set("comissaoServico")} /></Campo>
          <Campo label="Comissão em produtos (%)"><input type="number" min="0" max="100" step="0.5" value={f.comissaoProduto} onChange={set("comissaoProduto")} /></Campo>
          <Campo label="Dias que atende" largo dica="Nenhum marcado = todos os dias em que a unidade abre">
            <SeletorDias valor={f.diasTrabalho} onChange={(v) => setF({ ...f, diasTrabalho: v })} />
          </Campo>
          <Campo label="Especialidades" largo><input value={f.especialidades} onChange={set("especialidades")} placeholder="Degradê, barba terapia, platinado..." /></Campo>
          <Campo label="Bio (aparece no site)" largo><textarea value={f.bio} onChange={set("bio")} maxLength={1000} /></Campo>
          {barbeiro && <label className="check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Ativo (recebe agendamentos)</label>}
        </Grade>
      </form>
    </Modal>
  );
}

function Barbeiros() {
  const { unidadeId, perms } = usePainel();
  const req = useApi("/api/barbeiros" + qs({ unidadeId }));
  const [form, setForm] = React.useState(null);
  const confirmar = useConfirmar();
  const [executar] = useAcao();
  const excluir = async (b) => {
    if (!(await confirmar(`Excluir ${b.nome}? Se já tiver atendimentos, desative em vez disso.`, { perigo: true, ok: "Excluir" }))) return;
    if (await executar(() => api("/api/barbeiros/" + b.id, { method: "DELETE" }), "Barbeiro excluído")) req.recarregar();
  };
  return (
    <>
      {perms.gestao && <div className="acoes-linha direita"><button className="btn btn-primary" onClick={() => setForm({})}>+ Barbeiro</button></div>}
      <Estado req={req} vazio={<Vazio icone="💈" texto="Nenhum barbeiro cadastrado." />}>
        {(l) => (
          <div className="cartoes-grid">
            {l.map((b) => (
              <div key={b.id} className={"cartao barbeiro-card" + (b.ativo ? "" : " inativo")}>
                <div className="barbeiro-topo">
                  <Avatar nome={b.nome} foto={b.fotoUrl} tamanho={56} />
                  <div>
                    <b>{b.nome}{b.apelido ? ` “${b.apelido}”` : ""}</b>
                    <small className="texto-fraco">{b.unidadeNome.replace(/^.*? — /, "")}</small>
                    {b.notaMedia ? <span><Estrelas nota={Math.round(b.notaMedia)} tamanho={12} /> {b.notaMedia} ({b.totalAvaliacoes})</span> : <small className="texto-fraco">sem avaliações</small>}
                  </div>
                  {!b.ativo && <Pill>inativo</Pill>}
                </div>
                <p className="texto-fraco">{b.especialidades}</p>
                <dl className="mini-dl">
                  <dt>Comissão</dt><dd>{Number(b.comissaoServico)}% serviços · {Number(b.comissaoProduto)}% produtos</dd>
                  <dt>Atende</dt><dd>{diasLegiveis(b.diasTrabalho)}</dd>
                  {b.telefone && <><dt>Contato</dt><dd>{telefone(b.telefone)}</dd></>}
                </dl>
                {perms.gestao && (
                  <div className="acoes-linha">
                    <button className="btn btn-ghost btn-sm" onClick={() => setForm(b)}>Editar</button>
                    {b.telefone && <a className="btn btn-ghost btn-sm" target="_blank" rel="noreferrer" href={linkWhatsApp(b.telefone, "")}>💬</a>}
                    {perms.admin && <button className="btn btn-ghost btn-sm" onClick={() => excluir(b)}>Excluir</button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Estado>
      {form && <BarbeiroForm barbeiro={form.id ? form : null} onClose={() => setForm(null)} onSalvo={() => { setForm(null); req.recarregar(); }} />}
    </>
  );
}

function Folgas() {
  const { unidadeId, unidades, sessao, perms } = usePainel();
  const un = unidadeId || sessao.unidadeId || unidades[0]?.id || "";
  const req = useApi("/api/bloqueios" + qs({ unidadeId }));
  const [f, setF] = React.useState({ unidadeId: String(un), barbeiroId: perms.barbeiro ? String(sessao.barbeiroId) : "", data: hojeISO(), dataFim: hojeISO(), de: "12:00", ate: "13:00", diaInteiro: false, motivo: "" });
  const barbeiros = useApi("/api/barbeiros" + qs({ unidadeId: f.unidadeId, ativos: true }));
  const [executar, ocupado] = useAcao();
  const confirmar = useConfirmar();
  const barbDaUnidade = (barbeiros.dados || []).filter((b) => String(b.unidadeId) === String(f.unidadeId));

  const salvar = async (e) => {
    e.preventDefault();
    const corpo = {
      unidadeId: Number(f.unidadeId), barbeiroId: f.barbeiroId ? Number(f.barbeiroId) : null, motivo: f.motivo,
      inicio: `${f.data}T${f.diaInteiro ? "00:00" : f.de}:00`, fim: `${f.diaInteiro ? f.dataFim : f.data}T${f.diaInteiro ? "23:59" : f.ate}:00`,
    };
    if (await executar(() => api("/api/bloqueios", { method: "POST", body: corpo }), "Bloqueio criado — esses horários somem do agendamento online")) {
      setF({ ...f, motivo: "" }); req.recarregar();
    }
  };
  const excluir = async (b) => {
    if (!(await confirmar(`Remover o bloqueio "${b.motivo}"?`, { ok: "Remover" }))) return;
    if (await executar(() => api("/api/bloqueios/" + b.id, { method: "DELETE" }), "Bloqueio removido")) req.recarregar();
  };

  return (
    <div className="dash-colunas">
      <form className="cartao" onSubmit={salvar}>
        <h3>Nova folga / bloqueio</h3>
        <Grade>
          {perms.admin && (
            <Campo label="Unidade"><select value={f.unidadeId} onChange={(e) => setF({ ...f, unidadeId: e.target.value, barbeiroId: "" })}>{unidades.map((u) => <option key={u.id} value={u.id}>{u.nome.replace(/^.*? — /, "")}</option>)}</select></Campo>
          )}
          <Campo label="Quem">
            <select value={f.barbeiroId} onChange={(e) => setF({ ...f, barbeiroId: e.target.value })} disabled={perms.barbeiro}>
              <option value="">Unidade inteira (feriado, reforma)</option>
              {barbDaUnidade.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
          </Campo>
          <label className="check campo-largo"><input type="checkbox" checked={f.diaInteiro} onChange={(e) => setF({ ...f, diaInteiro: e.target.checked })} /> Dia(s) inteiro(s) — folga, férias</label>
          <Campo label={f.diaInteiro ? "De" : "Dia"}><input type="date" value={f.data} min={hojeISO()} onChange={(e) => setF({ ...f, data: e.target.value, dataFim: e.target.value > f.dataFim ? e.target.value : f.dataFim })} /></Campo>
          {f.diaInteiro ? <Campo label="Até"><input type="date" value={f.dataFim} min={f.data} onChange={(e) => setF({ ...f, dataFim: e.target.value })} /></Campo> : (
            <>
              <Campo label="Das"><input type="time" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} /></Campo>
              <Campo label="Até"><input type="time" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} /></Campo>
            </>
          )}
          <Campo label="Motivo" largo><input value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} required placeholder="Almoço, folga, médico, curso..." /></Campo>
        </Grade>
        <button className="btn btn-primary" disabled={ocupado}>Bloquear agenda</button>
      </form>
      <div className="cartao">
        <h3>Próximos bloqueios</h3>
        <Estado req={req} vazio={<Vazio icone="🗓️" texto="Nenhuma folga ou bloqueio marcado." />}>
          {(l) => (
            <ul className="lista-simples">
              {l.map((b) => (
                <li key={b.id}>
                  <span><b>{b.barbeiroNome || "🏪 Unidade inteira"}</b> · {b.motivo}<br /><small className="texto-fraco">{dataHora(b.inicio)} → {dataHora(b.fim)} · {b.unidadeNome.replace(/^.*? — /, "")}</small></span>
                  {(!perms.barbeiro || b.barbeiroId === sessao.barbeiroId) && <button className="btn-icone" title="Remover" onClick={() => excluir(b)}>🗑️</button>}
                </li>
              ))}
            </ul>
          )}
        </Estado>
      </div>
    </div>
  );
}

export default function Equipe() {
  const { perms } = usePainel();
  const [aba, setAba] = React.useState(perms.barbeiro || perms.recepcao ? "folgas" : "barbeiros");
  return (
    <div>
      <Cabecalho titulo={perms.barbeiro ? "Minhas folgas" : "Equipe e folgas"} sub="Folgas e bloqueios tiram os horários da agenda online automaticamente" />
      {!perms.barbeiro && <Abas abas={[["barbeiros", "Barbeiros"], ["folgas", "Folgas e bloqueios"]]} atual={aba} onChange={setAba} />}
      {aba === "barbeiros" ? <Barbeiros /> : <Folgas />}
    </div>
  );
}
