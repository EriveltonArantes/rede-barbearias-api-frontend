import React from "react";
import { api, qs } from "../api.js";
import { usePainel } from "../contexto.js";
import { BarrasH, Cabecalho, Estado, Estrelas, Kpi, Modal, Pill, Vazio, useAcao, useApi, useTabela } from "../ui.jsx";
import { dataBR } from "../util.js";

function Responder({ av, onClose, onFeito }) {
  const [resposta, setResposta] = React.useState(av.resposta || "");
  const [publica, setPublica] = React.useState(av.publica);
  const [executar, ocupado] = useAcao();
  const salvar = async () => {
    if (await executar(() => api("/api/avaliacoes/" + av.id, { method: "PATCH", body: { resposta, publica } }), "Avaliação atualizada")) onFeito();
  };
  return (
    <Modal titulo={`Avaliação de ${av.clienteNome}`} onClose={onClose}
           rodape={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={salvar} disabled={ocupado}>Salvar</button></>}>
      <p><Estrelas nota={av.nota} /> {av.servicoNome} com {av.barbeiroNome} · {dataBR(av.criadaEm)}</p>
      <blockquote className="citacao">{av.comentario || <i>sem comentário</i>}</blockquote>
      <label className="campo campo-largo"><span className="campo-label">Resposta da barbearia</span>
        <textarea value={resposta} onChange={(e) => setResposta(e.target.value)} placeholder="Obrigado pelo retorno..." /></label>
      <label className="check"><input type="checkbox" checked={publica} onChange={(e) => setPublica(e.target.checked)} /> Pode aparecer no site</label>
    </Modal>
  );
}

export default function Avaliacoes() {
  const { unidadeId, perms } = usePainel();
  const [barbeiroId, setBarbeiroId] = React.useState("");
  const [nota, setNota] = React.useState("");
  const barbeiros = useApi(perms.barbeiro ? null : "/api/barbeiros" + qs({ unidadeId }));
  const req = useApi("/api/avaliacoes" + qs({ unidadeId, barbeiroId }));
  const [sel, setSel] = React.useState(null);
  const todas = req.dados || [];
  const lista = todas.filter((a) => !nota || (nota === "baixas" ? a.nota <= 3 : a.nota === Number(nota)));
  const [pagina, paginacao] = useTabela(lista, 12);
  const media = todas.length ? todas.reduce((s, a) => s + a.nota, 0) / todas.length : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ rotulo: "★".repeat(n), valor: todas.filter((a) => a.nota === n).length }));
  const nps = todas.length ? Math.round(((todas.filter((a) => a.nota === 5).length - todas.filter((a) => a.nota <= 3).length) / todas.length) * 100) : 0;

  return (
    <div>
      <Cabecalho titulo={perms.barbeiro ? "Minhas avaliações" : "Avaliações dos clientes"} sub="Enviadas pelo cliente depois do atendimento (link do código do agendamento)" />
      <div className="dash-colunas">
        <div className="kpi-grid compacto">
          <Kpi icone="⭐" rotulo="Nota média" valor={media ? media.toFixed(2) : "—"} tom="ouro" detalhe={`${todas.length} avaliações`} />
          <Kpi icone="📣" rotulo="Índice de recomendação" valor={todas.length ? nps : "—"} detalhe="% de 5★ menos % de 1–3★" />
          <Kpi icone="⚠️" rotulo="Notas baixas (1–3)" valor={todas.filter((a) => a.nota <= 3).length} tom="alerta" />
        </div>
        <div className="cartao"><h3>Distribuição</h3><BarrasH itens={dist} cor="var(--ouro)" /></div>
      </div>
      <div className="filtros">
        {!perms.barbeiro && (
          <select value={barbeiroId} onChange={(e) => setBarbeiroId(e.target.value)} aria-label="Barbeiro">
            <option value="">Todos os barbeiros</option>
            {(barbeiros.dados || []).map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
        )}
        {[["", "Todas"], ["5", "5★"], ["4", "4★"], ["baixas", "1–3★"]].map(([k, r]) => (
          <button key={k} className={"chip" + (nota === k ? " on" : "")} onClick={() => setNota(k)}>{r}</button>
        ))}
      </div>
      <Estado req={req} vazio={<Vazio icone="💬" texto="Nenhuma avaliação ainda." />}>
        {() => (
          <>
            <div className="avaliacoes-grid">
              {pagina.map((a) => (
                <div key={a.id} className={"cartao avaliacao" + (a.nota <= 3 ? " baixa" : "")}>
                  <div className="acoes-linha entre"><Estrelas nota={a.nota} tamanho={16} /><small className="texto-fraco">{dataBR(a.criadaEm)}</small></div>
                  <p className="citacao">{a.comentario || <i className="texto-fraco">sem comentário</i>}</p>
                  <small className="texto-fraco"><b>{a.clienteNome}</b> · {a.servicoNome} com {a.barbeiroNome} · {a.unidadeNome.replace("Rede Barbearias — ", "")}</small>
                  {a.resposta && <p className="resposta">↳ {a.resposta}</p>}
                  <div className="acoes-linha entre">
                    {!a.publica ? <Pill>oculta do site</Pill> : <span></span>}
                    {perms.gestao && <button className="btn btn-ghost btn-sm" onClick={() => setSel(a)}>{a.resposta ? "Editar resposta" : "Responder"}</button>}
                  </div>
                </div>
              ))}
            </div>
            {paginacao}
          </>
        )}
      </Estado>
      {sel && <Responder av={sel} onClose={() => setSel(null)} onFeito={() => { setSel(null); req.recarregar(); }} />}
    </div>
  );
}
