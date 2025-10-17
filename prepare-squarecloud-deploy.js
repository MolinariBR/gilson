#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Preparando projeto para deploy no SquareCloud...');

// Função para remover diretório recursivamente
function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    console.log(`🗑️  Removendo ${dirPath}`);
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

// Função para remover arquivo
function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    console.log(`🗑️  Removendo ${filePath}`);
    fs.unlinkSync(filePath);
  }
}

// Remover node_modules (serão reinstalados no deploy)
removeDir('node_modules');
removeDir('backend/node_modules');
removeDir('frontend/node_modules');
removeDir('admin/node_modules');

// Remover arquivos de desenvolvimento
removeDir('.git');
removeDir('.kiro');
removeDir('Food-Delivery-main');

// Garantir que a estrutura de uploads exista (preservar imagens existentes)
if (!fs.existsSync('backend/uploads')) {
  fs.mkdirSync('backend/uploads', { recursive: true });
}
if (!fs.existsSync('backend/uploads/categories')) {
  fs.mkdirSync('backend/uploads/categories', { recursive: true });
}

// Remover testes
removeDir('backend/tests');
removeDir('frontend/src/test');
removeDir('admin/src/test');

// Remover arquivos de configuração de desenvolvimento
removeFile('frontend/vitest.config.js');
removeFile('admin/vitest.config.js');

// Remover documentação desnecessária
removeFile('DEPLOY.md');
removeFile('DEPLOYMENT_GUIDE.md');
removeFile('DEPLOYMENT_INTEGRATION.md');
removeFile('PRODUCTION_CONFIG.md');
removeFile('TEST_CATEGORY_README.md');
removeFile('URL_CONFIGURATION_SUMMARY.md');

// Remover scripts de teste
removeFile('test_category_complete.js');
removeFile('test_category_creation.js');
removeFile('setup_admin.js');

// Remover package-lock.json da raiz (não necessário)
removeFile('package-lock.json');

console.log('✅ Projeto otimizado para deploy!');
console.log('📦 Verificando tamanho final...');

try {
  const size = execSync('du -sh .', { encoding: 'utf8' }).trim();
  console.log(`📊 Tamanho atual: ${size}`);
} catch (error) {
  console.log('⚠️  Não foi possível verificar o tamanho');
}

console.log('\n🎯 Próximos passos:');
console.log('1. Comprima o projeto em um arquivo ZIP');
console.log('2. Faça upload no SquareCloud');
console.log('3. O SquareCloud instalará as dependências automaticamente');