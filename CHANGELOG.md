# CHANGELOG

## v0.4.0 — Importador Inteligente

### Adicionado
- Correção automática do estado “Perfil pendente”.
- RPC segura `ensure_my_profile`.
- Verificação de duplicidade antes do upload do arquivo.
- Histórico das 10 importações mais recentes.
- Auditoria visual das seis abas esperadas.
- Alertas para vendedores sem conversão conciliada.
- Projeção inicial pelo ritmo do mês.
- Validação da Project URL.
- Mensagens de sucesso e erro mais claras.

### Corrigido
- Arquivo duplicado não é mais enviado ao Storage antes da checagem.
- Nomes de arquivos com acentos passam a ser normalizados.
- Perfil recém-criado é recuperado automaticamente após o login.
