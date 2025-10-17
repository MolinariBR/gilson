#!/usr/bin/env node

/**
 * Script para corrigir referências de imagens de categoria - Define imagens padrão
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
    
    // Imagens padrão baseadas no nome da categoria
    const defaultImages = {
      'Pasteis': '/pastel-category.svg',
      'Bebidas': '/bebida-category.svg', 
      'Cervejas': '/cerveja-category.svg',
      'default': '/placeholder-category.svg'
    };
    
    for (const category of categories) {
      console.log(`\n🔍 Verificando categoria: ${category.name}`);
      console.log(`   Imagem atual: ${category.image}`);
      
      // Sempre definir imagem padrão para evitar 404
      const defaultImage = defaultImages[category.name] || defaultImages.default;
      
      if (category.image !== defaultImage) {
        console.log(`🔄 Atualizando para imagem padrão: ${defaultImage}`);
        
        await categoryModel.findByIdAndUpdate(category._id, {
          image: defaultImage
        });
        
        console.log(`✅ Categoria ${category.name} atualizada com imagem padrão!`);
      } else {
        console.log(`✅ Categoria ${category.name} já tem imagem padrão`);
      }
    }
    
    console.log('\n🎉 Correção concluída!');
    console.log('📝 Todas as categorias agora usam imagens padrão que existem no servidor.');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

fixCategoryImages();