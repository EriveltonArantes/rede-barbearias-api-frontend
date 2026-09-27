import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from './Login.jsx';
import SaudeSistema from './painel/SaudeSistema.jsx';
import Usuarios from './painel/Usuarios.jsx';
import MarcaPagina from './painel/Marca.jsx';
import { MarcaProvider, misturar, unidadeCurta } from './marca.jsx';
import { PainelCtx, permissoes } from './contexto.js';
import { ToastProvider, ConfirmProvider } from './ui.jsx';

const resposta = (dados, status = 200) => Promise.resolve({ ok: status < 400, status, text: () => Promise.resolve(JSON.stringify(dados)), json: () => Promise.resolve(dados) });

function comPainel(ui, papel = 'ADMIN') {
  const sessao = { username: 'x', nome: 'X', papel, unidadeId: 1 };
  return (
    <ToastProvider><ConfirmProvider>
      <PainelCtx.Provider value={{ sessao, papel, perms: permissoes(papel), unidades: [], unidadeId: '', setUnidadeId: () => {}, irPara: () => {} }}>
        {ui}
      </PainelCtx.Provider>
    </ConfirmProvider></ToastProvider>
  );
}

describe('Esqueci minha senha', () => {
  let chamadas;
  beforeEach(() => {
    chamadas = [];
    global.fetch = vi.fn((url, opts = {}) => {
      chamadas.push([url, opts.body && JSON.parse(opts.body)]);
      if (url.includes('/esqueci-senha')) return resposta({ mensagem: 'Se encontrarmos esse cadastro, enviamos um código.' });
      if (url.includes('/redefinir-senha')) {
        const b = JSON.parse(opts.body);
        return b.codigo === '123456' ? resposta({ token: 't', username: 'rita', nome: 'Rita', papel: 'CLIENTE' })
          : resposta({ erro: 'Código incorreto. Você ainda tem 4 tentativas.' }, 400);
      }
      return resposta({});
    });
  });

  test('pede o código pelo celular, erra, acerta e já entra', async () => {
    const onLogin = vi.fn();
    render(<Login onLogin={onLogin} onVoltar={() => {}} />);
    fireEvent.click(screen.getByText('Esqueci minha senha'));
    fireEvent.change(screen.getByPlaceholderText('Usuário, celular ou e-mail'), { target: { value: '31 99999-8888' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('enviamos um código'));
    expect(chamadas[0][1]).toEqual({ login: '31 99999-8888' });

    fireEvent.change(screen.getByPlaceholderText('Código de 6 números'), { target: { value: '12a3-45 9' } });
    expect(screen.getByPlaceholderText('Código de 6 números')).toHaveValue('123459');
    fireEvent.change(screen.getByPlaceholderText('Nova senha (mínimo 6)'), { target: { value: 'nova123' } });
    fireEvent.change(screen.getByPlaceholderText('Repita a nova senha'), { target: { value: 'nova123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar senha e entrar' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('4 tentativas'));
    expect(onLogin).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('Código de 6 números'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar senha e entrar' }));
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(expect.objectContaining({ token: 't' })));
    expect(chamadas.at(-1)[1]).toEqual({ login: '31 99999-8888', codigo: '123456', novaSenha: 'nova123' });
  });

  test('senhas diferentes não chegam no servidor', async () => {
    render(<Login onLogin={() => {}} onVoltar={() => {}} />);
    fireEvent.click(screen.getByText('Esqueci minha senha'));
    fireEvent.click(screen.getByText('Já tenho um código'));
    fireEvent.change(screen.getByPlaceholderText('Usuário, celular ou e-mail'), { target: { value: 'rita' } });
    fireEvent.change(screen.getByPlaceholderText('Código de 6 números'), { target: { value: '123456' } });
    fireEvent.change(screen.getByPlaceholderText('Nova senha (mínimo 6)'), { target: { value: 'nova123' } });
    fireEvent.change(screen.getByPlaceholderText('Repita a nova senha'), { target: { value: 'outra12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar senha e entrar' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('não são iguais'));
    expect(chamadas.some(([u]) => u.includes('redefinir'))).toBe(false);
  });
});

describe('Recepção ajudando quem esqueceu a senha', () => {
  test('lista o pedido e gera o código com link do WhatsApp', async () => {
    global.fetch = vi.fn((url, opts = {}) => {
      if (url.includes('/recuperacoes-pendentes')) return resposta([{ usuarioId: 9, username: 'rita', nome: 'Rita Souza', papel: 'CLIENTE', telefone: '31999998888', pedidoEm: '2026-09-27T09:00:00', entreguePor: null, vencido: false }]);
      if (url.includes('/codigo-senha') && opts.method === 'POST') return resposta({ codigo: '654321', username: 'rita', telefone: '31999998888', mensagem: 'Seu código é *654321*', validoAte: '2026-09-28T09:00:00' });
      return resposta([]);
    });
    render(comPainel(<Usuarios />, 'RECEPCAO'));
    await waitFor(() => expect(screen.getByText('Rita Souza')).toBeInTheDocument());
    expect(screen.getByText(/nenhum envio automático/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar código' }));
    await waitFor(() => expect(screen.getByLabelText('Código')).toHaveTextContent('654321'));
    const link = screen.getByRole('link', { name: /Enviar pelo WhatsApp/ });
    expect(link.getAttribute('href')).toContain('wa.me/5531999998888');
    expect(decodeURIComponent(link.getAttribute('href'))).toContain('654321');
  });
});

describe('Saúde do sistema', () => {
  test('mostra o semáforo com o mais grave primeiro e baixa/envia backup', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/sistema/saude')) return resposta({
        sistema: { versao: 'abc1234', iniciadoEm: '2026-09-27T08:00:00', noArHa: '2h 10min', memoriaMb: 120, memoriaMaxMb: 384, siteUrl: 'https://site' },
        banco: { ok: true, tipo: 'H2', temporario: true, latenciaMs: 2, clientes: 600, agendamentos: 2800 },
        canais: { whatsapp: { configurado: false, enviadas24h: 0, falhas24h: 0 }, email: { configurado: true, enviadas24h: 12, falhas24h: 1 }, pix: { configurado: false } },
        tarefas: { lembretes: { ultimaVez: '2026-09-27T10:05:00', ok: true, falhasSeguidas: 0, detalhe: '{}' } },
        backup: { destinos: [], ultimo: null },
        alertas: { telegram: false, email: false, recentes: [] },
        senhasPendentes: 2,
        verificacoes: [
          { nivel: 'erro', titulo: 'Banco temporário (H2 em memória)', detalhe: 'Tudo some ao reiniciar' },
          { nivel: 'aviso', titulo: 'Alertas desligados', detalhe: 'Configure o Telegram' },
        ],
      });
      return resposta({});
    });
    render(comPainel(<SaudeSistema />));
    await waitFor(() => expect(screen.getByText('Banco temporário (H2 em memória)')).toBeInTheDocument());
    expect(screen.getByText(/1 problema\(s\) sério\(s\)/)).toBeInTheDocument();
    expect(screen.getByText('2 pedido(s)')).toBeInTheDocument();
    expect(screen.getByText('Lembretes automáticos (a cada 5 min)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Baixar backup agora/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar agora' })).toBeNull();
  });
});

describe('Marca', () => {
  test('cores derivadas e nome curto da unidade funcionam pra qualquer marca', () => {
    expect(misturar('#000000', 0.5)).toBe('#808080');
    expect(misturar('#ffffff', -0.5)).toBe('#808080');
    expect(unidadeCurta('Barbearia do Zé — Centro')).toBe('Centro');
    expect(unidadeCurta('Studio Único')).toBe('Studio Único');
  });

  test('admin troca nome e cores e o site inteiro recebe a marca nova', async () => {
    let salvo = null;
    global.fetch = vi.fn((url, opts = {}) => {
      if (url.includes('/api/configuracoes/marca') && opts.method === 'PUT') {
        salvo = JSON.parse(opts.body);
        return resposta({ ...salvo, id: 1 });
      }
      if (url.includes('/api/configuracoes/marca')) return resposta({ nome: 'Rede Barbearias', corPrincipal: '#d4a843', corDestaque: '#c0392b', emoji: '💈', whatsapp: '31999990000' });
      if (url.includes('/api/publico/marca')) return resposta(salvo ? { ...salvo, versao: '2' } : { nome: 'Rede Barbearias', corPrincipal: '#d4a843', corDestaque: '#c0392b' });
      return resposta({});
    });
    render(<MarcaProvider>{comPainel(<MarcaPagina />)}</MarcaProvider>);
    await waitFor(() => expect(screen.getByDisplayValue('Rede Barbearias')).toBeInTheDocument());
    expect(screen.getByDisplayValue('(31) 99999-0000')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('Rede Barbearias'), { target: { value: 'Barbearia do Zé' } });
    fireEvent.click(screen.getByText('Azul navalha'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar marca' }));
    await waitFor(() => expect(salvo).not.toBeNull());
    expect(salvo).toMatchObject({ nome: 'Barbearia do Zé', corPrincipal: '#4aa3ff', corDestaque: '#1d4ed8' });
    await waitFor(() => expect(document.title).toBe('Barbearia do Zé — Agende online'));
    expect(document.documentElement.style.getPropertyValue('--marca-1')).toBe('#4aa3ff');
    expect(document.head.querySelector('link[rel="manifest"]').getAttribute('href')).toContain('/api/publico/manifest.webmanifest?origem=');
  });
});
