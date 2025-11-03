/**
 * Domain Error Classes
 *
 * Re-exports domain errors from the shared error system to maintain
 * architectural boundaries while using the unified error taxonomy.
 *
 * Maintains backward compatibility with the error handling system defined in src/shared/errors.
 */

export {
  DomainError,
  FieldResolutionError,
  FieldPathError,
} from '../../errors';
