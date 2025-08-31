import { clerkMiddleware, createRouteMatcher, redirectToSignIn } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)'
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    const { userId } = auth()
    
    if (!userId) {
      return redirectToSignIn({ returnBackUrl: req.url })
    }
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}