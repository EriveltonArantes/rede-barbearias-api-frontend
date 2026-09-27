import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AgendarOnline from './site/AgendarOnline.jsx';
import Privacidade from './site/Privacidade.jsx';
import SinaisEspera from './painel/SinaisEspera.jsx';
import { PainelCtx, permissoes } from './contexto.js';
import { ConfirmProvider } from './ui.jsx';

const resposta = (dados, status = 200) => Promise.resolve({ ok: status < 400, status, text: () => Promise.resolve(JSON.stringify(dados)) });

function proximoSabado() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const UNIDADE = { id: 1, nome: 'Rede Barbearias — Savassi', endereco: 'Rua A, 1', bairro: 'Savassi', horaAbertura: '08:00:00', horaFechamento: '20:00:00', diasFuncionamento: '1,2,3,4,5,6,7' };
const SERVICO = { id: 5, nome: 'Corte clássico', descricao: 'Tesoura e máquina', categoria: 'CORTE', preco: 50, duracaoMinutos: 30 };
const POLITICAS = { sinal: { ativo: true, valor: 10, fimDeSemana: true, quemFaltou: true, sempre: false, prazoMinutos: 60, devolucaoHoras: 24 }, esperaAtiva: true, emailPrivacidade: 'privacidade@barbearia.com', razaoSocial: 'Barbearia Teste Ltda' };

// Agendamento online: lista de espera quando o dia está lotado e sinal por Pix no fim de semana.
describe('Agendar online', () => {
  let chamadas;
  beforeEach(() => {
    chamadas = [];
    global.fetch = vi.fn((url, opts = {}) => {
      chamadas.push({ url, opts });
      if (url.includes('/api/publico/politicas')) return resposta(POLITICAS);
      if (url.includes('/api/publico/unidades')) return resposta([UNIDADE]);
      if (url.includes('/api/publico/servicos')) return resposta([SERVICO]);
      if (url.includes('/api/publico/barbeiros')) return resposta([]);
      if (url.includes('/api/publico/disponibilidade')) {
        return resposta(url.includes(proximoSabado()) ? [{ hora: '10:00', inicio: `${proximoSabado()}T10:00:00`, barbeiros: [] }] : []);
      }
      if (url.includes('/api/publico/lista-espera')) return resposta({ id: 9, posicao: 2, mensagem: 'Pronto! Você é o 2º da lista de espera.' }, 201);
      if (url.includes('/sinal')) return resposta({ payload: '00020126PIXDOSINAL', qrCodeBase64: 'data:image/png;base64,AAAA', valor: 10, recebedor: 'REDE BARBEARIAS' });
      if (url.endsWith('/api/publico/agendamentos') && opts.method === 'POST') {
        return resposta({ codigo: 'K7M2QX', clientePrimeiroNome: 'Ana', inicio: `${proximoSabado()}T10:00:00`, fim: `${proximoSabado()}T10:30:00`,
          servicoNome: 'Corte clássico', barbeiroNome: 'Rafa', unidadeNome: 'Savassi', unidadeEndereco: 'Rua A, 1',
          sinalValor: 10, sinalSituacao: 'PENDENTE', sinalExpiraEm: `${proximoSabado()}T09:00:00` }, 201);
      }
      return resposta([]);
    });
  });
  afterEach(() => { window.location.hash = ''; });

  test('dia sem horário oferece a lista de espera', async () => {
    render(<AgendarOnline />);
    fireEvent.click(await screen.findByText('Corte clássico'));
    fireEvent.click(await screen.findByText('Sem preferência'));
    expect(await screen.findByText(/Lista de espera —/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Souza' } });
    fireEvent.change(screen.getByLabelText('Celular (WhatsApp)'), { target: { value: '31988887777' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar na lista de espera' }));
    expect(await screen.findByText(/2º da lista de espera/)).toBeInTheDocument();
    const post = chamadas.find((c) => c.url.includes('/lista-espera'));
    expect(JSON.parse(post.opts.body)).toMatchObject({ unidadeId: 1, servicoId: 5, periodo: 'QUALQUER', telefone: '(31) 98888-7777' });
  });

  test('link da vaga abre no dia certo e o sábado pede sinal com Pix', async () => {
    window.location.hash = `#/agendar?unidade=1&servico=5&data=${proximoSabado()}`;
    render(<AgendarOnline />);
    fireEvent.click(await screen.findByRole('button', { name: '10:00' }));
    expect(screen.getByText(/sinal de/)).toHaveTextContent('R$ 10,00');
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Ana Souza' } });
    fireEvent.change(screen.getByPlaceholderText('(31) 99999-9999'), { target: { value: '31988887777' } });
    fireEvent.click(screen.getByLabelText(/Quero receber promoções/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar agendamento' }));
    expect(await screen.findByText(/Horário reservado/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Copiar código Pix' })).toBeInTheDocument();
    expect(screen.getByText('00020126PIXDOSINAL')).toBeInTheDocument();
    const post = chamadas.find((c) => c.url.endsWith('/api/publico/agendamentos'));
    expect(JSON.parse(post.opts.body).aceitaMarketing).toBe(true);
  });
});

describe('Privacidade', () => {
  test('mostra a empresa, o contato e os direitos', async () => {
    global.fetch = vi.fn(() => resposta(POLITICAS));
    render(<Privacidade />);
    expect(await screen.findByText('Barbearia Teste Ltda')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'privacidade@barbearia.com' })).toHaveAttribute('href', 'mailto:privacidade@barbearia.com');
    expect(screen.getByText('5. Seus direitos')).toBeInTheDocument();
  });
});

describe('Sinais e espera (painel)', () => {
  test('recepção confirma o Pix do sinal', async () => {
    const pendente = { id: 7, codigo: 'AB12CD', inicio: `${proximoSabado()}T10:00:00`, servicoNome: 'Corte', barbeiroNome: 'Rafa Tesoura',
      clienteNome: 'Bruno', clienteTelefone: '31988887777', sinalValor: 10, sinalSituacao: 'PENDENTE', status: 'AGENDADO', sinalAutomatico: false };
    let confirmado = false;
    global.fetch = vi.fn((url, opts = {}) => {
      if (url.includes('/sinal?acao=RECEBIDO')) { confirmado = true; return resposta({ ...pendente, sinalSituacao: 'PAGO' }); }
      if (url.includes('/api/agendamentos/sinais')) return resposta(confirmado ? [] : [pendente]);
      return resposta([]);
    });
    render(
      <PainelCtx.Provider value={{ perms: permissoes('RECEPCAO'), papel: 'RECEPCAO', unidades: [], unidadeId: '' }}>
        <ConfirmProvider><SinaisEspera /></ConfirmProvider>
      </PainelCtx.Provider>,
    );
    fireEvent.click(await screen.findByRole('button', { name: '💠 Recebi o Pix' }));
    expect(await screen.findByText(/Confirmar que o Pix de R\$ 10,00 de Bruno caiu na conta/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sinal recebido' }));
    await waitFor(() => expect(confirmado).toBe(true));
    expect(await screen.findByText('Nenhum sinal esperando pagamento.')).toBeInTheDocument();
  });
});
