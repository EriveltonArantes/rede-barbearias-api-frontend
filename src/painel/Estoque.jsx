import React from "react";
import { api, qs, urlArquivo } from "../api.js";
import { usePainel } from "../contexto.js";
import { Cabecalho, Campo, Estado, Grade, Modal, Pill, Upload, Vazio, useAcao, useApi, useConfirmar } from "../ui.jsx";
import { baixarCSV, dataHora, moeda } from "../util.js";

const TIPOS_MOV = { ENTRADA: "Entrada (compra)", AJUSTE: "Ajuste (inventário)", USO_INTERNO: "Uso no salão", SAIDA_VENDA: "Venda", ESTORNO_VENDA: "Estorno de venda" };

function ProdutoForm({ produto, unidadeId, onClose, onSalvo }) {
  const { unidades } = usePainel();
  const [f, setF] = React.useState({
    unidadeId: produto?.unidadeId || unidadeId || unidades[0]?.id || "", nome: produto?.nome || "", marca: produto?.marca || "",
    categoria: produto?.categoria || "", codigoBarras: produto?.codigoBarras || "", fotoUrl: produto?.fotoUrl || "",
    precoCusto: produto?.precoCusto ?? "", precoVenda: produto?.precoVenda ?? "", estoqueInicial: "", estoqueMinimo: produto?.estoqueMinimo ?? 3,
    ativo: produto?.ativo ?? true,
  });
  const [executar, ocupado] = useAcao();
  const margem = f.precoVenda && f.precoCusto ? ((f.precoVenda - f.precoCusto) / f.precoVenda) * 100 : null;
  const salvar = async (e) => {
    e.preventDefault();
    const corpo = { ...f, unidadeId: Number(f.unidadeId), estoqueInicial: f.estoqueInicial === "" ? 0 : Number(f.estoqueInicial) };
    const r = await executar(() => api(produto ? "/api/produtos/" + produto.id : "/api/produtos", { method: produto ? "PUT" : "POST", body: corpo }), "Produto salvo");
    if (r) onSalvo();
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal titulo={produto ? "Editar produto" : "Novo produto"} onClose={onClose} largura={620}
           rodape={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" form="f-prod" disabled={ocupado}>Salvar</button></>}>
      <form id="f-prod" onSubmit={salvar}>
        <Grade>
          <Campo label="Nome" largo><input value={f.nome} onChange={set("nome")} required /></Campo>
          <Campo label="Unidade">
            <select value={f.unidadeId} onChange={set("unidadeId")} disabled={!!produto} required>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome.replace(/^.*? — /, "")}</option>)}
            </select>
          </Campo>
          <Campo label="Marca"><input value={f.marca} onChange={set("marca")} /></Campo>
          <Campo label="Categoria"><input value={f.categoria} onChange={set("categoria")} placeholder="Barba, Cabelo, Finalizador..." /></Campo>
          <Campo label="Código de barras"><input value={f.codigoBarras} onChange={set("codigoBarras")} /></Campo>
          <Campo label="Preço de custo (R$)"><input type="number" step="0.01" min="0" value={f.precoCusto} onChange={set("precoCusto")} required /></Campo>
          <Campo label="Preço de venda (R$)" dica={margem !== null ? `Margem: ${margem.toFixed(0)}%` : null}><input type="number" step="0.01" min="0.01" value={f.precoVenda} onChange={set("precoVenda")} required /></Campo>
          {!produto && <Campo label="Estoque inicial"><input type="number" min="0" value={f.estoqueInicial} onChange={set("estoqueInicial")} /></Campo>}
          <Campo label="Estoque mínimo (alerta)"><input type="number" min="0" value={f.estoqueMinimo} onChange={set("estoqueMinimo")} /></Campo>
          <Campo label="Foto" largo><Upload valor={f.fotoUrl} onChange={(u) => setF({ ...f, fotoUrl: u })} /></Campo>
          {produto && <label className="check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Ativo (aparece no PDV)</label>}
        </Grade>
      </form>
    </Modal>
  );
}

