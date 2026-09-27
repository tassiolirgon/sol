# SOL · System of Life
## Especificação Completa do Sistema (v2 consolidada, setembro 2026)

> **Para o Claude Code:** este documento é a fonte única de verdade do produto. Ele substitui e consolida o "Sistema de Progressão V1" e o "Briefing Técnico" anteriores. Onde houver conflito com qualquer versão antiga, vale este. Itens marcados como **[PROPOSTO]** são defaults técnicos para destravar o build: implemente assim, mas sempre como valor configurável (tabela de configuração ou constante única), nunca espalhado pelo código. Itens em **Decisões em aberto** (seção 23) não devem ser inventados: use o default indicado ou pergunte.

---

# 1. O QUE É O SOL

SOL é um app mobile de evolução pessoal inspirado na progressão de RPG (referência: Solo Leveling), aplicado à vida real.

- **Filosofia central:** o Sistema administra, não o usuário. Uma camada de IA analisa o perfil, gera missões, precifica XP, cria desafios e acompanha a evolução em cinco atributos. O usuário executa.
- **Experiência:** parece um painel de evolução pessoal. O RPG (XP, níveis, classes) é a consequência, não o foco.
- **Estética:** dark fantasy sóbrio.
- **Negócio:** assinatura mensal única, trial de 14 dias sem cartão, sem plano gratuito permanente.
- **Motor de crescimento:** card de identidade compartilhável e rede social aspiracional (pós-MVP).
- **Slogan (candidatos, escolha final pendente):** "Não há volta. Só evolução." / "Não escolhi o Sistema. Evoluo por ele." / "O que resta é evoluir." Aparece na tela de abertura e no rodapé da home.

---

# 2. PRINCÍPIOS NÃO NEGOCIÁVEIS

## 2.1 Produto
1. **Identidade = Nível (número) + Classe (nome).** Nada mais. Não existe camada de "Título". Ela foi cortada e não deve voltar em nenhuma tela, tabela ou feed.
2. **Nível geral e XP total nunca regridem.** Não existe caminho de código que subtraia XP total ou reduza nível. A única regressão permitida é o decaimento de atributos (seção 11).
3. **Missões são binárias.** Feito ou não feito, um toque, estilo Todoist. Nunca progresso parcial ("12/20 páginas").
4. **O Sistema precifica, sempre.** O usuário nunca define o XP de uma missão, em nenhum modo.
5. **O Sistema sugere, o usuário aprova** em mudanças de identidade (classe, prestígio). Toda ação autônoma da IA mostra o motivo.
6. **Estatísticas intuitivas.** Números absolutos com escopo claro ("2/4 missões hoje"), nunca porcentagens soltas. O mesmo número não aparece duas vezes na mesma tela.
7. **Público só mostra vitória.** Falhas, missões perdidas e dias parados nunca são expostos.

## 2.2 Engenharia
1. **Servidor é a autoridade.** Todo cálculo de XP, nível, atributo, classe e decaimento acontece em Edge Functions com service role.
2. **RLS em todas as tabelas desde a primeira migration.**
3. **Nenhuma chave de API no client.** Secrets só em variáveis de ambiente das Edge Functions. `.env` no `.gitignore` desde o primeiro commit.
4. **`classify-mission` e `complete-mission` ignoram qualquer `xp_value` enviado pelo client.**
5. **Valores de balanceamento são configuração** (tabelas de XP, faixas, multiplicadores, limiares). Nunca hardcoded em vários lugares.

---

# 3. STACK

| Camada | Tecnologia | Motivo |
|---|---|---|
| App mobile | React Native + Expo (Expo Router) | Uma base para iOS e Android |
| Backend, Auth, DB | Supabase (Postgres) | Auth gerenciado, RLS, Edge Functions |
| Lógica sensível | Supabase Edge Functions | XP, validação, IA rodam no servidor |
| Jobs agendados | pg_cron (ou Scheduled Functions) | Decaimento, bosses, reset diário |
| IA | API de LLM chamada só via Edge Function | Chave nunca toca o app |
| Estado no app | React Query + Zustand | Cache de servidor + estado local leve |

## 3.1 Regras de segurança
- **Client só exibe e envia intenção.** Ele envia "concluí a missão X". A Edge Function valida (missão existe, pertence ao usuário, não foi concluída no período) e só então calcula e grava XP.
- **Colunas de progressão** (`level`, `total_xp`, `xp` de atributo, `current_class`, `prestige_level`) são somente leitura para o client via RLS.
- **Política padrão de RLS:** usuário lê e escreve apenas os próprios dados. Dados públicos (nível, classe, conquistas) terão política de leitura pública específica quando o social existir, nunca por padrão.
- **Auth:** Supabase Auth, refresh token rotation habilitado.
- **Dados financeiros:** tabelas separadas, RLS estrita (só o dono lê), criptografia em nível de aplicação nos valores, nunca em log, endpoint público ou perfil social.

