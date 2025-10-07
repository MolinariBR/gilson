# Design Document

## Overview

O design proposto resolve o problema de imagens compartilhadas entre categorias implementando um sistema de nomenclatura única baseada no ID da categoria, melhorando o processo de upload e validação de imagens, e garantindo que cada categoria mantenha sua própria imagem independente. A solução foca em três áreas principais: nomenclatura única de arquivos, validação robusta de uploads e sincronização adequada entre frontend e backend.

## Architecture

### Current Problem Analysis
Atualmente, o sistema tem os seguintes problemas:
1. **Nomenclatura de arquivos não única**: Imagens são salvas com nomes baseados apenas no nome original do arquivo + timestamp, sem referência à categoria
2. **Falta de isolamento**: Não há mecanismo para garantir que cada categoria tenha sua própria imagem
3. **Problemas de sincronização**: Updates de imagem podem afetar múltiplas categorias inadvertidamente
4. **Validação insuficiente**: O sistema não verifica adequadamente se a imagem está sendo associada corretamente à categoria

### Proposed Solution Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Category Image Management                 │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Admin)           │  Backend Services              │
│  ┌─────────────────────┐   │  ┌─────────────────────────┐   │
│  │ CategoryForm        │   │  │ CategoryService         │   │
│  │ - Image Upload      │◄──┤  │ - Unique File Naming    │   │
│  │ - Preview           │   │  │ - Image Validation      │   │
│  │ - Validation        │   │  │ - File Management       │   │
│  └─────────────────────┘   │  └─────────────────────────┘   │
│                             │                                │
│  ┌─────────────────────┐   │  ┌─────────────────────────┐   │
│  │ ImageUpload         │   │  │ File System             │   │
│  │ - Drag & Drop       │   │  │ /uploads/categories/    │   │
│  │ - File Validation   │   │  │ ├─ cat_[ID]_[timestamp] │   │
│  │ - Error Handling    │   │  │ ├─ cat_[ID]_[timestamp] │   │
│  └─────────────────────┘   │  │ └─ ...                  │   │
│                             │  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Enhanced CategoryService Methods

#### `generateUniqueImageName(categoryId, originalFilename)`
- **Purpose**: Gerar nome único para imagem baseado no ID da categoria
- **Input**: ID da categoria, nome original do arquivo
- **Output**: Nome único no formato `cat_[categoryId]_[timestamp].[ext]`
- **Logic**: Combina prefixo "cat_", ID da categoria, timestamp atual e extensão original

#### `processImageUpload(imageFile, categoryId, oldImagePath)`
- **Purpose**: Processar upload de imagem com validação e limpeza
- **Input**: Arquivo de imagem, ID da categoria, caminho da imagem anterior (opcional)
- **Output**: Resultado do processamento com novo caminho da imagem
- **Logic**: 
  1. Validar arquivo de imagem
  2. Gerar nome único usando categoryId
  3. Salvar arquivo no sistema
  4. Otimizar imagem se necessário
  5. Remover imagem anterior se existir
  6. Retornar novo caminho

#### `validateCategoryImageAssociation(categoryId, imagePath)`
- **Purpose**: Validar se a imagem pertence à categoria correta
- **Input**: ID da categoria, caminho da imagem
- **Output**: Boolean indicando se a associação é válida
- **Logic**: Verificar se o nome do arquivo contém o ID da categoria

### 2. Enhanced ImageUpload Component

#### New Props and State
```javascript
// Props
{
  categoryId: string,        // ID da categoria para nomenclatura única
  currentImage: string,      // Imagem atual da categoria
  onImageChange: function,   // Callback para mudança de imagem
  error: string             // Mensagem de erro
}

// State
{
  preview: string,          // Preview da nova imagem
  isUploading: boolean,     // Estado de upload
  validationError: string   // Erro de validação local
}
```

#### Enhanced Validation Logic
- Validar tipo de arquivo (JPEG, PNG, WEBP)
- Validar tamanho máximo (2MB)
- Validar dimensões mínimas (100x100px)
- Validar se o arquivo não está corrompido

### 3. Database Schema Enhancements

#### Category Model Validation
```javascript
// Enhanced image field validation
image: { 
  type: String, 
  required: true,
  trim: true,
  validate: {
    validator: function(v) {
      // Must start with /uploads/categories/
      if (!v.startsWith('/uploads/categories/')) return false;
      
      // Must contain category ID in filename for new uploads
      if (this.isNew || this.isModified('image')) {
        const filename = v.split('/').pop();
        return filename.startsWith(`cat_${this._id}_`);
      }
      
      return true;
    },
    message: 'Image path must be valid and unique to this category'
  }
}
```

