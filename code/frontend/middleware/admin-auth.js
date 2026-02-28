export default defineNuxtRouteMiddleware(() => {
  if (process.server) return

  const token = useCookie("token").value

  if (!token) {
    return navigateTo("/login")
  }
})

console.log("user cookie:", useCookie("user").value)
console.log("token cookie:", useCookie("token").value)