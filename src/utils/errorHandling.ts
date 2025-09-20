import { AppError } from '../types';

export class VacationPlannerError extends Error {
  constructor(
    message: string, 
    public code: string = 'GENERIC_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'VacationPlannerError';
  }
}

export const createError = (
  message: string, 
  code: string = 'GENERIC_ERROR', 
  details?: any
): VacationPlannerError => {
  return new VacationPlannerError(message, code, details);
};

export const handleServiceError = (error: any, context: string): AppError => {
  console.error(`❌ Error in ${context}:`, error);
  
  // Handle different error types
  if (error instanceof VacationPlannerError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details
    };
  }
  
  // Handle Supabase errors
  if (error?.message && error?.code) {
    return {
      code: error.code,
      message: `Database Error: ${error.message}`,
      details: error
    };
  }
  
  // Handle network errors
  if (error?.name === 'NetworkError' || error?.message?.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Verbindungsfehler. Bitte prüfen Sie Ihre Internetverbindung.',
      details: error
    };
  }
  
  // Generic error fallback
  return {
    code: 'UNKNOWN_ERROR',
    message: error?.message || 'Ein unbekannter Fehler ist aufgetreten.',
    details: error
  };
};

export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: string
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = handleServiceError(error, context);
      throw createError(appError.message, appError.code, appError.details);
    }
  };
};

export const logAndReturnError = (error: any, context: string, fallbackValue: any = null) => {
  const appError = handleServiceError(error, context);
  console.error(`❌ ${context}:`, appError);
  return fallbackValue;
};

// Common error messages
export const ErrorMessages = {
  NETWORK_ERROR: 'Verbindungsfehler. Bitte prüfen Sie Ihre Internetverbindung.',
  VALIDATION_ERROR: 'Die eingegebenen Daten sind ungültig.',
  PERMISSION_ERROR: 'Sie haben keine Berechtigung für diese Aktion.',
  NOT_FOUND: 'Das gesuchte Element wurde nicht gefunden.',
  GENERIC_ERROR: 'Ein unbekannter Fehler ist aufgetreten.'
} as const;