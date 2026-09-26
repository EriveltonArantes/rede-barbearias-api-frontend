import React from "react";
import { api, qs, urlArquivo } from "../api.js";
import { usePainel } from "../contexto.js";
import { Cabecalho, Campo, Estado, Modal, Pill, PixCobranca, Vazio, useAcao, useApi, useConfirmar } from "../ui.jsx";
import { dataHora, FORMAS, FORMAS_PAGAVEIS, moeda, telefone } from "../util.js";

/** PDV de produtos: busca/leitor de código de barras, carrinho, cliente, barbeiro (comissão) e pagamento. */
export default function Vendas() {
  const { unidadeId, unidades, perms } = usePainel();
  const [unLocal, setUnLocal] = React.useState("");
  const un = unidadeId || unLocal || (unidades[0] ? String(unidades[0].id) : "");
  const produtos = useApi(un ? "/api/produtos" + qs({ unidadeId: un }) : null);
  const barbeiros = useApi(un ? "/api/barbeiros" + qs({ unidadeId: un, ativos: true }) : null);
  const vendas = useApi(un ? "/api/vendas" + qs({ unidadeId: un }) : null);
  const [busca, setBusca] = React.useState("");
  const [carrinho, setCarrinho] = React.useState([]);
  const [cliente, setCliente] = React.useState(null);
  const [buscaCli, setBuscaCli] = React.useState("");
  const [sugestoes, setSugestoes] = React.useState([]);
  const [barbeiroId, setBarbeiroId] = React.useState("");
  const [forma, setForma] = React.useState("PIX");
  const [desconto, setDesconto] = React.useState("");
  const [cancelar, setCancelar] = React.useState(null);
  const [executar, ocupado] = useAcao();

  React.useEffect(() => {
    if (buscaCli.trim().length < 2) { setSugestoes([]); return; }
    const t = setTimeout(() => api("/api/clientes" + qs({ q: buscaCli.trim() })).then((l) => setSugestoes(l.slice(0, 6))).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [buscaCli]);

  const ativos = (produtos.dados || []).filter((p) => p.ativo);
  const visiveis = ativos.filter((p) => !busca || `${p.nome} ${p.marca || ""} ${p.codigoBarras || ""}`.toLowerCase().includes(busca.toLowerCase()));
  const noCarrinho = (id) => carrinho.find((i) => i.produto.id === id)?.quantidade || 0;

  const adicionar = (p) => {
    if (noCarrinho(p.id) >= p.estoque) return;
    setCarrinho((c) => c.some((i) => i.produto.id === p.id)
      ? c.map((i) => i.produto.id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i)
      : [...c, { produto: p, quantidade: 1 }]);
  };
  const alterar = (id, q) => setCarrinho((c) => c.map((i) => i.produto.id === id ? { ...i, quantidade: Math.max(0, Math.min(q, i.produto.estoque)) } : i).filter((i) => i.quantidade > 0));

  // leitor de código de barras (USB) digita o código e dá Enter no campo de busca
  const buscaEnter = (e) => {
    if (e.key !== "Enter") return;
    const exato = ativos.find((p) => p.codigoBarras && p.codigoBarras === busca.trim());
    if (exato) { adicionar(exato); setBusca(""); } else if (visiveis.length === 1) { adicionar(visiveis[0]); setBusca(""); }
  };

  const subtotal = carrinho.reduce((s, i) => s + i.quantidade * Number(i.produto.precoVenda), 0);
  const total = Math.max(0, subtotal - Number(desconto || 0));

  const finalizar = async () => {
    const r = await executar(() => api("/api/vendas", { method: "POST", body: {
      unidadeId: Number(un), clienteId: cliente?.id || null, barbeiroId: barbeiroId ? Number(barbeiroId) : null,
      itens: carrinho.map((i) => ({ produtoId: i.produto.id, quantidade: i.quantidade })),
      desconto: Number(desconto || 0), formaPagamento: forma,
    } }), "Venda registrada 🛒");
    if (r) {
      setCarrinho([]); setCliente(null); setDesconto(""); setBarbeiroId("");
      produtos.recarregar(); vendas.recarregar();
    }
  };

  return (
    <div>
      <Cabecalho titulo="Vender produto" sub="Busque pelo nome ou passe o leitor de código de barras">
        {perms.admin && !unidadeId && (
          <select value={un} onChange={(e) => { setUnLocal(e.target.value); setCarrinho([]); }} aria-label="Unidade">
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome.replace("Rede Barbearias — ", "")}</option>)}
          </select>
        )}
      </Cabecalho>
      <div className="pdv">
        <div className="pdv-produtos">
          <input className="busca grande" placeholder="🔎 Nome, marca ou código de barras + Enter" value={busca}
                 onChange={(e) => setBusca(e.target.value)} onKeyDown={buscaEnter} autoFocus />
          <Estado req={produtos} vazio={<Vazio icone="📦" texto="Nenhum produto cadastrado nessa unidade." />}>
            {() => (
              <div className="produtos-grid">
                {visiveis.map((p) => {
                  const esgotado = p.estoque - noCarrinho(p.id) <= 0;
                  return (
                    <button key={p.id} className={"produto-card" + (esgotado ? " esgotado" : "")} onClick={() => adicionar(p)} disabled={esgotado}>
                      {p.fotoUrl ? <img src={urlArquivo(p.fotoUrl)} alt="" /> : <span className="produto-ico">🧴</span>}
                      <b>{p.nome}</b>
                      <small>{p.marca}</small>
                      <span className="produto-preco">{moeda(p.precoVenda)}</span>
                      <small className={p.estoqueBaixo ? "texto-erro" : "texto-fraco"}>{esgotado ? "sem estoque" : `${p.estoque - noCarrinho(p.id)} em estoque`}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </Estado>
        </div>

        <aside className="pdv-carrinho cartao">
          <h3>🛒 Carrinho</h3>
          {!carrinho.length ? <Vazio icone="🛍️" texto="Clique nos produtos pra adicionar." /> : (
            <ul className="carrinho">
              {carrinho.map((i) => (
                <li key={i.produto.id}>
                  <div><b>{i.produto.nome}</b><small>{moeda(i.produto.precoVenda)} cada</small></div>
                  <div className="qtd">
                    <button onClick={() => alterar(i.produto.id, i.quantidade - 1)} aria-label="Menos">−</button>
                    <span>{i.quantidade}</span>
                    <button onClick={() => alterar(i.produto.id, i.quantidade + 1)} aria-label="Mais">+</button>
                  </div>
                  <b>{moeda(i.quantidade * i.produto.precoVenda)}</b>
                </li>
              ))}
            </ul>
          )}
          <Campo label="Cliente (opcional)">
            {cliente ? (
              <div className="linha-input"><input readOnly value={`${cliente.nome} · ${telefone(cliente.telefone)}`} /><button className="btn btn-ghost btn-sm" onClick={() => setCliente(null)}>✕</button></div>
            ) : (
              <div className="autocomplete">
                <input placeholder="Buscar cliente..." value={buscaCli} onChange={(e) => setBuscaCli(e.target.value)} />
                {sugestoes.length > 0 && (
                  <ul className="sugestoes">{sugestoes.map((c) => <li key={c.id}><button type="button" onClick={() => { setCliente(c); setBuscaCli(""); setSugestoes([]); }}><b>{c.nome}</b> <span>{telefone(c.telefone)}</span></button></li>)}</ul>
                )}
              </div>
            )}
          </Campo>
          <Campo label="Barbeiro que indicou (comissão)">
            <select value={barbeiroId} onChange={(e) => setBarbeiroId(e.target.value)}>
              <option value="">Ninguém / balcão</option>
              {(barbeiros.dados || []).map((b) => <option key={b.id} value={b.id}>{b.nome} ({b.comissaoProduto}%)</option>)}
            </select>
          </Campo>
          <div className="formas">
            {FORMAS_PAGAVEIS.map((f) => <button key={f} className={"forma" + (forma === f ? " sel" : "")} onClick={() => setForma(f)}>{FORMAS[f]}</button>)}
          </div>
          <Campo label="Desconto (R$)"><input type="number" min="0" step="0.5" value={desconto} onChange={(e) => setDesconto(e.target.value)} /></Campo>
          <div className="pdv-total"><span>Total</span><b>{moeda(total)}</b></div>
          {forma === "PIX" && total > 0 && carrinho.length > 0 && <PixCobranca valor={total.toFixed(2)} unidadeId={un} referencia={"PDV" + Date.now().toString().slice(-8)} />}
          <button className="btn btn-primary btn-lg largo" disabled={!carrinho.length || ocupado} onClick={finalizar}>{ocupado ? "Registrando..." : `Finalizar venda · ${moeda(total)}`}</button>
        </aside>
      </div>

      <h3 className="secao-titulo">Vendas dos últimos 30 dias</h3>
      <Estado req={vendas} vazio={<Vazio texto="Nenhuma venda recente." />}>
        {(lista) => (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead><tr><th>#</th><th>Quando</th><th>Itens</th><th>Cliente</th><th>Barbeiro</th><th>Forma</th><th className="num">Total</th><th></th></tr></thead>
              <tbody>{lista.slice(0, 50).map((v) => (
                <tr key={v.id} className={v.cancelada ? "cancelada" : ""}>
                  <td>{v.id}</td><td>{dataHora(v.dataHora)}</td>
                  <td>{v.itens.map((i) => `${i.quantidade}× ${i.produtoNome}`).join(", ")}</td>
                  <td>{v.clienteNome || "—"}</td><td>{v.barbeiroNome || "—"}</td><td>{FORMAS[v.formaPagamento]}</td>
                  <td className="num">{v.cancelada ? <Pill tom="ruim">estornada</Pill> : moeda(v.total)}</td>
                  <td>{perms.gestao && !v.cancelada && <button className="btn-icone" title="Estornar" onClick={() => setCancelar(v)}>↩️</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Estado>
      {cancelar && <EstornoModal venda={cancelar} onClose={() => setCancelar(null)} onFeito={() => { setCancelar(null); vendas.recarregar(); produtos.recarregar(); }} />}
    </div>
  );
}

function EstornoModal({ venda, onClose, onFeito }) {
  const [motivo, setMotivo] = React.useState("");
  const [executar, ocupado] = useAcao();
  const confirmar = useConfirmar();
  const enviar = async () => {
    if (!(await confirmar(`Estornar a venda #${venda.id} de ${moeda(venda.total)}? Os produtos voltam pro estoque.`, { perigo: true, ok: "Estornar" }))) return;
    if (await executar(() => api(`/api/vendas/${venda.id}/cancelar`, { method: "POST", body: { motivo } }), "Venda estornada")) onFeito();
  };
  return (
    <Modal titulo={`Estornar venda #${venda.id}`} onClose={onClose}
           rodape={<><button className="btn btn-ghost" onClick={onClose}>Voltar</button><button className="btn btn-danger" disabled={!motivo.trim() || ocupado} onClick={enviar}>Estornar</button></>}>
      <Campo label="Motivo do estorno" largo><input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: produto com defeito" autoFocus /></Campo>
    </Modal>
  );
}
