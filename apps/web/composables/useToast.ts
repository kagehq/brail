import { toast } from 'vue-sonner';

export const useToast = () => {
  return {
    success: (message: string, description?: string) => {
      toast.success(message, { description });
    },
    error: (message: string, description?: string) => {
      toast.error(message, { description });
    },
    warning: (message: string, description?: string) => {
      toast.warning(message, { description });
    },
    info: (message: string, description?: string) => {
      toast.info(message, { description });
    },
    loading: (message: string) => {
      return toast.loading(message);
    },
    promise: <T>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: any) => string);
      }
    ) => {
      return toast.promise(promise, messages);
    },
    
    // Specific error types
    authError: (message?: string) => {
      toast.error('Authentication Error', {
        description: message || 'You need to login again. Your session may have expired.',
      });
    },
    quotaError: (message?: string) => {
      toast.error('Quota Exceeded', {
        description: message || 'You have reached your usage limit. Please upgrade your plan or contact support.',
      });
    },
    validationError: (message?: string) => {
      toast.error('Validation Error', {
        description: message || 'The data provided is invalid. Please check and try again.',
      });
    },
    dropJsonError: (details?: string) => {
      toast.error('Invalid _drop.json', {
        description: details || 'Your _drop.json file has syntax errors or invalid configuration.',
      });
    },
    networkError: (message?: string) => {
      toast.error('Network Error', {
        description: message || 'Unable to connect to the server. Please check your connection.',
      });
    },
    
    // Helper to parse API errors and show appropriate toast
    apiError: (error: any) => {
      if (!error) {
        toast.error('Unknown Error', { description: 'An unexpected error occurred.' });
        return;
      }

      // Check for specific error types
      const status = error.status || error.statusCode;
      const message = error.message || error.error || 'An error occurred';

      switch (status) {
        case 401:
        case 403:
          toast.error('Authentication Error', {
            description: message || 'You need to login again.',
          });
          break;
        case 429:
          toast.error('Rate Limit Exceeded', {
            description: message || 'Too many requests. Please try again later.',
          });
          break;
        case 413:
          toast.error('File Too Large', {
            description: message || 'The uploaded file exceeds the size limit.',
          });
          break;
        case 422:
          toast.error('Validation Error', {
            description: message || 'Invalid data provided.',
          });
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          toast.error('Server Error', {
            description: message || 'The server encountered an error. Please try again.',
          });
          break;
        default:
          toast.error('Error', { description: message });
      }
    },
  };
};

