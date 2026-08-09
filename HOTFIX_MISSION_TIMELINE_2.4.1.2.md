# MONSTROS AI 2.4.1.2 — Missão → Timeline

## O que foi corrigido
A criação da missão agora grava o evento `Missão criada` diretamente no fluxo real, logo depois que `create_management_mission` retorna sucesso.

A Timeline agora lê:
- eventos persistidos em `public.operational_events`;
- eventos locais;
- eventos calculados da operação.

Os eventos são deduplicados.

## Fluxo esperado
Criar missão → Timeline: **Missão criada**
Iniciar missão → Timeline: **Missão iniciada**
Concluir missão → Timeline: **Missão concluída**

Após F5, os eventos persistidos continuam disponíveis.

## Implantação
Nenhum SQL novo, desde que a migration da 2.4.1 tenha sido executada.

Pode publicar o ZIP completo. Alternativamente, substitua:
- `app.js`
- `index.html`

Aguarde a Vercel ficar `Ready` e faça `Ctrl + F5`.

## Teste de aceite
1. Criar uma missão para um vendedor.
2. Abrir Timeline.
3. Confirmar `Missão criada`.
4. Voltar e clicar `Iniciar`.
5. Abrir Timeline e confirmar `Missão iniciada`.
6. Concluir.
7. Confirmar `Missão concluída`.
8. Dar F5 e verificar se os registros continuam.
