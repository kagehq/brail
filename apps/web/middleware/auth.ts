export default defineNuxtRouteMiddleware(async (to, from) => {
  if (process.server) return;

  const config = useRuntimeConfig();
  
  try {
    const response = await fetch(`${config.public.apiUrl}/v1/auth/me`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      return navigateTo('/login');
    }
  } catch (error) {
    return navigateTo('/login');
  }
});

