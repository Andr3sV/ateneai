import { SignUp } from '@clerk/nextjs'
import { Sora } from "next/font/google"
import Image from 'next/image'

const sora = Sora({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'] })

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#060010] relative overflow-hidden flex items-center justify-center">
      {/* Background Effects mejorados */}
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(182,117,255,0.4) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(168,85,247,0.3) 0%, transparent 50%),
          radial-gradient(circle at 40% 60%, rgba(147,51,234,0.2) 0%, transparent 50%)
        `
      }} />
      
      {/* Efectos de profundidad adicionales */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      
      {/* Patrones geométricos sutiles */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-2 h-2 bg-purple-300 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute top-40 right-32 w-1 h-1 bg-violet-300 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute bottom-32 left-40 w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping" style={{animationDelay: '2.5s'}}></div>
        <div className="absolute bottom-20 right-20 w-2 h-2 bg-violet-400 rounded-full animate-ping" style={{animationDelay: '3.5s'}}></div>
      </div>
      
      {/* Logo igual que la landing page */}
      <div className="absolute top-8 left-8 z-10">
        <div className="flex items-center group cursor-pointer">
          <div className="h-7 w-7 sm:h-10 sm:w-10 flex items-center justify-center">
            <Image
              src="/simbiosialogotransparent.svg"
              alt="Simbiosia Logo"
              width={28}
              height={28}
              className="brightness-0 invert h-5 w-5 sm:h-7 sm:w-7"
            />
          </div>
          <span className={`ml-1 text-lg sm:text-xl font-normal text-white tracking-wide group-hover:text-purple-200 transition-colors duration-300 ${sora.className}`}>
            Simbiosia
          </span>
        </div>
      </div>

      {/* Contenido centrado con efectos especiales */}
      <div className="relative z-10 w-full max-w-md">
        {/* Efecto de glow sutil alrededor del modal */}
        <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-violet-500/20 rounded-3xl blur-xl opacity-50 animate-pulse"></div>
        
        {/* Modal con fondo oscuro como la landing */}
        <div className="relative bg-[#060010]/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-purple-500/30 overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
          {/* Header decorativo con gradiente */}
          <div className="h-1 bg-gradient-to-r from-purple-500 via-violet-500 to-purple-500"></div>
          
      {/* Contenido de Clerk */}
      <div className="p-6">
        <SignUp 
          appearance={{
            baseTheme: "dark",
            variables: {
              colorPrimary: "#a855f7",
              colorBackground: "transparent",
              colorText: "#ffffff",
              colorInputBackground: "rgba(255, 255, 255, 0.1)",
              colorInputText: "#ffffff",
              borderRadius: "0.75rem",
              fontFamily: "var(--font-sora)",
            },
            elements: {
              socialButtonsBlockButton: {
                backgroundColor: "#ffffff",
                color: "#000000",
                border: "1px solid #ffffff",
                "&:hover": {
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #f8f9fa",
                }
              },
              socialButtonsBlockButtonText: {
                color: "#000000",
                fontWeight: "500"
              }
            },
            localization: {
              locale: "es",
              labels: {
                signUp: {
                  title: "Crear tu cuenta en Simbiosia",
                  subtitle: "¡Bienvenido! Por favor completa los datos para comenzar",
                  socialButtonsBlockButton: "Continuar con Google",
                  signIn: {
                    linkText: "¿Ya tienes una cuenta?",
                    linkAction: "Iniciar sesión"
                  }
                }
              }
            }
          }}
        />
      </div>
          
          {/* Footer decorativo */}
          <div className="h-1 bg-gradient-to-r from-purple-500 via-violet-500 to-purple-500"></div>
        </div>
      </div>
    </div>
  )
}