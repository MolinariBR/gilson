import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Teste 1: Verificar se os arquivos existem
router.get('/check-files', (req, res) => {
  logger.backend.info('🔍 Verificando existência dos arquivos...');
  
  const files = [
    { name: 'Frontend CSS', path: path.join(__dirname, '../../frontend/dist/assets/index-C6a7aT4-.css') },
    { name: 'Frontend JS', path: path.join(__dirname, '../../frontend/dist/assets/index-DQa1iJSy.js') },
    { name: 'Admin CSS', path: path.join(__dirname, '../../admin/dist/assets/index-B03NhcvP.css') },
    { name: 'Admin JS', path: path.join(__dirname, '../../admin/dist/assets/index-r_bhB-z9.js') }
  ];
  
  const results = files.map(file => {
    const exists = fs.existsSync(file.path);
    let size = 0;
    let content = '';
    
    if (exists) {
      const stats = fs.statSync(file.path);
      size = stats.size;
      // Ler primeiros 100 caracteres para verificar conteúdo
      content = fs.readFileSync(file.path, 'utf8').substring(0, 100);
    }
    
    logger.backend.info(`${file.name}: ${exists ? '✅ Existe' : '❌ Não existe'} - ${size} bytes`);
    
    return {
      name: file.name,
      path: file.path,
      exists,
      size,
      preview: content
    };
  });
  
  res.json({
    message: 'Verificação de arquivos concluída',
    files: results,
    timestamp: new Date().toISOString()
  });
});

// Teste 2: Servir arquivo diretamente (bypass de todas as rotas)
router.get('/direct-css', (req, res) => {
  logger.backend.info('🎯 Servindo CSS diretamente...');
  
  const cssPath = path.join(__dirname, '../../frontend/dist/assets/index-C6a7aT4-.css');
  
  if (!fs.existsSync(cssPath)) {
    logger.backend.error('❌ Arquivo CSS não encontrado');
    return res.status(404).send('CSS file not found');
  }
  
  try {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Test-Route', 'direct-css');
    
    logger.backend.info(`✅ CSS servido diretamente - ${cssContent.length} caracteres`);
    res.send(cssContent);
  } catch (error) {
    logger.backend.error('❌ Erro ao ler arquivo CSS:', error);
    res.status(500).send('Error reading CSS file');
  }
});

// Teste 3: Servir JS diretamente
router.get('/direct-js', (req, res) => {
  logger.backend.info('🎯 Servindo JS diretamente...');
  
  const jsPath = path.join(__dirname, '../../frontend/dist/assets/index-DQa1iJSy.js');
  
  if (!fs.existsSync(jsPath)) {
    logger.backend.error('❌ Arquivo JS não encontrado');
    return res.status(404).send('JS file not found');
  }
  
  try {
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Test-Route', 'direct-js');
    
    logger.backend.info(`✅ JS servido diretamente - ${jsContent.length} caracteres`);
    res.send(jsContent);
  } catch (error) {
    logger.backend.error('❌ Erro ao ler arquivo JS:', error);
    res.status(500).send('Error reading JS file');
  }
});

// Teste 4: Verificar headers de uma requisição
router.get('/check-headers', (req, res) => {
  logger.backend.info('🔍 Verificando headers da requisição...');
  
  const headers = {
    'user-agent': req.headers['user-agent'],
    'accept': req.headers['accept'],
    'accept-encoding': req.headers['accept-encoding'],
    'accept-language': req.headers['accept-language'],
    'cache-control': req.headers['cache-control'],
    'cf-ray': req.headers['cf-ray'],
    'cf-visitor': req.headers['cf-visitor'],
    'x-forwarded-for': req.headers['x-forwarded-for'],
    'x-forwarded-proto': req.headers['x-forwarded-proto']
  };
  
  logger.backend.info('Headers recebidos:', headers);
  
  res.json({
    message: 'Headers da requisição',
    headers,
    ip: req.ip,
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
});

// Teste 5: Simular requisição de asset
router.get('/simulate-asset/:filename', (req, res) => {
  const filename = req.params.filename;
  logger.backend.info(`🎭 Simulando requisição de asset: ${filename}`);
  
  // Simular o que acontece na rota /assets
  if (filename.includes('index-C6a7aT4-.css')) {
    logger.backend.info('📄 Simulando CSS do frontend');
    res.setHeader('Content-Type', 'text/css');
    res.setHeader('X-Simulated', 'true');
    return res.send('/* CSS simulado */\nbody { background: red; }');
  }
  
  if (filename.includes('index-DQa1iJSy.js')) {
    logger.backend.info('📄 Simulando JS do frontend');
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('X-Simulated', 'true');
    return res.send('// JS simulado\nconsole.log("Teste JS funcionando");');
  }
  
  res.status(404).send('Asset não encontrado na simulação');
});

// Teste 6: Debug completo da rota /assets
router.get('/debug-assets', (req, res) => {
  logger.backend.info('🐛 Debug completo da rota /assets');
  
  const assetsMiddleware = req.app._router.stack.find(layer => 
    layer.regexp.toString().includes('assets')
  );
  
  res.json({
    message: 'Debug da rota /assets',
    hasAssetsRoute: !!assetsMiddleware,
    routerStack: req.app._router.stack.length,
    timestamp: new Date().toISOString()
  });
});

export default router;