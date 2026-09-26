import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Notificacoes from './painel/Notificacoes.jsx';
import MeuHorario from './site/MeuHorario.jsx';
import { PainelCtx, permissoes } from './contexto.js';

const resposta = (dados) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(dados)) });

const CONFIG = {
  canais: [{ canal: 'WHATSAPP', configurado: false, descricao: 'Desligado' }],
  modelosWhatsApp: { lembrete_agendamento: 'Bom dia, {{1}}!' },
  botoesWhatsApp: { lembrete_agendamento: ['✅ Confirmo', '❌ Preciso cancelar'] },
  rodapeWhatsApp: 'Pra não receber mais mensagens, responda PARAR',
  horarios: { horaLembrete: 7, lembreteAntesMinutos: 60, avaliacaoAposMinutos: 90 },
  webhook: { url: 'https://api.teste/api/whatsapp/webhook', pronto: false, whatsappConfigurado: false, verifyTokenConfigurado: true, appSecretConfigurado: true },
};
const ATENDIMENTO = {
  respostaAutomatica: true, saudacao: 'Olá, {nome}! {link_agendar}', intervaloHoras: 12, mostrarProximoHorario: true,
  foraHorarioAtivo: true, mensagemForaHorario: 'Fechados, voltamos {abre}. {link_agendar}',
};
const CONVERSAS = [
  { id: 1, telefone: '5531997778899', nome: 'Renato', ultimaMensagem: 'PARAR', ultimaRecebidaEm: '2026-09-26T10:00:00', totalRecebidas: 2, optOut: true, ultimaAcao: '🚫 Pediu pra não receber mais mensagens' },
];

// Painel de notificações: lembrete 1h antes, botões do lembrete, simulador e quem pediu PARAR.
describe('Notificações', () => {
  let simulacoes;
  beforeEach(() => {
    simulacoes = [];
    global.fetch = vi.fn((url, opts = {}) => {
      if (url.includes('/atendimento/simular')) {
        const corpo = JSON.parse(opts.body);
        simulacoes.push(corpo);
        return corpo.texto === 'PARAR'
          ? resposta({ resposta: 'Pronto ✅ Você não vai mais receber mensagens automáticas por aqui.', acao: 'OPT_OUT', motivo: 'pediu pra parar' })
          : resposta({ resposta: 'Olá, João! https://site/#/agendar', acao: 'SAUDACAO', motivo: 'boas-vindas' });
      }
      if (url.includes('/atendimento/conversas')) return resposta(CONVERSAS);
      if (url.includes('/atendimento')) return resposta(ATENDIMENTO);
      if (url.includes('/configuracao')) return resposta(CONFIG);
      return resposta([]);
    });
  });

  const abrir = () => render(
    <PainelCtx.Provider value={{ perms: permissoes('ADMIN'), papel: 'ADMIN', unidades: [], unidadeId: '' }}>
      <Notificacoes />
    </PainelCtx.Provider>,
  );

  test('mostra o lembrete 1h antes, os botões do modelo e quem pediu pra parar', async () => {
    abrir();
    expect(await screen.findByText('1 hora antes')).toBeInTheDocument();
    expect(screen.getByText(/✅ Confirmo · ❌ Preciso cancelar/)).toBeInTheDocument();
    expect(await screen.findByText('não quer mensagens')).toBeInTheDocument();
    expect(screen.getByText('🚫 Pediu pra não receber mais mensagens')).toBeInTheDocument();
  });

  test('simulador mostra a resposta e testa o PARAR sem enviar nada', async () => {
    abrir();
    expect(await screen.findByText(/Olá, João!/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '🚫 PARAR' }));
    await waitFor(() => expect(screen.getByText(/não vai mais receber mensagens automáticas/)).toBeInTheDocument());
    expect(simulacoes.at(-1).texto).toBe('PARAR');
    expect(screen.getByText(/para de mandar mensagens automáticas/)).toBeInTheDocument();
  });
});

describe('Meu horário', () => {
  test('cliente confirma presença pelo site', async () => {
    const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 19);
    const base = { codigo: 'K7M2QX', status: 'AGENDADO', inicio: amanha, servicoNome: 'Corte', barbeiroNome: 'Rafa', duracaoMinutos: 30,
      unidadeNome: 'Savassi', unidadeEndereco: 'Rua X', valor: 50, desconto: 0, valorAPagar: 50, podeCancelar: true };
    global.fetch = vi.fn((url, opts = {}) => resposta(opts.method === 'POST' ? { ...base, status: 'CONFIRMADO' } : base));
    render(<MeuHorario codigoInicial="K7M2QX" />);
    fireEvent.click(await screen.findByRole('button', { name: '✅ Confirmar presença' }));
    await waitFor(() => expect(screen.getByText('Presença confirmada! Te esperamos 💈')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/K7M2QX/confirmar'), expect.objectContaining({ method: 'POST' }));
    expect(screen.queryByRole('button', { name: '✅ Confirmar presença' })).not.toBeInTheDocument();
  });
});
