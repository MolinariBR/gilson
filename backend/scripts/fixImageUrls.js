#!/usr/bin/env node

/**
 * Script para corrigir URLs de imagens existentes no banco de dados
 * Converte nomes de arquivo para URLs completas
 */

import mongoose from 'mongoose';
import foodModel from '../models/foodModel.js';
import categoryModel from '../models/categoryModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const fixImageUrls = async () => {
  try {
    console.log('🔧 Conectando ao MongoDB...');
    
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URL);
      console.log('✅ Conectado ao MongoDB');
    }

    // Fix food images
    console.log('\n🍕 Corrigindo URLs de imagens de comida...');
    const foods = await foodModel.find({});
    let foodsFixed = 0;
    
    for (const food of foods) {
      if (food.image && !food.image.startsWith('/') && !food.image.startsWith('http')) {
        // É só um nome de arquivo, converter para URL completa
        const oldImage = food.image;
        food.image = `/uploads/${food.image}`;
        await food.save();
        console.log(`✅ ${food.name}: ${oldImage} → ${food.image}`);
        foodsFixed++;
      } else if (food.image) {
        console.log(`⏭️  ${food.name}: ${food.image} (já correto)`);
      } else {
        console.log(`⚠️  ${food.name}: sem imagem`);
      }
    }

    // Fix category images
    console.log('\n📂 Corrigindo URLs de imagens de categoria...');
    const categories = await categoryModel.find({});
    let categoriesFixed = 0;
    
    for (const category of categories) {
      if (category.image && !category.image.startsWith('/') && !category.image.startsWith('http')) {
        // É só um nome de arquivo, converter para URL completa
        const oldImage = category.image;
        category.image = `/uploads/categories/${category.image}`;
        await category.save();
        console.log(`✅ ${category.name}: ${oldImage} → ${category.image}`);
        categoriesFixed++;
      } else if (category.image) {
        console.log(`⏭️  ${category.name}: ${category.image} (já correto)`);
      } else {
        console.log(`⚠️  ${category.name}: sem imagem`);
      }
    }

    console.log('\n📊 Resumo:');
    console.log(`🍕 Comidas corrigidas: ${foodsFixed}/${foods.length}`);
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
  fixImageUrls()
    .then(() => {
      console.log('\n🎉 Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha na execução:', error);
      process.exit(1);
    });
}

export default fixImageUrls;