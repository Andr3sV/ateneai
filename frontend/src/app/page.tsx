'use client'

import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// Hook para detectar si es móvil
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
};
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Phone, MessageSquare, TrendingUp, Zap, Shield, Users, CheckCircle, Star } from 'lucide-react'
import { Sora } from 'next/font/google'
import LaserFlow from '@/components/ui/laserflow'
import MagicBento from '@/components/ui/magicbento'
import MagicBentoSolutions from '@/components/ui/magicbento-solutions'

const sora = Sora({ subsets: ['latin'], weight: ['600','700','800'] })

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth()
  const heroRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const pedestalRef = useRef<HTMLDivElement | null>(null)
  const [onLightSection, setOnLightSection] = useState(false)
  const [labelTop, setLabelTop] = useState<number>(120)
  const router = useRouter()
  const isMobile = useIsMobile()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/home')
    }
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    const update = () => {
      const navApprox = 64
      const rect = heroRef.current?.getBoundingClientRect()
      if (!rect) return
      setOnLightSection(rect.bottom <= navApprox + 8)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  useEffect(() => {
    const computeLabelY = () => {
      const navEl = document.querySelector('nav') as HTMLElement | null
      const navH = navEl?.offsetHeight ?? 64
      const panelH = panelRef.current?.getBoundingClientRect().height ?? 0
      const pedestalH = pedestalRef.current?.getBoundingClientRect().height ?? 0
      const bottomGap = 24 // approximate bottom-6 in px
      const start = navH + 8
      const end = Math.max(start + 40, panelH - bottomGap - pedestalH)
      const center = (start + end) / 2
      setLabelTop(center)
    }
    computeLabelY()
    window.addEventListener('resize', computeLabelY)
    const id = requestAnimationFrame(computeLabelY)
    return () => {
      window.removeEventListener('resize', computeLabelY)
      cancelAnimationFrame(id)
    }
  }, [])

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-white">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${onLightSection ? 'backdrop-blur-xl' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="h-8 w-8 sm:h-12 sm:w-12 flex items-center justify-center">
                <Image
                  src="/simbiosis-logo.svg"
                  alt="SimbiosisAI Logo"
                  width={32}
                  height={32}
                  className="brightness-0 invert h-6 w-6 sm:h-8 sm:w-8"
                />
              </div>
              <span className="ml-1 text-lg sm:text-xl font-normal text-white tracking-wide">Simbiosia</span>
            </div>
            
            {/* CTAs */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                href="/sign-in"
                className="text-white hover:text-white/90 px-2 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base"
              >
                <span className="hidden sm:inline">Iniciar Sesión</span>
                <span className="sm:hidden">Entrar</span>
              </Link>
              <Link
                href="#demo"
                className="bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 text-white px-3 sm:px-6 py-2 rounded-lg shadow-[0_0_20px_rgba(182,117,255,0.3)] hover:shadow-[0_0_30px_rgba(182,117,255,0.5)] transition-all duration-300 border border-purple-400/30 hover:border-purple-300/50 text-sm sm:text-base"
              >
                <span className="hidden sm:inline">Comenzar ahora</span>
                <span className="sm:hidden">Demo</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pb-0 px-0 min-h-[90vh] md:min-h-[95vh] bg-[#060010]">

        <div className="relative z-10 mx-auto text-center h-[90vh] md:h-[95vh] max-w-none">
          <div className="px-0 py-0 h-full">
            {/* Dark hero panel stretched to fill the hero container */}
            <div ref={panelRef} className="relative w-screen h-full rounded-none bg-[#090414] overflow-visible">
              {/* LaserFlow canvas */}
              <div className="absolute inset-0 z-0">
                <LaserFlow
                  className="w-full h-full"
                  color="#B675FF"
                  horizontalBeamOffset={0.0}
                  verticalBeamOffset={isMobile ? -0.212 : -0.165}
                  fogIntensity={0.95}
                  wispIntensity={8.0}
                  wispDensity={1.4}
                  flowStrength={0.55}
                />
              </div>
              {/* Subtle vignette */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_700px_at_50%_10%,rgba(182,117,255,0.18),transparent_65%)]" />
              {/* Centered label */}
              <div className="absolute inset-x-0 flex items-center justify-center select-none" style={{ top: '35%', transform: 'translateY(-50%)' }}>
                  <span
                    className={`${sora.className} text-xl sm:text-2xl md:text-3xl lg:text-5xl font-normal tracking-wide bg-gradient-to-r from-fuchsia-300 via-pink-300 to-violet-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(182,117,255,0.25)] text-center`}
                  >
                    Tus ventas potenciadas por IA 
                </span>
              </div>

              {/* Bottom pedestal grid with message */}
              <div ref={pedestalRef} className="absolute left-3 right-3 sm:left-6 sm:right-6 bottom-8 sm:bottom-16 h-[160px] sm:h-[180px] md:h-[200px] rounded-[20px] sm:rounded-[28px] border-2 border-[#C084FC] bg-[#0B0614] overflow-hidden max-w-2xl sm:max-w-3xl md:max-w-4xl mx-auto">
                <div className="absolute inset-0 opacity-40" style={{backgroundImage:'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)',backgroundSize:'16px 16px',backgroundPosition:'0 0'}} />
                <div className="absolute inset-0 ring-1 ring-white/5 rounded-[20px] sm:rounded-[28px]" />
                <div className="relative h-full w-full flex flex-col items-center justify-center px-4 sm:px-8 py-6 sm:py-8 space-y-4 sm:space-y-8">
                  <p className={`text-white/95 text-sm sm:text-base md:text-lg lg:text-2xl text-center leading-relaxed font-normal tracking-wide ${sora.className}`}>
                  Automatiza el primer contacto sin perder el toque humano.
                  Ahorra horas a tu equipo y convierte más leads en clientes.                  </p>
                  <button className="px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 shadow-[0_0_40px_rgba(182,117,255,0.35)] hover:shadow-[0_0_60px_rgba(182,117,255,0.6)] transition-all duration-300 border border-purple-400/30 hover:border-purple-300/50 text-sm sm:text-base">
                    Comenzar ahora
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Social Proof - Minimalist Supabase Style */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#060010] relative overflow-hidden">
        {/* Subtle background elements */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'radial-gradient(circle at 20% 80%, rgba(182,117,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(168,85,247,0.3) 0%, transparent 50%)'}} />
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <p className="text-xl text-gray-300 mb-16 tracking-wide">
            Líderes en el sector han <span className="text-purple-400 font-medium">multiplicado</span> sus ventas
          </p>
          
          {/* Horizontal scrolling logos */}
          <div className="relative overflow-hidden mx-auto w-3/5">
            {/* Fade effect overlays */}
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#060010] to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#060010] to-transparent z-10 pointer-events-none"></div>
            
            <div className="flex animate-scroll-horizontal">
              {/* Logo row 1 */}
              <div className="flex items-center space-x-20 whitespace-nowrap">
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                  <Image src="/intercard-logo.png" alt="Intercard" width={240} height={80} className="h-16 w-auto opacity-40 brightness-0 invert" />
                </div>
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                  <Image src="/fjdenegia-logo.png" alt="FJD Energía" width={240} height={80} className="h-16 w-auto opacity-40 brightness-0 invert" />
                </div>
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                  <Image src="/limforce-logo.png" alt="Limforce" width={240} height={80} className="h-16 w-auto opacity-40 brightness-0 invert" />
                </div>
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                  <span className="text-2xl font-medium">Simbiosis</span>
                </div>
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                  <span className="text-2xl font-medium">AteneAI</span>
                </div>
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                  <span className="text-2xl font-medium">TechFlow</span>
                </div>
              </div>
              {/* Duplicate for seamless loop */}
              <div className="flex items-center space-x-20 whitespace-nowrap ml-20">
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                  <Image src="/intercard-logo.png" alt="Intercard" width={240} height={80} className="h-16 w-auto opacity-40 brightness-0 invert" />
                </div>
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                  <Image src="/fjdenegia-logo.png" alt="FJD Energía" width={240} height={80} className="h-16 w-auto opacity-40 brightness-0 invert" />
                </div>
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                  <Image src="/limforce-logo.png" alt="Limforce" width={240} height={80} className="h-16 w-auto opacity-40 brightness-0 invert" />
                </div>
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                  <span className="text-2xl font-medium">Simbiosis</span>
                </div>
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                  <span className="text-2xl font-medium">AteneAI</span>
                </div>
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                  <span className="text-2xl font-medium">TechFlow</span>
            </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* Soluciones Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#060010] relative overflow-hidden">
        {/* Subtle background elements */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'radial-gradient(circle at 25% 75%, rgba(182,117,255,0.4) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(168,85,247,0.3) 0%, transparent 50%)'}} />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className={`text-3xl md:text-4xl font-normal text-white mb-6 tracking-wide ${sora.className}`}>
              Las soluciones que necesitas para <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">escalar sin contratar</span>
            </h2>
          </div>
          
          <MagicBentoSolutions
            textAutoHide={true}
            enableStars={true}
            enableSpotlight={true}
            enableBorderGlow={true}
            enableTilt={true}
            enableMagnetism={true}
            clickEffect={true}
            spotlightRadius={300}
            particleCount={12}
            glowColor="132, 0, 255"
          />
        </div>
      </section>

      {/* Magic Bento Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#060010] relative overflow-hidden">
        {/* Subtle background elements */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'radial-gradient(circle at 30% 70%, rgba(182,117,255,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(168,85,247,0.3) 0%, transparent 50%)'}} />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className={`text-3xl md:text-4xl font-normal text-white mb-6 tracking-wide ${sora.className}`}>
              ¿Por qué elegir <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">SimbiosisAI</span>?
            </h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed font-light tracking-wide">
              Ventajas únicas que te harán destacar en el mercado
            </p>
          </div>
          
          <MagicBento 
            textAutoHide={true}
            enableStars={true}
            enableSpotlight={true}
            enableBorderGlow={true}
            enableTilt={true}
            enableMagnetism={true}
            clickEffect={true}
            spotlightRadius={300}
            particleCount={12}
            glowColor="132, 0, 255"
          />
        </div>
      </section>

      {/* Sectores y Casos de Uso */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#060010] relative overflow-hidden">
        {/* Subtle background elements */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'radial-gradient(circle at 20% 80%, rgba(182,117,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(168,85,247,0.3) 0%, transparent 50%)'}} />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className={`text-3xl md:text-4xl font-normal text-white mb-6 tracking-wide ${sora.className}`}>
              Soluciones para <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">todos los sectores</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed font-light tracking-wide">
              Nuestros agentes IA hacen miles de llamadas en tiempo real, como un humano, pero sin límites.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-12">
            {/* Utilities */}
            <div className="group relative">
              {/* Glowing border effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 via-violet-600/20 to-purple-600/30 rounded-3xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
              <div className="relative bg-gray-900/90 backdrop-blur-sm border border-purple-400/30 rounded-3xl p-8 shadow-[0_8px_32px_rgba(182,117,255,0.15)] hover:shadow-[0_16px_48px_rgba(182,117,255,0.25)] transition-all duration-500 group-hover:border-purple-400/50">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-violet-600/20 rounded-2xl blur-md"></div>
                  <div className="relative h-16 w-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-400 to-violet-400 shadow-[0_4px_16px_rgba(182,117,255,0.3)]">
                    <Zap className="h-8 w-8 text-white" />
                  </div>
              </div>
                <h3 className={`text-xl font-normal text-white mb-6 tracking-wide ${sora.className}`}>Utilities</h3>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-gray-300">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-violet-400 mr-3"></div>
                  Recordatorios de pago masivos
                </li>
                  <li className="flex items-center text-gray-300">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-violet-400 mr-3"></div>
                  Notificaciones de cortes
                </li>
                  <li className="flex items-center text-gray-300">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-violet-400 mr-3"></div>
                  Cualificación de leads - venta en frío
                </li>
              </ul>
                <p className="text-sm text-gray-300 italic bg-gradient-to-r from-purple-900/50 to-violet-900/50 p-4 rounded-xl border border-purple-400/30">
                "Procesos repetitivos resueltos de forma instantánea."
              </p>
              </div>
            </div>
            
            {/* Telecomunicaciones */}
            <div className="group relative">
              {/* Glowing border effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 via-violet-600/20 to-purple-600/30 rounded-3xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
              <div className="relative bg-gray-900/90 backdrop-blur-sm border border-purple-400/30 rounded-3xl p-8 shadow-[0_8px_32px_rgba(182,117,255,0.15)] hover:shadow-[0_16px_48px_rgba(182,117,255,0.25)] transition-all duration-500 group-hover:border-purple-400/50">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-violet-600/20 rounded-2xl blur-md"></div>
                  <div className="relative h-16 w-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-400 to-violet-400 shadow-[0_4px_16px_rgba(182,117,255,0.3)]">
                    <Phone className="h-8 w-8 text-white" />
                  </div>
              </div>
                <h3 className={`text-xl font-normal text-white mb-6 tracking-wide ${sora.className}`}>Telecomunicaciones</h3>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-gray-300">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-violet-400 mr-3"></div>
                  Retención de clientes
                </li>
                  <li className="flex items-center text-gray-300">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-violet-400 mr-3"></div>
                  Upselling de planes y bundles
                </li>
                  <li className="flex items-center text-gray-300">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-violet-400 mr-3"></div>
                  Avisos de facturación
                </li>
              </ul>
                <p className="text-sm text-gray-300 italic bg-gradient-to-r from-purple-900/50 to-violet-900/50 p-4 rounded-xl border border-purple-400/30">
                "Reduce tus costos de call center y aumenta la retención con IA."
              </p>
              </div>
            </div>
            
            {/* Finanzas */}
            <div className="group relative">
              {/* Glowing border effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 via-violet-600/20 to-purple-600/30 rounded-3xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
              <div className="relative bg-gray-900/90 backdrop-blur-sm border border-purple-400/30 rounded-3xl p-8 shadow-[0_8px_32px_rgba(182,117,255,0.15)] hover:shadow-[0_16px_48px_rgba(182,117,255,0.25)] transition-all duration-500 group-hover:border-purple-400/50">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-violet-600/20 rounded-2xl blur-md"></div>
                  <div className="relative h-16 w-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-400 to-violet-400 shadow-[0_4px_16px_rgba(182,117,255,0.3)]">
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
              </div>
                <h3 className={`text-xl font-normal text-white mb-6 tracking-wide ${sora.className}`}>Finanzas & Cobranzas</h3>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-gray-300">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-violet-400 mr-3"></div>
                  Cobranza preventiva y reactiva
                </li>
                  <li className="flex items-center text-gray-300">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-violet-400 mr-3"></div>
                  Negociación inicial de refinanciamientos
                </li>
                  <li className="flex items-center text-gray-300">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-violet-400 mr-3"></div>
                  Avisos de deuda vencida
                </li>
              </ul>
                <p className="text-sm text-gray-300 italic bg-gradient-to-r from-purple-900/50 to-violet-900/50 p-4 rounded-xl border border-purple-400/30">
                "Miles de llamadas diarias sin necesidad de call centers gigantes."
              </p>
              </div>
            </div>
            
            {/* Salud */}
            <div className="group relative">
              {/* Glowing border effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 via-violet-600/20 to-purple-600/30 rounded-3xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
              <div className="relative bg-gray-900/90 backdrop-blur-sm border border-purple-400/30 rounded-3xl p-8 shadow-[0_8px_32px_rgba(182,117,255,0.15)] hover:shadow-[0_16px_48px_rgba(182,117,255,0.25)] transition-all duration-500 group-hover:border-purple-400/50">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-violet-600/20 rounded-2xl blur-md"></div>
                  <div className="relative h-16 w-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-400 to-violet-400 shadow-[0_4px_16px_rgba(182,117,255,0.3)]">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
              </div>
                <h3 className={`text-xl font-normal text-white mb-6 tracking-wide ${sora.className}`}>Salud</h3>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-gray-300">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-violet-400 mr-3"></div>
                  Recordatorios de citas
                </li>
                  <li className="flex items-center text-gray-300">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-violet-400 mr-3"></div>
                  Seguimiento post-consulta
                </li>
                  <li className="flex items-center text-gray-300">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-violet-400 mr-3"></div>
                  Adherencia a tratamientos
                </li>
              </ul>
                <p className="text-sm text-gray-300 italic bg-gradient-to-r from-purple-900/50 to-violet-900/50 p-4 rounded-xl border border-purple-400/30">
                "Mejor experiencia del paciente, menos ausentismo."
              </p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Estadísticas Impresionantes */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#060010] relative overflow-hidden">
        {/* Subtle background elements */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'radial-gradient(circle at 40% 60%, rgba(182,117,255,0.4) 0%, transparent 50%), radial-gradient(circle at 60% 40%, rgba(168,85,247,0.3) 0%, transparent 50%)'}} />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-normal text-white mb-6 tracking-wide ${sora.className}`}>
              Resultados que <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">hablan por sí solos</span>
            </h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto font-light tracking-wide">
              Muchas empresas ya han transformado sus operaciones con SimbiosisAI
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {/* Stat 1 */}
            <div className="group text-center">
              <div className="relative mb-4 sm:mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-violet-600/20 rounded-2xl sm:rounded-3xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
                <div className="relative bg-gray-900/80 backdrop-blur-sm border border-purple-400/30 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-[0_8px_32px_rgba(182,117,255,0.15)] hover:shadow-[0_16px_48px_rgba(182,117,255,0.25)] transition-all duration-500">
                  <div className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-1 sm:mb-2 bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                    10,000+
                  </div>
                  <div className="text-sm sm:text-lg font-semibold text-gray-300 mb-1">Llamadas diarias</div>
                  <div className="text-xs sm:text-sm text-gray-400">Por agente IA</div>
                </div>
              </div>
            </div>
            
            {/* Stat 2 */}
            <div className="group text-center">
              <div className="relative mb-4 sm:mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-violet-600/20 rounded-2xl sm:rounded-3xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
                <div className="relative bg-gray-900/80 backdrop-blur-sm border border-purple-400/30 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-[0_8px_32px_rgba(182,117,255,0.15)] hover:shadow-[0_16px_48px_rgba(182,117,255,0.25)] transition-all duration-500">
                  <div className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-1 sm:mb-2 bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                    95%
                  </div>
                  <div className="text-sm sm:text-lg font-semibold text-gray-300 mb-1">Satisfacción</div>
                  <div className="text-xs sm:text-sm text-gray-400">De clientes</div>
                </div>
              </div>
            </div>
            
            {/* Stat 3 */}
            <div className="group text-center">
              <div className="relative mb-4 sm:mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-violet-600/20 rounded-2xl sm:rounded-3xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
                <div className="relative bg-gray-900/80 backdrop-blur-sm border border-purple-400/30 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-[0_8px_32px_rgba(182,117,255,0.15)] hover:shadow-[0_16px_48px_rgba(182,117,255,0.25)] transition-all duration-500">
                  <div className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-1 sm:mb-2 bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                    10x
                  </div>
                  <div className="text-sm sm:text-lg font-semibold text-gray-300 mb-1">Reducción</div>
                  <div className="text-xs sm:text-sm text-gray-400">En costos operativos</div>
                </div>
              </div>
            </div>
            
            {/* Stat 4 */}
            <div className="group text-center">
              <div className="relative mb-4 sm:mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-violet-600/20 rounded-2xl sm:rounded-3xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
                <div className="relative bg-gray-900/80 backdrop-blur-sm border border-purple-400/30 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-[0_8px_32px_rgba(182,117,255,0.15)] hover:shadow-[0_16px_48px_rgba(182,117,255,0.25)] transition-all duration-500">
                  <div className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-1 sm:mb-2 bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                    24/7
                  </div>
                  <div className="text-sm sm:text-lg font-semibold text-gray-300 mb-1">Disponibilidad</div>
                  <div className="text-xs sm:text-sm text-gray-400">Sin interrupciones</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final Mejorado */}
      <section id="demo" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#060010] relative overflow-hidden">
        {/* Subtle background elements */}
        <div className="absolute inset-0 opacity-[0.02]" style={{backgroundImage:'radial-gradient(circle at 50% 50%, rgba(182,117,255,0.3) 0%, transparent 70%)'}} />
        
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Urgencia y Social Proof */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-900/50 to-violet-900/50 border border-purple-400/30 mb-6">
              <div className="h-2 w-2 rounded-full bg-green-400 mr-2 animate-pulse"></div>
              <span className="text-sm font-medium text-purple-300">Únete a empresas top que ya transformaron sus operaciones</span>
            </div>
          </div>
          
          <div className="relative max-w-4xl sm:max-w-5xl mx-auto text-center">
            {/* Glowing border effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 via-violet-600/20 to-purple-600/30 rounded-2xl sm:rounded-3xl blur-xl"></div>
            <div className="relative bg-gray-900/90 backdrop-blur-sm border border-purple-400/30 rounded-2xl sm:rounded-3xl px-4 sm:px-8 py-12 sm:py-16 shadow-[0_16px_64px_rgba(182,117,255,0.25)]">
              <h2 className={`text-2xl sm:text-3xl md:text-4xl font-normal text-white mb-4 sm:mb-6 tracking-wide ${sora.className}`}>
                Tus clientes esperan.<br />
                <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">Tu AI agent ya está listo.</span>
          </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed font-light tracking-wide">
            Únete a las empresas que ya están transformando su atención al cliente con IA
          </p>
              
              {/* Garantía y beneficios */}
              <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mb-8 sm:mb-10 text-xs sm:text-sm text-gray-400">
                <div className="flex items-center">
                  <div className="h-1 w-1 rounded-full bg-purple-400 mr-2"></div>
                  <span>Lo hacemos todo por ti</span>
                </div>
                <div className="flex items-center">
                  <div className="h-1 w-1 rounded-full bg-purple-400 mr-2"></div>
                  <span>Sin compromiso</span>
                </div>
                <div className="flex items-center">
                  <div className="h-1 w-1 rounded-full bg-purple-400 mr-2"></div>
                  <span>Configuración en 24h</span>
                </div>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
          <Link
            href="/sign-up"
                  className="group relative px-6 sm:px-10 py-3 sm:py-5 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 shadow-[0_8px_32px_rgba(182,117,255,0.3)] hover:shadow-[0_16px_48px_rgba(182,117,255,0.4)] transition-all duration-300 border border-purple-400/30 hover:border-purple-300/50 text-sm sm:text-base w-full sm:w-auto"
                >
                  <span className="relative z-10">Solicitar demo gratuita</span>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
                <Link
                  href="/contact"
                  className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-gray-300 bg-white border border-gray-200 hover:border-purple-300 hover:text-purple-700 transition-all duration-300 text-sm sm:text-base w-full sm:w-auto"
                >
                  Hablar con un experto
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Profesional */}
      <footer className="bg-gray-900 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'radial-gradient(circle at 20% 80%, rgba(182,117,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(168,85,247,0.2) 0%, transparent 50%)'}} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Main Footer Content */}
          <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="flex items-center mb-6">
            <div className="h-12 w-12 flex items-center justify-center">
              <Image
                src="/simbiosis-logo.svg"
                alt="SimbiosisAI Logo"
                width={32}
                height={32}
                    className="brightness-0 invert"
                  />
                </div>
                <span className="ml-2 text-xl font-bold text-white">SimbiosisAI</span>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Transformamos la atención al cliente con inteligencia artificial que combina eficiencia y calidez humana.
              </p>
              {/* Social Links */}
              <div className="flex space-x-4">
                <a href="#" className="h-10 w-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-purple-600 transition-all duration-300">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="h-10 w-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-purple-600 transition-all duration-300">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Product Links */}
            <div>
              <h3 className="text-white font-semibold mb-6">Producto</h3>
              <ul className="space-y-3">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Características</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Precios</a></li>
                <li><a href="#demo" className="text-gray-400 hover:text-white transition-colors">Demo</a></li>
                <li><a href="/integrations" className="text-gray-400 hover:text-white transition-colors">Integraciones</a></li>
                <li><a href="/api" className="text-gray-400 hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            {/* Company Links */}
            <div>
              <h3 className="text-white font-semibold mb-6">Empresa</h3>
              <ul className="space-y-3">
                <li><a href="/about" className="text-gray-400 hover:text-white transition-colors">Acerca de</a></li>
                <li><a href="/blog" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="/careers" className="text-gray-400 hover:text-white transition-colors">Carreras</a></li>
                <li><a href="/contact" className="text-gray-400 hover:text-white transition-colors">Contacto</a></li>
                <li><a href="/press" className="text-gray-400 hover:text-white transition-colors">Prensa</a></li>
              </ul>
            </div>
            
            {/* Support Links */}
            <div>
              <h3 className="text-white font-semibold mb-6">Soporte</h3>
              <ul className="space-y-3">
                <li><a href="/help" className="text-gray-400 hover:text-white transition-colors">Centro de Ayuda</a></li>
                <li><a href="/docs" className="text-gray-400 hover:text-white transition-colors">Documentación</a></li>
                <li><a href="/status" className="text-gray-400 hover:text-white transition-colors">Estado del Sistema</a></li>
                <li><a href="/security" className="text-gray-400 hover:text-white transition-colors">Seguridad</a></li>
                <li><a href="/compliance" className="text-gray-400 hover:text-white transition-colors">Cumplimiento</a></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="py-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex flex-wrap gap-6 mb-4 md:mb-0">
                <a href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">Política de Privacidad</a>
                <a href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">Términos de Servicio</a>
                <a href="/cookies" className="text-gray-400 hover:text-white text-sm transition-colors">Cookies</a>
              </div>
              <p className="text-gray-400 text-sm">
            © 2024 SimbiosisAI. Todos los derechos reservados.
          </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
