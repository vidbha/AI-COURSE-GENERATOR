// db.js
import dotenv from 'dotenv';
dotenv.config(); // <-- ensure env is loaded here (important for ESM import order)

import { Sequelize } from 'sequelize';

// Read env AFTER dotenv.config()
const {
  AZURE_SQL_DATABASE,
  AZURE_SQL_USER,
  AZURE_SQL_PASSWORD,
  AZURE_SQL_HOST
} = process.env;

// Basic check to help debugging if any var is missing
if (!AZURE_SQL_DATABASE || !AZURE_SQL_USER || !AZURE_SQL_PASSWORD || !AZURE_SQL_HOST) {
  console.warn('WARNING: Missing one or more AZURE SQL env vars (AZURE_SQL_HOST/AZURE_SQL_USER/AZURE_SQL_PASSWORD/AZURE_SQL_DATABASE).');
  // Do NOT throw — allow startup so errors are clearer in logs. But you can throw if you'd prefer.
}

const sequelize = new Sequelize(
  AZURE_SQL_DATABASE || 'courses',
  AZURE_SQL_USER || '',
  AZURE_SQL_PASSWORD || '',
  {
    host: AZURE_SQL_HOST || 'courses-gen.database.windows.net',
    dialect: 'mssql',
    port: 1433,
    dialectOptions: {
      options: {
        encrypt: true, // required for Azure
        trustServerCertificate: false,
      }
    },
    logging: false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
  }
);

export default sequelize;
