const lowerLead = (label: string) =>
  /^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label;

export const joinValueName = (owner: string, label: string): string =>
  owner ? `${owner} ${lowerLead(label.trim())}` : label;
