import { AxiosError } from 'axios';

/**
 * Extracts a user-friendly error message from various error types
 * Handles Axios errors, Error objects, and unknown error types
 */
export function extractErrorMessage(error: unknown): string {
  // Handle AxiosError (from API requests)
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    // Try to extract message from response data
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }

    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error;
    }

    // Fallback to status text or generic message
    if (axiosError.response?.statusText) {
      return axiosError.response.statusText;
    }

    // Network errors
    if (axiosError.message) {
      return axiosError.message;
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Unknown error type
  return 'An unexpected error occurred';
}
