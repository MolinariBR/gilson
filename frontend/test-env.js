// Teste rápido das variáveis de ambiente
console.log("=== TESTE DE VARIÁVEIS DE AMBIENTE ===");
console.log("VITE_BACKEND_URL:", import.meta.env.VITE_BACKEND_URL);
console.log("MODE:", import.meta.env.MODE);
console.log("DEV:", import.meta.env.DEV);
console.log("PROD:", import.meta.env.PROD);
console.log("Todas as vars:", import.meta.env);
console.log("=====================================");