import React from "react";
import { api, qs } from "../api.js";
import { usePainel } from "../contexto.js";
import { Abas, Cabecalho, Campo, Estado, Grade, Modal, Pill, Vazio, useAcao, useApi, useConfirmar } from "../ui.jsx";
import { dataBR, linkWhatsApp, moeda, primeiroNome, telefone } from "../util.js";

function CupomForm({ cupom, onClose, onSalvo }) {
  const [tipo, setTipo] = React.useState(cupom?.valorFixo ? "valor" : "pct");
  const [f, setF] = React.useState({
    codigo: cupom?.codigo || "", descricao: cupom?.descricao || "", percentual: cupom?.percentual ?? "", valorFixo: cupom?.valorFixo ?? "",
    validoAte: cupom?.validoAte || "", limiteUsos: cupom?.limiteUsos ?? "", ativo: cupom?.ativo ?? true,
  });
  const [executar, ocupado] = useAcao();
  const salvar = async (e) => {
    e.preventDefault();
    const corpo = { ...f, percentual: tipo === "pct" ? Number(f.percentual) : null, valorFixo: tipo === "valor" ? Number(f.valorFixo) : null,
      validoAte: f.validoAte || null, limiteUsos: f.limiteUsos === "" ? null : Number(f.limiteUsos) };
    const r = await executar(() => api(cupom ? "/api/cupons/" + cupom.id : "/api/cupons", { method: cupom ? "PUT" : "POST", body: corpo }), "Cupom salvo");
    if (r) onSalvo();
  };
  return (
    <Modal titulo={cupom ? "Editar cupom" : "Novo cupom"} onClose={onClose}
           rodape={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" form="f-cupom" disabled={ocupado}>Salvar</button></>}>
      <form id="f-cupom" onSubmit={salvar}>
        <Grade>
          <Campo label="Código"><input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value.toUpperCase().replace(/\s/g, "") })} required placeholder="NIVER15" /></Campo>
          <Campo label="Tipo de desconto">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="pct">Percentual (%)</option><option value="valor">Valor fixo (R$)</option></select>
          </Campo>
          {tipo === "pct"
            ? <Campo label="Percentual"><input type="number" min="1" max="100" value={f.percentual} onChange={(e) => setF({ ...f, percentual: e.target.value })} required /></Campo>
            : <Campo label="Valor (R$)"><input type="number" min="1" step="0.5" value={f.valorFixo} onChange={(e) => setF({ ...f, valorFixo: e.target.value })} required /></Campo>}
          <Campo label="Válido até"><input type="date" value={f.validoAte} onChange={(e) => setF({ ...f, validoAte: e.target.value })} /></Campo>
          <Campo label="Limite de usos" dica="Vazio = ilimitado"><input type="number" min="1" value={f.limiteUsos} onChange={(e) => setF({ ...f, limiteUsos: e.target.value })} /></Campo>
          <Campo label="Descrição" largo><input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="Ex.: campanha dia dos pais" /></Campo>
          <label className="check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Ativo</label>
        </Grade>
      </form>
    </Modal>
  );
}

