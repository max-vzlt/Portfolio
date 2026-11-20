// Every /admin page (except login) requires the admin session.
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  if (to.path === '/admin/login') return
  const me = await $fetch<{ admin: boolean }>('/api/auth/me').catch(() => ({ admin: false }))
  if (!me.admin) return navigateTo(`/admin/login?next=${encodeURIComponent(to.fullPath)}`)
})
