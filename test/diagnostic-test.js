const axios = require('axios');

async function runDiagnostics() {
    console.log('🔍 Iniciando diagnóstico do sistema Pastel...\n');

    const results = {
        backend: false,
        database: false,
        adminPanel: false,
        apiRoutes: []
    };

    // 1. Testar se o backend está respondendo
    console.log('1. Testando conexão com o backend...');
    try {
        const backendResponse = await axios.get('http://localhost:4000', { timeout: 5000 });
        results.backend = true;
        console.log('✅ Backend está respondendo (porta 4000)');
    } catch (error) {
        console.log('❌ Backend não está respondendo:', error.message);
        return results;
    }

    // 2. Testar conexão com banco de dados via API
    console.log('\n2. Testando conexão com banco de dados...');
    try {
        // Tentar fazer uma requisição que envolva o banco de dados
        const dbTestResponse = await axios.get('http://localhost:4000/api/food/list', { timeout: 5000 });
        if (dbTestResponse.data && dbTestResponse.data.success !== false) {
            results.database = true;
            console.log('✅ Banco de dados está conectado');
        } else {
            console.log('⚠️  Resposta do banco de dados suspeita:', dbTestResponse.data);
        }
    } catch (error) {
        console.log('❌ Problema com banco de dados:', error.message);
        // Tentar outras rotas que usam DB
        try {
            const categoryResponse = await axios.get('http://localhost:4000/api/category/list', { timeout: 5000 });
            if (categoryResponse.data && categoryResponse.data.success !== false) {
                results.database = true;
                console.log('✅ Banco de dados está conectado (via categories)');
            }
        } catch (dbError) {
            console.log('❌ Banco de dados definitivamente com problema:', dbError.message);
        }
    }

    // 3. Testar rotas críticas da API
    console.log('\n3. Testando rotas críticas da API...');
    const routesToTest = [
        { name: 'Food List', url: '/api/food/list' },
        { name: 'Category List', url: '/api/categories' },
        { name: 'User Login', url: '/api/user/login', method: 'post', data: { name: 'test' } },
        { name: 'Order List', url: '/api/order/list' }
    ];

    for (const route of routesToTest) {
        try {
            const method = route.method || 'get';
            const config = { timeout: 5000 };
            
            if (method === 'post' && route.data) {
                config.method = 'post';
                config.data = route.data;
                config.headers = { 'Content-Type': 'application/json' };
            }
            
            const response = await axios(`http://localhost:4000${route.url}`, config);
            if (response.data && response.data.success !== false) {
                results.apiRoutes.push({ name: route.name, status: '✅ OK' });
                console.log(`✅ ${route.name}: OK`);
            } else {
                results.apiRoutes.push({ name: route.name, status: '⚠️  Resposta suspeita' });
                console.log(`⚠️  ${route.name}: Resposta suspeita`);
            }
        } catch (error) {
            results.apiRoutes.push({ name: route.name, status: `❌ ${error.message}` });
            console.log(`❌ ${route.name}: ${error.message}`);
        }
    }

    // 4. Testar se o admin panel está carregando
    console.log('\n4. Testando carregamento do admin panel...');
    try {
        const adminResponse = await axios.get('http://localhost:5174', { timeout: 5000 });
        if (adminResponse.data && adminResponse.data.includes('<div id="root"></div>')) {
            results.adminPanel = true;
            console.log('✅ Admin panel HTML está sendo servido');

            // Verificar se o JavaScript está sendo carregado
            if (adminResponse.data.includes('src="/src/main.jsx"')) {
                console.log('✅ JavaScript do admin está sendo referenciado');
            } else {
                console.log('⚠️  JavaScript do admin não encontrado no HTML');
            }
        } else {
            console.log('⚠️  HTML do admin panel não parece correto');
        }
    } catch (error) {
        console.log('❌ Admin panel não está respondendo:', error.message);
    }

    // 5. Verificar CORS
    console.log('\n5. Testando CORS...');
    try {
        const corsResponse = await axios.get('http://localhost:4000/api/category/list', {
            headers: {
                'Origin': 'http://localhost:5174'
            },
            timeout: 5000
        });
        console.log('✅ CORS parece estar funcionando');
    } catch (error) {
        if (error.response && error.response.status === 200) {
            console.log('✅ CORS está funcionando');
        } else {
            console.log('⚠️  Possível problema com CORS:', error.message);
        }
    }

    // 6. Resumo final
    console.log('\n📊 RESUMO DO DIAGNÓSTICO:');
    console.log('='.repeat(50));
    console.log(`Backend: ${results.backend ? '✅ OK' : '❌ FALHA'}`);
    console.log(`Banco de dados: ${results.database ? '✅ OK' : '❌ FALHA'}`);
    console.log(`Admin Panel: ${results.adminPanel ? '✅ OK' : '❌ FALHA'}`);
    console.log('\nRotas da API:');
    results.apiRoutes.forEach(route => {
        console.log(`  ${route.name}: ${route.status}`);
    });

    if (!results.backend) {
        console.log('\n🔧 RECOMENDAÇÕES:');
        console.log('- Verifique se o servidor backend está rodando (npm run dev no diretório backend)');
        console.log('- Verifique se a porta 4000 não está sendo usada por outro processo');
    }

    if (!results.database) {
        console.log('\n🔧 RECOMENDAÇÕES PARA BANCO DE DADOS:');
        console.log('- Verifique se o MongoDB está rodando');
        console.log('- Verifique as configurações de conexão no backend/config/db.js');
        console.log('- Verifique se as variáveis de ambiente estão corretas');
    }

    if (!results.adminPanel) {
        console.log('\n🔧 RECOMENDAÇÕES PARA ADMIN PANEL:');
        console.log('- Verifique se o servidor admin está rodando (npm run dev no diretório admin)');
        console.log('- Verifique se a porta 5174 não está sendo usada');
        console.log('- Verifique o console do navegador para erros de JavaScript');
        console.log('- Verifique se todas as dependências estão instaladas (npm install)');
    }

    return results;
}

// Executar diagnóstico
runDiagnostics().catch(error => {
    console.error('❌ Erro durante o diagnóstico:', error.message);
    process.exit(1);
});