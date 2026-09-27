# 💈 Rede Barbearias — Frontend

Site institucional com **agendamento online** + **painel de gestão** por papel + **área do cliente**, para uma rede de barbearias com várias unidades.

**Demo:** https://rede-barbearias-api-frontend.vercel.app · **API:** [rede-barbearias-api](https://github.com/EriveltonArantes/rede-barbearias-api)

Contas demo (botões na tela de login): `admin/admin123`, `gerente/gerente123`, `recepcao/recepcao123`, `barbeiro/barbeiro123`, `cliente/cliente123`.

## Stack
React 18 · Vite · CSS próprio (gráficos em SVG, sem biblioteca) · Vitest + Testing Library

## Telas
- **Site**: cardápio de serviços com preços, equipe com avaliações, planos do clube, depoimentos reais, unidades com mapa.
- **Agendamento online** em etapas: unidade → serviço → barbeiro → dia/horário livre → dados + cupom → confirmação com código, Google Agenda e WhatsApp.
- **Meu horário**: consultar, cancelar e avaliar pelo código, sem login.
- **Painel** (menu muda conforme o papel):
  - Dashboard com KPIs do dia/mês, faturamento de 14 dias, ranking de barbeiros, horários de pico, aniversariantes e clientes sumidos.
  - Agenda em grade por barbeiro (linha do "agora", folgas, clique no vazio pra agendar), finalização com Pix/clube/fidelidade, lembretes do dia.
  - Agendamentos (filtros + CSV), clientes (ficha completa), PDV de produtos com leitor de código de barras, estoque.
  - Financeiro: resultado (DRE), caixa do dia imprimível, comissões exportáveis, despesas recorrentes.
  - Clube de assinatura, marketing (campanhas por WhatsApp + cupons), avaliações, equipe e folgas, unidades e serviços, usuários e auditoria, notificações automáticas (lembrete no dia e 1h antes, com botões Confirmo/Preciso cancelar) e atendimento automático no WhatsApp (boas-vindas, aviso fora do horário, PARAR/VOLTAR) com simulador da conversa. A página "meu horário" permite confirmar presença e pagar o sinal por Pix. Agendamento online com lista de espera (link do aviso já abre no dia certo), consentimento de promoções e política de privacidade (`#/privacidade`). Painel com "Sinais e espera" (recepção confere Pix, devolve sinal, vê a fila) e "Regras e automações"; área do cliente com baixar/excluir meus dados (LGPD).
- **Área do cliente**: meus horários, agendar, fidelidade e clube, meus dados.
- **Esqueci minha senha**: login por usuário, celular ou e-mail; código de 6 números no WhatsApp/e-mail; a recepção vê quem pediu e manda o código pelo WhatsApp em 1 clique.
- **Marca e aparência** (admin): nome, logo, cores (com paletas prontas e prévia ao vivo) e contatos — site, painel e app mudam juntos, sem rebuild.
- **App no celular (PWA)**: convite "Instalar" no Android/Chrome, passo a passo no iPhone, ícone e nome da barbearia, service worker (abre sem sinal).
- **Saúde do sistema** (admin): semáforo de verificações, banco, canais, rotinas automáticas, backup (baixar/enviar agora) e últimos alertas.

Responsivo (menu lateral vira gaveta no celular).

## Rodando
```bash
npm install
VITE_API_URL=http://localhost:8080 npm run dev
npm test
npm run build
```
Sem `VITE_API_URL`, usa a API publicada no Render.
