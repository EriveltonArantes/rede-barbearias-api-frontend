import React from "react";
import { API, api, getSessao } from "../api.js";
import { Cabecalho, Estado, Pill, useAcao, useApi, useToast } from "../ui.jsx";
import { dataHora } from "../util.js";

const ICONE = { erro: "🔴", aviso: "🟠", info: "🔵", ok: "🟢" };

const TAREFAS = {
  lembretes: "Lembretes automáticos (a cada 5 min)",
  sinal: "Conferência do sinal por Pix",
  relacionamento: "Aniversário e retorno",
  clube: "Renovação do clube (3h)",
  "lista-espera": "Limpeza da lista de espera",
  banco: "Banco de dados (ronda de 5 min)",
  whatsapp: "Envios pelo WhatsApp",
  email: "Envios de e-mail",
  backup: "Backup semanal",
  "webhook-whatsapp": "Mensagens recebidas no WhatsApp",
  "webhook-pix": "Avisos de Pix pago",
  "recuperacao-senha": "Códigos de nova senha",
};

function quando(v) {
  return v ? dataHora(v) : "—";
}

function Linha({ rotulo, children }) {
  return <li><span>{rotulo}</span><span>{children}</span></li>;
}

/** Tudo em 10 segundos: está no ar, banco ok, WhatsApp/e-mail/Pix, rotinas, backup e alertas. */
export default function SaudeSistema() {
  const req = useApi("/api/sistema/saude");
  const [executar, ocupado] = useAcao();
  const avisar = useToast();
  const [resultado, setResultado] = React.useState(null);
  const [baixando, setBaixando] = React.useState(false);

  React.useEffect(() => {
    const t = setInterval(() => req.recarregar(), 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const testarAlerta = async () => {
    const r = await executar(() => api("/api/sistema/alerta-teste", { method: "POST" }));
    if (r) setResultado(["Teste de alerta", r.resultado]);
  };
  const enviarBackup = async () => {
    const r = await executar(() => api("/api/sistema/backup/enviar", { method: "POST" }));
    if (r) { setResultado(["Backup enviado agora", r.resultado]); req.recarregar(); }
  };
  const baixarBackup = async () => {
    setBaixando(true);
    try {
      const r = await fetch(API + "/api/sistema/backup", { headers: { Authorization: "Bearer " + getSessao()?.token } });
      if (!r.ok) throw new Error("Não consegui gerar o backup (erro " + r.status + ").");
      const nome = (r.headers.get("Content-Disposition") || "").match(/filename="?([^";]+)/)?.[1] || "backup.zip";
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url; a.download = nome;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      avisar("Backup baixado: " + nome);
    } catch (e) {
      avisar(e.message, "erro");
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div>
      <Cabecalho titulo="Saúde do sistema" sub="Se algo quebrar, aparece aqui primeiro — e chega no seu Telegram/e-mail se os alertas estiverem ligados.">
        <button className="btn btn-ghost" onClick={() => req.recarregar()}>↻ Atualizar</button>
      </Cabecalho>
      <Estado req={req}>
        {(s) => {
          const graves = s.verificacoes.filter((v) => v.nivel === "erro").length;
          const atencao = s.verificacoes.filter((v) => v.nivel === "aviso").length;
          return (
            <>
              <div className={"aviso-faixa " + (graves ? "ruim" : atencao ? "aviso" : "bom")} role="status">
                {graves ? `🔴 ${graves} problema(s) sério(s) precisam de atenção` : atencao ? `🟠 Tudo funcionando, com ${atencao} ponto(s) de atenção` : "🟢 Tudo certo por aqui"}
                {" · no ar há " + s.sistema.noArHa}
              </div>

              <section className="cartao">
                <h3>Verificações</h3>
                <div className="semaforo">
                  {s.verificacoes.map((v, i) => (
                    <div key={i} className={"semaforo-item " + v.nivel}>
                      <span className="semaforo-ico" aria-hidden="true">{ICONE[v.nivel]}</span>
                      <div><b>{v.titulo}</b><small>{v.detalhe}</small></div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="saude-grade">
                <section className="cartao">
                  <h3>🗄️ Banco de dados</h3>
                  <ul className="lista-chave-valor">
                    <Linha rotulo="Situação">{s.banco.ok ? <Pill tom="bom">respondendo</Pill> : <Pill tom="ruim">fora</Pill>}</Linha>
                    <Linha rotulo="Tipo">{s.banco.tipo || "—"}{s.banco.temporario && <> <Pill tom="ruim">temporário</Pill></>}</Linha>
                    <Linha rotulo="Tempo de resposta">{s.banco.latenciaMs != null ? s.banco.latenciaMs + " ms" : "—"}</Linha>
                    {s.banco.tamanhoMb != null && <Linha rotulo="Tamanho">{s.banco.tamanhoMb} MB</Linha>}
                    <Linha rotulo="Clientes">{s.banco.clientes ?? "—"}</Linha>
                    <Linha rotulo="Agendamentos">{s.banco.agendamentos ?? "—"}</Linha>
                  </ul>
                </section>

                <section className="cartao">
                  <h3>📨 Canais</h3>
                  <ul className="lista-chave-valor">
                    {[["whatsapp", "WhatsApp"], ["email", "E-mail"]].map(([k, nome]) => {
                      const c = s.canais[k];
                      return (
                        <Linha key={k} rotulo={nome}>
                          {c.configurado ? <><Pill tom={c.falhas24h > 0 ? "aviso" : "bom"}>ligado</Pill> {c.enviadas24h} enviadas / {c.falhas24h} falhas (24h)</> : <Pill>desligado</Pill>}
                        </Linha>
                      );
                    })}
                    <Linha rotulo="Pix">{s.canais.pix.configurado ? <Pill tom="bom">automático</Pill> : <Pill>manual</Pill>}</Linha>
                    <Linha rotulo="Senhas pendentes">{s.senhasPendentes > 0 ? <a href="#/painel/usuarios">{s.senhasPendentes} pedido(s)</a> : "nenhum"}</Linha>
                  </ul>
                </section>

                <section className="cartao">
                  <h3>💾 Backup</h3>
                  <ul className="lista-chave-valor">
                    <Linha rotulo="Destino automático">{s.backup.destinos.length ? s.backup.destinos.join(" e ") : <Pill tom="aviso">nenhum</Pill>}</Linha>
                    <Linha rotulo="Último envio">{s.backup.ultimo ? `${s.backup.ultimo.quando.replace("T", " ").slice(0, 16)} · ${s.backup.ultimo.tamanho}` : "ainda não rodou"}</Linha>
                  </ul>
                  <div className="acoes-linha" style={{ marginTop: 12 }}>
                    <button className="btn btn-primary btn-sm" onClick={baixarBackup} disabled={baixando}>{baixando ? "Gerando..." : "⬇️ Baixar backup agora"}</button>
                    {s.backup.destinos.length > 0 && <button className="btn btn-ghost btn-sm" onClick={enviarBackup} disabled={ocupado}>Enviar agora</button>}
                  </div>
                </section>

                <section className="cartao">
                  <h3>🔔 Alertas pra você</h3>
                  <ul className="lista-chave-valor">
                    <Linha rotulo="Telegram">{s.alertas.telegram ? <Pill tom="bom">ligado</Pill> : <Pill>desligado</Pill>}</Linha>
                    <Linha rotulo="E-mail">{s.alertas.email ? <Pill tom="bom">ligado</Pill> : <Pill>desligado</Pill>}</Linha>
                  </ul>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={testarAlerta} disabled={ocupado}>🧪 Mandar alerta de teste</button>
                </section>

                <section className="cartao">
                  <h3>🖥️ Servidor</h3>
                  <ul className="lista-chave-valor">
                    <Linha rotulo="Ligado desde">{quando(s.sistema.iniciadoEm)}</Linha>
                    <Linha rotulo="Memória">{s.sistema.memoriaMb} de {s.sistema.memoriaMaxMb} MB</Linha>
                    <Linha rotulo="Versão">{s.sistema.versao}</Linha>
                    <Linha rotulo="Site">{s.sistema.siteUrl}</Linha>
                  </ul>
                </section>
              </div>

              {resultado && (
                <section className="cartao" style={{ marginTop: 16 }}>
                  <h3>{resultado[0]}</h3>
                  <ul>{resultado[1].map((r, i) => <li key={i}>{r}</li>)}</ul>
                </section>
              )}

              <section className="cartao" style={{ marginTop: 16 }}>
                <h3>⚙️ Rotinas automáticas</h3>
                {!Object.keys(s.tarefas).length ? <p className="texto-fraco">As rotinas começam a rodar alguns minutos depois que o servidor liga.</p> : (
                  <div className="tabela-wrap">
                    <table className="tabela">
                      <thead><tr><th>Rotina</th><th>Última vez</th><th>Situação</th><th>Detalhe</th></tr></thead>
                      <tbody>{Object.entries(s.tarefas).map(([k, t]) => (
                        <tr key={k}>
                          <td>{TAREFAS[k] || k}</td>
                          <td>{quando(t.ultimaVez)}</td>
                          <td>{t.ok ? <Pill tom="bom">ok</Pill> : <Pill tom="ruim">{t.falhasSeguidas} falha(s)</Pill>}</td>
                          <td><small className="texto-fraco">{t.ok ? t.detalhe || "" : t.ultimoErro}</small></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="cartao" style={{ marginTop: 16 }}>
                <h3>🕑 Últimos alertas</h3>
                {!s.alertas.recentes.length ? <p className="texto-fraco">Nenhum alerta desde que o servidor ligou.</p> : (
                  <ul className="lista-simples">
                    {s.alertas.recentes.map((a, i) => (
                      <li key={i}><span><b>{a.titulo}</b><br /><small className="texto-fraco">{quando(a.quando)} · {a.entregue.length ? "enviado por " + a.entregue.join(" e ") : "não enviado (alertas desligados)"}{a.detalhe ? " · " + a.detalhe : ""}</small></span></li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          );
        }}
      </Estado>
    </div>
  );
}
