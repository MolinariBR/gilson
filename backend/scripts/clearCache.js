#!/usr/bin/env node

/**
 * Script para limpar o cache do CategoryService
 */

import CategoryService from '../services/categoryService.js';

async function clearCache() {
  try {
    const service = new CategoryService();
    service.clearCache();
    console.log('✅ Cache do CategoryService limpo com sucesso');
  } catch (error) {
    console.error('❌ Erro ao limpar cache:', error);
    process.exit(1);
  }
}

clearCache();