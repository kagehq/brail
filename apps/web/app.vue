<template>
  <div class="min-h-screen bg-black relative">
    <NuxtPage />
    <ClientOnly>
      <Toaster
        position="top-right"
        theme="dark"
        :duration="4000"
        :visibleToasts="3"
        :closeButton="true"
        :richColors="true"
        :expand="true"
        :toastOptions="{
          style: {
            background: 'rgba(24, 24, 27, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white',
            padding: '14px',
            borderRadius: '12px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
          },
        }"
        :style="{ position: 'fixed', top: '1rem', right: '1rem', bottom: 'auto', left: 'auto', zIndex: 9999 }"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
// Import composables
// Global styles and setup

// Konami Code Easter Egg 🎮
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const normalizedKonami = konamiCode.map((key) => key.toLowerCase());
const userInput = ref<string[]>([]);

const handleKeyDown = (event: KeyboardEvent) => {
  userInput.value.push(event.key.toLowerCase());
  userInput.value = userInput.value.slice(-normalizedKonami.length);
  
  if (userInput.value.join(',') === normalizedKonami.join(',')) {
    triggerEasterEgg();
    userInput.value = []; // Reset
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

async function triggerEasterEgg() {
  const { celebrate } = useConfetti();
  const toast = useToast();
  
  // Epic confetti!
  for (let i = 0; i < 5; i++) {
    setTimeout(() => celebrate(), i * 200);
  }
  
  // Show toast
  toast.success('Konami Code!', 'You found the secret! Keep building awesome stuff!');
  
  // Bonus: Add some fun visual effect
  document.body.style.animation = 'rainbow 2s ease-in-out';
  setTimeout(() => {
    document.body.style.animation = '';
  }, 2000);
}
</script>

<style>
@keyframes rainbow {
  0%, 100% { filter: hue-rotate(0deg); }
  50% { filter: hue-rotate(360deg); }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse-slow {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.05);
  }
}

.animate-fade-in {
  animation: fade-in 0.6s ease-out forwards;
  opacity: 0;
}

.animate-pulse-slow {
  animation: pulse-slow 4s ease-in-out infinite;
}
</style>

<style>
body {
  @apply bg-gray-50;
}

/* Toast customization */
:global([data-sonner-toaster][data-y-position="top"]) {
  top: 0 !important;
  bottom: auto !important;
}

:global([data-sonner-toaster][data-x-position="right"]) {
  right: 0 !important;
  left: auto !important;
}

:global([data-sonner-toaster]) {
  position: fixed !important;
  inset: auto !important;
  z-index: 9999 !important;
  padding: 1rem !important;
  margin: 0 !important;
}

:global([data-sonner-toast]) {
  min-width: 500px !important;
  max-width: 800px !important;
  width: max-content !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  word-wrap: break-word !important;
  display: flex !important;
  align-items: flex-start !important;
  gap: 0.75rem !important;
  margin-bottom: 0.75rem !important;
}

:global([data-sonner-toast] [data-icon]) {
  flex-shrink: 0 !important;
  margin-top: 0.125rem !important;
}

:global([data-sonner-toast][data-mounted]) {
  animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

:global([data-sonner-toast][data-removed]) {
  animation: slideOut 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

:global([data-sonner-toast]:hover) {
  transform: translateX(-4px) scale(1.02) !important;
  box-shadow: 0 25px 30px -10px rgba(0, 0, 0, 0.6), 0 15px 15px -10px rgba(0, 0, 0, 0.5) !important;
}

/* Success toasts */
:global([data-sonner-toast][data-type="success"]) {
  border-color: rgba(134, 239, 172, 0.4) !important;
  background: linear-gradient(to right, rgba(34, 197, 94, 0.1), rgba(24, 24, 27, 0.95)) !important;
}

:global([data-sonner-toast][data-type="success"] [data-icon]) {
  color: rgb(134, 239, 172) !important;
}

/* Error toasts */
:global([data-sonner-toast][data-type="error"]) {
  border-color: rgba(252, 165, 165, 0.4) !important;
  background: linear-gradient(to right, rgba(239, 68, 68, 0.1), rgba(24, 24, 27, 0.95)) !important;
}

:global([data-sonner-toast][data-type="error"] [data-icon]) {
  color: rgb(252, 165, 165) !important;
}

/* Loading toasts */
:global([data-sonner-toast][data-type="loading"]) {
  border-color: rgba(147, 197, 253, 0.4) !important;
  background: linear-gradient(to right, rgba(59, 130, 246, 0.1), rgba(24, 24, 27, 0.95)) !important;
}

/* Content styling */
:global([data-sonner-toast] [data-content]) {
  color: white !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 0.375rem !important;
  flex: 1 !important;
  min-width: 0 !important;
}

:global([data-sonner-toast] [data-title]) {
  color: white !important;
  font-weight: 600 !important;
  font-size: 0.9375rem !important;
  letter-spacing: -0.01em !important;
  line-height: 1.4 !important;
  word-break: break-word !important;
}

:global([data-sonner-toast] [data-description]) {
  color: rgb(161, 161, 170) !important;
  font-size: 0.875rem !important;
  line-height: 1.5 !important;
  word-break: break-word !important;
  white-space: normal !important;
}

/* Close button */
:global([data-sonner-toast] [data-close-button]) {
  color: rgb(161, 161, 170) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  background: rgba(255, 255, 255, 0.05) !important;
  transition: all 0.2s !important;
  flex-shrink: 0 !important;
  margin-left: auto !important;
}

:global([data-sonner-toast] [data-close-button]:hover) {
  background: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
}

</style>
