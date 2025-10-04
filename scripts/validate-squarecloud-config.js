#!/usr/bin/env node

/**
 * Script para validar configurações do SquareCloud
 * Executa verificações antes do deploy
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validando configurações do SquareCloud...\n');

// Verificar se squarecloud.config existe
const configPath = path.join(__dirname, '..', 'squarecloud.config');
if (!fs.existsSync(configPath)) {
    console.error('❌ Arquivo squarecloud.config não encontrado!');
    process.exit(1);
}

// Ler configurações
const config = fs.readFileSync(configPath, 'utf8');
const lines = config.split('\n').filter(line => line.trim() && !line.startsWith('#'));

console.log('✅ Configurações encontradas:');
lines.forEach(line => {
    const [key, value] = line.split('=');
    console.log(`   ${key}: ${value}`);
});

// Verificar variáveis críticas
const requiredVars = [
    'DISPLAY_NAME',
    'MAIN',
    'MEMORY',
    'START'
];

const missingVars = requiredVars.filter(varName => 
    !lines.some(line => line.startsWith(varName + '='))
);

if (missingVars.length > 0) {
    console.error('\n❌ Variáveis obrigatórias faltando:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    process.exit(1);
}

// Verificar se o arquivo principal existe
const mainFile = lines.find(line => line.startsWith('MAIN='))?.split('=')[1];
if (mainFile && !fs.existsSync(path.join(__dirname, '..', mainFile))) {
    console.error(`\n❌ Arquivo principal não encontrado: ${mainFile}`);
    process.exit(1);
}

console.log('\n🎉 Configuração válida para deploy no SquareCloud!');
console.log('\n📋 Próximos passos:');
console.log('1. Configure as variáveis de ambiente no painel');
console.log('2. Faça o upload do projeto');
console.log('3. Inicie a aplicação');