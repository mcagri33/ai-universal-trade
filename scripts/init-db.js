/**
 * Database Initialization Script
 * Creates database schema and initial data
 */

require('dotenv').config();

const db = require('../src/database/connection');
const dbModels = require('../src/database/models');
const logger = require('../src/utils/logger');

async function initializeDatabase() {
  try {
    logger.info('Initializing database...');
    
    // Initialize connection
    await db.initialize();
    
    // Initialize schema
    await dbModels.initializeSchema();
    
    logger.info('Database initialization completed successfully');
    
  } catch (error) {
    logger.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run if this is the main module
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
