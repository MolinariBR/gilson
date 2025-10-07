# Image URL Migration Script

This script fixes existing image paths in the database to ensure consistency across the application.

## Purpose

The script addresses the following issues:
- Inconsistent image URL formats in the database
- Food items and categories using different URL patterns
- Missing `/uploads/` prefixes in image paths
- Broken image references due to URL inconsistencies

## Features

- **Analysis**: Analyze current database state without making changes
- **Migration**: Fix image URLs with backup and rollback support
- **Validation**: Verify image URLs and file existence
- **Dry Run**: Preview changes before applying them
- **File Validation**: Check if image files actually exist on disk
- **Comprehensive Logging**: Detailed logs of all operations

## Usage

### 1. Analyze Current State

```bash
node scripts/migrateImageUrls.js analyze
```

This command analyzes the current database state and shows:
- Total number of foods and categories
- How many have images
- How many need migration
- URL patterns currently in use
- Missing files

### 2. Preview Migration (Dry Run)

```bash
node scripts/migrateImageUrls.js migrate --dry-run
```

This command shows what changes would be made without actually applying them.

### 3. Run Migration

```bash
node scripts/migrateImageUrls.js migrate
```

This command:
- Creates a backup of current database state
- Fixes all inconsistent image URLs
- Validates the results
- Provides a summary of changes

### 4. Validate Current State

```bash
node scripts/migrateImageUrls.js validate
```

This command validates the current database state and reports any issues.

### 5. Rollback Migration

```bash
node scripts/migrateImageUrls.js rollback <backup-path>
```

This command restores the database to a previous state using a backup file.

## Options

- `--dry-run`: Preview changes without applying them
- `--no-validate`: Skip file existence validation (faster but less thorough)

## Examples

```bash
# Analyze current state
node scripts/migrateImageUrls.js analyze

# Preview migration
node scripts/migrateImageUrls.js migrate --dry-run

# Run migration
node scripts/migrateImageUrls.js migrate

# Validate results
node scripts/migrateImageUrls.js validate

# Rollback if needed
node scripts/migrateImageUrls.js rollback ../backups/image_urls_backup_2024-01-15.json
```

## URL Normalization Rules

### Food Items
- Input: `image.jpg` → Output: `/uploads/image.jpg`
- Input: `/images/image.jpg` → Output: `/uploads/image.jpg`
- Input: `/uploads/image.jpg` → Output: `/uploads/image.jpg` (no change)

### Categories
- Input: `category.jpg` → Output: `/uploads/categories/category.jpg`
- Input: `/uploads/category.jpg` → Output: `/uploads/categories/category.jpg`
- Input: `/uploads/categories/category.jpg` → Output: `/uploads/categories/category.jpg` (no change)

### Special Cases
- HTTP/HTTPS URLs are preserved as-is
- Empty or null values are handled gracefully
- Invalid paths are logged for manual review

## Backup and Recovery

The script automatically creates backups before making changes:
- Backups are stored in `backend/backups/`
- Backup filename format: `image_urls_backup_YYYY-MM-DDTHH-mm-ss-sssZ.json`
- Backups contain complete database state for foods and categories
- Use the rollback command to restore from a backup

## File Validation

The script can validate that image files actually exist on disk:
- Checks `backend/uploads/` directory for food images
- Checks `backend/uploads/categories/` directory for category images
- Reports missing files for manual cleanup
- Can be disabled with `--no-validate` for faster execution

## Error Handling

The script includes comprehensive error handling:
- Database connection errors
- File system errors
- Invalid data formats
- Missing backup files
- Validation failures

## Requirements

- Node.js
- MongoDB connection
- Write access to `backend/backups/` directory
- Read access to `backend/uploads/` directory

## Troubleshooting

### Connection Issues
If you get database connection errors, check:
- MongoDB is running
- Connection string is correct
- Network connectivity

### Permission Issues
If you get file system errors, check:
- Write permissions for `backend/backups/`
- Read permissions for `backend/uploads/`

### Validation Failures
If validation fails after migration:
- Check the reported issues in the log
- Verify file paths are correct
- Ensure image files exist on disk
- Consider running with `--no-validate` if file validation is not needed

## Testing

Run the test script to verify functionality:

```bash
node scripts/test-migration.js
```

This tests the core functions without touching the database.