/**
 * Configuração da captação de iniciativas.
 * Ajuste este arquivo a cada trimestre — o restante da página não precisa mudar.
 */
window.CONFIG_CAPTACAO = {
  organizacao: 'Grupo Boticário',
  area: 'Produtos Digitais',

  ciclo: {
    // Trimestre que está sendo planejado.
    rotulo: 'Q4/2026',
    // Janela em que as áreas podem submeter (deixe vazio para ocultar o aviso de prazo).
    janelaInicio: '2026-09-01',
    janelaFim: '2026-09-30'
  },

  // Para onde a iniciativa é enviada ao clicar em "Enviar iniciativa".
  envio: {
    // Endpoint HTTP opcional (Power Automate, Apps Script, API interna...).
    // Quando preenchido, a página faz um POST com o JSON da iniciativa.
    endpoint: '',
    // Caixa de entrada que recebe a iniciativa quando não há endpoint configurado.
    email: 'produtosdigitais@grupoboticario.com.br'
  },

  // Produtos digitais oferecidos no formulário.
  produtos: ['Radar', 'Integra', 'Painel Único', 'Farol B2B'],

  // Link opcional com contexto adicional (página de intranet, guia de priorização...).
  linkApoio: {
    rotulo: '',
    url: ''
  }
};
