# CRI Leads: mini sistema de captação de leads com IA

Case técnico · Desenvolvedor(a) Jr, Agentes de IA · CRI Soluções Imobiliárias
Autor: Bryan Prinz

Sistema de captação de leads que funciona ponta a ponta: **banco de dados → API → painel de acompanhamento → agente de IA no WhatsApp** que cadastra o lead e envia a primeira mensagem de resposta.

| Peça | Pasta | Tecnologias |
|---|---|---|
| Banco de dados | Supabase | PostgreSQL |
| API + automação (webhook) | `CRI/backend` | Node.js, Express 5, Supabase JS |
| Painel de leads | `cri-dash-board` | React, TanStack Start, Tailwind, Recharts (feito no Lovable) |
| Agente de IA | `CRI/backend/service/llm.service.js` | OpenRouter (modelo gratuito) + Whapi (WhatsApp) |

- **API publicada:** https://cri-leads.onrender.com
- **Painel publicado:** https://cri-dash-board.onrender.com/
- **Vídeo de demonstração:** _(colar o link aqui, se houver)_

---

## Fluxo geral

```
Pessoa manda mensagem no WhatsApp
        │
        ▼
Whapi ──► POST /webhook/whapi (Express)
                │
                ├─ ignora mensagens minhas, grupos e mensagens que não são texto
                ├─ normaliza o telefone e verifica se o lead já existe
                ├─ envia a mensagem para a LLM (OpenRouter) ──► nome, imóvel de interesse e saudação
                ├─ cadastra o lead no Supabase (status "novo")
                └─ envia a saudação pelo WhatsApp (Whapi)

Painel (React) ◄── GET /leads, /leads/quantityStatus, /leads/quantityOrigin ── API ◄── Supabase
```

---

## Etapa 1 · Banco de dados

### O que construí
Uma tabela `leads` no Supabase (PostgreSQL) com os campos pedidos e alguns extras que a operação real pede, populada com leads fictícios variados entre origens e status.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | bigint (PK, identity) | |
| `name` | text | obrigatório |
| `phone` | bigint | **único**, só dígitos, DDD + número (ex.: `47992564689`) |
| `property_of_Interest` | text | imóvel de interesse, texto livre |
| `origin` | text | origem do lead (site, whatsapp, indicação e canais sociais) |
| `status` | text | `novo`, `em contato`, `qualificado` ou `perdido` |
| `observation` | text | anotações da equipe (editável pelo painel) |
| `last_contact` | timestamptz | último contato com o lead |
| `created_at` | timestamptz | data de criação (default `now()`) |

> Atenção: por causa do `I` maiúsculo, a coluna `property_of_Interest` precisa de aspas duplas em SQL puro.

### Ferramentas e por quê
- **Supabase:** é o que a CRI usa internamente, tem PostgreSQL de verdade, painel visual para conferir os dados e SDK simples para o Node.
- **Telefone como `bigint` único:** impede lead duplicado. A mesma pessoa mandando duas mensagens não cria dois registros.

### Dificuldade e como resolvi
Ao guardar o telefone como número, o WhatsApp entrega números no formato `554891375142` (com DDI 55, e às vezes sem o nono dígito). Criei `utils/phone.js`, que remove o DDI e adiciona o 9 quando necessário, para que o mesmo contato sempre gere o mesmo número no banco.

### O que faria diferente com mais tempo
- Usar `CHECK` constraints (ou `enum`) para `status` e `origin`, evitando valores fora do padrão.
- Padronizar os nomes das colunas (tudo em `snake_case` minúsculo).
- Separar o histórico de contatos em uma tabela própria, em vez de guardar só o último.

---

## Etapa 2 · Interpretação de dados

As respostas abaixo foram obtidas com consultas SQL rodadas diretamente sobre a tabela `leads`.

### 1. Qual origem gerou mais leads?

```sql
-- 1 Qual origem gerou mais leads?
SELECT origin AS origem, COUNT(*) AS quantidade_leads
FROM leads
GROUP BY origin
ORDER BY quantidade_leads DESC
LIMIT 1; -- Se quiser apenas o que gerou mais leads
```

Sem o `LIMIT 1`, a consulta devolve o ranking completo das origens. **Resultado:** _(colar aqui a origem e a quantidade)_

### 2. Qual o percentual de leads qualificados em cada origem?

```sql
-- 2 Qual o percentual de leads qualificados em cada origem?
SELECT origin AS origem, COUNT(*) AS total_leads,
    COUNT(*) FILTER (WHERE status = 'qualificado') AS leads_qualificados,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'qualificado') * 100.0 / COUNT(*),
        2
    ) AS percentual_qualificados
FROM leads
GROUP BY origin
ORDER BY percentual_qualificados DESC;
```

O `FILTER` conta só os qualificados dentro de cada grupo, e o `100.0` força divisão decimal (com `100` inteiro o resultado seria arredondado para baixo). **Resultado:** _(colar aqui a tabela retornada)_