Exemplo de política:
```sql
create policy "users read own missions"
  on missions for select
  using (auth.uid() = user_id);

create policy "users insert own personal missions"
  on missions for insert
  with check (auth.uid() = user_id and source = 'user');
```

---

# 4. ONBOARDING

Seis etapas. Meta: menos de 3 minutos.

**Etapa 1 · Boas-vindas.** Tela única com o slogan e a proposta: "Você está prestes a iniciar um sistema operacional para a sua vida."

**Etapa 2 · Prompt para IA externa (diferencial).** O usuário copia um prompt, cola na IA que já usa (ChatGPT, Gemini, Claude) e cola a resposta de volta. Alternativa: "Prefiro responder perguntas manualmente".

Prompt copiável:
```
Preciso que você me faça um resumo honesto sobre mim com base nas nossas conversas.
Inclua:
- Meus principais objetivos de vida (carreira, finanças, saúde, relacionamentos)
- Meus maiores desafios e dificuldades atuais
- Meus hábitos (bons e ruins)
- Minha rotina aproximada
- Minhas áreas de interesse
- O que eu mais procrastino ou evito
Seja direto e objetivo. Máximo de 300 palavras.
```

**Etapa 3 · Calibração.** Até 7 perguntas adaptativas, geradas a partir da resposta da IA. Estrutura base:

| # | Pergunta | Tipo |
|---|---|---|
| 1 | Qual é a sua maior prioridade agora? | Seleção única |
| 2 | Como está sua rotina de exercícios? | Escala 1-5 |
| 3 | Você tem algum objetivo financeiro específico? | Texto curto |
| 4 | Com que frequência você estuda ou se desenvolve? | Seleção |
| 5 | O que você mais evita fazer mas sabe que deveria? | Texto curto |
| 6 | Qual área da sua vida você sente mais negligenciada? | Seleção múltipla |
| 7 | Quantas horas você dorme por noite em média? | Número |

**Etapa 4 · Escolha do modo de operação.** Modo Sistema (recomendado) ou Modo Arquiteto. Ver seção 5.

**Etapa 5 · Análise do Sistema.** Animação de 3 a 5 segundos ("Identificando padrões... Calibrando missões iniciais... Definindo sua classe de entrada..."), mesmo que o processamento termine antes. O ritual importa.

**Etapa 6 · Revelação (momento épico, arte em tela cheia).**
> Análise concluída.
> **Nível 1 · Despertado**
> Suas primeiras missões foram geradas. O Sistema está pronto.
> [ INICIAR ]

No Modo Arquiteto, a Etapa 6 leva ao cadastro da rotina em vez de mostrar missões geradas.

---

# 5. MODOS DE OPERAÇÃO

| | Modo Sistema (padrão) | Modo Arquiteto |
|---|---|---|
| Missões de rotina | IA gera; usuário aprova, edita ou rejeita | Usuário escreve as próprias missões recorrentes |
| XP | Sistema atribui | Sistema classifica e atribui via `classify-mission` |
| Bosses, Épicas, Lendárias | IA | IA |
| Decaimento, sugestão de classe, alertas | Sistema | Sistema |
| Sugestões de missão | Adicionadas com aviso | Só sugeridas, nunca adicionadas sozinhas |

Regras:
- O modo pode ser trocado a qualquer momento nas Configurações.
- No Modo Arquiteto, criar missão mantém a voz do Sistema. O usuário escreve "academia seg, qua e sex" e recebe: *"Missão registrada: Saúde, dificuldade moderada, +50 XP."*
- O usuário nunca vê um campo de XP editável.

---

# 6. XP E NÍVEIS

## 6.1 XP base por tipo de missão

| Tipo | XP |
|---|---|
| Diária simples | 10-30 |
| Diária moderada | 30-60 |
| Diária difícil | 60-100 |
| Pessoal (checklist) | 15-40 |
| Boss Semanal | 200-400 |
| Boss Mensal | 400-800 |
| Missão Épica | 500-1000 |
| Missão Lendária | 2000+ |
| Atualização de Vida concluída | 150 fixo |

O LLM classifica tipo e dificuldade. O código escolhe o valor dentro da faixa e rejeita qualquer valor fora dela.

## 6.2 Multiplicadores e bônus

| Condição | Efeito |
|---|---|
| Primeiro dia de uma missão nova | 1.5x |
| Sequência ativa 7+ dias | 1.5x |
| Sequência ativa 30+ dias | 2x |
| Missão concluída antes das 9h (horário local) | 1.2x |
| Todas as missões do dia concluídas | +100 XP fixo |
| Retorno após decaimento (7 dias, só XP de atributo da área) | 2x |

**[PROPOSTO] Regra de acúmulo:** os multiplicadores de sequência não acumulam entre si (vale o maior). Os demais multiplicam entre si. O bônus fixo de +100 é somado depois e não é multiplicado. Teto de multiplicador combinado: 3x.

