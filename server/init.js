/** Initialise (ou réinitialise) la base de données. */
import { initDb, resetDb } from './db.js';

const force = process.argv.includes('--reset');
const path = force ? resetDb() : initDb();
console.log(force ? 'Base réinitialisée avec les données de démonstration :' : 'Base prête :', path);
