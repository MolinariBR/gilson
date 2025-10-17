# Pasta de Testes - Problemas com Imagens

Esta pasta contém ferramentas para testar e debugar problemas com imagens de categoria.

## Arquivos

### `image-test.html`
Página HTML interativa para testar o carregamento de imagens diretamente no navegador.

**Como usar:**
1. Abra o arquivo no navegador: `file:///home/mau/projetos/pastel/test/image-test.html`
2. Ou sirva via servidor local
3. Verifique se as imagens carregam corretamente
4. Use os botões para testar a API e verificar o banco de dados

### `test-images.js`
Script Node.js para testar imagens via linha de comando.

**Como usar:**
```bash
cd /home/mau/projetos/pastel/test
node test-images.js
```

Este script testa:
- ✅ Disponibilidade das imagens SVG
- ✅ Funcionamento da API de categorias
- ✅ Resolução de URLs
- ✅ Status do banco de dados

## Problemas Conhecidos

### Erros 404 em `/uploads/categories/`
- **Sintoma**: Imagens carregam de URLs como `/uploads/categories//pastel-category.svg`
- **Causa**: Função `resolveImageUrl` adicionava `/uploads/` incorretamente
- **Solução**: Modificada para tratar caminhos começando com `/` como absolutos

### Imagens não encontradas
- **Sintoma**: 404 para `pastel-category.svg`, `cerveja-category.svg`
- **Causa**: Imagens não estavam em `frontend/dist/`
- **Solução**: Copiadas manualmente para o diretório de build

## Como Reportar Problemas

1. Execute `node test/test-images.js`
2. Abra `test/image-test.html` no navegador
3. Verifique o console do navegador (F12 → Console)
4. Anote quais testes falham e os erros específicos

## URLs de Teste

- **Imagens diretas**: `https://pastel-delivery.squareweb.app/pastel-category.svg`
- **API de categorias**: `https://pastel-delivery.squareweb.app/api/categories`
- **Página de teste**: `file:///home/mau/projetos/pastel/test/image-test.html`

## Comandos Úteis

```bash
# Executar testes
cd test && node test-images.js

# Verificar se imagens existem
ls -la ../frontend/dist/*.svg

# Verificar banco de dados
curl https://pastel-delivery.squareweb.app/api/categories
```