## 6.3 Distribuição
Cada missão concluída credita o mesmo XP em dois lugares: XP total (nível geral) e XP do atributo da categoria da missão.
Exemplo: "Academia" concluída = +50 XP total e +50 XP em Saúde.

## 6.4 Tabela de níveis (XP total acumulado)
Níveis são apenas números. Não há nomes de nível.

| Nível | XP | Nível | XP |
|---|---|---|---|
| 1 | 0 | 11 | 50.000 |
| 2 | 500 | 12 | 67.000 |
| 3 | 1.200 | 13 | 88.000 |
| 4 | 2.500 | 14 | 115.000 |
| 5 | 4.500 | 15 | 148.000 |
| 6 | 7.500 | 16 | 190.000 |
| 7 | 12.000 | 17 | 242.000 |
| 8 | 18.000 | 18 | 306.000 |
| 9 | 26.000 | 19 | 385.000 |
| 10 | 36.000 | 20 | 480.000 |

Acima do nível 20: Prestígio (seção 12).

---

# 7. ATRIBUTOS

Cinco atributos, cada um com XP próprio, nível de 1 a 100, estágio nominal e cor fixa usada em todo o app (radar, rótulo de missão, alertas).

| Atributo | Sigla | Representa |
|---|---|---|
| Saúde | HP | Corpo, energia, vitalidade |
| Sabedoria | INT | Conhecimento, aprendizado |
| Espiritualidade | ESP | Propósito, fé, paz interior, valores |
| Prosperidade | PRO | Patrimônio, finanças, riqueza |
| Disciplina | DIS | Consistência, autocontrole, execução |

## 7.1 Estágios (os estágios são o "piso consolidado" do decaimento)

| Nível | Saúde | Sabedoria | Espiritualidade | Prosperidade |
|---|---|---|---|---|
| 1-5 | Sedentário | Curioso | Buscador | Endividado (ponto de partida, sem julgamento) |
| 6-15 | Ativo | Estudante | Fiel | Organizado |
| 16-30 | Atlético | Analítico | Devoto | Poupador |
| 31-50 | Resistente | Pensador | Enraizado | Investidor |
| 51-75 | Inabalável | Erudito | Guiado | Acumulador |
| 76-100 | Corpo de Aço | Sábio | Ungido | Próspero |

## 7.2 Disciplina é diferente
Não tem missões próprias e não recebe XP direto. É recalculada continuamente pela taxa de conclusão dos últimos 30 dias, sequências ativas e consistência entre semanas.

| Taxa de conclusão (30 dias) | Nível de Disciplina |
|---|---|
| < 30% | 1-10 |
| 30-50% | 11-25 |
| 50-70% | 26-50 |
| 70-85% | 51-75 |
| 85-95% | 76-90 |
| > 95% | 91-100 |

Dentro de cada faixa, interpolar linearmente pela taxa. **[PROPOSTO]**

## 7.3 Curva de XP por nível de atributo
Não definida ainda. **[PROPOSTO]** implementar como tabela de configuração `attribute_level_thresholds` com curva provisória `xp_para_nivel(n) = 50 * n^1.6` (arredondado), para ser rebalanceada depois sem migration de lógica.

---

# 8. CLASSES

A classe é a identidade narrativa. Não é escolhida, é conquistada. Critérios verificados por `check-class-upgrade`; o Sistema sugere, o usuário aceita ou recusa (pode manter a classe atual). A troca é um momento épico. Cada classe desbloqueia missões especiais exclusivas.

**Tier 0 · Despertado.** Classe inicial universal, automática no onboarding.

**Tier 1 · Especialização** (Nível 5 + atributo dominante ≥ 15)

| Classe | Atributo | Requisito |
|---|---|---|
| Lâmina | Saúde | Saúde ≥ 15 |
| Oráculo | Sabedoria | Sabedoria ≥ 15 |
| Devoto da Chama | Espiritualidade | Espiritualidade ≥ 15 |
| Forjador de Fortuna | Prosperidade | Prosperidade ≥ 15 |
| Inquebrável | Disciplina | Taxa de conclusão ≥ 75% por 30 dias |

**Tier 2 · Evolução** (Nível 10 + dois atributos ≥ 30)

| Classe | Combinação | Requisito |
|---|---|---|
| Centurião | Saúde + Disciplina | Saúde ≥ 30, taxa ≥ 80% |
| Arquimago | Sabedoria + Disciplina | Sabedoria ≥ 30, taxa ≥ 80% |
| Profeta | Espiritualidade + Sabedoria | ESP ≥ 30, SAB ≥ 30 |
| Magnata em Ascensão | Prosperidade + Sabedoria | PRO ≥ 30, SAB ≥ 30 |
| Monge de Ferro | Espiritualidade + Disciplina | ESP ≥ 30, taxa ≥ 85% |
| Barão das Sombras | Prosperidade + Disciplina | PRO ≥ 30, taxa ≥ 85% |

**Tier 3 · Maestria** (Nível 15 + três atributos ≥ 50)

