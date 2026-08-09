# MONSTROS AI 2.5.2 — Edge Function Health & Call QA Hotfix

- Corrige diagnóstico enganoso de “IA conectada” sem teste real.
- Adiciona ação `health` na Edge Function.
- Melhora CORS para invocação pelo navegador.
- Diferencia função inexistente, função online sem chave OpenAI e IA pronta.
- Mantém `gpt-transcribe`, modelo atualmente documentado para transcrição de arquivos.
- Valida limite de 25 MB no cliente e no servidor.
- Registra `status=error` no `call_recordings` quando a análise falha.
- Mantém o áudio enviado para nova tentativa sem exigir novo upload.
