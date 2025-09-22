import { useState, useEffect, useCallback } from 'react';

/**
 * Secure storage utilities for handling sensitive data
 * Provides encrypted storage and automatic expiration
 */

interface SecureStorageItem<T> {
  value: T;
  timestamp: number;
  expiresAt?: number;
  encrypted: boolean;
}

interface SecureStorageOptions {
  expires?: number; // Time in milliseconds
  encrypt?: boolean;
  prefix?: string;
}

// Simple encryption for demonstration (in production, use a proper encryption library)
const simpleEncrypt = (text: string, key: string): string => {
  try {
    // This is a simple XOR encryption for demo purposes
    // In production, use a proper encryption library like crypto-js
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result);
  } catch {
    return text; // Fallback to unencrypted
  }
};

const simpleDecrypt = (encryptedText: string, key: string): string => {
  try {
    const text = atob(encryptedText);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return encryptedText; // Fallback
  }
};

// Get a basic encryption key (in production, this should be more sophisticated)
const getEncryptionKey = (): string => {
  const userAgent = navigator.userAgent;
  const timestamp = Date.now().toString();
  return btoa(userAgent + timestamp).slice(0, 16);
};

/**
 * Secure localStorage hook with encryption and expiration
 */
export function useSecureStorage<T>(
  key: string,
  defaultValue: T,
  options: SecureStorageOptions = {}
): [T, (value: T) => void, () => void] {
  const { expires, encrypt = false, prefix = 'secure_' } = options;
  const fullKey = prefix + key;
  
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(fullKey);
      if (!item) return defaultValue;

      const parsed: SecureStorageItem<T> = JSON.parse(item);
      
      // Check expiration
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem(fullKey);
        return defaultValue;
      }

      // Decrypt if necessary
      if (parsed.encrypted && typeof parsed.value === 'string') {
        const decrypted = simpleDecrypt(parsed.value as string, getEncryptionKey());
        try {
          return JSON.parse(decrypted);
        } catch {
          return decrypted as T;
        }
      }

      return parsed.value;
    } catch (error) {
      console.error(`Error reading secure storage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      
      let finalValue: any = value;
      let isEncrypted = false;

      if (encrypt) {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        finalValue = simpleEncrypt(stringValue, getEncryptionKey());
        isEncrypted = true;
      }

      const item: SecureStorageItem<T> = {
        value: finalValue,
        timestamp: Date.now(),
        expiresAt: expires ? Date.now() + expires : undefined,
        encrypted: isEncrypted
      };

      localStorage.setItem(fullKey, JSON.stringify(item));
    } catch (error) {
      console.error(`Error setting secure storage key "${key}":`, error);
    }
  }, [fullKey, encrypt, expires, key]);

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(fullKey);
      setStoredValue(defaultValue);
    } catch (error) {
      console.error(`Error removing secure storage key "${key}":`, error);
    }
  }, [fullKey, defaultValue, key]);

  return [storedValue, setValue, removeValue];
}

/**
 * Secure session storage hook with automatic cleanup
 */
export function useSecureSessionStorage<T>(
  key: string,
  defaultValue: T,
  options: SecureStorageOptions = {}
): [T, (value: T) => void, () => void] {
  const { expires, encrypt = false, prefix = 'session_' } = options;
  const fullKey = prefix + key;
  
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = sessionStorage.getItem(fullKey);
      if (!item) return defaultValue;

      const parsed: SecureStorageItem<T> = JSON.parse(item);
      
      // Check expiration
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        sessionStorage.removeItem(fullKey);
        return defaultValue;
      }

      // Decrypt if necessary
      if (parsed.encrypted && typeof parsed.value === 'string') {
        const decrypted = simpleDecrypt(parsed.value as string, getEncryptionKey());
        try {
          return JSON.parse(decrypted);
        } catch {
          return decrypted as T;
        }
      }

      return parsed.value;
    } catch (error) {
      console.error(`Error reading secure session storage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      
      let finalValue: any = value;
      let isEncrypted = false;

      if (encrypt) {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        finalValue = simpleEncrypt(stringValue, getEncryptionKey());
        isEncrypted = true;
      }

      const item: SecureStorageItem<T> = {
        value: finalValue,
        timestamp: Date.now(),
        expiresAt: expires ? Date.now() + expires : undefined,
        encrypted: isEncrypted
      };

      sessionStorage.setItem(fullKey, JSON.stringify(item));
    } catch (error) {
      console.error(`Error setting secure session storage key "${key}":`, error);
    }
  }, [fullKey, encrypt, expires, key]);

  const removeValue = useCallback(() => {
    try {
      sessionStorage.removeItem(fullKey);
      setStoredValue(defaultValue);
    } catch (error) {
      console.error(`Error removing secure session storage key "${key}":`, error);
    }
  }, [fullKey, defaultValue, key]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook for managing secure cookies
 */
export function useSecureCookie(
  name: string,
  defaultValue: string = '',
  options: {
    expires?: number; // Days
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    httpOnly?: boolean;
  } = {}
): [string, (value: string) => void, () => void] {
  const { expires = 7, secure = true, sameSite = 'Strict' } = options;
  
  const [cookieValue, setCookieValue] = useState<string>(() => {
    try {
      const cookies = document.cookie.split(';');
      const cookie = cookies.find(c => c.trim().startsWith(`${name}=`));
      return cookie ? decodeURIComponent(cookie.split('=')[1]) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback((value: string) => {
    try {
      setCookieValue(value);
      
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expires);
      
      const cookieAttributes = [
        `${name}=${encodeURIComponent(value)}`,
        `expires=${expirationDate.toUTCString()}`,
        'path=/',
        sameSite ? `SameSite=${sameSite}` : '',
        secure ? 'Secure' : ''
      ].filter(Boolean).join('; ');

      document.cookie = cookieAttributes;
    } catch (error) {
      console.error(`Error setting cookie "${name}":`, error);
    }
  }, [name, expires, secure, sameSite]);

  const removeValue = useCallback(() => {
    try {
      setCookieValue(defaultValue);
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    } catch (error) {
      console.error(`Error removing cookie "${name}":`, error);
    }
  }, [name, defaultValue]);

  return [cookieValue, setValue, removeValue];
}

/**
 * Utility function to clear all secure storage
 */
export const clearAllSecureStorage = (prefix: string = 'secure_'): void => {
  try {
    // Clear localStorage items with prefix
    const localKeys = Object.keys(localStorage).filter(key => key.startsWith(prefix));
    localKeys.forEach(key => localStorage.removeItem(key));

    // Clear sessionStorage items with prefix
    const sessionKeys = Object.keys(sessionStorage).filter(key => key.startsWith(prefix));
    sessionKeys.forEach(key => sessionStorage.removeItem(key));

    console.log(`Cleared ${localKeys.length} localStorage and ${sessionKeys.length} sessionStorage items`);
  } catch (error) {
    console.error('Error clearing secure storage:', error);
  }
};

/**
 * Utility function to validate storage security
 */
export const validateStorageSecurity = (): {
  isSecure: boolean;
  issues: string[];
} => {
  const issues: string[] = [];
  
  // Check if we're on HTTPS
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    issues.push('Application not running on HTTPS');
  }
  
  // Check for localStorage availability
  try {
    localStorage.setItem('__security_test__', 'test');
    localStorage.removeItem('__security_test__');
  } catch {
    issues.push('localStorage not available or restricted');
  }
  
  // Check for sessionStorage availability
  try {
    sessionStorage.setItem('__security_test__', 'test');
    sessionStorage.removeItem('__security_test__');
  } catch {
    issues.push('sessionStorage not available or restricted');
  }
  
  // Check for cookies availability
  if (!navigator.cookieEnabled) {
    issues.push('Cookies are disabled');
  }
  
  // Check for suspicious storage items
  const suspiciousKeys = ['password', 'token', 'secret', 'key', 'auth'];
  const allStorageKeys = [
    ...Object.keys(localStorage),
    ...Object.keys(sessionStorage)
  ];
  
  suspiciousKeys.forEach(suspiciousKey => {
    const foundKeys = allStorageKeys.filter(key => 
      key.toLowerCase().includes(suspiciousKey) && 
      !key.startsWith('secure_') && 
      !key.startsWith('session_')
    );
    
    if (foundKeys.length > 0) {
      issues.push(`Potentially insecure storage keys found: ${foundKeys.join(', ')}`);
    }
  });
  
  return {
    isSecure: issues.length === 0,
    issues
  };
};