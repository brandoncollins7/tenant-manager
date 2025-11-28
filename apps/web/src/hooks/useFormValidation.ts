import { trackEvent } from '../utils/analytics';

export function useFormValidation(formId: string) {
  const trackError = (field: string, errorType: string) => {
    trackEvent('error:validation', {
      form_id: formId,
      field,
      error_type: errorType,
    });
  };

  return { trackError };
}
