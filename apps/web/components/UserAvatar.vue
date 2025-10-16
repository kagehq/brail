<template>
  <div class="relative">
    <!-- Avatar button -->
    <button
      @click="toggleDropdown"
      class="flex items-center text-xs justify-center w-7 h-7 bg-yellow-500/50 border border-yellow-500/10 text-white rounded-full font-semibold hover:bg-yellow-500/55 transition"
    >
      {{ initials }}
    </button>

    <!-- Dropdown menu -->
    <div
      v-if="isOpen"
      class="absolute right-0 mt-2 w-64 bg-black border border-gray-500/25 rounded-lg shadow-lg z-50"
    >
      <div class="p-4 border-b border-gray-500/25">
        <p class="text-sm text-gray-400">Signed in as</p>
        <p class="text-sm text-white font-medium mt-1">{{ email }}</p>
      </div>
      
      <div class="p-2">
        <button
          @click="handleLogout"
          class="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-500/15 rounded-lg transition"
        >
          Sign out
        </button>
      </div>
    </div>

    <!-- Backdrop to close dropdown -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-40"
      @click="closeDropdown"
    ></div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  email: string;
}

const props = defineProps<Props>();
const router = useRouter();
const config = useRuntimeConfig();

const isOpen = ref(false);

const initials = computed(() => {
  if (!props.email) return '?';
  const parts = props.email.split('@')[0].split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return props.email[0].toUpperCase();
});

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
};

const closeDropdown = () => {
  isOpen.value = false;
};

const handleLogout = async () => {
  try {
    // Call the logout endpoint
    await fetch(`${config.public.apiUrl}/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    // Clear the session cookie
    const sessionCookie = useCookie('br_session');
    sessionCookie.value = null;

    // Redirect to login page
    router.push('/login');
  } catch (error) {
    console.error('Logout failed:', error);
    // Still redirect even if the API call fails
    router.push('/login');
  }
};
</script>

