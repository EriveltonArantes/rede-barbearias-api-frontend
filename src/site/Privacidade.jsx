import React from "react";
import { useApi } from "../ui.jsx";

/**
 * Política de privacidade (LGPD) em linguagem simples. Nome, CNPJ e contato vêm das
 * "Regras e automações" do painel; o resto descreve o que o sistema faz de fato.
 */
export default function Privacidade() {
  const p = useApi("/api/publico/politicas").dados || {};
  const empresa = p.razaoSocial || "Rede Barbearias";
  const contato = p.emailPrivacidade;
  return (
    <article className="privacidade">
      <p className="texto-fraco">Última atualização: setembro de 2026.</p>
      <p>
        Esta política explica quais dados a <b>{empresa}</b>{p.cnpj ? ` (CNPJ ${p.cnpj})` : ""} coleta quando você agenda,
        compra ou conversa com a gente, pra que usamos e como você pode ver, corrigir ou apagar tudo — como manda a
        Lei Geral de Proteção de Dados (Lei 13.709/2018).
      </p>

      <h3>1. Quais dados guardamos</h3>
      <ul>
        <li><b>Cadastro:</b> nome, celular, e-mail (opcional), data de nascimento (opcional) e suas preferências de corte.</li>
        <li><b>Atendimentos:</b> horários marcados, serviços, barbeiro, valores pagos, pontos de fidelidade, avaliações e sinal por Pix, quando houver.</li>
        <li><b>Mensagens:</b> quais avisos automáticos enviamos (confirmação, lembrete, avaliação) e as mensagens que você manda no nosso WhatsApp.</li>
        <li><b>Lista de espera:</b> dia e período que você queria, pra te avisar se abrir vaga.</li>
      </ul>

      <h3>2. Pra que usamos</h3>
      <ul>
        <li><b>Prestar o serviço</b> (execução de contrato): marcar, confirmar, lembrar e cancelar seu horário; receber o pagamento e o sinal; avisar vaga da lista de espera.</li>
        <li><b>Obrigações legais</b>: registros financeiros e fiscais.</li>
        <li><b>Promoções, cupom de aniversário e convite de retorno</b>: <u>só com o seu consentimento</u> (a caixinha no agendamento ou em “Meus dados”). Dá pra desligar quando quiser.</li>
      </ul>

      <h3>3. Com quem compartilhamos</h3>
      <p>Não vendemos seus dados. Eles passam só pelos serviços necessários pro sistema funcionar:</p>
      <ul>
        <li>WhatsApp (Meta) e o provedor de e-mail, pra entregar as mensagens;</li>
        <li>o banco/processador do Pix, quando você paga o sinal;</li>
        <li>a hospedagem do sistema e do banco de dados (servidores na nuvem).</li>
      </ul>

      <h3>4. Por quanto tempo</h3>
      <p>
        Enquanto você for nosso cliente. Pedindo a exclusão, apagamos nome, telefone, e-mail, nascimento, preferências e conversas.
        O histórico de atendimentos continua só como número (sem identificar você), porque a lei exige guardar os registros financeiros.
      </p>

      <h3>5. Seus direitos</h3>
      <ul>
        <li><b>Ver e baixar</b> tudo que temos sobre você;</li>
        <li><b>corrigir</b> dados errados;</li>
        <li><b>apagar</b> seus dados;</li>
        <li><b>parar de receber</b> promoções — ou qualquer mensagem automática no WhatsApp respondendo <b>PARAR</b>.</li>
      </ul>
      <p>
        Com login, faça tudo sozinho em <a href="#/minha-conta">Minha conta → Meus dados</a>.
        {contato ? <> Sem login, escreva pra <a href={"mailto:" + contato}>{contato}</a> ou fale com a unidade.</> : " Sem login, fale com a unidade."}
        {" "}Respondemos em até 15 dias.
      </p>

      <h3>6. Segurança</h3>
      <p>Acesso ao painel com senha e permissão por função (cada barbeiro vê só a própria agenda), conexão criptografada e registro de quem alterou o quê.</p>
    </article>
  );
}
