import React from "react";
import { api, API } from "../api.js";
import { usePainel } from "../contexto.js";
import { Cabecalho, Campo, Grade, useAcao } from "../ui.jsx";
import { PAPEIS } from "../util.js";

export function TrocarSenha() {
  const [f, setF] = React.useState({ senhaAtual: "", novaSenha: "", confirmar: "" });
  const [executar, ocupado] = useAcao();
  const erro = f.confirmar && f.novaSenha !== f.confirmar ? "As senhas não conferem." : "";
  const salvar = async (e) => {
    e.preventDefault();
    if (erro) return;
    if (await executar(() => api("/api/auth/trocar-senha", { method: "POST", body: { senhaAtual: f.senhaAtual, novaSenha: f.novaSenha } }), "Senha alterada")) {
      setF({ senhaAtual: "", novaSenha: "", confirmar: "" });
    }
  };
  return (
    <form className="cartao" onSubmit={salvar}>
      <h3>🔑 Trocar senha</h3>
      <Grade>
        <Campo label="Senha atual" largo><input type="password" value={f.senhaAtual} onChange={(e) => setF({ ...f, senhaAtual: e.target.value })} required autoComplete="current-password" /></Campo>
        <Campo label="Nova senha"><input type="password" minLength={6} value={f.novaSenha} onChange={(e) => setF({ ...f, novaSenha: e.target.value })} required autoComplete="new-password" /></Campo>
        <Campo label="Repita a nova senha"><input type="password" value={f.confirmar} onChange={(e) => setF({ ...f, confirmar: e.target.value })} required autoComplete="new-password" /></Campo>
      </Grade>
      {erro && <p className="texto-erro">{erro}</p>}
      <button className="btn btn-primary" disabled={ocupado || !!erro}>Salvar nova senha</button>
    </form>
  );
}

export default function MinhaConta() {
  const { sessao } = usePainel();
  return (
    <div>
      <Cabecalho titulo="Minha conta" />
      <div className="dash-colunas">
        <div className="cartao">
          <h3>👤 {sessao.nome || sessao.username}</h3>
          <dl className="mini-dl">
            <dt>Usuário</dt><dd>{sessao.username}</dd>
            <dt>Papel</dt><dd>{PAPEIS[sessao.papel]}</dd>
            {sessao.unidadeNome && <><dt>Unidade</dt><dd>{sessao.unidadeNome}</dd></>}
          </dl>
          <p className="campo-dica">Documentação técnica da API (para integrações): <a href={API + "/swagger-ui.html"} target="_blank" rel="noreferrer">Swagger</a></p>
        </div>
        <TrocarSenha />
      </div>
    </div>
  );
}
