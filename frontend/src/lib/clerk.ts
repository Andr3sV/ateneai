import { clerkConfig } from '@clerk/nextjs'

export const clerkConfigOptions = {
  // Configuración por defecto para redirecciones
  afterSignInUrl: '/home',
  afterSignUpUrl: '/home',
  signInUrl: '/sign-in',
  signUpUrl: '/sign-up',
  
  // Configuración de rutas protegidas
  publicRoutes: ['/', '/sign-in(.*)', '/sign-up(.*)', '/api/webhooks(.*)'],
  
  // Configuración de middleware
  ignoredRoutes: ['/api/webhooks(.*)'],
}
