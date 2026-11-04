const DISALLOWED_USERNAME_CHARACTERS = /[^a-z0-9]/g;

function usernamePart(name: string): string {
  return name.toLowerCase().replace(DISALLOWED_USERNAME_CHARACTERS, '');
}

export function usernameBase(firstName: string, lastName: string): string {
  return `${usernamePart(firstName)}.${usernamePart(lastName)}`;
}
