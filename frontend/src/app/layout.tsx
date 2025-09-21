import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { LayoutWrapper } from '@/components/layout-wrapper';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "AteneAI - Chatbot SaaS Platform",
  description: "AI-powered chatbot platform for business automation",
};

const clerkAppearance = {
  baseTheme: "dark",
  variables: {
    colorPrimary: "#a855f7", // purple-500
    colorBackground: "transparent", // transparente para que se vea el fondo oscuro
    colorText: "#ffffff", // texto blanco
    colorInputBackground: "rgba(255, 255, 255, 0.1)", // fondo de inputs semi-transparente
    colorInputText: "#ffffff", // texto de inputs blanco
    borderRadius: "0.75rem", // rounded-xl
    fontFamily: "var(--font-sora)",
  },
  elements: {
    // Botón de Google con fondo blanco y texto oscuro
    socialButtonsBlockButton: {
      backgroundColor: "#ffffff",
      color: "#000000",
      border: "1px solid #ffffff",
      "&:hover": {
        backgroundColor: "#f8f9fa",
        border: "1px solid #f8f9fa",
      }
    },
    // Texto del botón de Google
    socialButtonsBlockButtonText: {
      color: "#000000",
      fontWeight: "500"
    }
  },
  localization: {
    locale: "es",
    labels: {
      signIn: {
        title: "Iniciar sesión en Simbiosia",
        subtitle: "¡Bienvenido de vuelta! Por favor inicia sesión para continuar",
        socialButtonsBlockButton: "Continuar con Google",
        signUp: {
          linkText: "¿No tienes una cuenta?",
          linkAction: "Regístrate"
        }
      },
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      afterSignInUrl="/home"
      afterSignUpUrl="/home"
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      appearance={clerkAppearance}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} antialiased`}
        >
          <LayoutWrapper>{children}</LayoutWrapper>
        </body>
      </html>
    </ClerkProvider>
  );
}
