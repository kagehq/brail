<template>
  <div class="min-h-screen bg-black">
    <DashboardHeader :user-email="user?.email" />

    <div class="max-w-7xl mx-auto px-4 py-8">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-bold text-white mb-1">Team Access</h1>
          <p class="text-gray-500 text-sm">Invite teammates and manage organization roles</p>
        </div>
        <NuxtLink
          to="/sites"
          class="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white border border-gray-500/20 rounded-lg hover:border-gray-500/40 transition-all"
        >
          ← Back to Sites
        </NuxtLink>
      </div>

      <div v-if="loading" class="space-y-6">
        <div class="bg-gray-500/5 border border-gray-500/10 p-6 rounded-xl animate-pulse">
          <div class="h-6 bg-gray-500/20 rounded w-40 mb-4"></div>
          <div class="space-y-3">
            <div v-for="i in 3" :key="`member-${i}`" class="flex items-center justify-between bg-gray-500/10 border border-gray-500/10 rounded-lg px-4 py-3">
              <div class="w-48 h-4 bg-gray-500/20 rounded"></div>
              <div class="w-24 h-8 bg-gray-500/20 rounded"></div>
            </div>
          </div>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 p-6 rounded-xl animate-pulse">
          <div class="h-6 bg-gray-500/20 rounded w-32 mb-4"></div>
          <div class="w-full h-12 bg-gray-500/15 rounded"></div>
        </div>
      </div>

      <div v-else-if="!org" class="bg-black border border-gray-500/25 rounded-xl p-6">
        <p class="text-gray-400 text-sm">No organization found for your account.</p>
      </div>

      <div v-else class="space-y-8 animate-fade-in">
        <!-- Members -->
        <section class="bg-black border border-gray-500/20 rounded-xl p-6 shadow-lg">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-white">Members</h2>
            <span class="text-xs px-2 py-1 rounded-lg border border-gray-500/30 text-gray-400">
              {{ org.members.length }} member{{ org.members.length === 1 ? '' : 's' }}
            </span>
          </div>

          <div v-if="org.members.length === 0" class="text-sm text-gray-400 bg-gray-500/10 border border-dashed border-gray-500/20 rounded-lg p-4">
            No members yet. Invite teammates to collaborate.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="member in org.members"
              :key="member.id"
              class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-gray-500/10 border border-gray-500/20 rounded-lg px-4 py-3"
            >
              <div>
                <p class="text-sm font-semibold text-white">{{ member.email }}</p>
                <p class="text-xs text-gray-500">
                  Joined {{ formatDate(member.joinedAt) }}
                  <span v-if="member.userId === org.currentMember.userId" class="text-blue-300 ml-1">(You)</span>
                </p>
              </div>

              <div class="flex items-center gap-3">
                <div class="relative">
                  <select
                    v-model="memberRoles[member.id]"
                    @change="() => handleRoleChange(member)"
                    :disabled="!canManage || memberAction === member.id || (!isOwner && member.role === 'owner')"
                    class="appearance-none text-sm bg-gray-500/10 border border-gray-500/30 text-sm text-white px-3 py-2 pr-9 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option
                      v-for="option in availableMemberRoles"
                      :key="`${member.id}-${option.value}`"
                      :value="option.value"
                      :disabled="option.value === 'owner' && !isOwner"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                  <svg class="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <button
                  @click="removeMember(member)"
                  :disabled="!canManage || memberAction === member.id || member.userId === org.currentMember.userId"
                  class="px-3 py-2 text-xs font-semibold text-red-400 border border-red-400/20 rounded-lg hover:bg-red-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ memberAction === member.id ? 'Removing...' : 'Remove' }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Invite form -->
        <section v-if="canManage" class="bg-black border border-gray-500/20 rounded-xl p-6 shadow-lg">
          <h2 class="text-xl font-semibold text-white mb-4">Invite Teammate</h2>
          <form @submit.prevent="inviteMember" class="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
            <div class="md:col-span-1">
              <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Email</label>
              <input
                v-model="inviteForm.email"
                type="email"
                required
                placeholder="teammate@example.com"
                class="w-full px-4 py-3 text-sm text-white border border-gray-500/25 bg-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/40 focus:border-blue-300/40 outline-none"
              />
            </div>

            <div class="md:col-span-1">
              <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Role</label>
              <select
                v-model="inviteForm.role"
                class="w-full px-4 py-3 text-sm text-white border border-gray-500/25 bg-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/40 focus:border-blue-300/40 outline-none"
              >
                <option
                  v-for="option in availableInviteRoles"
                  :key="`invite-${option.value}`"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>

            <div class="md:col-span-1 flex gap-3">
              <button
                type="submit"
                :disabled="inviting"
                class="flex-1 bg-blue-300 text-sm font-semibold text-black py-3 px-4 rounded-lg hover:bg-blue-400 transition-all hover:shadow-lg hover:shadow-blue-300/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ inviting ? 'Sending...' : 'Send Invite' }}
              </button>
            </div>
          </form>
        </section>

        <!-- Pending invites -->
        <section class="bg-black border border-gray-500/20 rounded-xl p-6 shadow-lg">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-white">Pending Invites</h2>
            <span class="text-xs px-2 py-1 rounded-lg border border-gray-500/30 text-gray-400">
              {{ org.invites.length }} pending
            </span>
          </div>

          <div v-if="org.invites.length === 0" class="text-sm text-gray-400 bg-gray-500/10 border border-dashed border-gray-500/20 rounded-lg p-4">
            No pending invitations. Invites that have been accepted or cancelled will appear here until they are resolved.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="invite in org.invites"
              :key="invite.id"
              class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-gray-500/10 border border-gray-500/20 rounded-lg px-4 py-3"
            >
              <div class="space-y-1">
                <p class="text-sm font-semibold text-white">{{ invite.email }}</p>
                <p class="text-xs text-gray-500">
                  Invited {{ formatDate(invite.createdAt) }} • Role: {{ roleLabel(invite.role) }}
                </p>
                <div v-if="invite.token" class="text-xs text-gray-500 flex flex-col gap-1">
                  <span class="font-semibold text-gray-400 uppercase tracking-wide">Invite Token</span>
                  <span class="inline-flex items-center gap-2 font-mono text-[11px] bg-gray-500/10 border border-gray-500/20 rounded px-2 py-1 break-all">
                    {{ invite.token }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="invite.token"
                  @click="copyInviteToken(invite)"
                  :disabled="!canManage || copiedInviteId === invite.id"
                  class="px-3 py-2 text-xs font-semibold text-blue-300 border border-blue-300/20 rounded-lg hover:bg-blue-300/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ copiedInviteId === invite.id ? 'Copied!' : 'Copy Token' }}
                </button>
                <button
                  @click="cancelInvite(invite)"
                  :disabled="!canManage || inviteAction === invite.id"
                  class="px-3 py-2 text-xs font-semibold text-gray-300 border border-gray-500/30 rounded-lg hover:bg-gray-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ inviteAction === invite.id ? 'Cancelling...' : 'Cancel Invite' }}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter();
const config = useRuntimeConfig();
const toast = useToast();

const user = ref<any>(null);
const org = ref<any | null>(null);
const loading = ref(true);

const inviteForm = reactive({
  email: '',
  role: 'member',
});
const inviting = ref(false);
const memberRoles = reactive<Record<string, string>>({});
const memberAction = ref<string | null>(null);
const inviteAction = ref<string | null>(null);
const copiedInviteId = ref<string | null>(null);

const canManage = computed(() => {
  const role = org.value?.currentMember?.role;
  return role === 'owner' || role === 'admin';
});

const isOwner = computed(() => org.value?.currentMember?.role === 'owner');

const availableMemberRoles = computed(() => {
  const base = [
    { value: 'admin', label: 'Admin' },
    { value: 'member', label: 'Member' },
  ];

  return isOwner.value
    ? [{ value: 'owner', label: 'Owner' }, ...base]
    : base;
});

const availableInviteRoles = computed(() => {
  const base = [
    { value: 'admin', label: 'Admin' },
    { value: 'member', label: 'Member' },
  ];

  return isOwner.value
    ? [{ value: 'owner', label: 'Owner' }, ...base]
    : base;
});

onMounted(async () => {
  try {
    const meResponse = await fetch(`${config.public.apiUrl}/v1/auth/me`, {
      credentials: 'include',
    });

    if (!meResponse.ok) {
      router.push('/login');
      return;
    }

    user.value = await meResponse.json();
    await loadOrg(true);
  } catch (error) {
    console.error('Failed to load team data:', error);
    toast.apiError(error);
  }
});

async function loadOrg(showSpinner = false) {
  if (showSpinner) {
    loading.value = true;
  }

  try {
    const response = await fetch(`${config.public.apiUrl}/v1/orgs/current`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to load organization');
    }

    const data = await response.json();
    org.value = data;
    resetMemberRoles();
    copiedInviteId.value = null;
  } catch (error) {
    org.value = null;
    toast.apiError(error);
  } finally {
    if (showSpinner) {
      loading.value = false;
    }
  }
}

function resetMemberRoles() {
  Object.keys(memberRoles).forEach((key) => {
    delete memberRoles[key];
  });

  org.value?.members?.forEach((member: any) => {
    memberRoles[member.id] = member.role;
  });

  if (!availableInviteRoles.value.some((option) => option.value === inviteForm.role)) {
    inviteForm.role = isOwner.value ? 'owner' : 'member';
  }
}

async function inviteMember() {
  if (!canManage.value) {
    return;
  }

  inviting.value = true;

  try {
    const response = await fetch(
      `${config.public.apiUrl}/v1/orgs/${org.value.id}/invites`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteForm.email,
          role: inviteForm.role,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to send invite');
    }

    toast.success('Invite sent', `Invitation sent to ${inviteForm.email}`);
    inviteForm.email = '';
    inviteForm.role = isOwner.value ? 'owner' : 'member';

    await loadOrg();
  } catch (error) {
    toast.apiError(error);
  } finally {
    inviting.value = false;
  }
}

async function handleRoleChange(member: any) {
  const selectedRole = memberRoles[member.id];

  if (!selectedRole || selectedRole === member.role) {
    return;
  }

  memberAction.value = member.id;

  try {
    const response = await fetch(
      `${config.public.apiUrl}/v1/orgs/${org.value.id}/members/${member.id}`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: selectedRole }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      memberRoles[member.id] = member.role;
      throw new Error(error.message || 'Failed to update role');
    }

    toast.success('Role updated', `${member.email} is now ${roleLabel(selectedRole)}.`);
    await loadOrg();
  } catch (error) {
    toast.apiError(error);
  } finally {
    memberAction.value = null;
  }
}

