# ⚡ Configuração Rápida - SquareCloud

## 🚨 AÇÃO IMEDIATA NECESSÁRIA

### 1. 🗄️ **Crie um MongoDB Atlas (GRATUITO)**
   - Acesse: https://www.mongodb.com/atlas
   - Clique em "Try Free"
   - Crie uma conta
   - Crie um cluster gratuito (M0)
   - Crie um usuário do banco de dados
   - Adicione 0.0.0.0/0 na whitelist de IPs (⚠️ temporário - restrinja depois)
   - Copie a string de conexão

### 2. 🔧 **Configure no Painel SquareCloud**
   - Acesse: https://squarecloud.app/dashboard
   - Selecione seu projeto
   - Vá em "Environment Variables"
   - Adicione estas variáveis:

```env
JWT_SECRET=GERE_UMA_CHAVE_ALEATORIA_DE_32_CARACTERES_AQUI
MONGO_URL=mongodb+srv://SEU_USUARIO:SUA_SENHA@cluster0.xxxxx.mongodb.net/pastel-delivery
MERCADOPAGO_ACCESS_TOKEN=APP_USR-seu_token_aqui_se_usar_pagamentos
FRONTEND_URL=https://pastel-delivery.squarecloud.app
BACKEND_URL=https://pastel-delivery.squarecloud.app
ADMIN_URL=https://pastel-delivery.squarecloud.app/admin
PORT=80
NODE_ENV=production
```

### 3. 🔄 **Reinicie a Aplicação**
   - No painel do SquareCloud, clique em "Restart"
   - Aguarde alguns minutos
   - Acesse: https://pastel-delivery.squarecloud.app

## 🎯 **Exemplo de String MongoDB Atlas:**
```
mongodb+srv://meuusuario:minhasenha@cluster0.abc123.mongodb.net/pastel-delivery?retryWrites=true&w=majority
```

## ✅ **Após Configurar:**
- Frontend: https://pastel-delivery.squarecloud.app
- Admin: https://pastel-delivery.squarecloud.app/admin
- API: https://pastel-delivery.squarecloud.app/api

## 🆘 **Se ainda der erro:**
1. Verifique se todas as variáveis foram salvas
2. Verifique se a string do MongoDB está correta
3. Reinicie a aplicação novamente
4. Verifique os logs no painel SquareCloud
5. Teste a conexão MongoDB separadamente

## 🔒 **Segurança Pós-Deploy:**
1. **Restrinja IPs no MongoDB:** Remova 0.0.0.0/0 e adicione apenas IPs do SquareCloud
2. **Gere JWT_SECRET único:** Use um gerador online de chaves aleatórias
3. **Monitore logs:** Acompanhe tentativas de acesso não autorizadas

## 🧪 **Validação da Configuração:**
```bash
# Teste se a API está respondendo
curl https://pastel-delivery.squarecloud.app/api/health

# Teste se o frontend carrega
curl -I https://pastel-delivery.squarecloud.app
```