### 3. Algum outro padrão relevante?

```sql
-- 3 Algum outro padrão relevante que você observou nos dados?
-- leads qualificados dos últimos 7 dias que vieram de alguma indicação
SELECT *
FROM leads
WHERE status = 'qualificado'
  AND origin = 'indicação'
  AND last_contact > NOW() - INTERVAL '7 days'
ORDER BY last_contact;
```

Cruza status, origem e recência para achar os leads mais quentes: qualificados, vindos de indicação e com contato recente. Essa é a fila que o time comercial deveria priorizar. **Observação:** _(escrever aqui o que você viu no resultado, ex.: quantos leads apareceram e se indicação converte melhor que as outras origens)_

### Ferramentas e por quê
SQL direto no editor do Supabase: os dados já estão lá, não precisa exportar nada, e a consulta fica documentada e reproduzível.

### O que faria diferente com mais tempo
Analisaria também o tempo médio entre `created_at` e o primeiro contato, e a taxa de leads `perdido` por origem, para descobrir onde o funil vaza.

---

## Etapa 3 · Interface (painel)

### O que construí
Um painel de acompanhamento pensado para ficar aberto numa **TV** (tela cheia 1200×900), com rolagem para uma tabela completa no computador.

- **Visão principal:** indicadores (total de leads, por status, leads parados), gráficos por status e por origem.
- **Tabela de leads:** listagem completa com **busca**, **filtro por status** e botão para **adicionar observação** (grava na coluna `observation`).
- Filtro clicável direto nos gráficos.
- Link de WhatsApp formatado para cada lead e marcação de leads sem contato há mais de 7 dias.
- Atualização automática a cada 1 minuto (com opção de desligar).
- Visual alinhado às cores da CRI (laranja e tons claros).

### Ferramentas e por quê
- **Lovable + React/TanStack:** a CRI usa Lovable internamente, e ele acelera a construção do visual. Como o código é React padrão, consigo ler, ajustar e versionar tudo no GitHub.
- **Recharts:** gráficos simples de configurar e que combinam com React.
- **React Query:** cuida de cache e do refetch automático a cada minuto.

### Dificuldade e como resolvi
A API devolve os campos com nomes como `property_of_Interest`, `origin` e `last_contact`, enquanto a interface trabalha com nomes mais amigáveis. Criei uma camada de normalização em `src/lib/leads.ts` que traduz o formato da API para o formato usado nos componentes, deixando o painel tolerante a pequenas variações de resposta.

### O que faria diferente com mais tempo
- Adicionar login e permissões (hoje o painel é aberto).
- Trocar o `window.location.reload()` por atualização apenas dos dados.
- Paginação da tabela no servidor, para volumes maiores de leads.

---

## Etapa 4 · Agente de automação

### O que construí
Um agente que atende o lead **de verdade pelo WhatsApp**, indo além do mínimo pedido (imprimir uma sugestão de mensagem). Quando alguém escreve para o número da CRI:

1. O webhook (`POST /webhook/whapi`) recebe a mensagem da Whapi e responde `200` imediatamente, processando em segundo plano.
2. São ignoradas mensagens enviadas por nós (`from_me`), de grupos e as que não são texto.
3. O telefone é normalizado; se o lead **já existe**, nada é feito (não cadastra nem cumprimenta de novo).
4. A mensagem vai para a LLM, que devolve um JSON com `name`, `property_of_interest` e `greeting` (saudação personalizada).
5. O lead é cadastrado com status `novo` e a saudação é enviada pelo WhatsApp.

### Ferramentas e por quê
- **Whapi:** forma simples de receber e enviar mensagens de WhatsApp por API e webhook.
- **OpenRouter com modelo gratuito** (padrão: `meta-llama/llama-3.3-70b-instruct:free`): permite trocar de modelo só mudando a variável `OPENROUTER_MODEL`, sem custo durante o desenvolvimento.
- **Saída em JSON:** uma única chamada à LLM extrai os dados do cadastro **e** escreve a saudação, mantendo tudo consistente.

### Cuidados de segurança e confiabilidade
- **Prompt injection:** o prompt trata a mensagem do contato como *dado*, nunca como instrução. Pedidos para mudar de papel ou revelar o prompt são ignorados.
- **Escopo limitado:** o agente não informa preços, rentabilidade, financiamento nem dá conselho financeiro ou jurídico, e não faz promessas. Fora do tema imobiliário, apenas cumprimenta.
- **Validação da saída:** a resposta da LLM é parseada e limpa (`parseAnalysis`), com limites de tamanho para cada campo.
- **Falha da LLM não perde o lead:** se a IA falhar, o lead é cadastrado com os dados básicos (nome do perfil do WhatsApp) e recebe uma saudação padrão.
- **Corrida entre mensagens:** se duas mensagens do mesmo número chegarem juntas, a restrição `UNIQUE` do banco (erro 409) evita cadastro duplicado.