function Cupons() {
  const { perms } = usePainel();
  const req = useApi("/api/cupons");
  const [form, setForm] = React.useState(null);
  const confirmar = useConfirmar();
  const [executar] = useAcao();
  const excluir = async (c) => {
    if (!(await confirmar(`Excluir o cupom ${c.codigo}?`, { perigo: true, ok: "Excluir" }))) return;
    if (await executar(() => api("/api/cupons/" + c.id, { method: "DELETE" }), "Cupom excluído")) req.recarregar();
  };
  return (
    <>
      {perms.admin && <div className="acoes-linha direita"><button className="btn btn-primary" onClick={() => setForm({})}>+ Cupom</button></div>}
      <Estado req={req} vazio={<Vazio icone="🏷️" texto="Nenhum cupom criado." />}>
        {(l) => (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead><tr><th>Código</th><th>Desconto</th><th>Validade</th><th>Usos</th><th>Situação</th><th></th></tr></thead>
              <tbody>{l.map((c) => (
                <tr key={c.id}>
                  <td><b className="codigo-mini">{c.codigo}</b><br /><small className="texto-fraco">{c.descricao}</small></td>
                  <td>{c.percentual ? `${Number(c.percentual)}%` : moeda(c.valorFixo)}</td>
                  <td>{c.validoAte ? dataBR(c.validoAte) : "sem prazo"}</td>
                  <td>{c.usos}{c.limiteUsos ? ` / ${c.limiteUsos}` : ""}</td>
                  <td>{c.valido ? <Pill tom="bom">valendo</Pill> : <Pill tom="neutro">{c.ativo ? "expirado/esgotado" : "inativo"}</Pill>}</td>
                  <td className="acoes-celula">{perms.admin && <><button className="btn-icone" onClick={() => setForm(c)} title="Editar">✏️</button><button className="btn-icone" onClick={() => excluir(c)} title="Excluir">🗑️</button></>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Estado>
      {form && <CupomForm cupom={form.id ? form : null} onClose={() => setForm(null)} onSalvo={() => { setForm(null); req.recarregar(); }} />}
    </>
  );
}

/** Listas prontas pra disparo manual no WhatsApp (sem custo de API): aniversariantes, sumidos, perto do resgate. */
function Campanhas() {
  const { unidadeId } = usePainel();
  const dash = useApi("/api/dashboard/resumo" + qs({ unidadeId }));
  const clientes = useApi("/api/clientes");
  const [tipo, setTipo] = React.useState("sumidos");
  const [msg, setMsg] = React.useState({
    sumidos: "Oi, {nome}! Faz tempo que você não aparece 💈 Volta essa semana e ganha 10% com o cupom BEMVINDO10. Agende: {link}",
    aniversario: "Feliz aniversário, {nome}! 🎉 Seu presente: 15% de desconto no próximo corte com o cupom NIVER15. Agende: {link}",
    fidelidade: "Oi, {nome}! Você já tem {pontos} pontos no nosso programa de fidelidade — falta pouco pro seu corte grátis! 🎁 Agende: {link}",
  });
  const link = window.location.origin + "/#/agendar";
  const alvos = tipo === "sumidos" ? (dash.dados?.clientesSumidos || [])
    : tipo === "aniversario" ? (dash.dados?.aniversariantesMes || [])
    : (clientes.dados || []).filter((c) => c.pontos >= 7 && c.aceitaMarketing).slice(0, 40);
  const texto = (c) => msg[tipo].replace("{nome}", primeiroNome(c.nome)).replace("{link}", link).replace("{pontos}", c.pontos ?? "");
  return (
    <>
      <div className="filtros">
        {[["sumidos", "😴 Clientes sumidos"], ["aniversario", "🎂 Aniversariantes do mês"], ["fidelidade", "🎁 Perto do resgate"]].map(([k, r]) => (
          <button key={k} className={"chip" + (tipo === k ? " on" : "")} onClick={() => setTipo(k)}>{r}</button>
        ))}
      </div>
      <Campo label="Mensagem ({nome}, {link}, {pontos} são trocados automaticamente)" largo>
        <textarea value={msg[tipo]} onChange={(e) => setMsg({ ...msg, [tipo]: e.target.value })} />
      </Campo>
      {dash.carregando || clientes.carregando ? <Vazio texto="Carregando lista..." /> : !alvos.length ? <Vazio icone="🎉" texto="Ninguém nessa lista agora." /> : (
        <ul className="lista-simples campanha">
          {alvos.map((c) => (
            <li key={c.id}>
              <span><b>{c.nome}</b> <small className="texto-fraco">{telefone(c.telefone)}{c.diasSemVir ? ` · ${c.diasSemVir} dias sem vir` : ""}{c.dia ? ` · dia ${c.dia}` : ""}</small></span>
              <a className="btn btn-ghost btn-sm" target="_blank" rel="noreferrer" href={linkWhatsApp(c.telefone, texto(c))}>💬 Enviar</a>
            </li>
          ))}
        </ul>
      )}
      <p className="campo-dica">Os disparos abrem o WhatsApp com a mensagem pronta — sem custo de API e sem risco de bloqueio por envio em massa.</p>
    </>
  );
}

export default function Marketing() {
  const [aba, setAba] = React.useState("campanhas");
  return (
    <div>
      <Cabecalho titulo="Marketing" sub="Traga o cliente de volta e aumente a frequência" />
      <Abas abas={[["campanhas", "Campanhas no WhatsApp"], ["cupons", "Cupons de desconto"]]} atual={aba} onChange={setAba} />
      {aba === "campanhas" ? <Campanhas /> : <Cupons />}
    </div>
  );
}
