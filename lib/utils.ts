import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts email address from various formats including:
 * - "Display Name" <email@domain.com>
 * - Display Name <email@domain.com>
 * - <email@domain.com>
 * - email@domain.com
 * 
 * @param emailText - The email text to parse
 * @returns The extracted email address
 * 
 * @example
 * extractEmailAddress('"Ryan Vogel" <ryan@mandarin3d.com>') // returns "ryan@mandarin3d.com"
 * extractEmailAddress('ryan@mandarin3d.com') // returns "ryan@mandarin3d.com"
 * extractEmailAddress('<ryan@mandarin3d.com>') // returns "ryan@mandarin3d.com"
 */
export function extractEmailAddress(emailText: string): string {
  if (!emailText) return '';
  
  // Match email inside angle brackets
  const angleMatch = emailText.match(/<([^>]+)>/);
  if (angleMatch) {
    return angleMatch[1].trim();
  }
  
  // If no angle brackets, assume the whole string is the email
  return emailText.trim();
}
