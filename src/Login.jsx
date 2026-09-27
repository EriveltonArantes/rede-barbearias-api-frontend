import React from "react";
import { api } from "./api.js";
import { Logo, useMarca } from "./marca.jsx";
import { mensagemErro, telefone } from "./util.js";

const DEMOS = [
  ["admin", "admin123", "Administrador", "rede inteira"],
  ["gerente", "gerente123", "Gerente", "unidade Savassi"],
  ["recepcao", "recepcao123", "Recepção", "unidade Centro"],
  ["barbeiro", "barbeiro123", "Barbeiro", "agenda e comissão"],
  ["cliente", "cliente123", "Cliente", "pontos e horários"],
];

const TITULOS = {
  login: ["Entrar", "Use seu usuário, celular ou e-mail"],
  registrar: ["Criar conta de cliente", "Acompanhe seus horários, pontos e o clube"],
  esqueci: ["Esqueci minha senha", "Digite seu usuário, celular ou e-mail. Enviamos um código de 6 números pro WhatsApp e/ou e-mail cadastrado."],
  codigo: ["Criar nova senha", "Digite o código que você recebeu e escolha uma senha nova"],
};

export default function Login({ onLogin, onVoltar }) {
  const marca = useMarca();
  const [modo, setModo] = React.useState("login");
  const [f, setF] = React.useState({ username: "", password: "", nome: "", telefone: "", email: "", codigo: "", novaSenha: "", confirmar: "" });
  const [erro, setErro] = React.useState("");
  const [aviso, setAviso] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: k === "telefone" ? telefone(e.target.value) : k === "codigo" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value });
  const ir = (m) => { setModo(m); setErro(""); if (m !== "codigo") setAviso(""); };

  const enviar = async (e, cred) => {
    e?.preventDefault();
    if (enviando) return;
    setErro(""); setEnviando(true);
    try {
      if (cred || modo === "login") {
        const dados = cred || f;
        onLogin(await api("/api/auth/login", { method: "POST", body: { username: dados.username.trim(), password: dados.password } }));
      } else if (modo === "registrar") {
        onLogin(await api("/api/auth/registrar", { method: "POST", body: { username: f.username, password: f.password, nome: f.nome, telefone: f.telefone, email: f.email || null } }));
      } else if (modo === "esqueci") {
        const r = await api("/api/auth/esqueci-senha", { method: "POST", body: { login: f.username.trim() } });
        setAviso(r.mensagem);
        setModo("codigo");
      } else if (modo === "codigo") {
        if (f.novaSenha !== f.confirmar) throw new Error("As duas senhas não são iguais.");
        onLogin(await api("/api/auth/redefinir-senha", { method: "POST", body: { login: f.username.trim(), codigo: f.codigo, novaSenha: f.novaSenha } }));
      }
    } catch (e2) {
      setErro(mensagemErro(e2));
    } finally {
      setEnviando(false);
    }
  };

  const [titulo, sub] = TITULOS[modo];
  const rotuloBotao = { login: "Entrar", registrar: "Criar conta", esqueci: "Enviar código", codigo: "Salvar senha e entrar" }[modo];
  return (
    <div className="login-screen">
      <button className="login-voltar-site" onClick={onVoltar}>← Voltar ao site</button>
      <div className="login-institucional">
        {marca.logoUrl ? <div className="login-logo"><Logo mostrarNome={false} tamanho={84} /></div> : <div className="login-tema-icone">{marca.emoji || "💈"}</div>}
        <h1>{marca.nome}</h1>
        <p className="login-slogan">Gestão completa da barbearia, na palma da mão</p>
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
        <h1>{titulo}</h1>
        <p className="login-sub">{sub}</p>
        {modo === "codigo" && aviso && <p className="login-aviso" role="status">📨 {aviso}</p>}
        <form onSubmit={enviar}>
          {modo === "registrar" && (
            <>
              <input placeholder="Nome completo" value={f.nome} onChange={set("nome")} autoComplete="name" required />
              <input placeholder="Celular com DDD" value={f.telefone} onChange={set("telefone")} inputMode="tel" autoComplete="tel" required />
              <input placeholder="E-mail (opcional)" type="email" value={f.email} onChange={set("email")} autoComplete="email" />
            </>
          )}
          <input placeholder={modo === "registrar" ? "Usuário (pra entrar)" : "Usuário, celular ou e-mail"} aria-label="Usuário, celular ou e-mail"
                 value={f.username} onChange={set("username")} autoComplete="username" required />
          {(modo === "login" || modo === "registrar") && (
            <input placeholder="Senha" aria-label="Senha" type="password" value={f.password} onChange={set("password")}
                   autoComplete={modo === "login" ? "current-password" : "new-password"} minLength={modo === "login" ? undefined : 6} required />
          )}
          {modo === "codigo" && (
            <>
              <input placeholder="Código de 6 números" aria-label="Código" value={f.codigo} onChange={set("codigo")} inputMode="numeric"
                     autoComplete="one-time-code" className="input-codigo" required minLength={6} />
              <input placeholder="Nova senha (mínimo 6)" aria-label="Nova senha" type="password" value={f.novaSenha} onChange={set("novaSenha")} autoComplete="new-password" minLength={6} required />
              <input placeholder="Repita a nova senha" aria-label="Repita a nova senha" type="password" value={f.confirmar} onChange={set("confirmar")} autoComplete="new-password" minLength={6} required />
            </>
          )}
          <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? "Aguarde..." : rotuloBotao}</button>
        </form>
        {erro && <p className="login-erro" role="alert">{erro}</p>}
        {modo === "login" && <button className="link-btn" onClick={() => ir("esqueci")}>Esqueci minha senha</button>}
        {modo === "esqueci" && <button className="link-btn" onClick={() => ir("codigo")}>Já tenho um código</button>}
        {modo === "codigo" && <button className="link-btn" onClick={() => ir("esqueci")}>Não chegou? Pedir outro código</button>}
        {modo === "login" || modo === "registrar" ? (
          <button className="link-btn" onClick={() => ir(modo === "login" ? "registrar" : "login")}>
            {modo === "login" ? "Sou cliente e ainda não tenho conta" : "Já tenho conta"}
          </button>
        ) : (
          <button className="link-btn" onClick={() => ir("login")}>← Voltar pro login</button>
        )}
        {(modo === "esqueci" || modo === "codigo") && marca.whatsapp && (
          <p className="login-ajuda">Precisa de ajuda? <a href={`https://wa.me/55${marca.whatsapp.replace(/^55/, "")}?text=${encodeURIComponent("Olá! Esqueci minha senha do site, pode me mandar um código?")}`} target="_blank" rel="noreferrer">Fale com a barbearia no WhatsApp</a></p>
        )}
      </div>
    </div>
  );
}
