import React from "react";
import { api } from "../api.js";
import { Estrelas, StatusPill, useApi } from "../ui.jsx";
import { SituacaoSinalCliente } from "./SinalPix.jsx";
import { dataExtenso, hora, linkWhatsApp, mensagemErro, moeda, telefone } from "../util.js";

/** Consulta, cancelamento e avaliação do agendamento pelo código (sem login). */
export default function MeuHorario({ codigoInicial }) {
  const [codigo, setCodigo] = React.useState(codigoInicial || "");
  const [ag, setAg] = React.useState(null);
  const [erro, setErro] = React.useState("");
  const [ok, setOk] = React.useState("");
  const [tel, setTel] = React.useState("");
  const [motivo, setMotivo] = React.useState("");
  const [nota, setNota] = React.useState(0);
  const [comentario, setComentario] = React.useState("");
  const [ocupado, setOcupado] = React.useState(false);
  const politicas = useApi("/api/publico/politicas");

  const buscar = async (c = codigo) => {
    if (!c.trim()) return;
    setErro(""); setOk(""); setOcupado(true);
    try { setAg(await api("/api/publico/agendamentos/" + encodeURIComponent(c.trim().toUpperCase()))); }
    catch (e) { setAg(null); setErro(mensagemErro(e)); }
    finally { setOcupado(false); }
  };
  React.useEffect(() => { if (codigoInicial) buscar(codigoInicial); }, [codigoInicial]);

  const agir = async (caminho, corpo, sucesso) => {
    setErro(""); setOcupado(true);
    try { setAg(await api(caminho, { method: "POST", body: corpo })); setOk(sucesso); }
    catch (e) { setErro(mensagemErro(e)); }
    finally { setOcupado(false); }
  };

  return (
    <div className="meu-horario">
      <form className="linha-input" onSubmit={(e) => { e.preventDefault(); buscar(); }}>
        <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Código (ex.: K7M2QX)" maxLength={12} aria-label="Código do agendamento" />
        <button className="btn btn-primary" disabled={ocupado}>Consultar</button>
      </form>
      {erro && <p className="texto-erro">{erro}</p>}
      {ok && <p className="texto-ok">{ok}</p>}
      {ag && (
        <div className="cartao-horario">
          <div className="cartao-topo"><StatusPill status={ag.status} /><span className="codigo-mini">#{ag.codigo}</span></div>
          <h3>{dataExtenso(ag.inicio.slice(0, 10))} · {hora(ag.inicio)}</h3>
          <p>{ag.servicoNome} com <b>{ag.barbeiroNome}</b> ({ag.duracaoMinutos} min)</p>
          <p>📍 {ag.unidadeNome} — {ag.unidadeEndereco}</p>
          <p>💰 {Number(ag.desconto) > 0 ? <><s>{moeda(ag.valor)}</s> {moeda(ag.valorAPagar)}</> : moeda(ag.valor)}</p>
          {ag.unidadeWhatsapp && (
            <a className="btn btn-ghost btn-sm" target="_blank" rel="noreferrer"
               href={linkWhatsApp(ag.unidadeWhatsapp, `Olá! Sobre meu agendamento ${ag.codigo}...`)}>💬 Falar com a unidade</a>
          )}

          <SituacaoSinalCliente ag={ag} regras={politicas.dados?.sinal} />
          {ag.status === "AGENDADO" && new Date(ag.inicio) > new Date() && ag.sinalSituacao !== "PENDENTE" && (
            <div className="bloco-acao">
              <h4>Vai vir? Confirme sua presença</h4>
              <p className="campo-dica">Ajuda a barbearia a organizar a agenda — leva 1 segundo.</p>
              <button className="btn btn-primary" disabled={ocupado}
                      onClick={() => agir(`/api/publico/agendamentos/${ag.codigo}/confirmar`, {}, "Presença confirmada! Te esperamos 💈")}>✅ Confirmar presença</button>
            </div>
          )}
          {ag.podeCancelar && (
            <div className="bloco-acao">
              <h4>Precisa cancelar?</h4>
              <p className="campo-dica">Confirme o celular usado no agendamento.</p>
              <div className="linha-input">
                <input value={tel} inputMode="tel" placeholder="(31) 99999-9999" onChange={(e) => setTel(telefone(e.target.value))} />
                <input value={motivo} placeholder="Motivo (opcional)" onChange={(e) => setMotivo(e.target.value)} />
                <button className="btn btn-danger" disabled={ocupado || !tel}
                        onClick={() => agir(`/api/publico/agendamentos/${ag.codigo}/cancelar`, { telefone: tel, motivo }, "Agendamento cancelado. O horário foi liberado.")}>Cancelar</button>
              </div>
            </div>
          )}
          {ag.podeAvaliar && (
            <div className="bloco-acao">
              <h4>Como foi seu atendimento?</h4>
              <Estrelas nota={nota} onChange={setNota} tamanho={30} />
              <textarea value={comentario} maxLength={1000} placeholder="Conte pra gente (opcional)" onChange={(e) => setComentario(e.target.value)} />
              <button className="btn btn-primary" disabled={ocupado || !nota}
                      onClick={() => agir(`/api/publico/agendamentos/${ag.codigo}/avaliar`, { nota, comentario }, "Obrigado pela avaliação! 💈")}>Enviar avaliação</button>
            </div>
          )}
          {ag.nota && <p className="texto-ok">Sua avaliação: <Estrelas nota={ag.nota} tamanho={16} /></p>}
        </div>
      )}
    </div>
  );
}