| Classe | Combinação |
|---|---|
| Titã | Saúde + Sabedoria + Disciplina |
| Senhor das Eras | Prosperidade + Sabedoria + Disciplina |
| Guardião Sagrado | Espiritualidade + Disciplina + Saúde |
| Soberano | Todos os atributos ≥ 40 |

**Tier 4 · Lendário** (Nível 20 + todos os atributos ≥ 70): **Monarca**. Classe única.

Textos de lore (exibir na revelação de classe):
- Despertado: a primeira vez que alguém abre os olhos para o próprio potencial não tem nome de especialidade. Só tem início.
- Lâmina: o corpo como arma forjada pela repetição.
- Oráculo: quem começa a enxergar padrões que os outros não veem.
- Devoto da Chama: uma fé que ainda arde baixo, mas já não se apaga.
- Forjador de Fortuna: o primeiro a entender que riqueza se constrói, não se espera.
- Inquebrável: quem não falha porque decidiu, há muito, não falhar.
- Centurião: comanda o próprio corpo como um general comanda tropas.
- Arquimago: domina o conhecimento com precisão cirúrgica.
- Profeta: vê além do presente, guiado por fé e razão ao mesmo tempo.
- Magnata em Ascensão: já não improvisa, calcula cada movimento patrimonial.
- Monge de Ferro: disciplina espiritual que não se abala por nada.
- Barão das Sombras: constrói impérios silenciosamente, sem precisar de plateia.
- Titã: força, mente e constância fundidas em uma só presença.
- Senhor das Eras: pensa em décadas enquanto os outros pensam em dias.
- Guardião Sagrado: corpo, fé e disciplina como um só voto.
- Soberano: não domina uma área. Domina a si mesmo, por inteiro.
- Monarca: não existe nada acima disto. Quem chega aqui já não compete com os outros, só com a própria lenda.

Classe conquistada nunca é perdida por decaimento.

---

# 9. MISSÕES

## 9.1 Regras gerais
- Binárias: concluídas com um toque. Se uma ação exige progresso, quebrar em missões menores.
- Categoria = um dos quatro atributos com missões (Saúde, Sabedoria, Espiritualidade, Prosperidade). Disciplina nunca é categoria.
- Volume: 3 a 5 missões diárias no máximo.
- Toda missão gerada pela IA carrega um `rationale` curto (por que esta missão, para este usuário, agora).
- Proibido missão genérica de lista pronta. Toda missão referencia o contexto real do usuário.

## 9.2 Tipos

| Tipo | Quem gera | Frequência | XP |
|---|---|---|---|
| Diária | IA (Sistema) ou usuário (Arquiteto) | Recorrente | 10-100 por dificuldade |
| Pessoal (checklist) | Usuário | Pontual | 15-40 |
| Boss Semanal | IA | 1 por semana | 200-400 |
| Boss Mensal | IA | 1 por mês | 400-800 |
| Épica (Boss de Vida) | IA | Após Atualização de Vida | 500-1000 |
| Lendária | IA | Uma vez na vida, irrepetível | 2000+ |
| Exclusiva de classe | IA | Desbloqueada pela classe | Faixa do tipo equivalente |

Exemplos de Boss Semanal: Saúde "Completar 5 treinos nesta semana"; Sabedoria "Ler 50 páginas esta semana"; Espiritualidade "7 dias seguidos de oração ou meditação"; Prosperidade "Registrar e revisar todo o patrimônio"; Disciplina "0 missões perdidas nesta semana".

Exemplos de Boss Mensal: "Mês do Corpo" (20 treinos), "Mês da Mente" (concluir 1 curso), "Mês Financeiro" (aporte e revisão de carteira), "Mês Espiritual" (30 dias seguidos).

Exemplos de Épica: iniciou MBA, "Concluir o primeiro módulo"; teve filho, "Criar rotina saudável nos primeiros 30 dias"; novo emprego, "Completar os primeiros 30 dias com consistência".

Exemplos de Lendária: "1 ano de sequência perfeita", "Patrimônio de R$100.000 registrado", "Atingir nível 20".

Bosses são binários do ponto de vista do toque: o usuário marca como derrotado ao cumprir o desafio. O servidor valida o que for verificável pelo histórico (ex: contagem de treinos concluídos na semana) antes de pagar o XP.

## 9.3 Atualização de Vida
Fluxo em que o usuário relata uma mudança relevante (emprego, curso, filho, mudança de cidade). `life-update` recalibra objetivos e missões sem destruir o que já funciona, gera uma Missão Épica e paga 150 XP ao concluir o fluxo.

## 9.4 Ciclo de vida da missão
`ativa` → `concluida` (no período) ou `pausada` (pela IA após inatividade, com aviso e botão de reativar). Missões nunca são apagadas pela IA.

---

# 10. RECOMPENSAS

