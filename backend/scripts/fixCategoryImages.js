#!/usr/bin/env node

/**
 * Script para corrigir referências de imagens de categoria
 */

import { connectDB } from '../config/db.js';
import categoryModel from '../models/categoryModel.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixCategoryImages() {
  try {
    console.log('🔧 Conectando ao banco de dados...');
    await connectDB();
    
    console.log('📋 Buscando todas as categorias...');
    const categories = await categoryModel.find({});
    
    console.log(`📊 Encontradas ${categories.length} categorias`);
    
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'categories');
    const availableFiles = fs.readdirSync(uploadsDir).filter(file => 
      !file.startsWith('.') && file.endsWith('.jpg')
    );
    
    console.log('📁 Arquivos disponíveis:', availableFiles);
    
    for (const category of categories) {
      console.log(`\n🔍 Verificando categoria: ${category.name}`);
      console.log(`   Imagem atual: ${category.image}`);
      
      if (category.image) {
        const filename = path.basename(category.image);
        const filePath = path.join(uploadsDir, filename);
        
        if (!fs.existsSync(filePath)) {
          console.log(`❌ Arquivo não encontrado: ${filename}`);
          
          // Procurar arquivo similar
          const categoryNameLower = category.name.toLowerCase();
          const similarFile = availableFiles.find(file => 
            file.toLowerCase().includes(categoryNameLower) ||
            categoryNameLower.includes(file.toLowerCase().split('_')[0])
          );
          
          if (similarFile) {
            const newImagePath = `/uploads/categories/${similarFile}`;
            console.log(`✅ Arquivo similar encontrado: ${similarFile}`);
            console.log(`🔄 Atualizando para: ${newImagePath}`);
            
            await categoryModel.findByIdAndUpdate(category._id, {
              image: newImagePath
            });
            
            console.log(`✅ Categoria ${category.name} atualizada!`);
          } else {
            console.log(`⚠️  Nenhum arquivo similar encontrado para ${category.name}`);
          }
        } else {
          console.log(`✅ Arquivo existe: ${filename}`);
        }
      } else {
        console.log(`⚠️  Categoria sem imagem: ${category.name}`);
      }
    }
    
    console.log('\n🎉 Correção concluída!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

fixCategoryImages();