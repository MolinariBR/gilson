#!/bin/bash

# Script de teste para imagens de categoria usando curl
# Uso: ./test-images-curl.sh

BASE_URL="https://pastel-delivery.squareweb.app"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🧪 Testando imagens de categoria com curl..."
echo "=========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para testar URL
test_url() {
    local url="$1"
    local description="$2"

    echo -n "🔍 Testando $description: "

    # Usar curl com timeout e silent
    response=$(curl -s -w "%{http_code}" -o /dev/null --max-time 10 "$url" 2>/dev/null)

    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ Sucesso (200)${NC}"
        return 0
    elif [ "$response" = "404" ]; then
        echo -e "${RED}❌ Não encontrado (404)${NC}"
        return 1
    elif [ "$response" = "000" ]; then
        echo -e "${YELLOW}⚠️  Timeout/Erro de conexão${NC}"
        return 1
    else
        echo -e "${YELLOW}⚠️  Status: $response${NC}"
        return 1
    fi
}

# Função para testar API JSON (simplificada)
test_api() {
    local url="$1"
    local description="$2"

    echo -n "🔍 Testando $description: "

    response=$(curl -s -w "\n%{http_code}" --max-time 10 "$url" 2>/dev/null)
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)

    if [ "$status" = "200" ]; then
        # Verificar se contém "success":true
        if echo "$body" | grep -q '"success":true'; then
            echo -e "${GREEN}✅ Sucesso (200)${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  API não retornou success=true${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Status: $status${NC}"
        return 1
    fi
}

echo "📁 Teste 1: Imagens diretas (frontend/dist)"
echo "------------------------------------------"
test_url "$BASE_URL/pastel-category.svg" "pastel-category.svg"
test_url "$BASE_URL/cerveja-category.svg" "cerveja-category.svg"
test_url "$BASE_URL/bebida-category.svg" "bebida-category.svg"
test_url "$BASE_URL/placeholder-category.svg" "placeholder-category.svg"
echo ""

echo "📊 Teste 2: API de categorias"
echo "-----------------------------"
test_api "$BASE_URL/api/categories" "API /api/categories"
echo ""

echo "🔍 Teste 3: Detalhes das categorias"
echo "-----------------------------------"
echo "Fazendo requisição para API..."

response=$(curl -s --max-time 10 "$BASE_URL/api/categories" 2>/dev/null)

if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ API retornou dados válidos${NC}"

    # Extrair nomes de categorias (simplificado)
    if echo "$response" | grep -q '"name":'; then
        echo ""
        echo "📋 Categorias encontradas:"
        echo "$response" | grep -o '"name":"[^"]*"' | sed 's/"name":"//g' | sed 's/"//g' | while read name; do
            echo "  - $name"
        done
    fi

    # Mostrar imagens
    if echo "$response" | grep -q '"image":'; then
        echo ""
        echo "🖼️  Imagens das categorias:"
        echo "$response" | grep -o '"image":"[^"]*"' | sed 's/"image":"//g' | sed 's/"//g' | while read image; do
            echo "  - $image"
        done
    fi
else
    echo -e "${RED}❌ API não retornou success=true${NC}"
    echo "Resposta: $response"
fi

echo ""
echo "🎯 Teste 4: Verificação de conectividade"
echo "----------------------------------------"
echo "Testando conectividade básica..."

# Testar conectividade
if ping -c 1 -W 2 pastel-delivery.squareweb.app >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Servidor responde a ping${NC}"
else
    echo -e "${YELLOW}⚠️  Servidor não responde a ping (pode ser normal)${NC}"
fi

# Testar HTTPS
if curl -s --max-time 5 "$BASE_URL" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ HTTPS funcionando${NC}"
else
    echo -e "${RED}❌ HTTPS com problemas${NC}"
fi

echo ""
echo "📋 Resumo dos testes"
echo "==================="
echo "Para executar novamente: $SCRIPT_DIR/test-images-curl.sh"
echo "Para testar no navegador: file://$SCRIPT_DIR/image-test.html"
echo ""
echo "Se ainda houver erros 404:"
echo "1. Verifique se as imagens estão em frontend/dist/"
echo "2. Confirme se o banco de dados tem as imagens corretas"
echo "3. Limpe o cache do navegador (Ctrl+F5)"
echo "4. Execute: cd backend && node scripts/fixCategoryImages.js"