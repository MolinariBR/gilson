# 📊 Sistema de Logs - Pastel Delivery

Este diretório contém todos os logs da aplicação organizados por categoria.

## 📁 Estrutura de Arquivos

### Logs por Categoria:
- **`app.log`** - Logs gerais da aplicação (inicialização, configuração)
- **`backend.log`** - Logs específicos do servidor backend
- **`api.log`** - Logs de requisições e respostas da API
- **`assets.log`** - Logs de servimento de arquivos estáticos (CSS, JS, imagens)
- **`database.log`** - Logs de conexão e operações do MongoDB
- **`system.log`** - Logs do sistema (variáveis de ambiente, validações)

### Logs Especiais:
- **`errors.log`** - Consolidado de TODOS os erros da aplicação

## 🔍 Como Visualizar os Logs

### Usando o Script de Visualização:
```bash
# Ver todos os arquivos de log disponíveis
node scripts/view-logs.js list

# Ver últimos erros (50 linhas)
node scripts/view-logs.js errors

# Ver logs do backend (100 linhas)
node scripts/view-logs.js backend 100

# Ver todos os logs (resumo)
node scripts/view-logs.js all

# Monitorar erros em tempo real
node scripts/view-logs.js watch errors.log

# Ver logs com stack trace completo
node scripts/view-logs.js errors --stack
```

### Visualização Manual:
```bash
# Ver últimas linhas de um arquivo
tail -f logs/errors.log

# Ver arquivo completo
cat logs/backend.log

# Buscar por termo específico
grep "ERROR" logs/app.log
```

## 📋 Formato dos Logs

Cada entrada de log é um JSON com a estrutura:
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "ERROR",
  "message": "Descrição do evento",
  "error": {
    "message": "Mensagem do erro",
    "stack": "Stack trace completo",
    "name": "Tipo do erro"
  }
}
```

## 🎯 Níveis de Log

- **INFO** 🔵 - Informações gerais (inicialização, operações normais)
- **WARN** 🟡 - Avisos (situações que merecem atenção)
- **ERROR** 🔴 - Erros (falhas que precisam ser corrigidas)
- **DEBUG** 🔍 - Informações de debug (apenas em desenvolvimento)

## 🚨 Monitoramento de Erros

### Erros Críticos para Monitorar:
1. **Conexão com MongoDB** - `database.log`
2. **Falhas de API** - `api.log` e `errors.log`
3. **Problemas de Assets** - `assets.log`
4. **Erros de Sistema** - `system.log`

### Comandos Úteis para Produção:
```bash
# Verificar se há erros recentes
node scripts/view-logs.js errors 10

# Monitorar erros em tempo real
node scripts/view-logs.js watch errors.log

# Ver status geral da aplicação
node scripts/view-logs.js app 20
```

## 🔄 Rotação de Logs

Os logs são anexados continuamente. Para evitar arquivos muito grandes:

1. **Manual**: Remova ou arquive logs antigos periodicamente
2. **Automático**: Configure logrotate no servidor (recomendado para produção)

### Exemplo de limpeza manual:
```bash
# Backup dos logs atuais
cp logs/errors.log logs/errors.log.backup

# Limpar arquivo (manter estrutura)
> logs/errors.log

# Ou remover logs antigos
find logs/ -name "*.log" -mtime +30 -delete
```

## 🛠️ Desenvolvimento

Para adicionar novos logs no código:

```javascript
import { logger } from './utils/logger.js';

// Log de informação
logger.backend.info('Operação realizada com sucesso');

// Log de erro
logger.api.error('Falha na requisição', error);

// Log de aviso
logger.system.warn('Configuração não recomendada');
```

## 📈 Análise de Performance

Use os logs para identificar:
- Requisições mais lentas (api.log)
- Erros frequentes (errors.log)
- Problemas de assets (assets.log)
- Falhas de conexão (database.log)

## 🔐 Segurança

⚠️ **IMPORTANTE**: 
- Logs podem conter informações sensíveis
- Não commite arquivos .log no Git
- Configure permissões adequadas em produção
- Considere criptografia para logs em produção