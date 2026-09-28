import { Document } from '../documents/document.entity.js';
import { DegreeVerification } from '../profile/degree-verification.entity.js';
import { Profile } from '../profile/profile.entity.js';
import { User } from '../users/user.entity.js';

/** Todas las entidades de TypeORM. Añade aquí cada entidad nueva. */
export const entities = [User, Document, Profile, DegreeVerification];
