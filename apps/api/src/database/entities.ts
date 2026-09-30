import { ApplicationMerit } from '../applications/application-merit.entity.js';
import { ApplicationRequirementDocument } from '../applications/application-requirement-document.entity.js';
import { Application } from '../applications/application.entity.js';
import { Document } from '../documents/document.entity.js';
import { ApplicationHiringDocument } from '../hiring/application-hiring-document.entity.js';
import { PackageDocument } from '../generation/package-document.entity.js';
import { Package } from '../generation/package.entity.js';
import { MeritDocument } from '../merits/merit-document.entity.js';
import { Merit } from '../merits/merit.entity.js';
import { DegreeVerification } from '../profile/degree-verification.entity.js';
import { Profile } from '../profile/profile.entity.js';
import { Position } from '../positions/position.entity.js';
import { RegistryEntry } from '../applications/registry-entry.entity.js';
import { User } from '../users/user.entity.js';

/** Todas las entidades de TypeORM. Añade aquí cada entidad nueva. */
export const entities = [
  User,
  Document,
  Profile,
  DegreeVerification,
  Merit,
  MeritDocument,
  Position,
  Application,
  ApplicationMerit,
  ApplicationRequirementDocument,
  Package,
  PackageDocument,
  RegistryEntry,
  ApplicationHiringDocument,
];
