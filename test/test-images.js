#!/usr/bin/env node

/**
 * Script de teste para verificar imagens de categoria
 */

const https = require('https');
const http = require('http');

const baseUrl = 'https://pastel-delivery.squareweb.app';

async function testImage(url) {
    return new Promise((resolve) => {
        const client = url.startsWith('https') ? https : http;

        const req = client.request(url, { method: 'HEAD' }, (res) => {
            resolve({
                url,
                status: res.statusCode,
                success: res.statusCode === 200
            });
        });

        req.on('error', (err) => {
            resolve({
                url,
                status: 'ERROR',
                error: err.message,
                success: false
            });
        });

        req.setTimeout(5000, () => {
            resolve({
                url,
                status: 'TIMEOUT',
                success: false
            });
        });

        req.end();
    });
}

async function testDatabase() {
    return new Promise((resolve) => {
        const url = `${baseUrl}/api/categories`;

        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        url,
                        status: res.statusCode,
                        success: jsonData.success,
                        categories: jsonData.data || [],
                        error: jsonData.message
                    });
                } catch (err) {
                    resolve({
                        url,
                        status: res.statusCode,
                        success: false,
                        error: 'Invalid JSON response'
                    });
                }
            });
        }).on('error', (err) => {
            resolve({
                url,
                status: 'ERROR',
                error: err.message,
                success: false
            });
        });
    });
}

async function runTests() {
    console.log('🧪 Iniciando testes de imagens de categoria...\n');

    // Teste 1: Imagens diretas
    console.log('📁 Teste 1: Imagens diretas (frontend/dist)');
    const images = [
        '/pastel-category.svg',
        '/cerveja-category.svg',
        '/bebida-category.svg',
        '/placeholder-category.svg'
    ];

    for (const image of images) {
        const result = await testImage(baseUrl + image);
        console.log(`${result.success ? '✅' : '❌'} ${image}: ${result.status}`);
    }

    console.log('\n📊 Teste 2: Banco de dados');
    const dbResult = await testDatabase();

    if (dbResult.success) {
        console.log('✅ API de categorias funcionando');
        console.log(`📋 Encontradas ${dbResult.categories.length} categorias:`);

        dbResult.categories.forEach(cat => {
            console.log(`  - ${cat.name}: ${cat.image || 'Sem imagem'}`);
        });
    } else {
        console.log('❌ Erro na API:', dbResult.error);
    }

    console.log('\n🔍 Teste 3: URLs resolvidas (simulando frontend)');
    if (dbResult.success) {
        for (const cat of dbResult.categories) {
            if (cat.image) {
                const resolvedUrl = cat.image.startsWith('http')
                    ? cat.image
                    : cat.image.startsWith('/')
                    ? baseUrl + cat.image
                    : baseUrl + '/uploads/' + cat.image;

                console.log(`${cat.name}: ${resolvedUrl}`);
            }
        }
    }

    console.log('\n🎯 Teste 4: Verificação final');
    console.log('Para testar no navegador:');
    console.log('1. Abra: file:///home/mau/projetos/pastel/test/image-test.html');
    console.log('2. Ou acesse via servidor local');
    console.log('3. Verifique se as imagens carregam sem erros 404');
}

runTests().catch(console.error);