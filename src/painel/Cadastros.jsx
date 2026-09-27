import React from "react";
import { marcaAtual } from "../marca.jsx";
import { api } from "../api.js";
import { usePainel } from "../contexto.js";
import { Abas, Cabecalho, Campo, Estado, Grade, Modal, Pill, SeletorDias, Upload, Vazio, useAcao, useApi, useConfirmar } from "../ui.jsx";
import { CATEGORIAS_SERVICO, diasLegiveis, moeda, telefone } from "../util.js";

function UnidadeForm({ unidade, onClose, onSalvo }) {
  const [f, setF] = React.useState({
    nome: unidade?.nome || marcaAtual().nome + " — ", endereco: unidade?.endereco || "", bairro: unidade?.bairro || "", cidade: unidade?.cidade || "",
    telefone: unidade?.telefone || "", whatsapp: telefone(unidade?.whatsapp || ""), email: unidade?.email || "", fotoUrl: unidade?.fotoUrl || "",
    horaAbertura: unidade?.horaAbertura?.slice(0, 5) || "09:00", horaFechamento: unidade?.horaFechamento?.slice(0, 5) || "20:00",
    diasFuncionamento: unidade?.diasFuncionamento || "1,2,3,4,5,6", chavePix: unidade?.chavePix || "", ativa: unidade?.ativa ?? true,
  });
  const [executar, ocupado] = useAcao();
  const set = (k) => (e) => setF({ ...f, [k]: k === "whatsapp" ? telefone(e.target.value) : e.target.value });
  const salvar = async (e) => {
    e.preventDefault();
    const corpo = { ...f, whatsapp: f.whatsapp.replace(/\D/g, ""), email: f.email || null, horaAbertura: f.horaAbertura + ":00", horaFechamento: f.horaFechamento + ":00" };
    const r = await executar(() => api(unidade ? "/api/unidades/" + unidade.id : "/api/unidades", { method: unidade ? "PUT" : "POST", body: corpo }), "Unidade salva");
    if (r) onSalvo();
  };
  return (
    <Modal titulo={unidade ? "Editar unidade" : "Nova unidade"} onClose={onClose} largura={640}
           rodape={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" form="f-un" disabled={ocupado || !f.diasFuncionamento}>Salvar</button></>}>
      <form id="f-un" onSubmit={salvar}>
        <Grade>
          <Campo label="Nome" largo><input value={f.nome} onChange={set("nome")} required /></Campo>
          <Campo label="Endereço" largo><input value={f.endereco} onChange={set("endereco")} required /></Campo>
          <Campo label="Bairro"><input value={f.bairro} onChange={set("bairro")} /></Campo>
          <Campo label="Cidade"><input value={f.cidade} onChange={set("cidade")} /></Campo>
          <Campo label="Telefone"><input value={f.telefone} onChange={set("telefone")} /></Campo>
          <Campo label="WhatsApp"><input value={f.whatsapp} onChange={set("whatsapp")} inputMode="tel" /></Campo>
          <Campo label="E-mail"><input type="email" value={f.email} onChange={set("email")} /></Campo>
          <Campo label="Chave Pix da unidade" dica="Vazio = chave da rede"><input value={f.chavePix} onChange={set("chavePix")} /></Campo>
          <Campo label="Abre às"><input type="time" value={f.horaAbertura} onChange={set("horaAbertura")} required /></Campo>
          <Campo label="Fecha às"><input type="time" value={f.horaFechamento} onChange={set("horaFechamento")} required /></Campo>
          <Campo label="Dias de funcionamento" largo><SeletorDias valor={f.diasFuncionamento} onChange={(v) => setF({ ...f, diasFuncionamento: v })} /></Campo>
          <Campo label="Foto da fachada" largo><Upload valor={f.fotoUrl} onChange={(u) => setF({ ...f, fotoUrl: u })} /></Campo>
          {unidade && <label className="check"><input type="checkbox" checked={f.ativa} onChange={(e) => setF({ ...f, ativa: e.target.checked })} /> Ativa (aparece no site e recebe agendamentos)</label>}
        </Grade>
      </form>
    </Modal>
  );
}

function ServicoForm({ servico, onClose, onSalvo }) {
  const [f, setF] = React.useState({
    nome: servico?.nome || "", descricao: servico?.descricao || "", categoria: servico?.categoria || "CORTE",
    preco: servico?.preco ?? "", duracaoMinutos: servico?.duracaoMinutos ?? 30, ativo: servico?.ativo ?? true,
  });
  const [executar, ocupado] = useAcao();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const salvar = async (e) => {
    e.preventDefault();
    const r = await executar(() => api(servico ? "/api/servicos/" + servico.id : "/api/servicos", { method: servico ? "PUT" : "POST", body: { ...f, preco: Number(f.preco), duracaoMinutos: Number(f.duracaoMinutos) } }), "Serviço salvo");
    if (r) onSalvo();
  };
  return (
    <Modal titulo={servico ? "Editar serviço" : "Novo serviço"} onClose={onClose}
           rodape={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" form="f-serv" disabled={ocupado}>Salvar</button></>}>
      <form id="f-serv" onSubmit={salvar}>
        <Grade>
          <Campo label="Nome" largo><input value={f.nome} onChange={set("nome")} required /></Campo>
          <Campo label="Categoria"><select value={f.categoria} onChange={set("categoria")}>{Object.entries(CATEGORIAS_SERVICO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Campo>
          <Campo label="Preço (R$)"><input type="number" step="0.01" min="0" value={f.preco} onChange={set("preco")} required /></Campo>
          <Campo label="Duração (min)" dica="Define o tamanho do horário na agenda"><input type="number" min="5" max="480" step="5" value={f.duracaoMinutos} onChange={set("duracaoMinutos")} required /></Campo>
          <Campo label="Descrição (aparece no site)" largo><textarea value={f.descricao} onChange={set("descricao")} maxLength={600} /></Campo>
          {servico && <label className="check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Ativo</label>}
        </Grade>
      </form>
    </Modal>
  );
}

export default function Cadastros() {
  const { perms } = usePainel();
  const [aba, setAba] = React.useState("unidades");
  const unidades = useApi("/api/unidades");
  const servicos = useApi("/api/servicos");
  const [form, setForm] = React.useState(null);
  const confirmar = useConfirmar();
  const [executar] = useAcao();
  const excluir = async (tipo, x) => {
    if (!(await confirmar(`Excluir ${x.nome}? Se já tiver histórico, desative em vez disso.`, { perigo: true, ok: "Excluir" }))) return;
    if (await executar(() => api(`/api/${tipo}/${x.id}`, { method: "DELETE" }), "Excluído")) (tipo === "unidades" ? unidades : servicos).recarregar();
  };
  return (
    <div>
      <Cabecalho titulo="Unidades e serviços" sub={perms.admin ? "Cadastros da rede" : "Somente leitura — alterações são feitas pelo administrador"}>
        {perms.admin && <button className="btn btn-primary" onClick={() => setForm({ tipo: aba })}>+ {aba === "unidades" ? "Unidade" : "Serviço"}</button>}
      </Cabecalho>
      <Abas abas={[["unidades", "Unidades"], ["servicos", "Serviços e preços"]]} atual={aba} onChange={setAba} />
      {aba === "unidades" ? (
        <Estado req={unidades} vazio={<Vazio texto="Nenhuma unidade." />}>
          {(l) => (
            <div className="cartoes-grid">
              {l.map((u) => (
                <div key={u.id} className={"cartao" + (u.ativa ? "" : " inativo")}>
                  <h3>🏪 {u.nome.replace(/^.*? — /, "")} {!u.ativa && <Pill>inativa</Pill>}</h3>
                  <p>📍 {u.endereco} — {u.bairro}, {u.cidade}</p>
                  <p>🕐 {diasLegiveis(u.diasFuncionamento)} · {u.horaAbertura.slice(0, 5)}–{u.horaFechamento.slice(0, 5)}</p>
                  <p>📞 {u.telefone}{u.whatsapp ? ` · 💬 ${telefone(u.whatsapp)}` : ""}</p>
                  <p>💈 {u.totalBarbeiros} barbeiro(s){u.chavePix ? ` · Pix: ${u.chavePix}` : ""}</p>
                  {perms.admin && <div className="acoes-linha"><button className="btn btn-ghost btn-sm" onClick={() => setForm({ tipo: "unidades", item: u })}>Editar</button><button className="btn btn-ghost btn-sm" onClick={() => excluir("unidades", u)}>Excluir</button></div>}
                </div>
              ))}
            </div>
          )}
        </Estado>
      ) : (
        <Estado req={servicos} vazio={<Vazio texto="Nenhum serviço." />}>
          {(l) => (
            <div className="tabela-wrap">
              <table className="tabela">
                <thead><tr><th>Serviço</th><th>Categoria</th><th className="num">Duração</th><th className="num">Preço</th><th></th></tr></thead>
                <tbody>{l.map((s) => (
                  <tr key={s.id} className={s.ativo ? "" : "inativo"}>
                    <td><b>{s.nome}</b>{!s.ativo && <> <Pill>inativo</Pill></>}<br /><small className="texto-fraco">{s.descricao}</small></td>
                    <td>{CATEGORIAS_SERVICO[s.categoria]}</td><td className="num">{s.duracaoMinutos} min</td><td className="num">{moeda(s.preco)}</td>
                    <td className="acoes-celula">{perms.admin && <><button className="btn-icone" onClick={() => setForm({ tipo: "servicos", item: s })} title="Editar">✏️</button><button className="btn-icone" onClick={() => excluir("servicos", s)} title="Excluir">🗑️</button></>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Estado>
      )}
      {form?.tipo === "unidades" && <UnidadeForm unidade={form.item} onClose={() => setForm(null)} onSalvo={() => { setForm(null); unidades.recarregar(); }} />}
      {form?.tipo === "servicos" && <ServicoForm servico={form.item} onClose={() => setForm(null)} onSalvo={() => { setForm(null); servicos.recarregar(); }} />}
    </div>
  );
}
