<template>
  <div class="min-h-screen bg-black overflow-hidden relative">
    <!-- Animated gradient background matching Brail's style -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse-slow"></div>
      <div class="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-400/20 via-cyan-500/10 to-transparent rounded-full blur-3xl animate-pulse-slow" style="animation-delay: 1s"></div>
    </div>

    <!-- Main content -->
    <div class="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
      <div class="max-w-2xl w-full animate-fade-in text-center">
        <!-- Logo -->
        <div class="mb-8">
          <img src="~/assets/img/logo.png" alt="Brail" class="w-16 h-16 mx-auto opacity-80" />
        </div>

        <!-- Error Code with gradient -->
        <div class="mb-8">
          <h1 class="text-8xl md:text-9xl font-bold text-blue-300 mb-4">
            {{ statusCode }}
          </h1>
          <!-- <div class="inline-block px-4 py-2 bg-blue-300/10 border border-blue-300/20 rounded-lg">
            <p class="text-blue-300 font-semibold">{{ statusMessage }}</p>
          </div> -->
        </div>

        <!-- Error message card -->
        <div class="bg-gradient-to-b from-gray-500/10 to-transparent border border-gray-500/20 rounded-2xl p-8 shadow-2xl mb-8">
          <div class="space-y-4">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-300/10 border border-blue-300/20 rounded-full mx-auto mb-4">
              <svg v-if="statusCode === 404" class="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg v-else class="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 class="text-2xl md:text-3xl font-bold text-white mb-3">
              {{ errorTitle }}
            </h2>
            
            <p class="text-gray-400 text-base md:text-lg max-w-lg mx-auto">
              {{ errorDescription }}
            </p>

            <!-- Additional error details for non-404 errors -->
            <div v-if="error?.message && statusCode !== 404" class="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div class="flex items-start gap-3">
                <div class="flex-shrink-0 w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <p class="text-sm font-medium text-red-400">Error Details</p>
                  <p class="text-sm text-red-400/80 mt-1 font-mono">{{ error.message }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <!-- Go back button -->
          <button
            @click="handleGoBack"
            class="group inline-flex items-center gap-2 px-6 py-3 bg-gray-500/10 border border-gray-500/25 text-white rounded-xl font-semibold hover:bg-gray-500/20 hover:border-gray-500/40 transition-all"
          >
            <svg class="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Go Back</span>
          </button>

          <!-- Home button -->
          <NuxtLink
            to="/"
            class="group inline-flex items-center gap-2 px-6 py-3 bg-blue-300 text-black rounded-xl font-semibold hover:bg-blue-400 transition-all"
          >
            <!-- <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg> -->
            <span>Go to Home</span>
            <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </NuxtLink>
        </div>

        <!-- Helpful links for 404 -->
        <div v-if="statusCode === 404" class="mt-12 pt-8 border-t border-gray-500/10">
          <p class="text-sm text-gray-500 mb-4">Looking for something? Try these:</p>
          <div class="flex flex-wrap items-center justify-center gap-3">
            <NuxtLink
              to="/sites"
              class="text-sm text-gray-400 hover:text-blue-300 transition inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-500/10"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Sites
            </NuxtLink>
            <NuxtLink
              to="/login"
              class="text-sm text-gray-400 hover:text-blue-300 transition inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-500/10"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Login
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app';

// Props passed by Nuxt
const props = defineProps({
  error: {
    type: Object as () => NuxtError,
    required: true,
  },
});

// Computed properties for error details
const statusCode = computed(() => props.error?.statusCode || 500);
const statusMessage = computed(() => props.error?.statusMessage || 'Error');

const errorTitle = computed(() => {
  switch (statusCode.value) {
    case 404:
      return "Page Not Found";
    case 403:
      return "Access Forbidden";
    case 500:
      return "Internal Server Error";
    default:
      return "Something Went Wrong";
  }
});

const errorDescription = computed(() => {
  switch (statusCode.value) {
    case 404:
      return "The page you're looking for doesn't exist or has been moved. Let's get you back on track.";
    case 403:
      return "You don't have permission to access this page. Please check your credentials.";
    case 500:
      return "We're experiencing technical difficulties. Our team has been notified and is working on it.";
    default:
      return "An unexpected error occurred. Please try again or contact support if the problem persists.";
  }
});

// Navigation handlers
const handleGoBack = () => {
  // Try to go back in history, or go to home if no history
  if (window.history.length > 1) {
    window.history.back();
  } else {
    navigateTo('/');
  }
};

// Clear error on unmount (for SPA navigation)
const handleError = () => clearError({ redirect: '/' });
</script>

