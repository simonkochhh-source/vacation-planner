/**
 * Comprehensive Input Validation and XSS Prevention
 * Provides security utilities for user input sanitization
 */

import { z } from 'zod';

// XSS Prevention Patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
  /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /on\w+\s*=/gi, // Event handlers like onclick, onload
  /expression\s*\(/gi, // CSS expressions
  /\.innerHTML/gi,
  /\.outerHTML/gi,
  /document\.write/gi,
  /eval\s*\(/gi,
  /setTimeout\s*\(\s*['"]/gi,
  /setInterval\s*\(\s*['"]/gi
];

// SQL Injection Prevention Patterns
const SQL_INJECTION_PATTERNS = [
  /(\s|^)(union|select|insert|update|delete|drop|create|alter|exec|execute)\s/gi,
  /(\s|^)(or|and)\s+\w+\s*=\s*\w+/gi,
  /(\s|^)(or|and)\s+1\s*=\s*1/gi,
  /(\s|^)(or|and)\s+\w+\s*(like|in)\s*/gi,
  /['";]\s*(or|and|union|select)/gi,
  /(\s|^)0x[0-9a-f]+/gi, // Hex values
  /(\s|^)char\s*\(/gi,
  /(\s|^)convert\s*\(/gi,
  /(\s|^)cast\s*\(/gi
];

// Path Traversal Prevention
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.[\\/]/g,
  /%2e%2e%2f/gi,
  /%2e%2e%5c/gi,
  /\.\.%2f/gi,
  /\.\.%5c/gi
];

/**
 * Sanitize text input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  let sanitized = input;

  // Remove potential XSS patterns
  XSS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // HTML entity encoding for remaining characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized.trim();
}

/**
 * Validate and sanitize trip/destination names
 */
export function sanitizeTripName(name: string): string {
  const sanitized = sanitizeInput(name);
  
  // Additional validation for trip names
  if (sanitized.length === 0) {
    throw new Error('Trip name cannot be empty');
  }
  
  if (sanitized.length > 100) {
    throw new Error('Trip name is too long (max 100 characters)');
  }
  
  // Only allow alphanumeric, spaces, and basic punctuation
  const allowedPattern = /^[\w\s\-.,!?()äöüÄÖÜß]+$/;
  if (!allowedPattern.test(sanitized)) {
    throw new Error('Trip name contains invalid characters');
  }
  
  return sanitized;
}

/**
 * Validate and sanitize descriptions
 */
export function sanitizeDescription(description: string): string {
  const sanitized = sanitizeInput(description);
  
  if (sanitized.length > 2000) {
    throw new Error('Description is too long (max 2000 characters)');
  }
  
  return sanitized;
}

/**
 * Validate email addresses
 */
export const emailSchema = z.string().email({
  message: 'Invalid email address format'
}).transform(email => email.toLowerCase().trim());

/**
 * Validate URLs
 */
export function validateURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Only allow HTTPS URLs (except localhost for development)
    if (urlObj.protocol !== 'https:' && urlObj.hostname !== 'localhost') {
      return false;
    }
    
    // Block suspicious domains
    const blockedDomains = [
      'bit.ly', 'tinyurl.com', 'goo.gl', 't.co',
      'localhost', '127.0.0.1', '0.0.0.0'
    ];
    
    if (process.env.NODE_ENV === 'production') {
      if (blockedDomains.some(domain => urlObj.hostname.includes(domain))) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize file paths to prevent directory traversal
 */
export function sanitizeFilePath(path: string): string {
  let sanitized = path;
  
  // Remove path traversal patterns
  PATH_TRAVERSAL_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Only allow alphanumeric, hyphens, underscores, and dots
  sanitized = sanitized.replace(/[^a-zA-Z0-9.\-_]/g, '');
  
  // Prevent hidden files
  if (sanitized.startsWith('.')) {
    sanitized = sanitized.substring(1);
  }
  
  return sanitized;
}

/**
 * Check for SQL injection patterns
 */
export function detectSQLInjection(input: string): boolean {
  const lowerInput = input.toLowerCase();
  
  return SQL_INJECTION_PATTERNS.some(pattern => 
    pattern.test(lowerInput)
  );
}

/**
 * Rate limiting for validation operations
 */
class ValidationRateLimiter {
  private attempts = new Map<string, number[]>();
  private readonly maxAttempts = 10;
  private readonly timeWindow = 60000; // 1 minute

  checkRate(clientId: string): boolean {
    const now = Date.now();
    const clientAttempts = this.attempts.get(clientId) || [];
    
    // Remove old attempts outside time window
    const recentAttempts = clientAttempts.filter(
      time => now - time < this.timeWindow
    );
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false; // Rate limit exceeded
    }
    
    recentAttempts.push(now);
    this.attempts.set(clientId, recentAttempts);
    
    return true;
  }
}

export const validationRateLimiter = new ValidationRateLimiter();

/**
 * Comprehensive input validation for forms
 */
export const secureFormSchemas = {
  tripForm: z.object({
    name: z.string()
      .min(1, 'Trip name is required')
      .max(100, 'Trip name too long')
      .transform(sanitizeTripName),
    
    description: z.string()
      .max(2000, 'Description too long')
      .transform(sanitizeDescription)
      .optional(),
    
    startDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    
    endDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    
    budget: z.number()
      .min(0, 'Budget cannot be negative')
      .max(1000000, 'Budget too high')
      .optional(),
    
    currency: z.enum(['EUR', 'USD', 'GBP', 'CHF'])
      .default('EUR')
  }),

  destinationForm: z.object({
    name: z.string()
      .min(1, 'Destination name is required')
      .max(100, 'Destination name too long')
      .transform(sanitizeTripName),
    
    description: z.string()
      .max(2000, 'Description too long')
      .transform(sanitizeDescription)
      .optional(),
    
    category: z.enum([
      'Sehenswürdigkeit', 'Restaurant', 'Hotel', 'Transport',
      'Aktivität', 'Natur & Landschaft', 'Museum', 'Shopping'
    ]),
    
    coordinates: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    }).optional(),
    
    estimatedCost: z.number()
      .min(0)
      .max(10000)
      .optional(),
    
    estimatedDuration: z.number()
      .min(0)
      .max(24)
      .optional()
  }),

  photoForm: z.object({
    caption: z.string()
      .max(500, 'Caption too long')
      .transform(sanitizeDescription)
      .optional(),
    
    isPrivate: z.boolean().default(false),
    
    destinationId: z.string()
      .uuid('Invalid destination ID')
      .optional()
  })
};

/**
 * Validate file uploads
 */
export function validateFileUpload(file: File): {
  isValid: boolean;
  error?: string;
} {
  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { isValid: false, error: 'File size too large (max 10MB)' };
  }
  
  // Check file type
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type' };
  }
  
  // Check file name
  const sanitizedName = sanitizeFilePath(file.name);
  if (sanitizedName.length === 0) {
    return { isValid: false, error: 'Invalid file name' };
  }
  
  // Check for suspicious file extensions
  const suspiciousExtensions = [
    '.exe', '.bat', '.cmd', '.scr', '.pif', '.com',
    '.js', '.vbs', '.jar', '.php', '.asp'
  ];
  
  if (suspiciousExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  )) {
    return { isValid: false, error: 'Suspicious file extension' };
  }
  
  return { isValid: true };
}