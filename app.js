(function () {
  'use strict';

  var STORAGE_KEY = 'iniciativas.v1';
  var DRAFT_KEY = 'iniciativas.rascunho.v1';

  var PADRAO = {
    organizacao: 'Grupo Boticário',
    area: 'Produtos Digitais',
    ciclo: { rotulo: '', janelaInicio: '', janelaFim: '' },
    envio: { endpoint: '', email: '' },
    produtos: ['Radar', 'Integra', 'Painel Único', 'Farol B2B'],
    linkApoio: { rotulo: '', url: '' }
  };

  var config = (function () {
    var bruto = window.CONFIG_CAPTACAO || {};
    return {
      organizacao: bruto.organizacao || PADRAO.organizacao,
      area: bruto.area || PADRAO.area,
      ciclo: Object.assign({}, PADRAO.ciclo, bruto.ciclo),
      envio: Object.assign({}, PADRAO.envio, bruto.envio),
      produtos: Array.isArray(bruto.produtos) && bruto.produtos.length ? bruto.produtos : PADRAO.produtos,
      linkApoio: Object.assign({}, PADRAO.linkApoio, bruto.linkApoio)
    };
  })();

  // Ordem usada na exibição dos detalhes e nas exportações.
  var CAMPOS = [
    { nome: 'trimestre', rotulo: 'Trimestre de referência' },
    { nome: 'areaSolicitante', rotulo: 'Área solicitante' },
    { nome: 'nome', rotulo: 'Nome da iniciativa' },
    { nome: 'produto', rotulo: 'Produto digital' },
    { nome: 'objetivo', rotulo: 'Objetivo desta iniciativa' },
    { nome: 'problema', rotulo: 'Problema de negócio que resolve' },
    { nome: 'impacto', rotulo: 'Impacto no negócio' },
    { nome: 'metrica', rotulo: 'Métrica de sucesso (alvo)' },
    { nome: 'importancia', rotulo: 'Por que é importante para a área' },
    { nome: 'deadline', rotulo: 'Deadline limite para subida' },
    { nome: 'responsavelNegocio', rotulo: 'Responsável (negócio)' },
    { nome: 'pmResponsavel', rotulo: 'PM do produto digital' },
    { nome: 'iniciativaNova', rotulo: 'Iniciativa nova?' },
    { nome: 'carryOver', rotulo: 'Carry over?' },
    { nome: 'alinhadoTech', rotulo: 'Alinhado previamente com Tech?' }
  ];

  var CAMPOS_TEXTO = [
    'areaSolicitante', 'nome', 'produtoOutro', 'objetivo', 'problema', 'impacto',
    'metrica', 'importancia', 'deadline', 'responsavelNegocio', 'pmResponsavel'
  ];

  var CAMPOS_ESCOLHA = ['iniciativaNova', 'carryOver', 'alinhadoTech'];

  var MIN_TEXTO_LONGO = 15;

  var STATUS = {
    enviada: { rotulo: 'Enviada', classe: 'enviada' },
    aguardando: { rotulo: 'Aguardando confirmação de envio', classe: 'aguardando' },
    registrada: { rotulo: 'Não enviada', classe: 'registrada' }
  };

  var MESES_TRIMESTRE = ['jan–mar', 'abr–jun', 'jul–set', 'out–dez'];

  var form = document.getElementById('form-iniciativa');
  var selectProduto = document.getElementById('produto');
  var selectTrimestre = document.getElementById('trimestre');
  var wrapperProdutoOutro = document.getElementById('wrapperProdutoOutro');
  var inputProdutoOutro = document.getElementById('produtoOutro');
  var resumoErros = document.getElementById('resumoErros');
  var notaEnvio = document.getElementById('notaEnvio');
  var btnLimpar = document.getElementById('btnLimpar');
  var btnCancelarEdicao = document.getElementById('btnCancelarEdicao');
  var btnCopiarResumo = document.getElementById('btnCopiarResumo');
  var btnCompartilhar = document.getElementById('btnCompartilhar');
  var btnSalvar = document.getElementById('btnSalvar');
  var lista = document.getElementById('lista');
  var listaVazia = document.getElementById('listaVazia');
  var contadorLista = document.getElementById('contadorLista');
  var contadorNav = document.getElementById('contadorNav');
  var busca = document.getElementById('busca');
  var toast = document.getElementById('toast');

  var iniciativas = carregar();
  var edicaoId = null;
  var toastTimer = null;

  /* ---------------- Armazenamento ---------------- */

  function carregar() {
    try {
      var bruto = localStorage.getItem(STORAGE_KEY);
      var dados = bruto ? JSON.parse(bruto) : [];
      return Array.isArray(dados) ? dados : [];
    } catch (erro) {
      return [];
    }
  }

  function persistir() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(iniciativas));
      return true;
    } catch (erro) {
      mostrarToast('Não foi possível salvar neste navegador. Exporte os dados.');
      return false;
    }
  }

  function salvarRascunho() {
    if (edicaoId) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(lerFormulario()));
    } catch (erro) {
      /* rascunho é best-effort */
    }
  }

  function limparRascunho() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (erro) {
      /* ignora */
    }
  }

  function restaurarRascunho() {
    var bruto;
    try {
      bruto = localStorage.getItem(DRAFT_KEY);
    } catch (erro) {
      return;
    }
    if (!bruto) return;
    try {
      preencherFormulario(JSON.parse(bruto));
    } catch (erro) {
      limparRascunho();
    }
  }

  /* ---------------- Datas e ciclo ---------------- */

  function hojeIso() {
    var hoje = new Date();
    return hoje.getFullYear() + '-' +
      String(hoje.getMonth() + 1).padStart(2, '0') + '-' +
      String(hoje.getDate()).padStart(2, '0');
  }

  function formatarData(iso) {
    if (!iso) return '—';
    var partes = iso.split('-');
    if (partes.length !== 3) return iso;
    return partes[2] + '/' + partes[1] + '/' + partes[0];
  }

  function formatarRegistro(iso) {
    var data = new Date(iso);
    if (isNaN(data.getTime())) return '';
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function diferencaEmDias(deIso, ateIso) {
    var de = new Date(deIso + 'T00:00:00');
    var ate = new Date(ateIso + 'T00:00:00');
    return Math.round((ate - de) / 86400000);
  }

  function estaVencida(iso) {
    return Boolean(iso) && iso < hojeIso();
  }

  function rotuloTrimestre(ano, trimestre) {
    return 'Q' + trimestre + '/' + ano;
  }

  function descricaoTrimestre(rotulo) {
    var partes = /^Q([1-4])\/(\d{4})$/.exec(rotulo);
    if (!partes) return rotulo;
    return rotulo + ' (' + MESES_TRIMESTRE[Number(partes[1]) - 1] + ')';
  }

  function trimestresDisponiveis() {
    var hoje = new Date();
    var ano = hoje.getFullYear();
    var trimestre = Math.floor(hoje.getMonth() / 3) + 1;
    var opcoes = [];

    for (var i = 0; i < 4; i += 1) {
      opcoes.push(rotuloTrimestre(ano, trimestre));
      trimestre += 1;
      if (trimestre > 4) {
        trimestre = 1;
        ano += 1;
      }
    }

    if (config.ciclo.rotulo && opcoes.indexOf(config.ciclo.rotulo) === -1) {
      opcoes.unshift(config.ciclo.rotulo);
    }
    return opcoes;
  }

  function trimestrePadrao() {
    var opcoes = trimestresDisponiveis();
    if (config.ciclo.rotulo) return config.ciclo.rotulo;
    // Sem ciclo configurado, a captação vale para o trimestre seguinte ao atual.
    return opcoes[1] || opcoes[0];
  }

  function situacaoJanela() {
    var inicio = config.ciclo.janelaInicio;
    var fim = config.ciclo.janelaFim;
    if (!inicio && !fim) return null;

    var hoje = hojeIso();
    if (inicio && hoje < inicio) {
      return {
        estado: 'futura',
        status: 'Captação ainda não começou',
        texto: 'A janela abre em ' + formatarData(inicio) + ' e vai até ' + formatarData(fim) + '.'
      };
    }
    if (fim && hoje > fim) {
      return {
        estado: 'encerrada',
        status: 'Captação encerrada',
        texto: 'A janela terminou em ' + formatarData(fim) + '. Envios agora entram no ciclo seguinte.'
      };
    }

    var restantes = fim ? diferencaEmDias(hoje, fim) : null;
    var texto = 'Envie sua iniciativa até ' + formatarData(fim) + '.';
    if (restantes === 0) texto = 'Hoje é o último dia para enviar (' + formatarData(fim) + ').';
    else if (restantes !== null) texto = 'Faltam ' + restantes + ' dia' + (restantes > 1 ? 's' : '') + ' — envie até ' + formatarData(fim) + '.';

    return {
      estado: restantes !== null && restantes <= 7 ? 'alerta' : 'aberta',
      status: 'Captação aberta',
      texto: texto
    };
  }

  /* ---------------- Formulário ---------------- */

  function lerFormulario() {
    var dados = {};
    CAMPOS_TEXTO.forEach(function (campo) {
      var el = form.elements[campo];
      dados[campo] = el ? el.value.trim() : '';
    });
    dados.produto = selectProduto.value;
    dados.trimestre = selectTrimestre.value;
    CAMPOS_ESCOLHA.forEach(function (campo) {
      var marcado = form.querySelector('input[name="' + campo + '"]:checked');
      dados[campo] = marcado ? marcado.value : '';
    });
    return dados;
  }

  function preencherFormulario(dados) {
    CAMPOS_TEXTO.forEach(function (campo) {
      var el = form.elements[campo];
      if (el) el.value = dados[campo] || '';
    });
    selectProduto.value = dados.produto || '';
    if (dados.trimestre) {
      // Registros de ciclos antigos podem citar um trimestre fora da lista atual.
      if (!selectTrimestre.querySelector('option[value="' + dados.trimestre + '"]')) {
        var opcao = document.createElement('option');
        opcao.value = dados.trimestre;
        opcao.textContent = descricaoTrimestre(dados.trimestre);
        selectTrimestre.insertBefore(opcao, selectTrimestre.firstChild);
      }
      selectTrimestre.value = dados.trimestre;
    }
    CAMPOS_ESCOLHA.forEach(function (campo) {
      var opcao = form.querySelector('input[name="' + campo + '"][value="' + (dados[campo] || '') + '"]');
      if (opcao) opcao.checked = true;
    });
    alternarProdutoOutro();
    atualizarContadores();
  }

  function alternarProdutoOutro() {
    var ehOutro = selectProduto.value === 'Outro';
    wrapperProdutoOutro.classList.toggle('is-hidden', !ehOutro);
    if (!ehOutro) {
      inputProdutoOutro.value = '';
      limparErro('produtoOutro');
    }
  }

  function nomeProduto(dados) {
    if (dados.produto === 'Outro') {
      return dados.produtoOutro ? dados.produtoOutro : 'Outro';
    }
    return dados.produto;
  }

  /* ---------------- Validação ---------------- */

  function validar(dados) {
    var erros = {};

    if (!dados.trimestre) {
      erros.trimestre = 'Selecione o trimestre de referência.';
    }

    if (!dados.areaSolicitante) {
      erros.areaSolicitante = 'Informe a área que está solicitando.';
    }

    if (!dados.nome) {
      erros.nome = 'Informe o nome da iniciativa.';
    } else if (dados.nome.length < 3) {
      erros.nome = 'O nome precisa ter pelo menos 3 caracteres.';
    }

    if (!dados.produto) {
      erros.produto = 'Selecione o produto digital.';
    }

    if (dados.produto === 'Outro' && !dados.produtoOutro) {
      erros.produtoOutro = 'Informe qual é o produto digital.';
    }

    [
      { campo: 'objetivo', rotulo: 'o objetivo da iniciativa' },
      { campo: 'problema', rotulo: 'o problema de negócio' },
      { campo: 'impacto', rotulo: 'o impacto no negócio' },
      { campo: 'importancia', rotulo: 'a importância para a sua área' }
    ].forEach(function (item) {
      if (!dados[item.campo]) {
        erros[item.campo] = 'Descreva ' + item.rotulo + '.';
      } else if (dados[item.campo].length < MIN_TEXTO_LONGO) {
        erros[item.campo] = 'Detalhe um pouco mais (mínimo de ' + MIN_TEXTO_LONGO + ' caracteres).';
      }
    });

    if (!dados.metrica) {
      erros.metrica = 'Informe a métrica de sucesso e o alvo esperado.';
    }

    if (!dados.deadline) {
      erros.deadline = 'Informe a data limite para subida.';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.deadline)) {
      erros.deadline = 'Use uma data válida.';
    } else if (!edicaoId && dados.deadline < hojeIso()) {
      erros.deadline = 'A data limite não pode estar no passado.';
    }

    if (!dados.responsavelNegocio) {
      erros.responsavelNegocio = 'Informe a pessoa responsável do negócio.';
    }

    if (!dados.pmResponsavel) {
      erros.pmResponsavel = 'Informe o PM responsável pelo produto digital.';
    }

    if (!dados.iniciativaNova) {
      erros.iniciativaNova = 'Selecione Sim ou Não.';
    }

    if (!dados.carryOver) {
      erros.carryOver = 'Selecione Sim ou Não.';
    }

    if (!dados.alinhadoTech) {
      erros.alinhadoTech = 'Selecione Sim ou Não.';
    }

    return erros;
  }

  function limparErro(campo) {
    var alvo = form.querySelector('[data-error-for="' + campo + '"]');
    if (alvo) alvo.textContent = '';
    var controle = form.elements[campo];
    if (controle && controle.classList) controle.classList.remove('has-error');
  }

  function limparTodosErros() {
    form.querySelectorAll('[data-error-for]').forEach(function (el) {
      el.textContent = '';
    });
    form.querySelectorAll('.has-error').forEach(function (el) {
      el.classList.remove('has-error');
    });
    resumoErros.classList.add('is-hidden');
    resumoErros.textContent = '';
  }

  function exibirErros(erros) {
    limparTodosErros();
    var campos = Object.keys(erros);
    campos.forEach(function (campo) {
      var alvo = form.querySelector('[data-error-for="' + campo + '"]');
      if (alvo) alvo.textContent = erros[campo];
      var controle = form.elements[campo];
      if (controle && controle.classList) controle.classList.add('has-error');
    });

    resumoErros.textContent = campos.length === 1
      ? 'Há 1 campo pendente. Revise o destaque abaixo.'
      : 'Há ' + campos.length + ' campos pendentes. Revise os destaques abaixo.';
    resumoErros.classList.remove('is-hidden');

    var primeiro = form.querySelector('[data-error-for="' + campos[0] + '"]');
    var container = primeiro ? primeiro.closest('.field') : null;
    var focavel = container ? container.querySelector('input, select, textarea') : null;
    if (focavel) {
      focavel.focus({ preventScroll: true });
      rolarAte(focavel, 'center');
    }
  }

  function rolarAte(elemento, bloco) {
    if (elemento && typeof elemento.scrollIntoView === 'function') {
      elemento.scrollIntoView({ behavior: 'smooth', block: bloco || 'start' });
    }
  }

  /* ---------------- Envio ---------------- */

  function resumoTexto(item) {
    var linhas = [
      'Iniciativa de evolução — ' + config.area + ' · ' + config.organizacao,
      ''
    ];
    CAMPOS.forEach(function (campo) {
      linhas.push(campo.rotulo + ': ' + valorExibicao(item, campo.nome));
    });
    return linhas.join('\n');
  }

  function copiarTexto(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texto);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = texto;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var ok = document.execCommand && document.execCommand('copy');
      document.body.removeChild(area);
      if (ok) resolve();
      else reject(new Error('Cópia não suportada'));
    });
  }

  function abrirEmail(item) {
    var assunto = '[Iniciativa ' + item.trimestre + '] ' + item.nome + ' — ' + nomeProduto(item);
    var url = 'mailto:' + encodeURIComponent(config.envio.email) +
      '?subject=' + encodeURIComponent(assunto) +
      '&body=' + encodeURIComponent(resumoTexto(item));
    var link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function enviar(item) {
    if (config.envio.endpoint) {
      btnSalvar.disabled = true;
      btnSalvar.textContent = 'Enviando...';
      return fetch(config.envio.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      }).then(function (resposta) {
        if (!resposta.ok) throw new Error('Falha no envio: ' + resposta.status);
        definirStatus(item.id, 'enviada');
        mostrarToast('Iniciativa enviada para o time de produto.');
      }).catch(function () {
        definirStatus(item.id, 'registrada');
        mostrarToast('Não foi possível enviar agora. A iniciativa ficou salva — use "Enviar" na lista para tentar de novo.');
      }).then(function () {
        btnSalvar.disabled = false;
        btnSalvar.textContent = rotuloBotaoEnvio();
      });
    }

    if (config.envio.email) {
      abrirEmail(item);
      definirStatus(item.id, 'aguardando');
      mostrarToast('Abrimos seu e-mail com a iniciativa preenchida. Confirme o envio na sua caixa de saída.');
      return Promise.resolve();
    }

    definirStatus(item.id, 'registrada');
    mostrarToast('Iniciativa registrada neste dispositivo. Exporte ou copie o resumo para encaminhar.');
    return Promise.resolve();
  }

  function definirStatus(id, status) {
    iniciativas = iniciativas.map(function (item) {
      return item.id === id ? Object.assign({}, item, { status: status }) : item;
    });
    persistir();
    renderizar();
  }

  function rotuloBotaoEnvio() {
    if (edicaoId) return 'Atualizar e enviar';
    return config.envio.endpoint || config.envio.email ? 'Enviar iniciativa' : 'Registrar iniciativa';
  }

  /* ---------------- Lista ---------------- */

  function valorExibicao(item, campo) {
    if (campo === 'produto') return nomeProduto(item);
    if (campo === 'deadline') return formatarData(item.deadline);
    return item[campo] || '—';
  }

  function criarElemento(tag, classe, texto) {
    var el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function criarBotao(rotulo, classe, acao) {
    var botao = criarElemento('button', 'btn btn--sm ' + classe, rotulo);
    botao.type = 'button';
    botao.addEventListener('click', acao);
    return botao;
  }

  function criarItem(item) {
    var li = criarElemento('li', 'item');
    var status = STATUS[item.status] || STATUS.registrada;

    var header = criarElemento('div', 'item__header');
    header.appendChild(criarElemento('h3', 'item__nome', item.nome));
    header.appendChild(criarElemento('span', 'item__status item__status--' + status.classe, status.rotulo));
    li.appendChild(header);

    var tags = criarElemento('div', 'item__tags');
    tags.appendChild(criarElemento('span', 'tag tag--produto', nomeProduto(item)));
    if (item.trimestre) tags.appendChild(criarElemento('span', 'tag', item.trimestre));
    if (item.areaSolicitante) tags.appendChild(criarElemento('span', 'tag', item.areaSolicitante));
    tags.appendChild(criarElemento(
      'span',
      'tag' + (estaVencida(item.deadline) ? ' tag--alerta' : ''),
      'Deadline: ' + formatarData(item.deadline)
    ));
    tags.appendChild(criarElemento('span', 'tag', item.iniciativaNova === 'Sim' ? 'Nova' : 'Existente'));
    if (item.carryOver === 'Sim') {
      tags.appendChild(criarElemento('span', 'tag', 'Carry over'));
    }
    if (item.alinhadoTech !== 'Sim') {
      tags.appendChild(criarElemento('span', 'tag tag--atencao', 'Sem alinhamento com Tech'));
    }
    li.appendChild(tags);

    var registro = formatarRegistro(item.criadoEm);
    if (registro) {
      li.appendChild(criarElemento('p', 'item__data', 'Preenchida em ' + registro));
    }

    var detalhes = criarElemento('details', 'item__detalhes');
    detalhes.appendChild(criarElemento('summary', null, 'Ver detalhes'));
    var dl = criarElemento('dl', 'item__dl');
    CAMPOS.forEach(function (campo) {
      if (campo.nome === 'nome') return;
      var bloco = document.createElement('div');
      bloco.appendChild(criarElemento('dt', null, campo.rotulo));
      bloco.appendChild(criarElemento('dd', null, valorExibicao(item, campo.nome)));
      dl.appendChild(bloco);
    });
    detalhes.appendChild(dl);
    li.appendChild(detalhes);

    var acoes = criarElemento('div', 'item__actions');
    if (item.status === 'aguardando') {
      acoes.appendChild(criarBotao('Confirmar envio', 'btn--ghost', function () {
        definirStatus(item.id, 'enviada');
        mostrarToast('Envio confirmado.');
      }));
    }
    acoes.appendChild(criarBotao(
      item.status === 'enviada' ? 'Enviar novamente' : 'Enviar',
      'btn--ghost',
      function () {
        enviar(item);
      }
    ));
    acoes.appendChild(criarBotao('Copiar resumo', 'btn--ghost', function () {
      copiarTexto(resumoTexto(item))
        .then(function () { mostrarToast('Resumo copiado.'); })
        .catch(function () { mostrarToast('Não foi possível copiar neste navegador.'); });
    }));
    acoes.appendChild(criarBotao('Editar', 'btn--ghost', function () {
      iniciarEdicao(item.id);
    }));
    acoes.appendChild(criarBotao('Duplicar', 'btn--ghost', function () {
      duplicar(item.id);
    }));
    acoes.appendChild(criarBotao('Excluir', 'btn--danger', function () {
      excluir(item.id);
    }));
    li.appendChild(acoes);

    return li;
  }

  function filtrar() {
    var termo = busca.value.trim().toLowerCase();
    if (!termo) return iniciativas;
    return iniciativas.filter(function (item) {
      return [item.nome, nomeProduto(item), item.areaSolicitante, item.trimestre, item.responsavelNegocio, item.pmResponsavel]
        .join(' ')
        .toLowerCase()
        .indexOf(termo) !== -1;
    });
  }

  function renderizar() {
    var visiveis = filtrar();
    lista.innerHTML = '';
    visiveis.forEach(function (item) {
      lista.appendChild(criarItem(item));
    });

    var vazio = visiveis.length === 0;
    listaVazia.classList.toggle('is-hidden', !vazio);
    listaVazia.textContent = iniciativas.length === 0
      ? 'Nenhuma iniciativa registrada ainda. Preencha o formulário acima para começar.'
      : 'Nenhuma iniciativa encontrada para essa busca.';

    contadorLista.textContent = String(iniciativas.length);
    contadorNav.textContent = String(iniciativas.length);
  }

  /* ---------------- Ações ---------------- */

  function gerarId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'ini-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8);
  }

  function iniciarEdicao(id) {
    var item = iniciativas.find(function (registro) {
      return registro.id === id;
    });
    if (!item) return;

    edicaoId = id;
    preencherFormulario(item);
    limparTodosErros();
    btnSalvar.textContent = rotuloBotaoEnvio();
    btnCancelarEdicao.classList.remove('is-hidden');
    rolarAte(form);
    form.elements.nome.focus({ preventScroll: true });
  }

  function encerrarEdicao() {
    edicaoId = null;
    btnSalvar.textContent = rotuloBotaoEnvio();
    btnCancelarEdicao.classList.add('is-hidden');
  }

  function duplicar(id) {
    var item = iniciativas.find(function (registro) {
      return registro.id === id;
    });
    if (!item) return;

    encerrarEdicao();
    var copia = Object.assign({}, item);
    copia.nome = item.nome + ' (cópia)';
    preencherFormulario(copia);
    limparTodosErros();
    rolarAte(form);
    mostrarToast('Dados copiados para o formulário. Revise e envie.');
  }

  function excluir(id) {
    var item = iniciativas.find(function (registro) {
      return registro.id === id;
    });
    if (!item) return;
    if (!window.confirm('Excluir a iniciativa "' + item.nome + '"?')) return;

    iniciativas = iniciativas.filter(function (registro) {
      return registro.id !== id;
    });
    persistir();
    if (edicaoId === id) {
      encerrarEdicao();
      form.reset();
      alternarProdutoOutro();
    }
    renderizar();
    mostrarToast('Iniciativa excluída.');
  }

  function mostrarToast(mensagem) {
    toast.textContent = mensagem;
    toast.classList.remove('is-hidden');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.add('is-hidden');
    }, 4500);
  }

  /* ---------------- Exportação ---------------- */

  function baixarArquivo(conteudo, nomeArquivo, tipo) {
    var blob = new Blob([conteudo], { type: tipo });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function celulaCsv(valor) {
    return '"' + String(valor === undefined || valor === null ? '' : valor).replace(/"/g, '""') + '"';
  }

  function exportarCsv() {
    if (iniciativas.length === 0) {
      mostrarToast('Não há iniciativas para exportar.');
      return;
    }

    var cabecalho = CAMPOS.map(function (campo) {
      return celulaCsv(campo.rotulo);
    }).concat(celulaCsv('Situação'), celulaCsv('Preenchida em')).join(';');

    var linhas = iniciativas.map(function (item) {
      var colunas = CAMPOS.map(function (campo) {
        var valor = campo.nome === 'produto' ? nomeProduto(item) : item[campo.nome];
        return celulaCsv(valor);
      });
      colunas.push(celulaCsv((STATUS[item.status] || STATUS.registrada).rotulo));
      colunas.push(celulaCsv(formatarRegistro(item.criadoEm)));
      return colunas.join(';');
    });

    // BOM para que o Excel reconheça os acentos.
    baixarArquivo(
      '\ufeff' + [cabecalho].concat(linhas).join('\r\n'),
      'iniciativas-' + hojeIso() + '.csv',
      'text/csv;charset=utf-8;'
    );
    mostrarToast('CSV exportado.');
  }

  function exportarJson() {
    if (iniciativas.length === 0) {
      mostrarToast('Não há iniciativas para exportar.');
      return;
    }
    baixarArquivo(
      JSON.stringify(iniciativas, null, 2),
      'iniciativas-' + hojeIso() + '.json',
      'application/json;charset=utf-8;'
    );
    mostrarToast('JSON exportado.');
  }

  /* ---------------- Eventos ---------------- */

  form.addEventListener('submit', function (evento) {
    evento.preventDefault();
    var dados = lerFormulario();
    var erros = validar(dados);

    if (Object.keys(erros).length > 0) {
      exibirErros(erros);
      return;
    }

    limparTodosErros();
    var registro;

    if (edicaoId) {
      registro = null;
      iniciativas = iniciativas.map(function (item) {
        if (item.id !== edicaoId) return item;
        registro = Object.assign({}, item, dados, { atualizadoEm: new Date().toISOString() });
        return registro;
      });
      encerrarEdicao();
    } else {
      registro = Object.assign({}, dados, {
        id: gerarId(),
        criadoEm: new Date().toISOString(),
        status: 'registrada'
      });
      iniciativas.unshift(registro);
    }

    persistir();
    limparRascunho();
    form.reset();
    selectTrimestre.value = trimestrePadrao();
    alternarProdutoOutro();
    atualizarContadores();
    busca.value = '';
    renderizar();

    if (registro) enviar(registro);
    rolarAte(document.getElementById('registradas'));
  });

  form.addEventListener('input', function (evento) {
    var alvo = evento.target;
    if (alvo.name) limparErro(alvo.name);
    atualizarContador(alvo);
    salvarRascunho();
  });

  form.addEventListener('change', function (evento) {
    if (evento.target.name) limparErro(evento.target.name);
    salvarRascunho();
  });

  selectProduto.addEventListener('change', alternarProdutoOutro);

  btnCopiarResumo.addEventListener('click', function () {
    copiarTexto(resumoTexto(lerFormulario()))
      .then(function () { mostrarToast('Resumo copiado. Cole no e-mail, Teams ou card da sua área.'); })
      .catch(function () { mostrarToast('Não foi possível copiar neste navegador.'); });
  });

  btnCompartilhar.addEventListener('click', function () {
    var url = window.location.href.split('#')[0];
    var dados = {
      title: 'Captação de iniciativas · ' + config.area,
      text: 'Submeta as evoluções que sua área precisa no próximo trimestre.',
      url: url
    };
    if (navigator.share) {
      navigator.share(dados).catch(function () { /* usuário cancelou */ });
      return;
    }
    copiarTexto(url)
      .then(function () { mostrarToast('Link da página copiado.'); })
      .catch(function () { mostrarToast('Copie o endereço da página na barra do navegador.'); });
  });

  btnLimpar.addEventListener('click', function () {
    if (!window.confirm('Limpar todos os campos preenchidos?')) return;
    form.reset();
    selectTrimestre.value = trimestrePadrao();
    limparTodosErros();
    alternarProdutoOutro();
    atualizarContadores();
    limparRascunho();
    encerrarEdicao();
    form.elements.nome.focus({ preventScroll: true });
  });

  btnCancelarEdicao.addEventListener('click', function () {
    encerrarEdicao();
    form.reset();
    selectTrimestre.value = trimestrePadrao();
    limparTodosErros();
    alternarProdutoOutro();
    atualizarContadores();
  });

  busca.addEventListener('input', renderizar);

  document.getElementById('btnExportarCsv').addEventListener('click', exportarCsv);
  document.getElementById('btnExportarJson').addEventListener('click', exportarJson);

  document.getElementById('btnApagarTudo').addEventListener('click', function () {
    if (iniciativas.length === 0) {
      mostrarToast('Não há iniciativas para apagar.');
      return;
    }
    if (!window.confirm('Apagar todas as ' + iniciativas.length + ' iniciativas registradas? Essa ação não pode ser desfeita.')) return;
    iniciativas = [];
    persistir();
    encerrarEdicao();
    renderizar();
    mostrarToast('Todas as iniciativas foram apagadas.');
  });

  /* ---------------- Contadores de caracteres ---------------- */

  function atualizarContador(elemento) {
    if (!elemento || !elemento.name) return;
    var contador = form.querySelector('[data-counter-for="' + elemento.name + '"]');
    if (!contador || !elemento.maxLength || elemento.maxLength < 0) return;
    contador.textContent = elemento.value.length + '/' + elemento.maxLength + ' caracteres';
  }

  function atualizarContadores() {
    form.querySelectorAll('[data-counter-for]').forEach(function (contador) {
      atualizarContador(form.elements[contador.getAttribute('data-counter-for')]);
    });
  }

  /* ---------------- Montagem da página ---------------- */

  function montarOpcoes() {
    trimestresDisponiveis().forEach(function (rotulo) {
      var opcao = document.createElement('option');
      opcao.value = rotulo;
      opcao.textContent = descricaoTrimestre(rotulo);
      selectTrimestre.appendChild(opcao);
    });
    selectTrimestre.value = trimestrePadrao();

    config.produtos.forEach(function (produto) {
      var opcao = document.createElement('option');
      opcao.value = produto;
      opcao.textContent = produto;
      selectProduto.appendChild(opcao);
    });
    var outro = document.createElement('option');
    outro.value = 'Outro';
    outro.textContent = 'Outro (especificar)';
    selectProduto.appendChild(outro);
  }

  function montarTextos() {
    document.getElementById('topbarSubtitulo').textContent = config.area + ' · ' + config.organizacao;

    var ciclo = document.getElementById('heroCiclo');
    ciclo.textContent = config.ciclo.rotulo
      ? 'Planejamento ' + descricaoTrimestre(config.ciclo.rotulo)
      : 'Planejamento trimestral';

    var janela = situacaoJanela();
    if (janela) {
      var caixa = document.getElementById('janela');
      caixa.classList.remove('is-hidden');
      if (janela.estado === 'encerrada') caixa.classList.add('janela--encerrada');
      else if (janela.estado === 'alerta' || janela.estado === 'futura') caixa.classList.add('janela--alerta');
      document.getElementById('janelaStatus').textContent = janela.status;
      document.getElementById('janelaTexto').textContent = janela.texto;
    }

    if (config.linkApoio.url && config.linkApoio.rotulo) {
      var link = document.getElementById('linkApoio');
      link.href = config.linkApoio.url;
      link.textContent = config.linkApoio.rotulo;
      link.classList.remove('is-hidden');
    }

    btnSalvar.textContent = rotuloBotaoEnvio();

    if (config.envio.endpoint) {
      notaEnvio.textContent = 'Ao enviar, a iniciativa vai direto para a base do time de ' + config.area + '.';
    } else if (config.envio.email) {
      notaEnvio.textContent = 'Ao enviar, abrimos seu e-mail já preenchido para ' + config.envio.email + '. Basta confirmar o envio.';
    } else {
      notaEnvio.textContent = 'Nenhum destino de envio configurado: a iniciativa fica salva neste dispositivo para você exportar ou copiar.';
    }

    if (config.envio.email) {
      document.getElementById('rodapeContato').textContent = 'Canal de captação de ' + config.area + ' · ' + config.envio.email;
    } else {
      document.getElementById('rodapeContato').textContent = 'Canal de captação de ' + config.area + ' · ' + config.organizacao;
    }
  }

  montarOpcoes();
  montarTextos();
  restaurarRascunho();
  alternarProdutoOutro();
  atualizarContadores();
  renderizar();
})();
