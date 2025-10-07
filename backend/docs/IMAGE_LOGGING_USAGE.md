# Image Logging Usage Guide

Este documento explica como usar o sistema de logging de imagens implementado no `backend/utils/logger.js`.

## Visão Geral

O sistema de logging de imagens fornece logging abrangente para todas as operações relacionadas a imagens, incluindo:

- Upload de imagens
- Servir imagens
- Validação de imagens
- Operações de arquivo
- Métricas de performance
- Cache de imagens
- Manutenção e limpeza

## Importação

```javascript
import { logger, imageLogger, imageServingMiddleware } from '../utils/logger.js';
```

## Uso Básico

### 1. Logging de Upload de Imagens

```javascript
// No controller de upload
const uploadImage = async (req, res) => {
  const file = req.file;
  const userId = req.user?.id;
  
  try {
    // Log início do upload
    logger.image.upload.start(file.originalname, file.size, file.mimetype, userId);
    
    // Validação
    if (!isValidImageType(file.mimetype)) {
      logger.image.upload.validation.failed(file.originalname, 'Invalid file type', userId);
      return res.status(400).json({ error: 'Invalid file type' });
    }
    
    logger.image.upload.validation.passed(file.originalname, ['type', 'size'], userId);
    
    // Operação de upload usando o wrapper de logging
    const result = await imageLogger.logUpload(
      async () => {
        const savedPath = await saveImageToStorage(file);
        logger.image.file.created(savedPath, file.size);
        return { path: savedPath };
      },
      file.originalname,
      file.size,
      file.mimetype,
      userId
    );
    
    res.json({ success: true, path: result.path });
    
  } catch (error) {
    // O erro já foi logado pelo imageLogger.logUpload
    res.status(500).json({ error: 'Upload failed' });
  }
};
```

### 2. Logging de Servir Imagens

```javascript
// Middleware automático (adicionar no server.js)
app.use('/uploads', imageServingMiddleware, express.static('uploads'));

// Ou logging manual em rotas customizadas
const serveImage = async (req, res) => {
  const imagePath = req.params.imagePath;
  
  try {
    await imageLogger.logServing(
      async () => {
        const filePath = path.join(uploadsDir, imagePath);
        const stats = fs.statSync(filePath);
        
        res.sendFile(filePath);
        return { size: stats.size, cached: false };
      },
      imagePath,
      req
    );
  } catch (error) {
    // Erro já foi logado pelo imageLogger.logServing
    res.status(404).json({ error: 'Image not found' });
  }
};
```

### 3. Logging de Validação

```javascript
const validateImage = (file, userId) => {
  const checks = [];
  
  // Validar tipo
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
    logger.image.upload.validation.failed(file.originalname, 'Invalid MIME type', userId);
    return false;
  }
  checks.push('mimetype');
  
  // Validar tamanho
  if (file.size > 5 * 1024 * 1024) { // 5MB
    logger.image.upload.validation.failed(file.originalname, 'File too large', userId);
    return false;
  }
  checks.push('size');
  
  logger.image.upload.validation.passed(file.originalname, checks, userId);
  return true;
};
```

### 4. Logging de Performance

```javascript
// Logging automático de operações lentas
const processImage = async (imagePath) => {
  const startTime = Date.now();
  
  try {
    // Processar imagem...
    const result = await heavyImageProcessing(imagePath);
    
    const duration = Date.now() - startTime;
    
    // Log automático se for lento (> 5 segundos)
    logger.image.performance.slowUpload(imagePath, duration);
    
    return result;
  } catch (error) {
    throw error;
  }
};

// Coletar métricas manualmente
imageLogger.performanceCollector.record('resize', 1500);
imageLogger.performanceCollector.record('resize', 2000);
imageLogger.performanceCollector.record('resize', 1200);

// Relatório automático a cada 5 minutos, ou manual:
imageLogger.performanceCollector.report();
```

### 5. Logging de Operações de Arquivo

