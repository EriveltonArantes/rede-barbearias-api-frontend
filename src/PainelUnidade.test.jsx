import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from './Login.jsx';

describe('Login', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: false, status: 401, text: () => Promise.resolve(JSON.stringify({ erro: 'Usuário ou senha inválidos.' })),
    }));
  });

  test('mostra contas demo e o erro do servidor', async () => {
    render(<Login onLogin={() => {}} onVoltar={() => {}} />);
    expect(screen.getByText('Contas de demonstração')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Usuário, celular ou e-mail'), { target: { value: 'x' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: 'y' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByText('Usuário ou senha inválidos.')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/login'), expect.objectContaining({ method: 'POST' }));
  });

  test('alterna pra criação de conta de cliente', () => {
    render(<Login onLogin={() => {}} onVoltar={() => {}} />);
    fireEvent.click(screen.getByText('Sou cliente e ainda não tenho conta'));
    expect(screen.getByPlaceholderText('Nome completo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Celular com DDD')).toBeInTheDocument();
  });
});
