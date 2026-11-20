export default defineEventHandler(async (event) => {
  return {
    admin: await isAdmin(event),
    defaultPassword: import.meta.dev && !useRuntimeConfig().adminPassword,
  }
})
