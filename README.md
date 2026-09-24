# Captura de iniciativas de produtos digitais

Página web responsiva para registrar novas iniciativas de evolução de produtos digitais.
Funciona igualmente em celular e em navegadores de desktop, sem back-end e sem etapa de build:
são apenas três arquivos estáticos (`index.html`, `styles.css` e `app.js`).

## Campos do formulário

| Campo | Tipo | Obrigatório |
| --- | --- | --- |
| Nome da iniciativa | Texto | Sim |
| Produto digital (Radar, Integra, Painel Único, Farol B2B ou outro) | Seleção | Sim |
| Objetivo desta iniciativa | Texto longo | Sim |
| Qual é o problema de negócio que a iniciativa resolve? | Texto longo | Sim |
| Impacto no negócio | Texto longo | Sim |
| Métrica de sucesso (alvo) | Texto | Sim |
| Por que isso é importante para a minha área? | Texto longo | Sim |
| Deadline limite para subida | Data | Sim |
| Nome da pessoa responsável (do negócio) | Texto | Sim |
| Nome do PM responsável pelo produto digital | Texto | Sim |
| Iniciativa nova? | Sim / Não | Sim |
| Carry over? | Sim / Não | Sim |
| Alinhado previamente com Tech? | Sim / Não | Sim |

Ao escolher "Outro" em produto digital, um campo adicional pede o nome do produto.

## Recursos

- Layout responsivo: coluna única no celular e duas colunas a partir de 640px de largura.
- Validação com mensagens por campo, resumo de pendências e foco no primeiro erro.
- Rascunho salvo automaticamente enquanto o formulário é preenchido.
- Lista das iniciativas registradas com busca, edição, duplicação e exclusão.
- Destaques visuais para deadline vencido e falta de alinhamento com Tech.
- Exportação em CSV (separador `;`, compatível com Excel) e em JSON.
- Suporte a tema claro/escuro conforme a preferência do sistema e folha de estilo para impressão/PDF.

## Como usar

Abra o `index.html` diretamente no navegador ou sirva a pasta por HTTP:

```bash
python3 -m http.server 8000
# acesse http://localhost:8000
```

Para publicar, basta hospedar os três arquivos em qualquer serviço de conteúdo estático
(GitHub Pages, S3, Netlify e similares).

## Armazenamento dos dados

Os registros ficam no `localStorage` do navegador em que foram criados — não há sincronização
entre dispositivos nem envio para servidores. Exporte em CSV ou JSON antes de limpar os dados do
navegador ou para consolidar as iniciativas de várias pessoas.