```javascript
const deleteImage = async (imagePath, reason = 'user request') => {
  try {
    fs.unlinkSync(imagePath);
    logger.image.file.deleted(imagePath, reason);
  } catch (error) {
    logger.image.file.corrupted(imagePath, error);
    throw error;
  }
};

const moveImage = async (oldPath, newPath) => {
  try {
    fs.renameSync(oldPath, newPath);
    logger.image.file.moved(oldPath, newPath);
  } catch (error) {
    logger.image.serving.error(oldPath, error, 'system');
    throw error;
  }
};
```

### 6. Logging de Cache

```javascript
const getCachedImage = (imagePath) => {
  const cacheKey = generateCacheKey(imagePath);
  
  if (cache.has(cacheKey)) {
    logger.image.cache.hit(imagePath, cacheKey);
    return cache.get(cacheKey);
  }
  
  logger.image.cache.miss(imagePath, cacheKey);
  return null;
};

const invalidateImageCache = (pattern, reason) => {
  cache.clear(pattern);
  logger.image.cache.invalidated(pattern, reason);
};
```

### 7. Logging de Manutenção

```javascript
const cleanupOrphanedImages = async () => {
  const orphanedFiles = await findOrphanedImages();
  let deletedCount = 0;
  let freedSpace = 0;
  
  for (const file of orphanedFiles) {
    try {
      const stats = fs.statSync(file.path);
      fs.unlinkSync(file.path);
      
      deletedCount++;
      freedSpace += stats.size;
      
      logger.image.maintenance.orphanDetected(file.path, file.reason);
    } catch (error) {
      logger.image.file.corrupted(file.path, error);
    }
  }
  
  logger.image.maintenance.cleanup(deletedCount, freedSpace);
};

const migrateImageUrls = async () => {
  const startTime = Date.now();
  let affectedCount = 0;
  
  try {
    // Migração...
    affectedCount = await performMigration();
    
    const duration = Date.now() - startTime;
    logger.image.maintenance.migration('url-standardization', affectedCount, duration);
    
  } catch (error) {
    logger.system.error('Migration failed', error);
    throw error;
  }
};
```

## Arquivos de Log Gerados

O sistema cria os seguintes arquivos de log:

- `logs/images.log` - Todos os logs relacionados a imagens
- `logs/missing-images.log` - Log específico para imagens não encontradas
- `logs/performance.log` - Métricas de performance de imagens
- `logs/errors.log` - Erros relacionados a imagens (também incluído nos logs gerais)

## Configuração do Middleware

Para habilitar o logging automático de servir imagens, adicione o middleware no `server.js`:

```javascript
import { imageServingMiddleware } from './utils/logger.js';

// Aplicar middleware antes de servir arquivos estáticos
app.use('/uploads', imageServingMiddleware, express.static('uploads'));
```

## Monitoramento e Alertas

O sistema automaticamente:

- Reporta métricas de performance a cada 5 minutos
- Detecta operações lentas (upload > 5s, serving > 1s)
- Registra imagens não encontradas para análise
- Coleta estatísticas de uso

## Exemplo de Integração Completa

```javascript
// foodController.js
import { logger, imageLogger } from '../utils/logger.js';

const addFood = async (req, res) => {
  const userId = req.user?.id;
  
  try {
    if (req.file) {
      // Upload com logging completo
      const uploadResult = await imageLogger.logUpload(
        async () => {
          // Validação
          if (!validateImage(req.file, userId)) {
            throw new Error('Invalid image');
          }
          
          // Salvar arquivo
          const imagePath = `/uploads/${req.file.filename}`;
          logger.image.file.created(imagePath, req.file.size);
          
          return { path: imagePath };
        },
        req.file.originalname,
        req.file.size,
        req.file.mimetype,
        userId
      );
      
      req.body.image = uploadResult.path;
    }
    
    // Salvar no banco de dados...
    const food = new Food(req.body);
    await food.save();
    
    res.json({ success: true, data: food });
    
  } catch (error) {
    logger.api.error('Failed to add food', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
```

Este sistema de logging fornece visibilidade completa sobre todas as operações de imagem, facilitando o debugging, monitoramento de performance e manutenção do sistema.