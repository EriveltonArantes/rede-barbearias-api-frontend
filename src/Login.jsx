import React from "react";
import { api } from "./api.js";
import { mensagemErro, telefone } from "./util.js";

const DEMOS = [
  ["admin", "admin123", "Administrador", "rede inteira"],
  ["gerente", "gerente123", "Gerente", "unidade Savassi"],
  ["recepcao", "recepcao123", "Recepção", "unidade Centro"],
  ["barbeiro", "barbeiro123", "Barbeiro", "agenda e comissão"],
  ["cliente", "cliente123", "Cliente", "pontos e horários"],
];

export default function Login({ onLogin, onVoltar }) {
  const [modo, setModo] = React.useState("login");
  const [f, setF] = React.useState({ username: "", password: "", nome: "", telefone: "", email: "" });
  const [erro, setErro] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: k === "telefone" ? telefone(e.target.value) : e.target.value });

  const enviar = async (e, cred) => {
    e?.preventDefault();
    if (enviando) return;
    setErro(""); setEnviando(true);
    try {
      const dados = cred || f;
      const r = modo === "login" || cred
        ? await api("/api/auth/login", { method: "POST", body: { username: dados.username, password: dados.password } })
        : await api("/api/auth/registrar", { method: "POST", body: { username: f.username, password: f.password, nome: f.nome, telefone: f.telefone, email: f.email || null } });
      onLogin(r);
    } catch (e2) {
      setErro(mensagemErro(e2));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login-screen">
      <button className="login-voltar-site" onClick={onVoltar}>← Voltar ao site</button>
      <div className="login-institucional">
        <div className="login-tema-icone">💈</div>
        <h1>Rede Barbearias</h1>
        <p className="login-slogan">Gestão completa da rede, na palma da mão</p>
        <ul className="login-features">
          <li>✓ Agenda por barbeiro com checagem de conflito</li>
          <li>✓ Agendamento online 24h com código de consulta</li>
          <li>✓ Caixa, comissões, despesas e lucro por unidade</li>
          <li>✓ Clube de assinatura, fidelidade e cupons</li>
          <li>✓ Estoque e PDV de produtos</li>
        </ul>
        <div className="demo-box">
          <b>Contas de demonstração</b>
          <div className="demo-grid">
            {DEMOS.map(([u, s, papel, desc]) => (
              <button key={u} type="button" className="demo-btn" disabled={enviando}
                      onClick={() => { setModo("login"); setF({ ...f, username: u, password: s }); enviar(null, { username: u, password: s }); }}>
                <b>{papel}</b><small>{desc}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="login-card">
        <h1>{modo === "login" ? "Entrar" : "Criar conta de cliente"}</h1>
        <p className="login-sub">{modo === "login" ? "Equipe e clientes usam o mesmo acesso" : "Acompanhe seus horários, pontos e o clube"}</p>
        <form onSubmit={enviar}>
          {modo === "registrar" && (
            <>
              <input placeholder="Nome completo" value={f.nome} onChange={set("nome")} autoComplete="name" required />
              <input placeholder="Celular com DDD" value={f.telefone} onChange={set("telefone")} inputMode="tel" autoComplete="tel" required />
              <input placeholder="E-mail (opcional)" type="email" value={f.email} onChange={set("email")} autoComplete="email" />
            </>
          )}
          <input placeholder="Usuário" value={f.username} onChange={set("username")} autoComplete="username" required />
          <input placeholder="Senha" type="password" value={f.password} onChange={set("password")}
                 autoComplete={modo === "login" ? "current-password" : "new-password"} minLength={modo === "login" ? undefined : 6} required />
          <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? "Aguarde..." : modo === "login" ? "Entrar" : "Criar conta"}</button>
        </form>
        {erro && <p className="login-erro">{erro}</p>}
        <button className="link-btn" onClick={() => { setModo(modo === "login" ? "registrar" : "login"); setErro(""); }}>
          {modo === "login" ? "Sou cliente e ainda não tenho conta" : "Já tenho conta"}
        </button>
      </div>
    </div>
  );
}
