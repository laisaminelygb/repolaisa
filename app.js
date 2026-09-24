(function () {
  'use strict';

  var STORAGE_KEY = 'iniciativas.v1';
  var DRAFT_KEY = 'iniciativas.rascunho.v1';

  // Ordem usada na exibição dos detalhes e nas exportações.
  var CAMPOS = [
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
    'nome', 'produtoOutro', 'objetivo', 'problema', 'impacto',
    'metrica', 'importancia', 'deadline', 'responsavelNegocio', 'pmResponsavel'
  ];

  var CAMPOS_ESCOLHA = ['iniciativaNova', 'carryOver', 'alinhadoTech'];

  var MIN_TEXTO_LONGO = 15;

  var form = document.getElementById('form-iniciativa');
  var selectProduto = document.getElementById('produto');
  var wrapperProdutoOutro = document.getElementById('wrapperProdutoOutro');
  var inputProdutoOutro = document.getElementById('produtoOutro');
  var resumoErros = document.getElementById('resumoErros');
  var btnLimpar = document.getElementById('btnLimpar');
  var btnCancelarEdicao = document.getElementById('btnCancelarEdicao');
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

  /* ---------------- Formulário ---------------- */

  function lerFormulario() {
    var dados = {};
    CAMPOS_TEXTO.forEach(function (campo) {
      var el = form.elements[campo];
      dados[campo] = el ? el.value.trim() : '';
    });
    dados.produto = selectProduto.value;
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
      focavel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /* ---------------- Lista ---------------- */

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

  function estaVencida(iso) {
    if (!iso) return false;
    var hoje = new Date();
    var hojeIso = hoje.getFullYear() + '-' +
      String(hoje.getMonth() + 1).padStart(2, '0') + '-' +
      String(hoje.getDate()).padStart(2, '0');
    return iso < hojeIso;
  }

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

  function criarItem(item) {
    var li = criarElemento('li', 'item');

    var header = criarElemento('div', 'item__header');
    header.appendChild(criarElemento('h3', 'item__nome', item.nome));
    var registro = formatarRegistro(item.criadoEm);
    if (registro) {
      header.appendChild(criarElemento('span', 'item__data', 'Registrada em ' + registro));
    }
    li.appendChild(header);

    var tags = criarElemento('div', 'item__tags');
    tags.appendChild(criarElemento('span', 'tag tag--produto', nomeProduto(item)));
    tags.appendChild(criarElemento(
      'span',
      'tag' + (estaVencida(item.deadline) ? ' tag--alerta' : ''),
      'Deadline: ' + formatarData(item.deadline)
    ));
    tags.appendChild(criarElemento('span', 'tag', item.iniciativaNova === 'Sim' ? 'Nova' : 'Existente'));
    if (item.carryOver === 'Sim') {
      tags.appendChild(criarElemento('span', 'tag', 'Carry over'));
    }
    tags.appendChild(criarElemento(
      'span',
      'tag' + (item.alinhadoTech === 'Sim' ? '' : ' tag--alerta'),
      item.alinhadoTech === 'Sim' ? 'Alinhado com Tech' : 'Sem alinhamento com Tech'
    ));
    li.appendChild(tags);

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
    var btnEditar = criarElemento('button', 'btn btn--sm btn--ghost', 'Editar');
    btnEditar.type = 'button';
    btnEditar.addEventListener('click', function () {
      iniciarEdicao(item.id);
    });
    var btnDuplicar = criarElemento('button', 'btn btn--sm btn--ghost', 'Duplicar');
    btnDuplicar.type = 'button';
    btnDuplicar.addEventListener('click', function () {
      duplicar(item.id);
    });
    var btnExcluir = criarElemento('button', 'btn btn--sm btn--danger', 'Excluir');
    btnExcluir.type = 'button';
    btnExcluir.addEventListener('click', function () {
      excluir(item.id);
    });
    acoes.appendChild(btnEditar);
    acoes.appendChild(btnDuplicar);
    acoes.appendChild(btnExcluir);
    li.appendChild(acoes);

    return li;
  }

  function filtrar() {
    var termo = busca.value.trim().toLowerCase();
    if (!termo) return iniciativas;
    return iniciativas.filter(function (item) {
      return [item.nome, nomeProduto(item), item.responsavelNegocio, item.pmResponsavel]
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
    btnSalvar.textContent = 'Atualizar iniciativa';
    btnCancelarEdicao.classList.remove('is-hidden');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    form.elements.nome.focus({ preventScroll: true });
  }

  function encerrarEdicao() {
    edicaoId = null;
    btnSalvar.textContent = 'Salvar iniciativa';
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
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    mostrarToast('Dados copiados para o formulário. Revise e salve.');
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
    }, 3200);
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

  function carimboDeData() {
    return new Date().toISOString().slice(0, 10);
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
    }).concat(celulaCsv('Registrada em')).join(';');

    var linhas = iniciativas.map(function (item) {
      var colunas = CAMPOS.map(function (campo) {
        var valor = campo.nome === 'produto' ? nomeProduto(item) : item[campo.nome];
        return celulaCsv(valor);
      });
      colunas.push(celulaCsv(formatarRegistro(item.criadoEm)));
      return colunas.join(';');
    });

    // BOM para que o Excel reconheça os acentos.
    baixarArquivo(
      '\ufeff' + [cabecalho].concat(linhas).join('\r\n'),
      'iniciativas-' + carimboDeData() + '.csv',
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
      'iniciativas-' + carimboDeData() + '.json',
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

    if (edicaoId) {
      iniciativas = iniciativas.map(function (item) {
        return item.id === edicaoId
          ? Object.assign({}, item, dados, { atualizadoEm: new Date().toISOString() })
          : item;
      });
      encerrarEdicao();
      mostrarToast('Iniciativa atualizada.');
    } else {
      dados.id = gerarId();
      dados.criadoEm = new Date().toISOString();
      iniciativas.unshift(dados);
      mostrarToast('Iniciativa registrada.');
    }

    persistir();
    limparRascunho();
    form.reset();
    alternarProdutoOutro();
    atualizarContadores();
    busca.value = '';
    renderizar();
    form.elements.nome.focus({ preventScroll: true });
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

  btnLimpar.addEventListener('click', function () {
    if (!window.confirm('Limpar todos os campos preenchidos?')) return;
    form.reset();
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

  /* ---------------- Inicialização ---------------- */

  restaurarRascunho();
  alternarProdutoOutro();
  atualizarContadores();
  renderizar();
})();
