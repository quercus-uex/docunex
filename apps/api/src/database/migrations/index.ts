import { InitialSchema1790604609747 } from './1790604609747-InitialSchema.js';
import { DocumentsAndProfile1790605530003 } from './1790605530003-DocumentsAndProfile.js';
import { Merits1790606991009 } from './1790606991009-Merits.js';
import { Applications1790622595798 } from './1790622595798-Applications.js';

/** Todas las migraciones, en orden. Añade aquí cada migración generada. */
export const migrations: Function[] = [
  InitialSchema1790604609747,
  DocumentsAndProfile1790605530003,
  Merits1790606991009,
  Applications1790622595798,
];
