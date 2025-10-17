#!/usr/bin/env node

/**
 * Script para verificar o estado atual das categorias no banco
 */

import { connectDB } from '../config/db.js';
import categoryModel from '../models/categoryModel.js';

async function checkCategories() {
  try {
    console.log('🔧 Conectando ao banco de dados...');
    await connectDB();

    console.log('📋 Buscando todas as categorias...');
    const categories = await categoryModel.find({});

    console.log(`📊 Encontradas ${categories.length} categorias:\n`);

    categories.forEach((category, index) => {
      console.log(`${index + 1}. ${category.name}`);
      console.log(`   ID: ${category._id}`);
      console.log(`   Imagem: ${category.image}`);
      console.log(`   Criado: ${category.createdAt}`);
      console.log(`   Atualizado: ${category.updatedAt}`);
      console.log('');
    });

    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

checkCategories();