async function removeMember(member: any) {
  if (!canManage.value || member.userId === org.value?.currentMember?.userId) {
    return;
  }

  if (!window.confirm(`Remove ${member.email} from the organization?`)) {
    return;
  }

  memberAction.value = member.id;

  try {
    const response = await fetch(
      `${config.public.apiUrl}/v1/orgs/${org.value.id}/members/${member.id}`,
      {
        method: 'DELETE',
        credentials: 'include',
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to remove member');
    }

    toast.success('Member removed', `${member.email} has been removed.`);
    await loadOrg();
  } catch (error) {
    toast.apiError(error);
  } finally {
    memberAction.value = null;
  }
}

async function cancelInvite(invite: any) {
  if (!canManage.value) {
    return;
  }

  inviteAction.value = invite.id;

  try {
    const response = await fetch(
      `${config.public.apiUrl}/v1/orgs/${org.value.id}/invites/${invite.id}`,
      {
        method: 'DELETE',
        credentials: 'include',
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to cancel invite');
    }

    toast.success('Invite cancelled', `Invite for ${invite.email} cancelled.`);
    await loadOrg();
  } catch (error) {
    toast.apiError(error);
  } finally {
    inviteAction.value = null;
  }
}

async function copyInviteToken(invite: any) {
  if (!invite.token) {
    return;
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(invite.token);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = invite.token;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    copiedInviteId.value = invite.id;
    toast.success('Invite token copied', 'Share this token with your teammate to accept the invite.');

    window.setTimeout(() => {
      if (copiedInviteId.value === invite.id) {
        copiedInviteId.value = null;
      }
    }, 2000);
  } catch (error) {
    console.error('Failed to copy invite token:', error);
    toast.error('Copy failed', 'Unable to copy invite token to clipboard.');
  }
}

function formatDate(value: string) {
  try {
    const date = new Date(value);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
</script>
