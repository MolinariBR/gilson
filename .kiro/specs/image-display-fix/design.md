# Design Document

## Overview

O problema das imagens não aparecendo é causado por inconsistências nas URLs de imagens entre frontend, admin e backend, além de problemas na configuração de servir arquivos estáticos. O sistema atual tem múltiplas formas de referenciar imagens, causando confusão e falhas no carregamento.

### Problemas Identificados

1. **URLs Inconsistentes**: O sistema usa diferentes padrões de URL (`/uploads/`, `/images/`, caminhos relativos)
2. **Configuração de Servir Arquivos**: O backend serve imagens em `/uploads` e `/images`, mas os componentes usam URLs diferentes
3. **Fallback de Imagens**: Não há tratamento adequado para imagens que falham ao carregar
4. **Caminhos de Imagem no Banco**: Imagens são salvas com caminhos inconsistentes no banco de dados

## Architecture

### Current State Analysis

**Backend (server.js)**:
- Serve imagens em `/uploads` e `/images` (duplicado)
- Salva imagens em `backend/uploads/` e `backend/uploads/categories/`
- URLs geradas: `/uploads/filename` no foodController

**Frontend**:
- FoodItem: usa `url + image` onde image pode começar com `/uploads/`
- ExploreMenu: usa `item.menu_image` diretamente
- Context: `url` é definido como backend URL

**Admin**:
- List: usa `${url}/images/` + item.image
- CategoryCard: usa função `getImageUrl()` com lógica complexa

### Target Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │      Admin      │    │     Backend     │
│                 │    │                 │    │                 │
│ Image URLs:     │    │ Image URLs:     │    │ Static Serving: │
│ {url}/uploads/  │◄──►│ {url}/uploads/  │◄──►│ /uploads/*      │
│                 │    │                 │    │                 │
│ Fallback:       │    │ Fallback:       │    │ Storage:        │
│ placeholder.png │    │ placeholder.png │    │ uploads/        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Components and Interfaces

### 1. Image URL Resolution Service

**Purpose**: Centralizar a lógica de resolução de URLs de imagens

```javascript
// utils/imageUtils.js
export const resolveImageUrl = (imagePath, baseUrl) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('/uploads/')) return baseUrl + imagePath;
  return baseUrl + '/uploads/' + imagePath;
};

export const getImageWithFallback = (imagePath, baseUrl, fallback = '/placeholder.png') => {
  const resolvedUrl = resolveImageUrl(imagePath, baseUrl);
  return resolvedUrl || (baseUrl + fallback);
};
```

### 2. Image Component with Error Handling

**Purpose**: Componente reutilizável para exibir imagens com fallback

```javascript
// components/SafeImage/SafeImage.jsx
const SafeImage = ({ src, alt, fallback, className, ...props }) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImageSrc(fallback);
    }
  };

  return (
    <img 
      src={imageSrc} 
      alt={alt} 
      className={className}
      onError={handleError}
      {...props}
    />
  );
};
```

### 3. Backend Image Storage Standardization

**Purpose**: Padronizar como imagens são salvas e referenciadas

```javascript
// controllers/imageController.js
const saveImage = (file, category = 'general') => {
  const filename = `${category}_${Date.now()}_${file.originalname}`;
  const relativePath = `/uploads/${category}/${filename}`;
  // Save file to uploads/{category}/{filename}
  return relativePath;
};
```

## Data Models

### Food Model Updates

```javascript
// Padronizar campo image para sempre usar /uploads/
const foodSchema = new mongoose.Schema({
  // ... outros campos
  image: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return v.startsWith('/uploads/');
      },
      message: 'Image path must start with /uploads/'
    }
  }
});
```

### Category Model Updates

```javascript
// Padronizar campo image para sempre usar /uploads/
const categorySchema = new mongoose.Schema({
  // ... outros campos
  image: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return v.startsWith('/uploads/');
      },
      message: 'Image path must start with /uploads/'
    }
  }
});
```

## Error Handling

### 1. Image Loading Errors

- **Frontend**: Implementar onError handlers em todos os componentes de imagem
- **Fallback Strategy**: Usar imagens placeholder quando carregamento falha
- **Retry Logic**: Tentar carregar imagem novamente após falha inicial

### 2. Missing Images

- **Detection**: Verificar se arquivo existe no servidor antes de servir
- **Logging**: Registrar imagens ausentes para debugging
- **Cleanup**: Remover referências de imagens que não existem mais

### 3. Invalid URLs

- **Validation**: Validar URLs de imagem antes de salvar no banco
- **Sanitization**: Limpar e padronizar caminhos de imagem
- **Migration**: Corrigir URLs existentes no banco de dados

## Testing Strategy

### 1. Unit Tests

- **Image Utils**: Testar funções de resolução de URL
- **SafeImage Component**: Testar comportamento de fallback
- **Controllers**: Testar salvamento e recuperação de imagens

### 2. Integration Tests

- **Image Upload**: Testar upload completo (frontend → backend → storage)
- **Image Display**: Testar exibição em diferentes componentes
- **Error Scenarios**: Testar comportamento com imagens ausentes/corrompidas

### 3. End-to-End Tests

- **User Workflows**: Testar fluxos completos de usuário
- **Admin Workflows**: Testar gerenciamento de imagens no admin
- **Cross-browser**: Testar em diferentes navegadores

### 4. Performance Tests

- **Image Loading**: Medir tempo de carregamento de imagens
- **Concurrent Requests**: Testar múltiplas requisições simultâneas
- **Cache Behavior**: Verificar efetividade do cache de imagens

## Implementation Phases

### Phase 1: Backend Standardization
- Padronizar servir de arquivos estáticos
- Corrigir controllers para usar URLs consistentes
- Implementar validação de caminhos de imagem

### Phase 2: Frontend Image Utils
- Criar utilitários de resolução de URL
- Implementar componente SafeImage
- Atualizar componentes existentes

### Phase 3: Admin Panel Updates
- Atualizar componentes de admin para usar novos utilitários
- Implementar preview de imagens durante upload
- Melhorar feedback visual

### Phase 4: Data Migration
- Migrar URLs existentes no banco de dados
- Verificar integridade de imagens existentes
- Limpar arquivos órfãos

### Phase 5: Testing & Optimization
- Implementar testes automatizados
- Otimizar performance de carregamento
- Monitorar e corrigir problemas restantes