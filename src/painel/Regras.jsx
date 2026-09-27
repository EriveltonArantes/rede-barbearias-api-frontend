import React from "react";
import { api } from "../api.js";
import { usePainel } from "../contexto.js";
import { Cabecalho, Campo, Estado, Pill, useAcao, useApi } from "../ui.jsx";
import { moeda } from "../util.js";

function Liga({ valor, onChange, children, disabled }) {
  return (
    <label className="check-linha">
      <input type="checkbox" checked={!!valor} disabled={disabled} onChange={(e) => onChange(e.target.checked)} /> {children}
    </label>
  );
}

/** Regras da rede: sinal por Pix, lista de espera, aniversário/retorno e dados da política de privacidade. */
export default function Regras() {
  const { perms } = usePainel();
  const req = useApi("/api/configuracoes/rede");
  const [f, setF] = React.useState(null);
  const [executar, ocupado] = useAcao();
  const [rodada, setRodada] = React.useState(null);
  React.useEffect(() => { if (req.dados) setF(req.dados.regras); }, [req.dados]);
  const pode = perms.admin;
  const set = (campo) => (v) => setF((x) => ({ ...x, [campo]: v }));
  const num = (campo) => (e) => set(campo)(e.target.value);

  const salvar = async (e) => {
    e.preventDefault();
    const r = await executar(() => api("/api/configuracoes/rede", { method: "PUT", body: f }), "Regras salvas");
    if (r) setF(r);
  };
  const rodarAgora = async () => {
    const r = await executar(() => api("/api/configuracoes/rede/rodar-relacionamento", { method: "POST" }));
    if (r) setRodada(r);
  };

  return (
    <div>
      <Cabecalho titulo="Regras e automações" sub="Sinal por Pix, lista de espera, aniversário, convite de retorno e privacidade" />
      <Estado req={req}>
        {(d) => f && (
          <form onSubmit={salvar} className="regras">
            <section className="cartao">
              <h3>💠 Sinal por Pix <small className="texto-fraco">— reduz falta</small></h3>
              <p className="texto-fraco">Vale só pro agendamento online (site/app). O sinal é descontado no dia; cancelando com antecedência, volta pro cliente; falta ou cancelamento em cima da hora, fica com a barbearia (e entra no financeiro).</p>
              <Liga valor={f.sinalAtivo} onChange={set("sinalAtivo")} disabled={!pode}>Pedir sinal no agendamento online</Liga>
              {f.sinalAtivo && <>
                <div className="form-grade">
                  <Campo label="Valor do sinal (R$)"><input type="number" min="1" step="0.5" value={f.sinalValor} disabled={!pode} onChange={num("sinalValor")} /></Campo>
                  <Campo label="Prazo pra pagar (minutos)"><input type="number" min="10" value={f.sinalPrazoMinutos} disabled={!pode} onChange={num("sinalPrazoMinutos")} /></Campo>
                  <Campo label="Devolve se cancelar com pelo menos (horas)"><input type="number" min="0" value={f.sinalDevolucaoHoras} disabled={!pode} onChange={num("sinalDevolucaoHoras")} /></Campo>
                </div>
                <b className="rotulo-bloco">Quando pedir</b>
                <Liga valor={f.sinalFimDeSemana} onChange={set("sinalFimDeSemana")} disabled={!pode || f.sinalSempre}>Sábado e domingo</Liga>
                <Liga valor={f.sinalQuemFaltou} onChange={set("sinalQuemFaltou")} disabled={!pode || f.sinalSempre}>Cliente que faltou sem avisar nos últimos 6 meses</Liga>
                <Liga valor={f.sinalSempre} onChange={set("sinalSempre")} disabled={!pode}>Sempre (todo agendamento online)</Liga>
                <div className={"aviso-faixa " + (d.gatewayPix ? "bom" : "aviso")}>
                  {d.gatewayPix
                    ? <>✅ Confirmação automática ligada ({d.gatewayPix}): o horário fica garantido assim que o Pix cai.</>
                    : <>ℹ️ Pix estático com a chave da unidade: a recepção confere no banco e clica em “Recebi o Pix” (tela <a href="#/painel/sinais">Sinais e espera</a>).
                        Pra confirmar sozinho, crie uma conta no Mercado Pago e coloque <code>MERCADOPAGO_ACCESS_TOKEN</code> no Render.</>}
                </div>
                <Liga valor={f.sinalCancelarSemPagamento} onChange={set("sinalCancelarSemPagamento")} disabled={!pode}>
                  Sem pagamento no prazo, cancelar sozinho e liberar o horário {!d.gatewayPix && <Pill tom="aviso">só recomendado com confirmação automática</Pill>}
                </Liga>
              </>}
            </section>

            <section className="cartao">
              <h3>⏳ Lista de espera</h3>
              <Liga valor={f.esperaAtiva} onChange={set("esperaAtiva")} disabled={!pode}>Oferecer lista de espera no agendamento online</Liga>
              {f.esperaAtiva && (
                <div className="form-grade">
                  <Campo label="Quando alguém cancela, avisar quantos da fila" dica="Todos recebem juntos; quem agendar primeiro leva.">
                    <input type="number" min="1" max="20" value={f.esperaAvisarQuantos} disabled={!pode} onChange={num("esperaAvisarQuantos")} />
                  </Campo>
                </div>
              )}
            </section>

            <section className="cartao">
              <h3>🎉 Aniversário e 👋 convite de retorno</h3>
              <p className="texto-fraco">Saem sozinhos, uma vez, só pra quem aceitou receber promoções (e não respondeu PARAR). Cada cliente ganha um cupom pessoal de uso único.</p>
              <Liga valor={f.aniversarioAtivo} onChange={set("aniversarioAtivo")} disabled={!pode}>Parabéns no dia do aniversário, com cupom</Liga>
              {f.aniversarioAtivo && (
                <div className="form-grade">
                  <Campo label="Desconto (%)"><input type="number" min="1" max="100" value={f.aniversarioDesconto} disabled={!pode} onChange={num("aniversarioDesconto")} /></Campo>
                  <Campo label="Cupom vale por (dias)"><input type="number" min="1" max="90" value={f.aniversarioValidadeDias} disabled={!pode} onChange={num("aniversarioValidadeDias")} /></Campo>
                </div>
              )}
              <Liga valor={f.retornoAtivo} onChange={set("retornoAtivo")} disabled={!pode}>“Bora voltar?” pra quem sumiu e não tem horário marcado</Liga>
              {f.retornoAtivo && (
                <div className="form-grade">
                  <Campo label="Depois de quantos dias sem vir"><input type="number" min="7" max="365" value={f.retornoDias} disabled={!pode} onChange={num("retornoDias")} /></Campo>
                  <Campo label="Desconto (%) — 0 = sem cupom"><input type="number" min="0" max="100" value={f.retornoDesconto} disabled={!pode} onChange={num("retornoDesconto")} /></Campo>
                  <Campo label="Cupom vale por (dias)"><input type="number" min="1" max="90" value={f.retornoValidadeDias} disabled={!pode} onChange={num("retornoValidadeDias")} /></Campo>
                </div>
              )}
              <div className="form-grade">
                <Campo label="Horário de envio (a partir das)"><input type="number" min="7" max="21" value={f.horaMensagens} disabled={!pode} onChange={num("horaMensagens")} /></Campo>
              </div>
              {pode && <div className="acoes-linha">
                <button type="button" className="btn btn-ghost btn-sm" disabled={ocupado} onClick={rodarAgora}>▶️ Rodar agora</button>
                {rodada && <small className="texto-fraco">Enviados agora: {rodada.aniversarios} aniversário(s), {rodada.retornos} convite(s) de retorno.</small>}
              </div>}
            </section>

            <section className="cartao">
              <h3>🔒 Privacidade (LGPD)</h3>
              <p className="texto-fraco">Aparece na <a href="#/privacidade" target="_blank" rel="noreferrer">política de privacidade</a> do site. Pedidos de acesso ou exclusão chegam nesse e-mail; na ficha do cliente dá pra baixar os dados ou anonimizar.</p>
              <div className="form-grade">
                <Campo label="Razão social"><input value={f.razaoSocial || ""} disabled={!pode} onChange={(e) => set("razaoSocial")(e.target.value)} /></Campo>
                <Campo label="CNPJ"><input value={f.cnpj || ""} disabled={!pode} onChange={(e) => set("cnpj")(e.target.value)} /></Campo>
                <Campo label="E-mail pra pedidos de privacidade"><input type="email" value={f.emailPrivacidade || ""} disabled={!pode} onChange={(e) => set("emailPrivacidade")(e.target.value)} /></Campo>
              </div>
            </section>

            {pode ? <button className="btn btn-primary btn-lg" disabled={ocupado}>{ocupado ? "Salvando..." : "Salvar regras"}</button>
              : <p className="texto-fraco">Só o administrador altera as regras.</p>}
            {f.sinalAtivo && <p className="texto-fraco">Exemplo: corte de {moeda(50)} num sábado → cliente paga {moeda(f.sinalValor)} agora e {moeda(Math.max(0, 50 - Number(f.sinalValor)))} no dia.</p>}
          </form>
        )}
      </Estado>
    </div>
  );
}
