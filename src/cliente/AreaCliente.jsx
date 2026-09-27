import React from "react";
import { Logo, marcaAtual } from "../marca.jsx";
import { api } from "../api.js";
import AgendarOnline from "../site/AgendarOnline.jsx";
import { TrocarSenha } from "../painel/MinhaConta.jsx";
import { Abas, Campo, Estado, Estrelas, Grade, Kpi, Modal, StatusPill, Vazio, useAcao, useApi, useConfirmar } from "../ui.jsx";
import { PainelCtx } from "../contexto.js";
import { baixarJSON, dataExtenso, dataBR, hora, linkGoogleAgenda, moeda, primeiroNome, telefone } from "../util.js";

function MeusHorarios({ onAgendar }) {
  const req = useApi("/api/minha-conta/agendamentos");
  const [avaliar, setAvaliar] = React.useState(null);
  const confirmar = useConfirmar();
  const [executar] = useAcao();
  const agora = new Date();
  const lista = req.dados || [];
  const proximos = lista.filter((a) => !["CONCLUIDO", "CANCELADO", "NAO_COMPARECEU"].includes(a.status) && new Date(a.fim) > agora).reverse();
  const historico = lista.filter((a) => !proximos.includes(a));
  const cancelar = async (a) => {
    if (!(await confirmar(`Cancelar ${a.servicoNome} em ${dataExtenso(a.inicio.slice(0, 10))} às ${hora(a.inicio)}?`, { perigo: true, ok: "Cancelar horário" }))) return;
    if (await executar(() => api(`/api/minha-conta/agendamentos/${a.codigo}/cancelar`, { method: "POST", body: {} }), "Horário cancelado")) req.recarregar();
  };
  return (
    <Estado req={req}>
      {() => (
        <>
          <h3 className="secao-titulo">Próximos horários</h3>
          {!proximos.length ? (
            <Vazio icone="🗓️" texto="Você não tem horário marcado."><button className="btn btn-primary" onClick={onAgendar}>Agendar agora</button></Vazio>
          ) : (
            <div className="cartoes-grid">
              {proximos.map((a) => (
                <div key={a.codigo} className="cartao horario-cliente">
                  <div className="acoes-linha entre"><StatusPill status={a.status} /><span className="codigo-mini">#{a.codigo}</span></div>
                  <h3>{dataExtenso(a.inicio.slice(0, 10))} · {hora(a.inicio)}</h3>
                  <p>{a.servicoNome} com <b>{a.barbeiroNome}</b></p>
                  <p className="texto-fraco">📍 {a.unidadeNome} — {a.unidadeEndereco}</p>
                  <p>{Number(a.desconto) > 0 ? <><s>{moeda(a.valor)}</s> {moeda(a.valorAPagar)}</> : moeda(a.valor)}</p>
                  <div className="acoes-linha">
                    <a className="btn btn-ghost btn-sm" target="_blank" rel="noreferrer" href={linkGoogleAgenda({ titulo: `${a.servicoNome} — ${marcaAtual().nome}`, inicio: a.inicio, fim: a.fim, local: a.unidadeEndereco, detalhes: "Código " + a.codigo })}>📅 Agenda</a>
                    {a.podeCancelar ? <button className="btn btn-ghost btn-sm" onClick={() => cancelar(a)}>Cancelar</button> : <small className="texto-fraco">Pra cancelar agora, fale com a unidade.</small>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <h3 className="secao-titulo">Histórico</h3>
          {!historico.length ? <Vazio texto="Seu histórico aparece aqui depois do primeiro atendimento." /> : (
            <ul className="lista-simples">
              {historico.map((a) => (
                <li key={a.codigo}>
                  <span>{dataBR(a.inicio)} · {a.servicoNome} com {a.barbeiroNome} <StatusPill status={a.status} /></span>
                  {a.nota ? <Estrelas nota={a.nota} tamanho={14} /> : a.podeAvaliar ? <button className="btn btn-ghost btn-sm" onClick={() => setAvaliar(a)}>⭐ Avaliar</button> : null}
                </li>
              ))}
            </ul>
          )}
          {avaliar && <Avaliar ag={avaliar} onClose={() => setAvaliar(null)} onFeito={() => { setAvaliar(null); req.recarregar(); }} />}
        </>
      )}
    </Estado>
  );
}

function Avaliar({ ag, onClose, onFeito }) {
  const [nota, setNota] = React.useState(0);
  const [comentario, setComentario] = React.useState("");
  const [executar, ocupado] = useAcao();
  const enviar = async () => {
    if (await executar(() => api(`/api/minha-conta/agendamentos/${ag.codigo}/avaliar`, { method: "POST", body: { nota, comentario } }), "Obrigado pela avaliação! 💈")) onFeito();
  };
  return (
    <Modal titulo={`Avaliar ${ag.servicoNome} com ${ag.barbeiroNome}`} onClose={onClose}
           rodape={<><button className="btn btn-ghost" onClick={onClose}>Depois</button><button className="btn btn-primary" disabled={!nota || ocupado} onClick={enviar}>Enviar</button></>}>
      <div className="centro"><Estrelas nota={nota} onChange={setNota} tamanho={36} /></div>
      <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} maxLength={1000} placeholder="Conte como foi (opcional)" />
    </Modal>
  );
}

function Beneficios({ ficha }) {
  const planos = useApi("/api/publico/planos");
  const c = ficha.cliente;
  const pct = Math.min(100, (c.pontos / ficha.pontosParaResgate) * 100);
  return (
    <div className="dash">
      <div className="cartao fidelidade">
        <h3>🎁 Programa de fidelidade</h3>
        <p>A cada atendimento pago você ganha 1 ponto. Com {ficha.pontosParaResgate} pontos, o próximo é por nossa conta.</p>
        <div className="fidelidade-barra"><span style={{ width: pct + "%" }}></span></div>
        <p><b>{c.pontos}</b> de {ficha.pontosParaResgate} pontos {ficha.podeResgatar ? "— 🎉 você já pode resgatar! Avise na recepção." : `— faltam ${ficha.pontosParaResgate - c.pontos}.`}</p>
      </div>
      <div className="cartao">
        <h3>⭐ Clube de assinatura</h3>
        {ficha.assinatura && ficha.assinatura.status !== "CANCELADA" ? (
          <>
            <p>Você é assinante do <b>{ficha.assinatura.planoNome}</b> ({moeda(ficha.assinatura.precoMensal)}/mês).</p>
            <p>Usos neste ciclo: <b>{ficha.assinatura.usosNoCiclo}/{ficha.assinatura.usosPorMes}</b> · válido até {dataBR(ficha.assinatura.validaAte)}
              {ficha.assinatura.vencida || ficha.assinatura.status === "SUSPENSA" ? <span className="texto-erro"> — mensalidade pendente, renove na recepção.</span> : ""}</p>
          </>
        ) : (
          <>
            <p>Pague um valor fixo por mês e ande sempre na régua. Assine em qualquer unidade.</p>
            <div className="cartoes-grid">
              {(planos.dados || []).map((p) => (
                <div key={p.id} className="cartao plano"><b>{p.nome}</b><div className="plano-preco">{moeda(p.precoMensal)}<small>/mês</small></div><small>{p.usosPorMes} atendimentos · {p.servicos.map((s) => s.nome).join(", ")}</small></div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** LGPD: baixar tudo e pedir exclusão. */
function Privacidade({ onExcluido }) {
  const [executar, ocupado] = useAcao();
  const [excluindo, setExcluindo] = React.useState(false);
  const [confirmacao, setConfirmacao] = React.useState("");
  const baixar = async () => {
    const r = await executar(() => api("/api/minha-conta/meus-dados"));
    if (r) baixarJSON("meus-dados-rede-barbearias.json", r);
  };
  const excluir = async () => {
    const r = await executar(() => api("/api/minha-conta/excluir-conta", { method: "POST", body: { confirmacao } }));
    if (r) onExcluido(r.mensagem);
  };
  return (
    <div className="cartao">
      <h3>🔒 Privacidade</h3>
      <p className="texto-fraco">Veja tudo que a barbearia guarda sobre você, ou peça pra apagar. <a href="#/privacidade">Política de privacidade</a></p>
      <div className="acoes-linha">
        <button type="button" className="btn btn-ghost" disabled={ocupado} onClick={baixar}>⬇️ Baixar meus dados</button>
        <button type="button" className="btn btn-danger" onClick={() => setExcluindo(true)}>Excluir minha conta</button>
      </div>
      {excluindo && (
        <Modal titulo="Excluir minha conta" onClose={() => setExcluindo(false)}
               rodape={<><button className="btn btn-ghost" onClick={() => setExcluindo(false)}>Voltar</button>
                 <button className="btn btn-danger" disabled={ocupado || confirmacao.trim().toUpperCase() !== "EXCLUIR"} onClick={excluir}>Excluir definitivamente</button></>}>
          <p>Seus dados pessoais (nome, telefone, e-mail, aniversário, preferências e conversas) serão apagados e o login deixa de funcionar.
            Horários marcados serão cancelados e seus pontos de fidelidade são perdidos. Isso não tem volta.</p>
          <Campo label="Digite EXCLUIR pra confirmar"><input value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoFocus /></Campo>
        </Modal>
      )}
    </div>
  );
}

function MeusDados({ ficha, onSalvo, onExcluido }) {
  const c = ficha.cliente;
  const [f, setF] = React.useState({ nome: c.nome, telefone: telefone(c.telefone), email: c.email || "", dataNascimento: c.dataNascimento || "", observacoes: c.observacoes || "", aceitaMarketing: c.aceitaMarketing });
  const [executar, ocupado] = useAcao();
  const salvar = async (e) => {
    e.preventDefault();
    if (await executar(() => api("/api/minha-conta", { method: "PUT", body: { ...f, email: f.email || null, dataNascimento: f.dataNascimento || null } }), "Dados atualizados")) onSalvo();
  };
  return (
    <div className="dash-colunas">
      <form className="cartao" onSubmit={salvar}>
        <h3>👤 Meus dados</h3>
        <Grade>
          <Campo label="Nome" largo><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} required /></Campo>
          <Campo label="Celular"><input value={f.telefone} onChange={(e) => setF({ ...f, telefone: telefone(e.target.value) })} required /></Campo>
          <Campo label="E-mail"><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Campo>
          <Campo label="Aniversário" dica="Ganhe um presente no mês do seu aniversário"><input type="date" value={f.dataNascimento} onChange={(e) => setF({ ...f, dataNascimento: e.target.value })} /></Campo>
          <Campo label="Preferências de corte" largo><textarea value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} placeholder="Ex.: máquina 2 na lateral, sem gel" /></Campo>
          <label className="check campo-largo"><input type="checkbox" checked={f.aceitaMarketing} onChange={(e) => setF({ ...f, aceitaMarketing: e.target.checked })} /> Quero receber promoções no WhatsApp</label>
        </Grade>
        <button className="btn btn-primary" disabled={ocupado}>Salvar</button>
      </form>
      <div className="coluna-empilhada">
        <TrocarSenha />
        <Privacidade onExcluido={onExcluido} />
      </div>
    </div>
  );
}

export default function AreaCliente({ sessao, onSair }) {
  const ficha = useApi("/api/minha-conta");
  const [aba, setAba] = React.useState("horarios");
  return (
    <PainelCtx.Provider value={{ sessao, papel: "CLIENTE", unidades: [], unidadeId: "", irPara: () => {} }}>
      <div className="area-cliente">
        <header className="cliente-topo">
          <a className="site-brand" href="#/"><Logo pontoClasse="site-brand-dot" /></a>
          <div className="acoes-linha">
            <span>Olá, {primeiroNome(ficha.dados?.cliente.nome || sessao.nome)}</span>
            <a className="btn btn-ghost btn-sm" href="#/" onClick={onSair}>Sair</a>
          </div>
        </header>
        <main className="cliente-main">
          <Estado req={ficha}>
            {(f) => (
              <>
                <div className="kpi-grid compacto">
                  <Kpi icone="✂️" rotulo="Atendimentos" valor={f.atendimentos} />
                  <Kpi icone="🎁" rotulo="Pontos de fidelidade" valor={`${f.cliente.pontos}/${f.pontosParaResgate}`} tom={f.podeResgatar ? "ouro" : undefined} />
                  <Kpi icone="⭐" rotulo="Clube" valor={f.assinatura && f.assinatura.status !== "CANCELADA" ? `${f.assinatura.usosRestantes} uso(s)` : "—"} detalhe={f.assinatura?.planoNome || "não assinante"} />
                  <Kpi icone="💈" rotulo="Seu favorito" valor={f.servicoFavorito || "—"} />
                </div>
                <Abas abas={[["horarios", "Meus horários"], ["agendar", "Agendar"], ["beneficios", "Fidelidade e clube"], ["dados", "Meus dados"]]} atual={aba} onChange={setAba} />
                {aba === "horarios" && <MeusHorarios onAgendar={() => setAba("agendar")} />}
                {aba === "agendar" && <div className="cartao"><AgendarOnline clienteLogado={f.cliente} onVoltar={() => { setAba("horarios"); ficha.recarregar(); }} /></div>}
                {aba === "beneficios" && <Beneficios ficha={f} />}
                {aba === "dados" && <MeusDados ficha={f} onSalvo={ficha.recarregar} onExcluido={() => { onSair(); window.location.hash = "#/"; }} />}
              </>
            )}
          </Estado>
        </main>
      </div>
    </PainelCtx.Provider>
  );
}
