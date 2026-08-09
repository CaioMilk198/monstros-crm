# MONSTROS AI 2.5 — Piloto Operacional Integrado

## O que muda
- Visual menos "quadrado": contexto ativo, transições, superfícies mais leves e hierarquia mais clara.
- Fluxo vendedor → Perfil 360 → Coach → Academy → Missão → Timeline preservando o mesmo contexto.
- Nova tela **Ligações & QA** para subir áudio, transcrever, analisar e transformar evidência em Coach, Academy ou missão.
- Monstrão preparado para responder com IA real via Supabase Edge Function; se a função não estiver ativa, mantém o modo local.
- Estrutura inicial de login do vendedor via `profiles.seller_id`.

## Implantação em 4 passos
1. Rode `SUPABASE_MIGRATION_V7_0_PILOTO_OPERACIONAL.sql` no SQL Editor do Supabase.
2. Na Supabase CLI, publique a função `supabase/functions/monstros-ai` e configure o segredo `OPENAI_API_KEY`.
3. Suba todos os arquivos do projeto na Vercel. Não altere a URL e a publishable key já configuradas.
4. Faça Ctrl+F5. No canto esquerdo deve aparecer **PILOTO 2.5**.

## Edge Function
Exemplo com Supabase CLI:

```bash
supabase functions deploy monstros-ai
supabase secrets set OPENAI_API_KEY=SUA_CHAVE_OPENAI
```

A chave OpenAI fica somente no servidor/Edge Function. Nunca coloque essa chave no `index.html`, `app.js` ou navegador.

## Login de vendedor — piloto
1. O vendedor cria uma conta normalmente na tela de login.
2. Confirme que foi criada uma linha em `public.profiles`.
3. No piloto, vincule o login ao vendedor com:

```sql
select public.assign_pilot_user('UUID_DO_USUARIO','UUID_DO_VENDEDOR','seller');
```

Ao entrar como `seller`, a interface mostra apenas Perfil 360, Coach, Ligações & QA, Academy e Timeline. Antes de comercializar o SaaS, faça uma rodada específica de hardening das RLS/RPCs para isolamento completo do perfil vendedor.

## Teste mínimo recomendado
- Ranking → clique em vendedor → Perfil 360.
- Perfil 360 → Abrir Coach.
- Coach → Treinar no Academy.
- Coach → Transformar plano em missão.
- Iniciar e concluir missão → conferir Timeline.
- Ligações & QA → enviar MP3/WAV/M4A → conferir análise → abrir Coach → criar missão.
- Monstrão → perguntar "Quem devo cobrar hoje e por quê?".
