#!/usr/bin/env node

/**
 * Script para testar deployment no SquareCloud
 * Valida se todas as rotas estão funcionando
 */

const axios = require('axios');

const BASE_URL = process.env.BACKEND_URL || 'https://pastel-delivery.squarecloud.app';

const tests = [
    {
        name: 'Health Check API',
        url: `${BASE_URL}/api/health`,
        method: 'GET',
        expectedStatus: 200
    },
    {
        name: 'Frontend Static Files',
        url: BASE_URL,
        method: 'GET',
        expectedStatus: 200
    },
    {
        name: 'Admin Panel',
        url: `${BASE_URL}/admin`,
        method: 'GET',
        expectedStatus: 200
    },
    {
        name: 'Categories API',
        url: `${BASE_URL}/api/category/list`,
        method: 'GET',
        expectedStatus: 200
    }
];

async function runTests() {
    console.log('🧪 Testando deployment no SquareCloud...\n');
    
    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            console.log(`⏳ ${test.name}...`);
            
            const response = await axios({
                method: test.method,
                url: test.url,
                timeout: 10000,
                validateStatus: () => true // Não lançar erro para status HTTP
            });

            if (response.status === test.expectedStatus) {
                console.log(`✅ ${test.name} - OK (${response.status})`);
                passed++;
            } else {
                console.log(`❌ ${test.name} - FALHOU (${response.status})`);
                failed++;
            }
        } catch (error) {
            console.log(`❌ ${test.name} - ERRO: ${error.message}`);
            failed++;
        }
    }

    console.log(`\n📊 Resultados:`);
    console.log(`✅ Passou: ${passed}`);
    console.log(`❌ Falhou: ${failed}`);
    
    if (failed === 0) {
        console.log('\n🎉 Todos os testes passaram! Deployment funcionando.');
    } else {
        console.log('\n⚠️ Alguns testes falharam. Verifique a configuração.');
        process.exit(1);
    }
}

runTests().catch(console.error);