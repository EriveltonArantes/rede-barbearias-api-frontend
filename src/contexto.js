import React from "react";

/** Sessão do usuário logado + unidade selecionada no topo do painel. */
export const PainelCtx = React.createContext({
  sessao: null, papel: null, unidades: [], unidadeId: "", setUnidadeId: () => {}, irPara: () => {},
});
export const usePainel = () => React.useContext(PainelCtx);

/** Regras de tela por papel (o backend também valida tudo isso). */
export function permissoes(papel) {
  const admin = papel === "ADMIN";
  const gerente = papel === "GERENTE";
  const recepcao = papel === "RECEPCAO";
  const barbeiro = papel === "BARBEIRO";
  return {
    admin, gerente, recepcao, barbeiro,
    gestao: admin || gerente,
    equipe: admin || gerente || recepcao,
    excluir: admin,
    editarCadastrosRede: admin,
  };
}
