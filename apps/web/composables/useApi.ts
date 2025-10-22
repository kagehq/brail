import { ApiClient } from '@br/shared';

export const useApi = () => {
  const config = useRuntimeConfig();
  
  // Get session token from cookie
  const token = useCookie('br_session');
  
  // Route through FlowScope in development mode for debugging
  // FlowScope proxy format: http://localhost:4317/proxy/path
  // It will prepend UPSTREAM (http://localhost:3000) to the path
  const apiUrl = config.public.apiUrl as string;
  const baseUrl = config.public.flowscopeEnabled
    ? 'http://localhost:4317/proxy'
    : apiUrl;
  
  const client = new ApiClient({
    baseUrl,
    token: token.value || undefined,
  });
  
  return client;
};

