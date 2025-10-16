<template>
  <div class="min-h-screen bg-black overflow-hidden">
    <!-- Animated gradient background -->
    <!-- <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse-slow"></div>
      <div class="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-400/20 via-cyan-500/10 to-transparent rounded-full blur-3xl animate-pulse-slow" style="animation-delay: 1s"></div>
    </div> -->

    <!-- Main content -->
    <div class="relative z-10">
      <!-- Hero section -->
      <div class="max-w-2xl mx-auto px-4 pt-20 pb-16 sm:pt-32 sm:pb-24">
        <div class="text-center">

          <!-- Main heading -->
          <h1 class="sm:text-base md:text-xl font-semibold mb-5 animate-fade-in flex items-center justify-center" style="animation-delay: 0.1s">
            <img src="~/assets/img/logo.png" alt="Brail" class="w-7 h-7" />
            <span class="text-white">
              Brail
            </span>
          </h1>

          <h1 class="text-white mx-auto w-full text-balance text-center font-semibold tracking-tight max-w-2xl text-2xl !leading-[1.2] sm:text-4xl md:text-5xl animate-fade-in flex items-center justify-center" style="animation-delay: 0.1s">
            If FileZilla grew up in the cloud era.
            <!-- was built for the edge. -->
          </h1>

          <!-- Subheading -->
          <p class="font-normal text-center text-gray-400 max-w-lg mx-auto mb-8 sm:mt-4 text-pretty text-base sm:text-lg sm:leading-6 leading-relaxed animate-fade-in" style="animation-delay: 0.2s">
            Deploy static sites <span class="text-blue-300 font-semibold">instantly</span> with drag-and-drop simplicity.
            <br />
             Instant, atomic, and globally distributed.
            <!-- If FileZilla grew up in the cloud era -->
          </p>

          <!-- CTA buttons -->
          <div class="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in" style="animation-delay: 0.3s">
            <NuxtLink
              to="/login"
              class="group relative bg-blue-300 text-sm text-black px-6 py-3 rounded-xl font-semibold hover:bg-blue-400 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-300/50 flex items-center gap-2"
            >
              <span>Get Started Free</span>
              <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </NuxtLink>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-2 gap-5 max-w-sm mx-auto animate-fade-in" style="animation-delay: 0.4s">
            <div class="text-center">
              <div class="text-3xl sm:text-4xl font-bold text-white mb-2">< 2ms</div>
              <div class="text-sm text-gray-500">to Deploy</div>
            </div>
            <div class="text-center">
              <div class="text-3xl sm:text-4xl font-bold text-white mb-2">9+</div>
              <div class="text-sm text-gray-500">Adapters</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Auto-redirect to /sites if already authenticated
onMounted(async () => {
  const config = useRuntimeConfig();
  try {
    const response = await fetch(`${config.public.apiUrl}/v1/auth/me`, {
      credentials: 'include',
    });
    
    if (response.ok) {
      // User is authenticated, redirect to sites
      navigateTo('/sites');
    }
  } catch (error) {
    // Not authenticated, stay on landing page
  }
});
</script>