### Dificuldade e como resolvi
Alguns modelos gastam tokens "pensando" antes de escrever a resposta, e com um limite baixo de `max_tokens` a resposta vinha **vazia** (`finish_reason=length`). Resolvi desativando o raciocínio (`reasoning: { enabled: false }`), aumentando o `max_tokens` para 2048 e tratando explicitamente o caso de resposta vazia ou truncada, com log claro do motivo.

### O que faria diferente com mais tempo
- Validar a assinatura/segredo do webhook para aceitar só chamadas da Whapi.
- Fila de mensagens (com reprocessamento) em vez de processar em memória.
- Registrar a origem do lead como `whatsapp` no cadastro automático (hoje a origem fica em branco).
- Trocar o modelo gratuito por um mais estável e medir a qualidade das saudações.
- Testes automatizados para `normalizePhone` e `parseAnalysis`.

---

## Etapa 5 · Como rodar localmente

### Pré-requisitos
- **Node.js 20+** e npm
- Uma conta no **Supabase** com a tabela `leads` criada (veja a Etapa 1)
- *(Opcional, só para a automação)* conta na **Whapi** e chave no **OpenRouter**

### 1. Clonar o repositório

```bash
git clone <URL-DO-REPOSITORIO>
cd <NOME-DO-REPOSITORIO>
```

### 2. Backend (API + webhook)

```bash
cd CRI/backend
npm install
```

Crie o arquivo `.env` dentro de `CRI/backend` com:

```env
# Banco de dados (Supabase > Project Settings > API)
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_KEY=sua-service-role-key

# Servidor
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=*

# Automação WhatsApp (opcional para testar só a API e o painel)
WHAPI_TOKEN=seu-token-da-whapi
OPENROUTER_API_KEY=sua-chave-do-openrouter
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
```

Inicie o servidor:

```bash
npm run dev     # com recarga automática (nodemon)
# ou
npm start
```

Teste: abra http://localhost:3000, deve aparecer `{"message":"API funcionando!"}`. Depois teste http://localhost:3000/leads.

> ⚠️ A `SUPABASE_SERVICE_KEY` dá acesso total ao banco. Ela fica só no backend e o `.env` já está no `.gitignore`. **Nunca suba esse arquivo para o GitHub.**

### 3. Painel (frontend)

```bash
cd cri-dash-board
npm install
npm run dev
```

Abra o endereço mostrado no terminal (normalmente http://localhost:5173).

**Apontando o painel para a sua API local:** o endereço da API está fixo em `src/lib/api.ts`. Para usar o backend local, troque:

```ts
const API_BASE = "https://cri-leads.onrender.com";
// para
const API_BASE = "http://localhost:3000";
```

Para testar a versão de produção do painel: `npm run build` e depois `npm run preview` (http://localhost:4173).

### 4. Testando a automação do WhatsApp (opcional)

1. Com o backend rodando, exponha a porta para a internet (ex.: `ngrok http 3000`).
2. No painel da Whapi, configure o webhook para `https://SEU-ENDERECO/webhook/whapi` com o evento **messages** (modo `post`).
3. Mande uma mensagem de outro número para o WhatsApp conectado, por exemplo: *"Oi, sou a Ana, procuro um apartamento de 2 quartos em Itajaí para investir"*.
4. Confira: o lead aparece na tabela (e no painel) e a Ana recebe a saudação.

### Rotas da API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/leads?status=&search=&stale=true` | Lista leads (filtro por status, busca e leads parados) |
| GET | `/leads/quantityStatus` | Contagem de leads por status |
| GET | `/leads/quantityOrigin` | Contagem de leads por origem |
| GET | `/leads/phone/:phone` | Busca por telefone |
| GET | `/leads/:id` | Busca por ID |
| POST | `/leads` | Cria um lead |
| PUT | `/leads/:id` | Atualiza um lead |
| PATCH | `/leads/:id/contact` | Registra um contato (atualiza `last_contact`) |
| POST | `/webhook/whapi` | Recebe mensagens do WhatsApp |

---

## Estrutura do repositório

```
CRI/backend
├── index.js                  # sobe o servidor
├── server/app.js             # Express, CORS e rotas
├── router/                   # lead.route.js, webhook.route.js
├── controller/               # camada HTTP
├── service/                  # regras: lead, LLM, Whapi, webhook
├── db/supabase.js            # conexão com o Supabase
└── utils/                    # phone.js (telefone), validacao.js (validação)

cri-dash-board
├── src/routes/index.tsx      # tela principal (TV + tabela)
├── src/components/dashboard  # tabela, status e diálogo de observação
└── src/lib/                  # api.ts e leads.ts (hooks e normalização)
```

---

## Uso de IA no desenvolvimento

Usei IA como parte do fluxo de trabalho: Lovable para gerar o painel, e Claude para apoiar a escrita do backend, do prompt do agente e desta documentação. Todas as decisões (estrutura do banco, regras do agente, tratamento de erros) foram revisadas e testadas por mim.
