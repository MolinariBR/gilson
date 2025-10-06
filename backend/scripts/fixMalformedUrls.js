#!/usr/bin/env node

/**
 * Script para corrigir URLs malformadas de categorias
 * Corrige URLs como "https://domain.comfilename.jpg" para "/uploads/categories/filename.jpg"
 */

import mongoose from 'mongoose';
import categoryModel from '../models/categoryModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const fixMalformedUrls = async () => {
  try {
    console.log('🔧 Conectando ao MongoDB...');
    
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URL);
      console.log('✅ Conectado ao MongoDB');
    }

    // Fix malformed category URLs
    console.log('\n📂 Corrigindo URLs malformadas de categoria...');
    const categories = await categoryModel.find({});
    let categoriesFixed = 0;
    
    for (const category of categories) {
      if (category.image) {
        const originalImage = category.image;
        
        // Check for malformed URLs like "https://domain.comfilename.jpg"
        if (category.image.includes('.com') && !category.image.includes('/uploads/')) {
          // Extract filename from malformed URL
          const match = category.image.match(/\.com(.+\.(jpg|jpeg|png|gif|webp))$/i);
          if (match) {
            const filename = match[1];
            category.image = `/uploads/categories/${filename}`;
            await category.save();
            console.log(`✅ ${category.name}: ${originalImage} → ${category.image}`);
            categoriesFixed++;
          }
        } else if (!category.image.startsWith('/') && !category.image.startsWith('http') && category.image.includes('.')) {
          // Handle simple filenames
          category.image = `/uploads/categories/${category.image}`;
          await category.save();
          console.log(`✅ ${category.name}: ${originalImage} → ${category.image}`);
          categoriesFixed++;
        } else {
          console.log(`⏭️  ${category.name}: ${category.image} (já correto ou não é imagem)`);
        }
      } else {
        console.log(`⚠️  ${category.name}: sem imagem`);
      }
    }

    console.log('\n📊 Resumo:');
    console.log(`📂 Categorias corrigidas: ${categoriesFixed}/${categories.length}`);
    console.log('\n✅ Correção concluída!');

  } catch (error) {
    console.error('❌ Erro ao corrigir URLs:', error.message);
    throw error;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Conexão com MongoDB fechada');
    }
  }
};

// Run the script if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixMalformedUrls()
    .then(() => {
      console.log('\n🎉 Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha na execução:', error);
      process.exit(1);
    });
}

export default fixMalformedUrls;