# Captação de iniciativas · Produtos Digitais

Página web usada para divulgar, às áreas internas do Grupo Boticário, a captação trimestral de
iniciativas de evolução dos produtos digitais. No início de cada trimestre, a área preenche uma
iniciativa por evolução necessária, descreve o objetivo e envia para o time de produto.

Funciona igualmente em celular e em navegadores de desktop, sem back-end e sem etapa de build:
são quatro arquivos estáticos (`index.html`, `styles.css`, `app.js` e `config.js`).

## Configuração a cada ciclo

Tudo o que muda de um trimestre para o outro está em `config.js`:

| Chave | Para que serve |
| --- | --- |
| `ciclo.rotulo` | Trimestre que está sendo planejado (ex.: `Q4/2026`). Aparece na abertura e vem pré-selecionado no formulário. |
| `ciclo.janelaInicio` / `ciclo.janelaFim` | Período de submissão. A página mostra se a captação está aberta, quantos dias faltam ou se já encerrou. Deixe vazio para ocultar o aviso. |
| `envio.endpoint` | URL opcional que recebe um `POST` com o JSON da iniciativa (Power Automate, Apps Script, API interna). |
| `envio.email` | Caixa de entrada usada quando não há endpoint: a página abre o e-mail já preenchido. |
| `produtos` | Lista de produtos digitais do formulário. |
| `linkApoio` | Link opcional para material de apoio na intranet. |

O botão principal se adapta ao que estiver configurado: envia para o endpoint, abre o e-mail
preenchido ou apenas registra a iniciativa no dispositivo.

## Campos do formulário

| Campo | Tipo |
| --- | --- |
| Trimestre de referência | Seleção (pré-preenchida com o ciclo atual) |
| Área solicitante | Texto |
| Nome da iniciativa | Texto |
| Produto digital (Radar, Integra, Painel Único, Farol B2B ou outro) | Seleção |
| Objetivo desta iniciativa | Texto longo |
| Qual é o problema de negócio que a iniciativa resolve? | Texto longo |
| Impacto no negócio | Texto longo |
| Métrica de sucesso (alvo) | Texto |
| Por que isso é importante para a minha área? | Texto longo |
| Deadline limite para subida | Data |
| Nome da pessoa responsável (do negócio) | Texto |
| Nome do PM responsável pelo produto digital | Texto |
| Iniciativa nova? | Sim / Não |
| Carry over? | Sim / Não |
| Alinhado previamente com Tech? | Sim / Não |

Todos são obrigatórios. Ao escolher "Outro" em produto digital, um campo adicional pede o nome do
produto.

## Recursos

- Abertura explicando o ciclo, o prazo da janela e o que acontece depois do envio.
- Layout responsivo: coluna única no celular e duas colunas a partir de 640px de largura.
- Validação com mensagens por campo, resumo de pendências e foco no primeiro erro.
- Rascunho salvo automaticamente enquanto o formulário é preenchido.
- Situação de cada submissão: enviada, aguardando confirmação (quando vai por e-mail) ou não enviada,
  com ação para reenviar em caso de falha.
- Lista das submissões feitas no dispositivo, com busca, edição, duplicação e exclusão.
- "Copiar resumo" para colar a iniciativa em e-mail, Teams ou card, e "Compartilhar página" para
  divulgar o link às áreas.
- Exportação em CSV (separador `;`, compatível com Excel) e em JSON.
- Tema claro/escuro conforme a preferência do sistema e folha de estilo para impressão/PDF.

## Como publicar

Hospede os quatro arquivos em qualquer serviço de conteúdo estático (GitHub Pages, S3, intranet).

Pelo GitHub Pages, que já serve para divulgar o link às áreas: em **Settings → Pages**, escolha
*Deploy from a branch*, selecione a branch e a pasta `/ (root)` e salve. O endereço publicado fica
em `https://<organizacao>.github.io/<repositorio>/`.

Para testar localmente:

```bash
python3 -m http.server 8000
# acesse http://localhost:8000
```

## Onde ficam os dados

Sem endpoint configurado, a página não envia nada sozinha: a iniciativa é salva no `localStorage`
do navegador de quem preencheu e segue por e-mail. A lista "Minhas submissões" é local — cada
pessoa vê apenas o que preencheu no próprio dispositivo. Para consolidar as iniciativas de todas as
áreas em um só lugar, configure `envio.endpoint` ou reúna os CSVs exportados.
