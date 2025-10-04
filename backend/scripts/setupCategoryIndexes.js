import mongoose from 'mongoose';
import categoryModel from '../models/categoryModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Script to set up database indexes for category performance optimization
 */
async function setupCategoryIndexes() {
  try {
    console.log('🚀 Starting category index setup...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get the collection
    const collection = mongoose.connection.db.collection('categories');
    
    // Drop existing indexes (except _id)
    console.log('🗑️  Dropping existing indexes...');
    try {
      const indexes = await collection.indexes();
      for (const index of indexes) {
        if (index.name !== '_id_') {
          await collection.dropIndex(index.name);
          console.log(`   Dropped index: ${index.name}`);
        }
      }
    } catch (error) {
      console.log('   No existing indexes to drop or error dropping:', error.message);
    }

    // Create optimized indexes
    console.log('📊 Creating optimized indexes...');
    
    const indexesToCreate = [
      // Single field indexes
      { key: { slug: 1 }, options: { unique: true, name: 'slug_unique' } },
      { key: { name: 1 }, options: { name: 'name_index' } },
      { key: { originalName: 1 }, options: { name: 'originalName_index' } },
      { key: { isActive: 1 }, options: { name: 'isActive_index' } },
      { key: { order: 1 }, options: { name: 'order_index' } },
      { key: { createdAt: -1 }, options: { name: 'createdAt_desc' } },
      { key: { updatedAt: -1 }, options: { name: 'updatedAt_desc' } },
      
      // Compound indexes for common queries
      { key: { isActive: 1, order: 1 }, options: { name: 'active_order_compound' } },
      { key: { isActive: 1, createdAt: -1 }, options: { name: 'active_created_compound' } },
      { key: { isActive: 1, name: 1 }, options: { name: 'active_name_compound' } },
      
      // Text index for search functionality
      { key: { name: 'text', originalName: 'text' }, options: { name: 'text_search' } }
    ];

    for (const indexSpec of indexesToCreate) {
      try {
        await collection.createIndex(indexSpec.key, indexSpec.options);
        console.log(`   ✅ Created index: ${indexSpec.options.name}`);
      } catch (error) {
        console.log(`   ❌ Failed to create index ${indexSpec.options.name}:`, error.message);
      }
    }

    // Verify indexes
    console.log('🔍 Verifying created indexes...');
    const finalIndexes = await collection.indexes();
    console.log('   Current indexes:');
    finalIndexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Get collection stats
    console.log('📈 Collection statistics:');
    const stats = await collection.stats();
    console.log(`   Documents: ${stats.count}`);
    console.log(`   Average document size: ${Math.round(stats.avgObjSize)} bytes`);
    console.log(`   Total index size: ${Math.round(stats.totalIndexSize / 1024)} KB`);
    console.log(`   Storage size: ${Math.round(stats.storageSize / 1024)} KB`);

    // Test index performance
    console.log('⚡ Testing index performance...');
    
    const testQueries = [
      { query: { isActive: true }, description: 'Active categories' },
      { query: { isActive: true, order: { $gte: 0 } }, description: 'Active categories with order' },
      { query: { slug: 'test-slug' }, description: 'Category by slug' },
      { query: { name: /test/i }, description: 'Category by name pattern' }
    ];

    for (const test of testQueries) {
      const startTime = Date.now();
      const result = await collection.find(test.query).explain('executionStats');
      const endTime = Date.now();
      
      const executionStats = result.executionStats;
      console.log(`   ${test.description}:`);
      console.log(`     Execution time: ${endTime - startTime}ms`);
      console.log(`     Documents examined: ${executionStats.totalDocsExamined}`);
      console.log(`     Documents returned: ${executionStats.totalDocsReturned}`);
      console.log(`     Index used: ${executionStats.executionStages?.indexName || 'COLLSCAN'}`);
    }

    console.log('✅ Category index setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up category indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

/**
 * Analyze query performance
 */
async function analyzeQueryPerformance() {
  try {
    console.log('🔍 Analyzing query performance...');
    
    const collection = mongoose.connection.db.collection('categories');
    
    // Common queries to analyze
    const queries = [
      { name: 'Get all active categories', query: { isActive: true } },
      { name: 'Get categories by order', query: { isActive: true }, sort: { order: 1 } },
      { name: 'Search by name', query: { name: /pizza/i } },
      { name: 'Get category by slug', query: { slug: 'pizza' } },
      { name: 'Get recent categories', query: { isActive: true }, sort: { createdAt: -1 } }
    ];

    for (const queryTest of queries) {
      console.log(`\n📊 Testing: ${queryTest.name}`);
      
      const explain = await collection
        .find(queryTest.query)
        .sort(queryTest.sort || {})
        .explain('executionStats');
      
      const stats = explain.executionStats;
      console.log(`   Execution time: ${stats.executionTimeMillis}ms`);
      console.log(`   Documents examined: ${stats.totalDocsExamined}`);
      console.log(`   Documents returned: ${stats.totalDocsReturned}`);
      console.log(`   Index used: ${stats.executionStages?.indexName || 'COLLSCAN'}`);
      
      if (stats.totalDocsExamined > stats.totalDocsReturned * 2) {
        console.log(`   ⚠️  Warning: Query may benefit from better indexing`);
      }
    }
    
  } catch (error) {
    console.error('Error analyzing query performance:', error);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  setupCategoryIndexes()
    .then(() => {
      console.log('🎉 Index setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Index setup failed:', error);
      process.exit(1);
    });
}

export { setupCategoryIndexes, analyzeQueryPerformance };