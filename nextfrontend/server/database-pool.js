import { createAppPool, initDatabase, installAutoDatabaseRepair } from "./database.js";

export const pool = installAutoDatabaseRepair(createAppPool());

let databaseInitialization;

export function initializeDatabase() {
  if (!databaseInitialization) {
    databaseInitialization = initDatabase(pool).catch((error) => {
      databaseInitialization = undefined;
      throw error;
    });
  }
  return databaseInitialization;
}
