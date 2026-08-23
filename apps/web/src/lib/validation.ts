/**
 * Validation utilities for user input
 * Based on Shipbubble API requirements
 */

/**
 * Validates full name (first name + last name)
 * Requirements:
 * - Minimum 2 words (first and last name)
 * - Only letters and spaces
 * - 2-100 characters total
 */
export const validateFullName = (name: string): string | null => {
  if (!name || name.trim() === '') {
    return 'Name is required';
  }

  const trimmedName = name.trim();
  const words = trimmedName.split(/\s+/).filter(word => word.length > 0);

  if (words.length < 2) {
    return 'Please enter first name and last name';
  }

  // Only letters and spaces allowed
  const nameRegex = /^[a-zA-Z\s]+$/;
  if (!nameRegex.test(trimmedName)) {
    return 'Name can only contain letters and spaces';
  }

  if (trimmedName.length < 2 || trimmedName.length > 100) {
    return 'Name must be between 2 and 100 characters';
  }

  return null;
};

/**
 * Validates Nigerian phone number format
 * Required format: +234XXXXXXXXXX (13 characters total)
 */
export const validatePhoneNumber = (phone: string): string | null => {
  if (!phone || phone.trim() === '') {
    return 'Phone number is required';
  }

  const nigerianPhoneRegex = /^\+234[0-9]{10}$/;
  if (!nigerianPhoneRegex.test(phone)) {
    return 'Phone must be in format +234XXXXXXXXXX';
  }

  return null;
};

/**
 * Validates email address format
 */
export const validateEmail = (email: string): string | null => {
  if (!email || email.trim() === '') {
    return 'Email is required';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }

  return null;
};

/**
 * Formats phone number to Nigerian format (+234XXXXXXXXXX)
 * Handles various input formats:
 * - 08012345678 → +2348012345678
 * - 2348012345678 → +2348012345678
 * - +2348012345678 → +2348012345678 (no change)
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // If starts with 0, replace with +234
  if (digits.startsWith('0') && digits.length === 11) {
    return '+234' + digits.substring(1);
  }

  // If starts with 234, add +
  if (digits.startsWith('234') && digits.length === 13) {
    return '+' + digits;
  }

  // If already has +234, return as is
  if (phone.startsWith('+234') && digits.length === 13) {
    return phone;
  }

  // If it's just 10 digits, add +234
  if (digits.length === 10) {
    return '+234' + digits;
  }

  // Otherwise return original input (let validation catch it)
  return phone;
};

/**
 * Validates username format
 * - Alphanumeric, underscore, hyphen only
 * - 3-30 characters
 */
export const validateUsername = (username: string): string | null => {
  if (!username || username.trim() === '') {
    return 'Username is required';
  }

  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return 'Username can only contain letters, numbers, underscores, and hyphens';
  }

  if (username.length < 3 || username.length > 30) {
    return 'Username must be between 3 and 30 characters';
  }

  return null;
};
