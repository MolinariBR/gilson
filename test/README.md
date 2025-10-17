# Pasta de Testes - Problemas com Imagens

## ✅ Status: COMPLETAMENTE RESOLVIDO

**Último teste realizado:** $(date)
**Resultado:** ✅ Todas as imagens carregando perfeitamente
**Status da API:** ✅ Retornando imagens corretas
**Imagens testadas:** ✅ Todas com status 200

### Problema Final Resolvido
- ❌ Antes: `/uploads//cerveja-category.svg` (404)
- ❌ Antes: `/uploads/image-1760738279911-589520138.jpg` (404)
- ✅ Agora: `/cerveja-category.svg` (200 OK)
- ✅ Agora: `/pastel-category.svg` (200 OK)
- ✅ Agora: `/placeholder-category.svg` (200 OK)

### Ações Executadas
1. ✅ Identificado problema: categorias com imagens JPG inexistentes
2. ✅ Executado script de correção para definir imagens SVG padrão
3. ✅ Limpo cache do CategoryService
4. ✅ Forçado reimplantação no SquareCloud via git push
5. ✅ Verificado carregamento de todas as imagens SVG
6. ✅ Executado testes completos de validação

### Categorias Corrigidas
- **Pasteis**: `/uploads/image-1760738279911-589520138.jpg` → `/pastel-category.svg`
- **Cervejas**: Já estava correto `/cerveja-category.svg`
- **Pastel**: `/uploads/image-1760738338080-188940503.jpg` → `/placeholder-category.svg`

Esta pasta contém ferramentas para testar e debugar problemas com imagens de categoria.

## Arquivos

### `image-test.html`
Página HTML interativa para testar o carregamento de imagens diretamente no navegador.

**Como usar:**
1. Abra o arquivo no navegador: `file:///home/mau/projetos/pastel/test/image-test.html`
2. Ou sirva via servidor local
3. Verifique se as imagens carregam corretamente
4. Use os botões para testar a API e verificar o banco de dados

### `test-images-curl.sh`
Script bash que usa curl para testar imagens e API via linha de comando.

**Como usar:**
```bash
cd /home/mau/projetos/pastel/test
./test-images-curl.sh
```

Este script testa:
- ✅ Disponibilidade das imagens SVG via HTTP
- ✅ Funcionamento da API de categorias
- ✅ Resolução de URLs simulando o frontend
- ✅ Conectividade básica do servidor
- ✅ Parsing JSON da API

### `test-images.js`
Script Node.js alternativo para testes (pode ter problemas de conectividade).

## Problemas Conhecidos

### Erros 404 em `/uploads/categories/`
- **Sintoma**: Imagens carregam de URLs como `/uploads/categories//pastel-category.svg`
- **Causa**: Função `resolveImageUrl` adicionava `/uploads/` incorretamente
- **Solução**: Modificada para tratar caminhos que começam com `/` como absolutos

### Imagens não encontradas
- **Sintoma**: 404 para `pastel-category.svg`, `cerveja-category.svg`
- **Causa**: Imagens não estavam em `frontend/dist/`
- **Solução**: Copiadas manualmente para o diretório de build

## Como Reportar Problemas

1. Execute `./test/test-images-curl.sh`
2. Abra `test/image-test.html` no navegador
3. Verifique o console do navegador (F12 → Console)
4. Anote quais testes falham e os erros específicos

## URLs de Teste

- **Imagens diretas**: `https://pastel-delivery.squareweb.app/pastel-category.svg`
- **API de categorias**: `https://pastel-delivery.squareweb.app/api/categories`
- **Página de teste**: `file:///home/mau/projetos/pastel/test/image-test.html`

## Comandos Úteis

```bash
# Executar testes com curl
cd test && ./test-images-curl.sh

# Testar imagem específica
curl -I https://pastel-delivery.squareweb.app/pastel-category.svg

# Verificar API
curl https://pastel-delivery.squareweb.app/api/categories | jq .

# Testar no navegador
cd test && python3 -m http.server 8000
# Acesse: http://localhost:8000/image-test.html

# Corrigir banco de dados
cd ../backend && node scripts/fixCategoryImages.js
```