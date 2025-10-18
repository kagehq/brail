import { ApiClient } from '@br/shared';

export const useApi = () => {
  const config = useRuntimeConfig();
  
  // Get session token from cookie
  const token = useCookie('br_session');
  
  const client = new ApiClient({
    baseUrl: config.public.apiUrl as string,
    token: token.value || undefined,
  });
  
  return client;
};

