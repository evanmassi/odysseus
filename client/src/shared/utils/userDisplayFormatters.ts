/**
 * User Display Utilities
 *
 * Shared logic for consistent user representation across the app.
 */

/**
 * Priority: firstName + lastName initials > firstName first 2 chars > username first 2 chars
 *
 * @example
 * getUserInitials('jdoe', 'John', 'Doe') // 'JD'
 * getUserInitials('jdoe', 'John')        // 'JO'
 * getUserInitials('jdoe')                // 'JD'
 */
export function getUserInitials(username: string, firstName?: string, lastName?: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

/**
 * Priority: "firstName lastName" > "firstName" > "username"
 *
 * @example
 * getUserDisplayName('jdoe', 'John', 'Doe') // 'John Doe'
 * getUserDisplayName('jdoe', 'John')        // 'John'
 * getUserDisplayName('jdoe')                // 'jdoe'
 */
export function getUserDisplayName(
  username: string,
  firstName?: string,
  lastName?: string
): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (firstName) {
    return firstName;
  }
  return username;
}
