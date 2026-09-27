import React from "react";
import { useApi } from "../ui.jsx";
import { copiar, dataHora, moeda } from "../util.js";

/** Situação do sinal com texto pro cliente (página "meu horário" e confirmação do agendamento). */
export function SituacaoSinalCliente({ ag, regras }) {
  if (!ag?.sinalSituacao || ag.sinalSituacao === "EXPIRADO") return null;
  if (ag.sinalSituacao === "PENDENTE") return <SinalPix codigo={ag.codigo} valor={ag.sinalValor} expiraEm={ag.sinalExpiraEm} regras={regras} />;
  const textos = {
    PAGO: `✅ Sinal de ${moeda(ag.sinalValor)} recebido — ele é descontado do valor no dia.`,
    ABATIDO: `✅ Sinal de ${moeda(ag.sinalValor)} descontado no pagamento.`,
    A_DEVOLVER: `↩️ Seu sinal de ${moeda(ag.sinalValor)} vai ser devolvido pela barbearia no Pix.`,
    DEVOLVIDO: `↩️ Sinal de ${moeda(ag.sinalValor)} devolvido.`,
    RETIDO: `O sinal de ${moeda(ag.sinalValor)} ficou com a barbearia (cancelamento em cima da hora ou falta).`,
  };
  return <p className={"sinal-status " + (ag.sinalSituacao === "RETIDO" ? "texto-fraco" : "texto-ok")}>{textos[ag.sinalSituacao]}</p>;
}

/** Pix do sinal: QR Code + copia-e-cola + prazo. */
export default function SinalPix({ codigo, valor, expiraEm, regras }) {
  const pix = useApi(`/api/publico/agendamentos/${encodeURIComponent(codigo)}/sinal`);
  const [copiado, setCopiado] = React.useState(false);
  return (
    <div className="bloco-acao sinal-bloco">
      <h4>💠 Falta o sinal de {moeda(valor)} pra garantir seu horário</h4>
      <p className="campo-dica">
        Pague com Pix{expiraEm ? <> até <b>{dataHora(expiraEm)}</b></> : null}. O valor é <b>descontado no dia</b> do atendimento.
        {regras?.devolucaoHoras != null && <> Se precisar cancelar com pelo menos {regras.devolucaoHoras}h de antecedência, o sinal é devolvido; faltando sem avisar, ele fica com a barbearia.</>}
      </p>
      {pix.carregando ? <small className="texto-fraco">Gerando o Pix...</small> : pix.erro ? <p className="texto-erro">{pix.erro}</p> : (
        <div className="pix-box">
          <img className="pix-qr" src={pix.dados.qrCodeBase64} alt={"QR Code Pix do sinal de " + moeda(pix.dados.valor)} />
          <div className="pix-info">
            <b>{moeda(pix.dados.valor)}</b>
            {pix.dados.recebedor && <span>Recebedor: {pix.dados.recebedor}</span>}
            <code className="pix-copia">{pix.dados.payload}</code>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { copiar(pix.dados.payload); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}>
              {copiado ? "Copiado ✓" : "Copiar código Pix"}
            </button>
          </div>
        </div>
      )}
      <small className="texto-fraco">Depois de pagar, a confirmação aparece aqui na página “meu horário”.</small>
    </div>
  );
}
