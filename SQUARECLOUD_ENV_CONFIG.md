# 🔧 Configuração de Variáveis de Ambiente - SquareCloud

## ⚠️ AÇÃO NECESSÁRIA: Configure estas variáveis no painel do SquareCloud

### 📋 Variáveis Obrigatórias:

```env
# 1. JWT Secret (Chave para tokens de autenticação)
JWT_SECRET=your_secure_jwt_secret_minimum_32_characters_here

# 2. MongoDB Connection (MongoDB Atlas recomendado)
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/tomato-delivery-prod

# 3. MercadoPago Token (Opcional - para pagamentos)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-your_production_mercadopago_access_token_here

# 4. URLs da Aplicação (Configuração automática para SquareCloud)
FRONTEND_URL=https://pastel-delivery.squarecloud.app
BACKEND_URL=https://pastel-delivery.squarecloud.app
ADMIN_URL=https://pastel-delivery.squarecloud.app/admin

# 5. Configurações do Servidor
PORT=4000
NODE_ENV=production

# 6. Configurações de Categoria (Opcionais - já têm valores padrão)
CATEGORY_IMAGE_MAX_SIZE=2097152
CATEGORY_UPLOAD_PATH=uploads/categories
CATEGORY_CACHE_TTL=3600
CATEGORY_PERFORMANCE_ENABLED=true
```

## 🎯 Como Configurar no SquareCloud:

### 1. **Acesse o Painel do SquareCloud**
   - Vá para https://squarecloud.app/dashboard
   - Selecione seu projeto "pastel-delivery"

### 2. **Configure as Variáveis de Ambiente**
   - Clique em "Environment Variables" ou "Variáveis de Ambiente"
   - Adicione cada variável:

#### ✅ JWT_SECRET
```
Nome: JWT_SECRET
Valor: [SUBSTITUA] your_secure_jwt_secret_minimum_32_characters_here
```

#### ✅ MONGO_URL
```
Nome: MONGO_URL
Valor: [SUBSTITUA] mongodb+srv://username:password@cluster.mongodb.net/tomato-delivery-prod
```

#### ✅ MERCADOPAGO_ACCESS_TOKEN (Opcional)
```
Nome: MERCADOPAGO_ACCESS_TOKEN
Valor: [SUBSTITUA] APP_USR-your_production_mercadopago_access_token_here
```

#### ✅ URLs (Automáticas)
```
Nome: FRONTEND_URL
Valor: https://pastel-delivery.squarecloud.app

Nome: BACKEND_URL
Valor: https://pastel-delivery.squarecloud.app

Nome: ADMIN_URL
Valor: https://pastel-delivery.squarecloud.app/admin
```

#### ✅ Configurações do Servidor
```
Nome: PORT
Valor: 4000

Nome: NODE_ENV
Valor: production
```

#### ✅ Configurações de Categoria (Opcionais)
```
Nome: CATEGORY_IMAGE_MAX_SIZE
Valor: 2097152

Nome: CATEGORY_UPLOAD_PATH
Valor: uploads/categories

Nome: CATEGORY_CACHE_TTL
Valor: 3600

Nome: CATEGORY_PERFORMANCE_ENABLED
Valor: true
```

## 🗄️ MongoDB Atlas (Recomendado)

### Para criar um banco MongoDB gratuito:

1. **Acesse**: https://www.mongodb.com/atlas
2. **Crie uma conta gratuita**
3. **Crie um cluster gratuito**
4. **Configure o usuário do banco**
5. **Adicione seu IP à whitelist** (ou 0.0.0.0/0 para permitir todos)
6. **Copie a string de conexão**

Exemplo de string de conexão:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/tomato-delivery-prod?retryWrites=true&w=majority
```

⚠️ **Importante**: Substitua `username`, `password`, `cluster0.xxxxx` e `tomato-delivery-prod` pelos seus valores reais.

## 💳 MercadoPago (Opcional)

### Para configurar pagamentos:

1. **Acesse**: https://www.mercadopago.com.br/developers
2. **Crie uma aplicação**
3. **Copie o Access Token de produção**
4. **Configure no SquareCloud**

## 🔄 Após Configurar:

1. **Reinicie a aplicação** no painel do SquareCloud
2. **Verifique os logs** para confirmar que não há mais erros
3. **Teste o acesso** em https://pastel-delivery.squarecloud.app

## 🆘 Troubleshooting:

- **Se ainda houver erro de variáveis**: Verifique se todas foram salvas corretamente
- **Se houver erro de conexão MongoDB**: Verifique a string de conexão e whitelist
- **Se houver erro 500**: Verifique os logs no painel do SquareCloud
- **Se houver erro de porta**: Certifique-se que PORT=4000 (não 80)
- **Se categorias não funcionarem**: Verifique se as variáveis CATEGORY_* foram configuradas

## 🔒 Segurança:

⚠️ **NUNCA** compartilhe suas variáveis de ambiente reais em repositórios públicos!
- Use valores placeholder como `[SUBSTITUA]` em documentação
- Mantenha JWT_SECRET com pelo menos 32 caracteres
- Use sempre HTTPS em produção