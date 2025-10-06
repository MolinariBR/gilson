#!/bin/bash

# Script para desenvolvimento local
echo "🚀 Iniciando ambiente de desenvolvimento local..."

# Função para verificar se uma porta está em uso
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Porta $1 já está em uso"
        return 1
    else
        return 0
    fi
}

# Verificar portas
echo "🔍 Verificando portas..."
check_port 4000 || echo "   Backend pode estar rodando na porta 4000"
check_port 5173 || echo "   Frontend pode estar rodando na porta 5173"

echo ""
echo "📋 Para desenvolvimento local, use os seguintes comandos:"
echo ""
echo "🔧 Backend (Terminal 1):"
echo "   cd backend && npm run dev"
echo ""
echo "🎨 Frontend (Terminal 2):"
echo "   cd frontend && npm run dev:local"
echo ""
echo "🌐 URLs de desenvolvimento:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:4000"
echo ""
echo "📝 Configurações:"
echo "   ✅ Backend usa .env.local (localhost:4000)"
echo "   ✅ Frontend usa .env.local (aponta para localhost:4000)"
echo "   ✅ CORS configurado para desenvolvimento"
echo ""
echo "🚨 IMPORTANTE:"
echo "   - Arquivos .env.local NÃO são commitados no git"
echo "   - Arquivos .env são usados em produção"
echo "   - Sempre teste localmente antes do push"