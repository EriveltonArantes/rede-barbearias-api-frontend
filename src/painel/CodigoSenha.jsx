import React from "react";
import { api, qs } from "../api.js";
import { usePainel } from "../contexto.js";
import { Modal, Pill, Vazio, useAcao, useApi } from "../ui.jsx";
import { copiar, dataHora, linkWhatsApp, PAPEIS, telefone } from "../util.js";

/** Mostra o código gerado e manda pelo WhatsApp da barbearia (wa.me) em 1 clique. */
export function CodigoGerado({ dados, onClose }) {
  const [copiado, setCopiado] = React.useState(false);
  const link = linkWhatsApp(dados.telefone, dados.mensagem);
  return (
    <Modal titulo="Código de nova senha" onClose={onClose}
           rodape={<button className="btn btn-ghost" onClick={onClose}>Fechar</button>}>
      <p className="texto-fraco">Vale por 24 horas e só funciona uma vez. Usuário: <b>{dados.username}</b></p>
      <p className="input-codigo" style={{ background: "var(--bg-soft)", borderRadius: 12, padding: 14, textAlign: "center" }} aria-label="Código">{dados.codigo}</p>
      <div className="acoes-linha">
        {link ? <a className="btn btn-primary" target="_blank" rel="noreferrer" href={link}>💬 Enviar pelo WhatsApp</a>
          : <span className="texto-fraco">Sem celular cadastrado — passe o código pessoalmente.</span>}
        <button className="btn btn-ghost" onClick={() => setCopiado(copiar(dados.mensagem))}>{copiado ? "✅ Copiado" : "📋 Copiar mensagem"}</button>
      </div>
    </Modal>
  );
}

/** Pedidos de "esqueci minha senha" que ainda não foram resolvidos + busca de cliente no balcão. */
export default function PedidosSenha() {
  const { perms } = usePainel();
  const req = useApi("/api/usuarios/recuperacoes-pendentes");
  const [executar, ocupado] = useAcao();
  const [gerado, setGerado] = React.useState(null);
  const [busca, setBusca] = React.useState("");
  const [clientes, setClientes] = React.useState([]);
  React.useEffect(() => {
    if (busca.trim().length < 2) { setClientes([]); return; }
    const t = setTimeout(() => api("/api/clientes" + qs({ q: busca.trim() })).then((l) => setClientes(l.slice(0, 6))).catch(() => setClientes([])), 250);
    return () => clearTimeout(t);
  }, [busca]);

  const gerar = async (caminho) => {
    const r = await executar(() => api(caminho, { method: "POST" }));
    if (r) { setGerado(r); req.recarregar(); }
  };
  const pedidos = req.dados || [];
  return (
    <section className="cartao pedidos-senha">
      <h3>🔑 Esqueceram a senha</h3>
      <p className="texto-fraco">Quem pediu “esqueci minha senha” no site aparece aqui. Se o código não chegou sozinho, gere um e mande pelo WhatsApp da barbearia.</p>
      {req.carregando && !req.dados ? <p className="texto-fraco">Carregando...</p> : !pedidos.length ? <Vazio icone="✅" texto="Nenhum pedido pendente." /> : (
        <ul className="lista-simples">
          {pedidos.map((p) => (
            <li key={p.usuarioId}>
              <span>
                <b>{p.nome}</b> <small className="texto-fraco">({p.username} · {PAPEIS[p.papel]})</small><br />
                <small className="texto-fraco">Pediu {dataHora(p.pedidoEm)} · {p.entreguePor ? `código enviado por ${p.entreguePor}` : "nenhum envio automático"}{p.telefone ? " · " + telefone(p.telefone) : ""}</small>
                {p.vencido && <> <Pill tom="aviso">código vencido</Pill></>}
              </span>
              <button className="btn btn-primary btn-sm" disabled={ocupado} onClick={() => gerar(`/api/usuarios/${p.usuarioId}/codigo-senha`)}>Gerar código</button>
            </li>
          ))}
        </ul>
      )}
      <div style={{ marginTop: 14 }}>
        <b className="rotulo-bloco">Cliente no balcão não consegue entrar?</b>
        <div className="autocomplete">
          <input placeholder="🔎 Nome ou celular do cliente" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar cliente" />
          {clientes.length > 0 && (
            <ul className="sugestoes">{clientes.map((c) => (
              <li key={c.id}><button type="button" disabled={ocupado} onClick={() => { setBusca(""); gerar(`/api/usuarios/por-cliente/${c.id}/codigo-senha`); }}>
                <b>{c.nome}</b> <span>{telefone(c.telefone)} · gerar código</span>
              </button></li>
            ))}</ul>
          )}
        </div>
        {perms.gestao && <small className="texto-fraco">Pra contas da equipe, use o 🔑 na lista de usuários abaixo.</small>}
      </div>
      {gerado && <CodigoGerado dados={gerado} onClose={() => setGerado(null)} />}
    </section>
  );
}