O que já está definido:
- **XP** por missão, com multiplicadores e bônus de dia completo (seção 6.2).
- **Subida de nível** (momento épico em tela cheia).
- **Evolução de estágio de atributo** (ex: Ativo para Atlético).
- **Upgrade de classe** (momento épico) com missões exclusivas desbloqueadas.
- **Conquistas** permanentes (seção 13).
- **Prestígio** com ícone e missões exclusivas (seção 12).
- **XP de atributo em dobro por 7 dias** ao retomar uma área que estava em decaimento.
- **Card de identidade compartilhável** como troféu social.
- **Referral:** convide um amigo, ganhe 30 dias grátis.

Sistema de recompensas detalhado além disso está em aberto (seção 23).

---

# 11. PUNIÇÕES E CONSEQUÊNCIAS

Decisão consolidada: **não existe subtração de XP nem perda de nível.** Aversão à perda destrói retenção. A consequência é justa, temática e recuperável.

## 11.1 Decaimento de atributos
Atributo é estado atual e decai como na vida real.

| Regra | Valor |
|---|---|
| Gatilho | 14 dias sem nenhuma missão concluída na categoria do atributo |
| Aviso prévio | No 11º dia: "Seu atributo Saúde entrará em decaimento em 3 dias." |
| Ritmo | -1 nível de atributo por dia |
| Teto | -15 por ciclo de inatividade |
| Piso | Nunca abaixo do início do estágio já consolidado (quem virou Atlético pode cair dentro de Atlético, nunca para Ativo) |
| Fim do ciclo | Qualquer missão concluída na área zera o contador |
| Recuperação | 7 dias de XP de atributo em dobro na área |

**[PROPOSTO]** Ao decair, o XP do atributo é ajustado para o limiar do novo nível, para que a recuperação seja coerente com a curva.

Disciplina não usa esse mecanismo: ela já cai naturalmente pela taxa de conclusão.

## 11.2 Outras consequências
- **Perda de sequência:** dia sem atividade zera a sequência e desliga os multiplicadores de sequência.
- **Queda de Disciplina:** efeito direto de missões não concluídas.
- **Pausa de missão:** missão ignorada por 14+ dias é pausada pela IA, com aviso.

## 11.3 O que nunca decai
Nível geral, XP total, classe conquistada, conquistas, nível de prestígio.

---

# 12. PRESTÍGIO

- Ao atingir nível 20, o usuário recebe a opção (nunca obrigatória) de entrar em Prestígio.
- O nível volta para 1. Mantém classe, atributos e conquistas.
- Ganha ícone de prestígio no perfil e acesso a missões exclusivas.
- XP necessário por nível aumenta 20% e recompensas aumentam proporcionalmente.
- Entrar em prestígio é momento épico.

| Prestígio | Nome | Símbolo |
|---|---|---|
| I | O Renascido | ✦ |
| II | O Forjado | ✦✦ |
| III | O Eterno | ✦✦✦ |
| IV | O Imortal | ✦✦✦✦ |
| V | O Além | ✦✦✦✦✦ |

**[PROPOSTO]** o aumento é cumulativo e linear: prestígio P exige `xp_tabela * (1 + 0.2 * P)`. O XP total exibido e usado no ranking continua acumulando e nunca é zerado; só o contador de nível reinicia.

---

# 13. CONQUISTAS

Registros permanentes. Não expiram. Absorveram os antigos "títulos" de evento.

- **Progressão:** primeiro nível; níveis 5, 10, 15, 20; primeira troca de classe; segunda troca de classe; primeiro prestígio.
- **Consistência:** sequências de 7, 30, 100, 365 dias; 7 dias perfeitos; 30 dias perfeitos; 100 dias com taxa > 90%.
- **Atributo:** cada atributo nos níveis 25, 50, 75, 100.
- **Financeiro:** primeiro investimento registrado; patrimônio registrado ≥ R$10k, 50k, 100k, 500k, 1M.
- **Eventos únicos:** voltou após 30+ dias parado; quebrou a sequência e voltou em 24h; top 1% de XP da plataforma.
- **Social (pós-MVP):** primeiro seguidor; 10, 50, 100, 500, 1000 seguidores; primeira conquista compartilhada.
- **Sazonais:** conquistas temporárias geradas pelo Sistema (depende da decisão sobre eventos sazonais).

Chaves estáveis em código (`achievement_key`), textos em tabela de configuração.

---

# 14. IA · AUTONOMIA COM TRANSPARÊNCIA

Regra: **a IA pode agir, o usuário sempre sabe o porquê.**

## 14.1 Pode fazer sozinha
| Ação | Condição |
|---|---|
| Adicionar missão (Modo Sistema) | Padrão detectado + atributo carente. No Modo Arquiteto, só sugere |
| Pausar missão | 14+ dias sem conclusão |
| Aumentar dificuldade | 21+ dias de conclusão consistente |
| Sugerir upgrade de classe | Critérios atingidos |
| Gerar Boss Semanal e Mensal | Ciclo automático |
| Gerar Missão Épica | Após Atualização de Vida |
| Enviar alerta | Inatividade, decaimento próximo, oportunidade |

