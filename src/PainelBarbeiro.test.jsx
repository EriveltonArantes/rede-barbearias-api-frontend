import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AgendarOnline from './site/AgendarOnline.jsx';

const unidades = [
  { id: 1, nome: 'Rede Barbearias — Savassi', endereco: 'Rua A, 1', bairro: 'Savassi', horaAbertura: '09:00:00', horaFechamento: '20:00:00', diasFuncionamento: '1,2,3,4,5,6,7' },
  { id: 2, nome: 'Rede Barbearias — Centro', endereco: 'Av B, 2', bairro: 'Centro', horaAbertura: '08:00:00', horaFechamento: '19:00:00', diasFuncionamento: '1,2,3,4,5,6' },
];
const servicos = [{ id: 7, nome: 'Corte Degradê', descricao: 'Na régua', categoria: 'CORTE', preco: 55, duracaoMinutos: 40 }];

function resposta(dados) {
  return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(dados)) });
}

describe('AgendarOnline', () => {
  beforeEach(() => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/publico/unidades')) return resposta(unidades);
      if (url.includes('/publico/servicos')) return resposta(servicos);
      if (url.includes('/publico/barbeiros')) return resposta([]);
      return resposta([]);
    });
  });

  test('lista as unidades e avança pro serviço com preço', async () => {
    render(<AgendarOnline />);
    await waitFor(() => expect(screen.getByText('Savassi')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Savassi'));
    await waitFor(() => expect(screen.getByText('Qual serviço?')).toBeInTheDocument());
    expect(screen.getByText('Corte Degradê')).toBeInTheDocument();
    expect(screen.getByText(/40 min/)).toBeInTheDocument();
  });
});
