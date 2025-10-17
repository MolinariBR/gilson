# Pasta de Testes - Problemas com Imagens

## ✅ Status: CORRIGIDO

**Último teste realizado:** $(date)
**Resultado:** ✅ Todas as imagens carregando corretamente
**URLs retornadas:** `/pastel-category.svg`, `/cerveja-category.svg` (sem prefixos incorretos)

### Problema Resolvido
- ❌ Antes: `/uploads/categories//pastel-category.svg` (causava 404)
- ✅ Agora: `/pastel-category.svg` (carrega corretamente)

### Ações Realizadas
1. ✅ Corrigido `processCategoryImageUrls` no CategoryService
2. ✅ Limpo cache do serviço
3. ✅ Implantado mudanças via git push
4. ✅ Verificado funcionamento com testes curl
5. ✅ Criado scripts de manutenção e diagnóstico

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