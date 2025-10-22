<template>
  <div class="min-h-screen bg-black overflow-hidden relative">
    <!-- Animated gradient background -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse-slow"></div>
      <div class="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-400/20 via-cyan-500/10 to-transparent rounded-full blur-3xl animate-pulse-slow" style="animation-delay: 1s"></div>
    </div>

    <!-- Main content -->
    <div class="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
      <div class="max-w-md w-full animate-fade-in">
        <!-- Logo & Title -->
        <div class="text-center mb-8">
          <!-- <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-300/10 border border-blue-300/20 rounded-2xl mb-4">
            <svg class="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div> -->
          <img src="~/assets/img/logo.png" alt="Brail" class="w-14 h-14 mx-auto mb-4" />
          <h1 class="text-3xl font-bold text-white mb-2">Welcome to Brail</h1>
          <p class="text-gray-400 text-sm">Sign in with your email to continue</p>
        </div>

        <!-- Login Form -->
        <div class="bg-gradient-to-b from-gray-500/10 to-transparent border border-gray-500/20 rounded-2xl p-8 shadow-2xl">
          <form @submit.prevent="handleLogin" class="space-y-6">
            <!-- Email Input -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  v-model="email"
                  type="email"
                  required
                  class="w-full pl-11 pr-4 py-3 bg-gray-500/10 border border-gray-500/25 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300/50 focus:border-blue-300/50 transition-all placeholder:text-gray-600"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="loading"
              class="group relative w-full bg-blue-300 text-black py-3 px-4 rounded-xl font-semibold hover:bg-blue-400 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-300/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              <svg v-if="loading" class="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ loading ? 'Sending magic link...' : 'Send magic link' }}</span>
              <svg v-if="!loading" class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </form>

          <!-- Success Message -->
          <div v-if="message" class="mt-6 p-4 bg-green-300/10 border border-green-300/20 rounded-xl animate-fade-in">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 w-6 h-6 bg-green-300/20 rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-green-300">Magic link sent!</p>
                <p class="text-sm text-green-300/80 mt-1">{{ message }}</p>
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-fade-in">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-red-400">Something went wrong</p>
                <p class="text-sm text-red-400/80 mt-1">{{ error }}</p>
              </div>
            </div>
          </div>

          <!-- Dev Mode Notice -->
          <!-- <div class="mt-6 p-3 bg-yellow-300/5 border border-yellow-300/10 rounded-lg">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-yellow-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
              <p class="text-xs text-yellow-300/80">
                <span class="font-semibold text-yellow-300">Dev mode:</span> Check your console for the magic link
              </p>
            </div>
          </div> -->
        </div>

        <!-- Back to home -->
        <div class="mt-6 text-center">
          <NuxtLink to="/" class="text-sm text-gray-500 hover:text-white transition inline-flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to home
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod';

const api = useApi();
const router = useRouter();
const route = useRoute();

const email = ref('');
const loading = ref(false);
const message = ref('');
const error = ref('');

const emailSchema = z.string().trim().min(1, 'Email is required').email('Please enter a valid email address');

const handleLogin = async () => {
  loading.value = true;
  message.value = '';
  error.value = '';

  const validation = emailSchema.safeParse(email.value);

  if (!validation.success) {
    error.value = validation.error.errors[0].message;
    loading.value = false;
    return;
  }

  try {
    const response = await api.requestMagicLink({ email: validation.data });
    message.value = response.message;
  } catch (err: any) {
    error.value = err.message || 'Failed to send magic link';
  } finally {
    loading.value = false;
  }
};

// Check for error in query params (from failed magic link)
onMounted(async () => {
  // Display error from query params if present
  if (route.query.error) {
    error.value = decodeURIComponent(route.query.error as string);
  }

  // Auto-redirect if already authenticated
  const config = useRuntimeConfig();
  try {
    const response = await fetch(`${config.public.apiUrl}/v1/auth/me`, {
      credentials: 'include',
    });

    if (response.ok) {
      // User is already authenticated, redirect to sites
      router.push('/sites');
    }
  } catch (err) {
    // Not authenticated, stay on login page
  }
});
</script>
