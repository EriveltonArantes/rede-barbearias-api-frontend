import { describe, test, expect } from 'vitest';
import { hojeISO, linkWhatsApp, moeda, somarDias, telefone, telefoneValido, diasLegiveis, linkGoogleAgenda } from './util.js';

// Utilitários que a agenda e o agendamento online usam em todo lugar.
describe('util', () => {
  test('máscara e validação de telefone', () => {
    expect(telefone('31988887777')).toBe('(31) 98888-7777');
    expect(telefone('3133334444')).toBe('(31) 3333-4444');
    expect(telefoneValido('(31) 98888-7777')).toBe(true);
    expect(telefoneValido('9888')).toBe(false);
  });

  test('datas locais sem virar UTC', () => {
    expect(somarDias('2026-02-28', 1)).toBe('2026-03-01');
    expect(somarDias('2026-01-01', -1)).toBe('2025-12-31');
    expect(hojeISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('link de WhatsApp com DDI e mensagem codificada', () => {
    expect(linkWhatsApp('(31) 98888-7777', 'Olá & até')).toBe('https://wa.me/5531988887777?text=Ol%C3%A1%20%26%20at%C3%A9');
    expect(linkWhatsApp('', 'x')).toBeNull();
  });

  test('moeda, dias e agenda', () => {
    expect(moeda(85).replace(/\s/g, ' ')).toBe('R$ 85,00');
    expect(diasLegiveis('1,2,3')).toBe('Seg, Ter, Qua');
    expect(linkGoogleAgenda({ titulo: 'Corte', inicio: '2026-10-01T10:00:00', fim: '2026-10-01T10:30:00' })).toContain('dates=20261001T100000%2F20261001T103000');
  });
});