function MovimentoModal({ produto, onClose, onFeito }) {
  const [f, setF] = React.useState({ tipo: "ENTRADA", quantidade: "", custoUnitario: produto.precoCusto, motivo: "" });
  const historico = useApi(`/api/produtos/${produto.id}/movimentos`);
  const [executar, ocupado] = useAcao();
  const salvar = async (e) => {
    e.preventDefault();
    const r = await executar(() => api(`/api/produtos/${produto.id}/movimentos`, { method: "POST", body: { ...f, quantidade: Number(f.quantidade) } }), "Estoque atualizado");
    if (r) onFeito();
  };
  return (
    <Modal titulo={`Estoque — ${produto.nome}`} onClose={onClose} largura={640}>
      <p>Estoque atual: <b>{produto.estoque}</b> (mínimo {produto.estoqueMinimo})</p>
      <form onSubmit={salvar} className="form-grade">
        <Campo label="Movimento">
          <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
            <option value="ENTRADA">Entrada (chegou mercadoria)</option>
            <option value="AJUSTE">Ajuste (contei o estoque)</option>
            <option value="USO_INTERNO">Uso no salão</option>
          </select>
        </Campo>
        <Campo label={f.tipo === "AJUSTE" ? "Quantidade contada" : "Quantidade"}><input type="number" min="0" value={f.quantidade} onChange={(e) => setF({ ...f, quantidade: e.target.value })} required /></Campo>
        {f.tipo === "ENTRADA" && <Campo label="Custo unitário (R$)"><input type="number" step="0.01" min="0" value={f.custoUnitario} onChange={(e) => setF({ ...f, custoUnitario: e.target.value })} /></Campo>}
        <Campo label="Motivo / nota fiscal" largo><input value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} required={f.tipo === "AJUSTE"} /></Campo>
        <div className="campo-largo"><button className="btn btn-primary" disabled={ocupado || f.quantidade === ""}>Registrar</button></div>
      </form>
      <h4>Histórico</h4>
      <Estado req={historico} vazio={<Vazio texto="Sem movimentos." />}>
        {(l) => (
          <div className="tabela-wrap altura-max">
            <table className="tabela"><thead><tr><th>Quando</th><th>Tipo</th><th className="num">Qtd</th><th>Motivo</th><th>Por</th></tr></thead>
              <tbody>{l.map((m) => <tr key={m.id}><td>{dataHora(m.dataHora)}</td><td>{TIPOS_MOV[m.tipo]}</td><td className={"num " + (m.quantidade < 0 ? "texto-erro" : "texto-ok")}>{m.quantidade > 0 ? "+" : ""}{m.quantidade}</td><td>{m.motivo}</td><td>{m.usuario}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Estado>
    </Modal>
  );
}

export default function Estoque() {
  const { unidadeId, perms } = usePainel();
  const req = useApi("/api/produtos" + qs({ unidadeId }));
  const [busca, setBusca] = React.useState("");
  const [soBaixo, setSoBaixo] = React.useState(false);
  const [form, setForm] = React.useState(null);
  const [mov, setMov] = React.useState(null);
  const confirmar = useConfirmar();
  const [executar] = useAcao();

  const lista = (req.dados || []).filter((p) => (!soBaixo || (p.ativo && p.estoqueBaixo))
    && (!busca || `${p.nome} ${p.marca || ""} ${p.codigoBarras || ""}`.toLowerCase().includes(busca.toLowerCase())));
  const valorEstoque = (req.dados || []).reduce((s, p) => s + p.estoque * Number(p.precoCusto), 0);
  const baixos = (req.dados || []).filter((p) => p.ativo && p.estoqueBaixo).length;

  const excluir = async (p) => {
    if (!(await confirmar(`Excluir ${p.nome}? (produto já vendido só pode ser desativado)`, { perigo: true, ok: "Excluir" }))) return;
    if (await executar(() => api("/api/produtos/" + p.id, { method: "DELETE" }), "Produto excluído")) req.recarregar();
  };

  return (
    <div>
      <Cabecalho titulo="Estoque" sub={`${(req.dados || []).length} produtos · ${moeda(valorEstoque)} em estoque (custo)`}>
        <button className="btn btn-ghost" disabled={!lista.length} onClick={() => baixarCSV("estoque.csv", [
          { titulo: "Produto", valor: (p) => p.nome }, { titulo: "Marca", valor: (p) => p.marca }, { titulo: "Unidade", valor: (p) => p.unidadeNome },
          { titulo: "Estoque", valor: (p) => p.estoque }, { titulo: "Mínimo", valor: (p) => p.estoqueMinimo },
          { titulo: "Custo", valor: (p) => String(p.precoCusto).replace(".", ",") }, { titulo: "Venda", valor: (p) => String(p.precoVenda).replace(".", ",") },
          { titulo: "Repor", valor: (p) => p.estoqueBaixo ? Math.max(0, p.estoqueMinimo * 3 - p.estoque) : 0 },
        ], lista)}>⬇️ Lista de compras / CSV</button>
        {perms.gestao && <button className="btn btn-primary" onClick={() => setForm({})}>+ Produto</button>}
      </Cabecalho>
      <div className="filtros">
        <input className="busca" placeholder="🔎 Produto, marca ou código" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button className={"chip" + (soBaixo ? " on" : "")} onClick={() => setSoBaixo(!soBaixo)}>⚠️ Só estoque baixo ({baixos})</button>
      </div>
      <Estado req={req} vazio={<Vazio icone="📦" texto="Nenhum produto cadastrado." />}>
        {() => (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead><tr><th>Produto</th><th>Unidade</th><th className="num">Custo</th><th className="num">Venda</th><th className="num">Margem</th><th className="num">Estoque</th><th></th></tr></thead>
              <tbody>{lista.map((p) => (
                <tr key={p.id} className={p.ativo ? "" : "inativo"}>
                  <td className="celula-produto">{p.fotoUrl ? <img src={urlArquivo(p.fotoUrl)} alt="" /> : <span>🧴</span>}<div><b>{p.nome}</b><small className="texto-fraco">{p.marca}{p.codigoBarras ? " · " + p.codigoBarras : ""}</small></div></td>
                  <td>{p.unidadeNome.replace(/^.*? — /, "")}</td>
                  <td className="num">{moeda(p.precoCusto)}</td><td className="num">{moeda(p.precoVenda)}</td>
                  <td className="num">{p.margemPercentual != null ? p.margemPercentual + "%" : "—"}</td>
                  <td className="num">{p.estoqueBaixo && p.ativo ? <Pill tom="ruim">⚠️ {p.estoque}</Pill> : <b>{p.estoque}</b>} <small className="texto-fraco">/ mín {p.estoqueMinimo}</small></td>
                  <td className="acoes-celula">
                    <button className="btn btn-ghost btn-sm" onClick={() => setMov(p)}>± Estoque</button>
                    {perms.gestao && <button className="btn-icone" title="Editar" onClick={() => setForm(p)}>✏️</button>}
                    {perms.gestao && <button className="btn-icone" title="Excluir" onClick={() => excluir(p)}>🗑️</button>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Estado>
      {form && <ProdutoForm produto={form.id ? form : null} unidadeId={unidadeId} onClose={() => setForm(null)} onSalvo={() => { setForm(null); req.recarregar(); }} />}
      {mov && <MovimentoModal produto={mov} onClose={() => setMov(null)} onFeito={() => { setMov(null); req.recarregar(); }} />}
    </div>
  );
}