### 4. File System Organization

#### Directory Structure
```
/uploads/categories/
├── cat_[categoryId1]_[timestamp1].jpg
├── cat_[categoryId2]_[timestamp2].png
├── cat_[categoryId3]_[timestamp3].webp
└── ...
```

#### Naming Convention
- **Format**: `cat_[categoryId]_[timestamp].[extension]`
- **Example**: `cat_507f1f77bcf86cd799439011_1704067200000.jpg`
- **Benefits**: 
  - Garantia de unicidade por categoria
  - Facilita identificação e limpeza
  - Permite rastreamento temporal
  - Evita conflitos de nomes

## Data Models

### Enhanced Category Data Flow

#### Create Category Flow
```javascript
// 1. Frontend sends FormData with image
const formData = new FormData();
formData.append('name', categoryName);
formData.append('image', imageFile);

// 2. Backend processes with unique naming
const uniqueImageName = generateUniqueImageName(newCategoryId, imageFile.originalname);
const imagePath = await saveImageWithUniqueName(imageFile, uniqueImageName);

// 3. Save category with unique image path
const category = new categoryModel({
  name: categoryName,
  image: `/uploads/categories/${uniqueImageName}`,
  // ... other fields
});
```

#### Update Category Flow
```javascript
// 1. Check if new image is provided
if (imageFile) {
  // 2. Generate new unique name
  const uniqueImageName = generateUniqueImageName(categoryId, imageFile.originalname);
  
  // 3. Save new image
  const newImagePath = await saveImageWithUniqueName(imageFile, uniqueImageName);
  
  // 4. Remove old image
  if (existingCategory.image) {
    await removeOldCategoryImage(existingCategory.image);
  }
  
  // 5. Update category with new image path
  updateData.image = `/uploads/categories/${uniqueImageName}`;
}
```

### Image Validation Schema
```javascript
const imageValidationSchema = {
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  maxSize: 2 * 1024 * 1024, // 2MB
  minDimensions: { width: 100, height: 100 },
  maxDimensions: { width: 2000, height: 2000 }
};
```

## Error Handling

### Frontend Error Handling
```javascript
// Image validation errors
const imageErrors = {
  INVALID_TYPE: 'Tipo de arquivo inválido. Use JPG, PNG ou WEBP.',
  FILE_TOO_LARGE: 'Arquivo muito grande. Máximo 2MB.',
  DIMENSIONS_INVALID: 'Dimensões inválidas. Mínimo 100x100px.',
  UPLOAD_FAILED: 'Falha no upload. Tente novamente.',
  CATEGORY_MISMATCH: 'Erro interno: imagem não corresponde à categoria.'
};
```

### Backend Error Handling
```javascript
// Service layer error responses
const serviceErrors = {
  IMAGE_VALIDATION_FAILED: {
    success: false,
    code: 'IMAGE_VALIDATION_FAILED',
    message: 'Validação da imagem falhou',
    details: {} // Specific validation errors
  },
  FILE_SAVE_FAILED: {
    success: false,
    code: 'FILE_SAVE_FAILED',
    message: 'Falha ao salvar arquivo de imagem'
  },
  OLD_IMAGE_CLEANUP_FAILED: {
    success: false,
    code: 'OLD_IMAGE_CLEANUP_FAILED',
    message: 'Falha ao remover imagem anterior'
  }
};
```

### Rollback Strategy
```javascript
// If image save fails during category update
const rollbackImageUpdate = async (categoryId, originalImagePath) => {
  try {
    // Restore original image path in database
    await categoryModel.findByIdAndUpdate(categoryId, {
      image: originalImagePath
    });
    
    // Remove any partially uploaded files
    await cleanupFailedUploads(categoryId);
    
  } catch (rollbackError) {
    console.error('Rollback failed:', rollbackError);
    // Log for manual intervention
  }
};
```

## Testing Strategy

### Unit Tests

#### CategoryService Tests
```javascript
describe('CategoryService Image Management', () => {
  test('generateUniqueImageName creates unique names', () => {
    const categoryId = '507f1f77bcf86cd799439011';
    const filename = 'test.jpg';
    const result = generateUniqueImageName(categoryId, filename);
    expect(result).toMatch(/^cat_507f1f77bcf86cd799439011_\d+\.jpg$/);
  });

  test('processImageUpload handles file correctly', async () => {
    const mockFile = createMockImageFile();
    const categoryId = '507f1f77bcf86cd799439011';
    const result = await processImageUpload(mockFile, categoryId);
    expect(result.success).toBe(true);
    expect(result.imagePath).toContain(categoryId);
  });

  test('validateCategoryImageAssociation validates correctly', () => {
    const categoryId = '507f1f77bcf86cd799439011';
    const validPath = '/uploads/categories/cat_507f1f77bcf86cd799439011_1704067200000.jpg';
    const invalidPath = '/uploads/categories/cat_different_id_1704067200000.jpg';
    
    expect(validateCategoryImageAssociation(categoryId, validPath)).toBe(true);
    expect(validateCategoryImageAssociation(categoryId, invalidPath)).toBe(false);
  });
});
```

