/**
 * Utility functions for handling user names
 */

export interface NameParts {
  firstname: string;
  lastname: string;
}

/**
 * Splits a full name into firstname and lastname parts
 * Handles single names, multiple names, and edge cases gracefully
 * 
 * Examples:
 * - "John" → { firstname: "John", lastname: "" }
 * - "John Doe" → { firstname: "John", lastname: "Doe" }
 * - "John Doe Smith" → { firstname: "John", lastname: "Doe Smith" }
 * - "John  Doe" → { firstname: "John", lastname: "Doe" }
 * - "" → { firstname: "", lastname: "" }
 */
export const splitFullName = (fullName: string | null | undefined): NameParts => {
  if (!fullName || typeof fullName !== 'string') {
    return { firstname: '', lastname: '' };
  }
  
  // Split by whitespace, filter out empty strings from multiple spaces
  const nameParts = fullName.trim().split(/\s+/).filter(part => part.length > 0);
  
  if (nameParts.length === 0) {
    return { firstname: '', lastname: '' };
  }
  
  if (nameParts.length === 1) {
    return { firstname: nameParts[0], lastname: '' };
  }
  
  // First part is firstname, everything else is lastname
  return {
    firstname: nameParts[0],
    lastname: nameParts.slice(1).join(' ')
  };
};

/**
 * Validates if a full name is in a valid format
 */
export const isValidFullName = (fullName: string | null | undefined): boolean => {
  if (!fullName || typeof fullName !== 'string') {
    return false;
  }
  
  const trimmed = fullName.trim();
  return trimmed.length > 0 && !/^\s*$/.test(trimmed);
};