## 14.2 Nunca faz sozinha
Apagar histórico, alterar dados financeiros, trocar a classe sem aprovação, enviar mais de 2 alertas por dia, definir XP fora da tabela.

## 14.3 Notificação de ação
> ⚙️ **O Sistema agiu.**
> Sua missão "Caminhar" foi pausada.
> Motivo: 18 dias sem conclusão.
> [ Reativar ] [ Entendido ]

Exemplos de alerta: "Você está há 6 dias seguidos. Não pare agora." / "Sabedoria está estagnada há 3 semanas. Recalibrar missões?" / "Seu atributo Saúde entrará em decaimento em 3 dias."

## 14.4 Regras obrigatórias em todo prompt de LLM
1. Missões sempre binárias.
2. XP só dentro das faixas oficiais. O LLM classifica, o código precifica e valida.
3. Contexto real do usuário obrigatório. Nada genérico.
4. Saída só em JSON válido com schema fixo (`title`, `description`, `category`, `difficulty`, `type`, `rationale`). Validar antes de gravar; resposta inválida gera retry, nunca gravação parcial.
5. Tom do Sistema: direto, épico contido, nunca infantil. Português brasileiro.
6. `rationale` sempre presente.
7. Máximo de 3 a 5 missões diárias.
8. Modo Arquiteto: `generate-missions` não gera diárias, só Bosses, Épicas e sugestões marcadas como sugestão.

---

# 15. TELAS

## 15.1 Navegação (tab bar, 5 abas)
**Sistema** (home) · **Missões** · **Evolução** · **Financeiro** · **Perfil**

Cinco é o limite. Quando a rede social entrar, ela substitui uma aba ou vira submenu do Perfil (decisão futura).

## 15.2 Sistema (home) · wireframe final, 4ª iteração
De cima para baixo:
1. **Saudação:** "Bom dia, [nome]" + "Seu Sistema está ativo" + sino de alertas com indicador.
2. **Card de identidade:** nível (losango dourado) + classe (dourado) + barra de XP até o próximo nível, com arte épica de fundo. É o "cartão postal" do app, pensado para print e compartilhamento. Botão de compartilhar gera imagem do card.
3. **Três tiles diários:** sequência atual, "2/4 missões hoje", boss disponível.
4. **Radar de atributos:** cinco vértices rotulados, cada um na cor do atributo, com valor.
5. **Missões do dia:** lista binária, rótulo de categoria colorido, XP visível nas pendentes. Concluídas ficam esmaecidas e riscadas. Sem contador duplicado no cabeçalho da lista.
6. **Banner de Boss:** no fim da lista, com CTA.
7. **Slogan** discreto no rodapé.

Métricas semanais e históricas não entram na home.

## 15.3 Missões
Todas as missões ativas agrupadas por tipo (diárias, pessoais, bosses, épicas). Conclusão em um toque. No Modo Arquiteto: botão para criar missão em texto livre, com resposta do Sistema classificando e precificando. Sugestões da IA aparecem em seção própria com aceitar/recusar.

## 15.4 Evolução
Radar detalhado, cada atributo com nível, estágio e barra de XP; histórico de XP; métricas semanais e mensais; sequência mais longa; conquistas; status de decaimento por atributo (dias até o aviso); caminho de classes com o próximo requisito.

## 15.5 Financeiro
Registro de patrimônio e investimentos que alimenta Prosperidade e os marcos financeiros. Módulo completo é pós-MVP, mas a tabela nasce com RLS estrita e criptografia.

## 15.6 Perfil
Card de identidade, conquistas, prestígio, Configurações (modo de operação, notificações, fuso horário, assinatura), Atualização de Vida.

## 15.7 Momentos épicos (tela cheia, arte, animação)
Revelação do onboarding, subida de nível, troca de classe, boss ou Épica derrotada, entrada em prestígio. Nada além disso recebe arte épica.

## 15.8 Tela de abertura
Logo SOL + slogan.

---

# 16. DIRETRIZES VISUAIS

**Regra central: sobriedade no dia a dia, épico nos momentos.**

- Fundo escuro quase monocromático.
- Cor só onde carrega significado. Cada atributo tem cor fixa, usada igual em todo lugar.
- **Dourado é exclusivo da identidade** (nível e classe) e do slogan. Dourado espalhado vira enfeite; raro vira status.
- Arte épica só nos momentos (15.7) e no card de identidade.
- Referência de comportamento: Nubank (sóbrio, momentos celebrados). Referência de clima: Solo Leveling.
- Arte será ilustração real. Tentativas em SVG foram descartadas.

Tokens base (do wireframe aprovado):

| Token | Valor |
|---|---|
| `bg` | #101014 |
| `surface` | #16161C |
| `border` | #2A2A32 |
| `text` | #ECECF0 |
| `text-muted` | #8A8A94 |
| `gold-identity` | #BA8C3C |
| `alert` | #E24B4A |