#### ImageUpload Component Tests
```javascript
describe('ImageUpload Component', () => {
  test('validates file type correctly', () => {
    const validFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });
    
    expect(validateImageFile(validFile)).toBe(null);
    expect(validateImageFile(invalidFile)).toContain('Tipo de arquivo inválido');
  });

  test('generates preview for valid images', async () => {
    const mockFile = createMockImageFile();
    const component = render(<ImageUpload categoryId="test" />);
    
    await component.handleImageSelect(mockFile);
    expect(component.state.preview).toBeTruthy();
  });
});
```

### Integration Tests

#### End-to-End Category Image Workflow
```javascript
describe('Category Image E2E Workflow', () => {
  test('complete category creation with unique image', async () => {
    // 1. Create category with image
    const categoryData = { name: 'Test Category' };
    const imageFile = createTestImageFile();
    
    const response = await request(app)
      .post('/api/admin/categories')
      .field('name', categoryData.name)
      .attach('image', imageFile)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(201);
    
    // 2. Verify unique image naming
    const savedCategory = await categoryModel.findOne({ name: 'Test Category' });
    expect(savedCategory.image).toMatch(new RegExp(`cat_${savedCategory._id}_\\d+\\.jpg`));
    
    // 3. Verify file exists on filesystem
    const imagePath = path.join(__dirname, '..', savedCategory.image);
    expect(fs.existsSync(imagePath)).toBe(true);
  });

  test('category image update preserves uniqueness', async () => {
    // 1. Create initial category
    const category = await createTestCategory();
    const originalImage = category.image;
    
    // 2. Update with new image
    const newImageFile = createTestImageFile('new-image.png');
    
    const response = await request(app)
      .put(`/api/admin/categories/${category._id}`)
      .attach('image', newImageFile)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    
    // 3. Verify new unique image
    const updatedCategory = await categoryModel.findById(category._id);
    expect(updatedCategory.image).not.toBe(originalImage);
    expect(updatedCategory.image).toMatch(new RegExp(`cat_${category._id}_\\d+\\.png`));
    
    // 4. Verify old image was removed
    const oldImagePath = path.join(__dirname, '..', originalImage);
    expect(fs.existsSync(oldImagePath)).toBe(false);
  });
});
```

### Performance Tests

#### Image Processing Performance
```javascript
describe('Image Processing Performance', () => {
  test('handles multiple concurrent uploads', async () => {
    const uploadPromises = [];
    
    for (let i = 0; i < 10; i++) {
      const categoryId = new mongoose.Types.ObjectId();
      const imageFile = createTestImageFile(`test-${i}.jpg`);
      
      uploadPromises.push(
        processImageUpload(imageFile, categoryId.toString())
      );
    }
    
    const results = await Promise.all(uploadPromises);
    
    // All uploads should succeed
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
    
    // All should have unique names
    const imagePaths = results.map(r => r.imagePath);
    const uniquePaths = new Set(imagePaths);
    expect(uniquePaths.size).toBe(imagePaths.length);
  });
});
```

## Security Considerations

### File Upload Security
1. **File Type Validation**: Apenas tipos de imagem permitidos (JPEG, PNG, WEBP)
2. **File Size Limits**: Máximo 2MB por arquivo
3. **File Content Validation**: Verificar se o arquivo é realmente uma imagem válida
4. **Path Traversal Prevention**: Sanitizar nomes de arquivo para evitar ataques de path traversal
5. **Unique Naming**: Usar IDs de categoria para evitar conflitos e ataques de sobreposição

### Access Control
1. **Admin Authentication**: Apenas administradores podem fazer upload/editar imagens
2. **Category Ownership**: Validar se o usuário tem permissão para editar a categoria específica
3. **File System Permissions**: Configurar permissões adequadas no diretório de uploads

### Data Integrity
1. **Atomic Operations**: Garantir que updates de categoria e imagem sejam atômicos
2. **Rollback Capability**: Implementar rollback em caso de falhas parciais
3. **Backup Strategy**: Manter backups das imagens antes de atualizações