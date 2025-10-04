# Category Migration System

This directory contains migration scripts to convert the static category system to a dynamic database-driven system.

## Overview

The migration system handles two main tasks:
1. **Category Migration**: Convert static `menu_list` categories to database records
2. **Food Migration**: Update food products to reference category IDs instead of category names

## Migration Scripts

### 1. Category Migration (`migrateCategories.js`)

Converts static categories from `frontend/src/assets/frontend_assets/assets.js` to database records.

**Features:**
- Creates category records in MongoDB
- Copies category images from frontend assets to backend uploads
- Generates slugs for URL-friendly category names
- Creates backups before migration
- Supports rollback functionality

**Usage:**
```bash
# Run category migration
node migrations/migrateCategories.js migrate

# Rollback category migration
node migrations/migrateCategories.js rollback <backup-path>

# Validate category migration
node migrations/migrateCategories.js validate
```

### 2. Food Category Migration (`migrateFoodCategories.js`)

Updates food products to use category ObjectId references instead of string names.

**Features:**
- Updates food products to reference category IDs
- Maintains backward compatibility with legacy category names
- Maps English category names to Portuguese equivalents
- Creates backups before migration
- Validates migration results

**Usage:**
```bash
# Run food category migration
node migrations/migrateFoodCategories.js migrate

# Rollback food migration
node migrations/migrateFoodCategories.js rollback <backup-path>

# Validate food migration
node migrations/migrateFoodCategories.js validate

# Check category references in code
node migrations/migrateFoodCategories.js update-refs
```

## Helper Scripts

### 1. Category Migration Runner (`scripts/runCategoryMigration.js`)

Wrapper script that handles database connections for category migration.

**Usage:**
```bash
# Run with npm scripts
npm run migrate:categories
npm run migrate:categories:validate

# Or directly
node scripts/runCategoryMigration.js migrate
```

### 2. Full Migration Runner (`scripts/runFullCategoryMigration.js`)

Comprehensive script that runs the complete migration process:
1. Migrate categories
2. Validate categories
3. Migrate food categories
4. Validate food migration
5. Check code references

**Usage:**
```bash
# Run complete migration
npm run migrate:full

# Validate all migrations
npm run migrate:full:validate

# Or directly
node scripts/runFullCategoryMigration.js migrate
```

## Migration Process

### Step-by-Step Migration

1. **Backup Current Data**
   ```bash
   # Optional: Create manual backup
   mongodump --db food-delivery --out ./backup
   ```

2. **Run Category Migration**
   ```bash
   npm run migrate:categories
   ```

3. **Validate Categories**
   ```bash
   npm run migrate:categories:validate
   ```

4. **Run Food Migration**
   ```bash
   npm run migrate:food
   ```

5. **Validate Food Migration**
   ```bash
   npm run migrate:food:validate
   ```

6. **Or Run Everything at Once**
   ```bash
   npm run migrate:full
   ```

### Rollback Process

If you need to rollback the migration:

1. **Rollback Food Migration**
   ```bash
   npm run migrate:food:rollback ./migrations/food_backup_<timestamp>.json
   ```

2. **Rollback Category Migration**
   ```bash
   npm run migrate:categories:rollback ./migrations/category_backup_<timestamp>.json
   ```

## Database Schema Changes

### Category Model
```javascript
{
  _id: ObjectId,
  name: String,           // Portuguese name (e.g., "Salada")
  originalName: String,   // English name (e.g., "Salad")
  slug: String,           // URL-friendly (e.g., "salada")
  image: String,          // Image path
  isActive: Boolean,      // Status
  order: Number,          // Display order
  createdAt: Date,
  updatedAt: Date
}
```

### Food Model (Updated)
```javascript
{
  name: String,
  description: String,
  price: Number,
  image: String,
  // Legacy field (maintained for compatibility)
  category: String,       // Original English name
  // New fields
  categoryId: ObjectId,   // Reference to category
  categoryName: String,   // Portuguese category name
  createdAt: Date,
  updatedAt: Date
}
```

## Backward Compatibility

The migration maintains backward compatibility by:

1. **Keeping Legacy Fields**: The `category` field in food products is preserved
2. **Dual Support**: Controllers support both legacy string categories and new ObjectId references
3. **Fallback Mechanisms**: If category lookup fails, falls back to string matching
4. **Gradual Migration**: System works during the transition period

## Category Name Mapping

The migration maps English category names to Portuguese equivalents:

| English | Portuguese |
|---------|------------|
| Salad | Salada |
| Rolls | Rolinhos |
| Deserts | Sobremesas |
| Sandwich | Sanduíche |
| Cake | Bolo |
| Pure Veg | Vegetariano |
| Pasta | Massa |
| Noodles | Macarrão |

## File Structure

```
backend/
├── migrations/
│   ├── README.md                    # This file
│   ├── migrateCategories.js         # Category migration
│   ├── migrateFoodCategories.js     # Food migration
│   └── category_backup_*.json       # Backup files
├── scripts/
│   ├── runCategoryMigration.js      # Category migration runner
│   └── runFullCategoryMigration.js  # Full migration runner
├── models/
│   ├── categoryModel.js             # Updated category model
│   └── foodModel.js                 # Updated food model
└── controllers/
    └── foodController.js            # Updated with dual support
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check your `.env` file has correct `MONGODB_URI`
   - Ensure MongoDB is running

2. **Image Copy Failures**
   - Verify frontend assets exist in `frontend/src/assets/frontend_assets/`
   - Check write permissions on `backend/uploads/categories/`

3. **Category Not Found Errors**
   - Run category migration before food migration
   - Check category name mappings in `migrateFoodCategories.js`

4. **Validation Failures**
   - Check migration logs for specific errors
   - Verify all required fields are populated

### Recovery

If migration fails:
1. Use the backup files created during migration
2. Run rollback commands with the backup file paths
3. Check logs for specific error messages
4. Fix issues and re-run migration

## Testing

Before running in production:

1. **Test on Development Environment**
   ```bash
   # Use test database
   MONGODB_URI=mongodb://localhost:27017/food-delivery-test npm run migrate:full
   ```

2. **Validate Results**
   ```bash
   npm run migrate:full:validate
   ```

3. **Test Application Functionality**
   - Verify category display works
   - Test food filtering by category
   - Check admin category management

## Support

For issues or questions:
1. Check the migration logs for error details
2. Verify database connection and permissions
3. Ensure all dependencies are installed
4. Review the backup files if rollback is needed