Cores dos cinco atributos: pendente (seção 23). Definir como tokens `attr-saude`, `attr-sabedoria`, `attr-espiritualidade`, `attr-prosperidade`, `attr-disciplina`.

---

# 17. REDE SOCIAL (pós-MVP)

- **Mural de evolução, não feed de atividades.** Só vitórias.
- **Perfil público:** avatar, nome, nível + barra, classe, radar, sequência, número de conquistas, ícone de prestígio.
- **Eventos do feed:** subiu de nível, mudou de classe, sequência de 30 dias, boss derrotado, conquista desbloqueada.
- **Reações só positivas:** 🔥 Fogo, ⚔️ Força, 🙏 Inspiração, 👑 Lendário. Sem comentários negativos.
- **Rankings:** global por XP, por atributo, entre seguidos, semanal (reset toda segunda).
- **V2:** missão em grupo, desafio direto.

---

# 18. MONETIZAÇÃO

- Plano único: **R$9,90/mês** (preço de aquisição; revisar com custo real de IA por usuário).
- **Trial de 14 dias sem cartão.** Sem plano gratuito permanente.
- Crescimento: trial, compartilhamento do card, rede social, referral (30 dias grátis), influenciadores de produtividade.
- Paywall entra no pós-MVP.

---

# 19. SCHEMA (Postgres / Supabase)

Gerar migrations com RLS habilitada em cada tabela.

### `profiles`
- `id` uuid PK FK auth.users
- `display_name`, `avatar_url`
- `level` int default 1 (só backend)
- `total_xp` bigint default 0 (só backend)
- `current_class` text default 'despertado' (só backend)
- `prestige_level` int default 0 (só backend)
- `operation_mode` enum('sistema','arquiteto') default 'sistema'
- `timezone` text **[PROPOSTO]** (base para dia, sequência e bônus antes das 9h)
- `created_at`

### `attributes`
- `user_id`, `type` enum('saude','sabedoria','espiritualidade','prosperidade','disciplina')
- `xp` bigint, `level` int (só backend)
- `last_activity_at` timestamptz
- `decay_applied` int default 0 (teto 15, zera ao retomar)
- `consolidated_floor` int (piso do estágio)
- `recovery_until` timestamptz **[PROPOSTO]** (fim da janela de XP em dobro)

### `missions`
- `id`, `user_id`, `title`, `description`
- `category` enum('saude','sabedoria','espiritualidade','prosperidade')
- `difficulty` enum('simples','moderada','dificil')
- `xp_value` int (sempre definido no backend, inclusive no Modo Arquiteto; valor do client é ignorado)
- `type` enum('diaria','pessoal','boss_semanal','boss_mensal','epica','lendaria','classe')
- `source` enum('ia','user')
- `status` enum('ativa','concluida','pausada','sugerida','recusada') **[PROPOSTO: sugerida, recusada]**
- `recurrence` jsonb **[PROPOSTO]** (dias da semana para missões recorrentes)
- `rationale` text
- `due_date`, `created_at`
- Reservar extensibilidade para um futuro `type = 'evento'` com fonte de verificação externa.

### `mission_completions`
- `id`, `mission_id`, `user_id`, `completed_at`, `xp_awarded` (backend), `multipliers` jsonb **[PROPOSTO]** (auditoria)

### `streaks`
- `user_id`, `current_streak`, `longest_streak`, `last_active_date`

### `achievements`
- `user_id`, `achievement_key`, `unlocked_at`

### `class_history` **[PROPOSTO]**
- `user_id`, `class_key`, `suggested_at`, `accepted_at`, `declined_at`

### `system_actions` **[PROPOSTO]**
- `user_id`, `action_type`, `reason`, `payload`, `created_at`, `acknowledged_at` (alimenta as notificações "O Sistema agiu" e o limite de 2 alertas por dia)

### `life_updates`
- `user_id`, `description`, `processed_at`, `epic_mission_id`

### `financial_assets` (RLS estrita, criptografado)
- `user_id`, `asset_type`, `value_encrypted`, `metadata`, `created_at`

### Social (pós-MVP)
- `follows(follower_id, following_id)`, `feed_events(user_id, event_type, payload, created_at)`, `reactions(event_id, user_id, reaction_type)`

### Configuração
- `level_thresholds`, `attribute_level_thresholds`, `xp_ranges`, `multipliers`, `class_requirements`, `achievement_definitions`

---

# 20. EDGE FUNCTIONS

