# 🚀 Instruções de Deploy no SquareCloud

## ✅ Correções Aplicadas

1. **Dependências adicionadas ao package.json principal**:
   - Express, MongoDB, bcrypt, JWT e todas as dependências do backend
   - Script `postinstall` para instalar dependências do backend automaticamente

2. **Configuração do SquareCloud otimizada**:
   - `START=npm start` adicionado para usar o script correto
   - Memória configurada para 1GB
   - Subdomínio: `pastel-delivery`

3. **Tamanho otimizado**: 20MB (bem abaixo do limite de 100MB)

## 📦 Preparação para Deploy

1. **Construir os arquivos estáticos**:
   ```bash
   npm run build:all
   ```

2. **Preparar para SquareCloud**:
   ```bash
   npm run squarecloud:prepare
   ```

3. **Arquivo para upload**: `pastel-delivery-squarecloud-v2.zip`

## 🔧 Variáveis de Ambiente Necessárias

Configure no painel do SquareCloud:

```env
# Database
MONGO_URL=sua_string_de_conexao_mongodb

# JWT
JWT_SECRET=sua_chave_secreta_jwt

# MercadoPago (opcional)
MERCADOPAGO_ACCESS_TOKEN=seu_token_mercadopago

# URLs (configurar com o domínio real do SquareCloud)
FRONTEND_URL=https://pastel-delivery.squarecloud.app
BACKEND_URL=https://pastel-delivery.squarecloud.app
ADMIN_URL=https://pastel-delivery.squarecloud.app/admin
```

## 🎯 Processo de Deploy

1. **Preparar localmente**:
   ```bash
   npm run build:all
   npm run squarecloud:prepare
   ```

2. **Upload do ZIP** no painel do SquareCloud

3. **Configurar variáveis de ambiente** (ver seção acima)

4. **Aguardar instalação das dependências** (automática via postinstall)

5. **Verificar logs** para confirmar funcionamento

6. **Testar endpoints** (ver seção de verificação)

## 📋 Estrutura do Deploy

- **Backend**: Roda na porta configurada pelo SquareCloud
- **Frontend**: Servido como arquivos estáticos pelo backend
- **Admin**: Servido como arquivos estáticos pelo backend
- **Uploads**: Diretório criado automaticamente

## 🔍 Verificação Pós-Deploy

Após o deploy, teste:
- `https://pastel-delivery.squarecloud.app` - Frontend
- `https://pastel-delivery.squarecloud.app/admin` - Admin
- `https://pastel-delivery.squarecloud.app/api/food/list` - API

## 🆘 Troubleshooting

### Problemas Comuns:

**1. Erro 500 na inicialização**:
- Verifique se `MONGO_URL` está correto
- Confirme se `JWT_SECRET` foi definido
- Verifique logs: variáveis de ambiente faltando

**2. Frontend não carrega**:
- Confirme se `npm run build:all` foi executado
- Verifique se arquivos `dist/` estão no ZIP
- Teste: `https://seu-app.squarecloud.app/`

**3. Admin não carrega**:
- Verifique se build do admin foi criado
- Teste: `https://seu-app.squarecloud.app/admin`

**4. API não responde**:
- Verifique se backend iniciou corretamente
- Teste: `https://seu-app.squarecloud.app/api/food/list`
- Confirme se MongoDB está conectado

### Comandos de Validação:

```bash
# Validar configuração local
npm run validate:prod

# Testar builds localmente
npm run build:all && ls -la frontend/dist admin/dist

# Verificar variáveis necessárias
node -e "console.log(['MONGO_URL', 'JWT_SECRET', 'MERCADOPAGO_ACCESS_TOKEN'].map(v => v + ': ' + (process.env[v] ? '✅' : '❌')).join('\n'))"
```