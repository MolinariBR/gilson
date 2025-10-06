# 🛠️ Configuração para Desenvolvimento Local

## 📋 Resumo

Este projeto está configurado para funcionar tanto em **desenvolvimento local** quanto em **produção** sem conflitos.

## 🔧 Configuração de Ambiente

### Arquivos de Ambiente

| Arquivo | Uso | Commitado |
|---------|-----|-----------|
| `.env` | Produção (SquareCloud) | ✅ Sim |
| `.env.local` | Desenvolvimento local | ❌ Não |

### URLs por Ambiente

| Ambiente | Frontend | Backend |
|----------|----------|---------|
| **Local** | http://localhost:5173 | http://localhost:4000 |
| **Produção** | https://pastel-delivery.squareweb.app | https://pastel-delivery.squareweb.app |

## 🚀 Como Rodar Localmente

### 1. Backend (Terminal 1)
```bash
cd backend
npm run dev
```

### 2. Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

## 📝 Scripts Disponíveis

### Frontend
- `npm run dev` - Desenvolvimento local (usa .env.development)
- `npm run dev:prod` - Desenvolvimento com config de produção
- `npm run build` - Build para produção

### Backend
- `npm run dev` - Desenvolvimento local (usa .env.local)
- `npm run dev:prod` - Desenvolvimento com config de produção
- `npm start` - Produção

## 🔒 CORS Configurado

O backend está configurado para aceitar requisições de:
- **Desenvolvimento**: `localhost:5173`, `localhost:4000`
- **Produção**: `pastel-delivery.squareweb.app`

## ⚠️ IMPORTANTE

1. **Nunca commite arquivos `.env.local`** - Eles são ignorados pelo git
2. **Sempre teste localmente** antes de fazer push
3. **Os arquivos `.env` são usados em produção** - não altere URLs de produção neles
4. **Use `.env.local` para desenvolvimento** - crie se não existir

## 🐛 Resolução de Problemas

### Erro de CORS
- Verifique se está usando `npm run dev:local` no frontend
- Verifique se o backend está rodando na porta 4000
- Confirme que o arquivo `.env.local` existe no backend

### Erro de Conexão
- Verifique se ambos os serviços estão rodando
- Confirme as portas: Frontend (5173), Backend (4000)
- Verifique os logs do console para mais detalhes

## 📦 Deploy

Para deploy em produção:
1. Faça push normalmente - os arquivos `.env` serão usados
2. Os arquivos `.env.local` são ignorados no deploy
3. As URLs de produção estão configuradas nos arquivos `.env`