| Função | Responsabilidade |
|---|---|
| `process-onboarding` | Recebe resumo da IA externa + calibração; cria perfil, atributos iniciais, classe Despertado e primeiras missões (Modo Sistema) |
| `generate-missions` | Gera missões via LLM respeitando o modo de operação; valida JSON e faixas; grava |
| `classify-mission` | Modo Arquiteto: classifica categoria + dificuldade via LLM e precifica pela tabela. Nunca aceita XP do client |
| `complete-mission` | Valida posse, status e período; aplica multiplicadores; grava XP total e de atributo; atualiza nível, sequência, Disciplina, conquistas; dispara momentos épicos |
| `check-class-upgrade` | Verifica requisitos de classe e cria sugestão |
| `life-update` | Processa Atualização de Vida, recalibra e gera Épica |
| `attribute-decay` | Job diário: aviso no 11º dia, decaimento a partir do 14º, respeita teto e piso |
| `generate-bosses` **[PROPOSTO]** | Job semanal e mensal que cria os bosses (pode ser um modo de `generate-missions`) |

Regra: toda escrita em XP, nível, atributo e classe acontece só aqui, com service role.

---

# 21. ESTRUTURA DE PASTAS

```
sol/
├── app/                  # Expo Router
│   ├── (auth)/
│   ├── (onboarding)/
│   ├── (tabs)/           # sistema, missoes, evolucao, financeiro, perfil
│   └── _layout.tsx
├── components/
├── lib/
│   ├── supabase.ts       # só anon key
│   ├── queries/          # hooks React Query
│   └── types/
├── supabase/
│   ├── migrations/       # schema + RLS
│   └── functions/        # Edge Functions
├── .env                  # nunca commitado
└── .gitignore
```

---

# 22. ORDEM DE CONSTRUÇÃO

**Fase 1 · Fundação** (terminar inteira antes de qualquer tela)
1. Setup Expo + Supabase
2. Migrations com schema central e RLS em tudo, incluindo tabelas de configuração populadas
3. Auth

**Fase 2 · Onboarding**
4. Telas: boas-vindas, prompt externo, calibração, escolha de modo, análise, revelação
5. `process-onboarding`
6. Primeiras missões (Sistema) ou cadastro de rotina + `classify-mission` (Arquiteto)

**Fase 3 · Loop central**
7. Tela Sistema completa (seção 15.2)
8. `complete-mission` com anti-cheat
9. Tela Missões
10. Tela Evolução

**Fase 4 · Inteligência**
11. `generate-missions` e bosses
12. `classify-mission` refinada
13. `check-class-upgrade`
14. `life-update`
15. `attribute-decay`

**Fase 5 · Pós-MVP**
16. Rede social
17. Financeiro completo
18. Assinatura e paywall
19. Eventos do mundo real

---

# 23. DECISÕES EM ABERTO

| Tema | Status | Default para o build |
|---|---|---|
| Gatilho de troca de classe: automático por requisito ou exige missão/prova de classe | Aberto | Sugestão automática quando os requisitos batem, usuário aceita |
| Eventos sazonais dentro do app | Aberto | Não implementar |
| Sistema de recompensas detalhado (itens, cosméticos, etc.) | Aberto | Só o que está na seção 10 |
| Slogan final | Aberto | "Não há volta. Só evolução." como placeholder |
| Cores dos 5 atributos | Aberto | Tokens com cores provisórias distintas |
| Curva de XP de atributo | Aberto | Seção 7.3 |
| Acúmulo de multiplicadores | Aberto | Seção 6.2 |
| O que conta como dia ativo na sequência | Aberto | Pelo menos 1 missão concluída no dia local |
| Prestígio além do V | Aberto | Parar no V |
| Nome "O Renascido" duplicado (Prestígio I e conquista de retorno) | Aberto | Manter no Prestígio; conquista de retorno com chave `comeback_30d` e nome a definir |
| Onde a rede social entra na tab bar | Aberto | Decidir no pós-MVP |

---

# 24. ROADMAP · EVENTOS DO MUNDO REAL

Eventos presenciais estilo Pokémon GO (corridas, treinos, desafios coletivos) que valem XP para quem **completar**. Só depois de escala. O bloqueio é verificação, não criação: integrar Strava, Apple Health ou Google Fit; validar GPS + tempo + distância; check-in geolocalizado em janela de tempo. Arquitetura atual deve permitir um tipo de missão `evento` com verificação externa sem reescrever o núcleo.

---

# 25. DECISÕES DESCARTADAS (não reintroduzir)

| Descartado | Motivo |
|---|---|
| Camada de Títulos (nível + classe + título) | Redundante. Eventos úteis viraram Conquistas |
| Nomes de nível (Recruta, Iniciante...) | Identidade é número + classe |
| Subtração de XP ou perda de nível como punição | Mata retenção. Substituído por decaimento de atributo |
| Progresso parcial nas missões | Ninguém alimenta o "12/20". Binário |
| "% de missões na semana" na home | Ambíguo. Trocado por "2/4 missões hoje" |
| Arte ilustrativa em telas de rotina | Compete com a informação. Só card de identidade e momentos |
| Dourado fora da identidade | Dourado raro vira status |
| Renomear para "Gen Z Legacy" | SOL é mais coeso com a narrativa e melhor para ASO |
| Arte feita em SVG | Qualidade insuficiente. Usar ilustração real |

---

*SOL · System of Life · Especificação consolidada · setembro 2026*
