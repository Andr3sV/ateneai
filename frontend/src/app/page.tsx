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
import ElectricBorder from '@/components/ui/electricBorder'

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
                  alt="Simbiosia Logo"
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
                href="/demo"
                className="bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 text-white px-3 sm:px-6 py-2 rounded-lg shadow-[0_0_20px_rgba(182,117,255,0.3)] hover:shadow-[0_0_30px_rgba(182,117,255,0.5)] transition-all duration-300 border border-purple-400/30 hover:border-purple-300/50 text-sm sm:text-base"
              >
                <span className="hidden sm:inline">Solicitar demo</span>
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
                  <Link href="/demo" className="px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 shadow-[0_0_40px_rgba(182,117,255,0.35)] hover:shadow-[0_0_60px_rgba(182,117,255,0.6)] transition-all duration-300 border border-purple-400/30 hover:border-purple-300/50 text-sm sm:text-base inline-block">
                    Solicitar una demo
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Social Proof - Minimalist Supabase Style */}
      <section className="pt-16 pb-8 px-4 sm:px-6 lg:px-8 bg-[#060010] relative overflow-hidden">
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
                <span className="text-2xl font-medium">Prime Players</span>
                </div>
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                <span className="text-2xl font-medium">FJD Energía</span>
                </div>
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                <span className="text-2xl font-medium">Sirilum</span>
                </div>
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                  <span className="text-2xl font-medium">Intercard</span>
                </div>
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                  <span className="text-2xl font-medium">AteneAI</span>
                </div>
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                  <span className="text-2xl font-medium">Limforce</span>
                </div>
              </div>
              {/* Duplicate for seamless loop */}
              <div className="flex items-center space-x-20 whitespace-nowrap ml-20">
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                  <Image src="/intercard-logo.png" alt="Intercard" width={240} height={80} className="h-16 w-auto opacity-60 invert" />
                </div>
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                  <Image src="/fjdenegia-logo.png" alt="FJD Energía" width={240} height={80} className="h-16 w-auto opacity-60 invert" />
                </div>
                <div className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                  <Image src="/limforce-logo.png" alt="Limforce" width={240} height={80} className="h-16 w-auto opacity-60 invert" />
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
              Lo que necesitas para <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">escalar sin contratar</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed font-light tracking-wide">
              IA perfectamente sincronizada con tu equipo para multiplicar tus resultados
            </p>
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

      {/* Testimonial Cliente - Sección Clave */}
      <section className="pt-1 pb-14 px-4 sm:px-6 lg:px-8 bg-[#060010] relative">
        <div className="max-w-4xl mx-auto">
          {/* Quote Icon - Minimalista */}
          <div className="flex justify-center mb-8">
            <div className="w-8 h-8 text-purple-400">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
              </svg>
            </div>
          </div>

          {/* Quote text - Elegante y centrado */}
          <blockquote className="text-center mb-12">
            <p className={`text-xl md:text-2xl text-gray-300 leading-relaxed font-light tracking-wide ${sora.className}`}>
              "A diferencia de otras herramientas, en{' '}
              <span className="text-purple-400 font-medium">
                Simbiosia
              </span>
              {' '}no pierdo tiempo configurando nada. Se encarga de todo y me garantiza un seguimiento continuo para{' '}
              <span className="text-purple-400 font-medium">
                maximizar mis resultados
              </span>
              ."
            </p>
          </blockquote>

          {/* Client info - Minimalista */}
          <div className="flex items-center justify-center space-x-3">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">Z</span>
            </div>
            <div className="text-left">
              <p className="text-white text-sm font-medium">Ze Forjáz</p>
              <p className="text-gray-400 text-xs">CCO, Prime Players</p>
            </div>
          </div>
        </div>
      </section>

      {/* Casos de Uso Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#060010] relative overflow-hidden">
        {/* Subtle background elements */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'radial-gradient(circle at 40% 60%, rgba(182,117,255,0.4) 0%, transparent 50%), radial-gradient(circle at 60% 40%, rgba(168,85,247,0.3) 0%, transparent 50%)'}} />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className={`text-3xl md:text-4xl font-normal text-white mb-6 tracking-wide ${sora.className}`}>
              Agentes flexibles para <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">muchos casos de uso</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed font-light tracking-wide">
              Descubre todas las formas en que nuestros agentes de IA pueden optimizar tu negocio
            </p>
          </div>
          
          {/* Tags Mosaic */}
          <div className="flex flex-wrap justify-center gap-4 max-w-6xl mx-auto">
            {[
              'Cualificación de leads',
              'Recordatorios de pago masivos',
              'Notificaciones',
              'Retención de clientes',
              'Upselling de planes y bundles',
              'Cobranza preventiva y reactiva',
              'Seguimientos'
            ].map((tag, index) => (
              <div
                key={index}
                className="group relative px-6 py-3 rounded-full bg-gray-900/80 border border-white/20 hover:border-purple-400/50 transition-all duration-300  hover:shadow-[0_8px_25px_rgba(182,117,255,0.15)] cursor-pointer"
              >
                <span className="text-white text-sm md:text-base font-light tracking-wide group-hover:text-purple-300 transition-colors duration-300">
                  {tag}
                </span>
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600/20 to-violet-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
            </div>
            ))}
          </div>
              </div>
      </section>

      {/* Magic Bento Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#060010] relative overflow-hidden">
        {/* Subtle background elements */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'radial-gradient(circle at 30% 70%, rgba(182,117,255,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(168,85,247,0.3) 0%, transparent 50%)'}} />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className={`text-3xl md:text-4xl font-normal text-white mb-6 tracking-wide ${sora.className}`}>
              ¿Por qué elegir <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">Simbiosia</span>?
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

      {/* Sectores Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#060010] relative overflow-hidden">
        {/* Subtle background elements */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'radial-gradient(circle at 35% 65%, rgba(182,117,255,0.4) 0%, transparent 50%), radial-gradient(circle at 65% 35%, rgba(168,85,247,0.3) 0%, transparent 50%)'}} />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className={`text-3xl md:text-4xl font-normal text-white mb-6 tracking-wide ${sora.className}`}>
              Agentes que hablan el idioma de <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">tu sector y empresa</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed font-light tracking-wide">
              Nuestros agentes pueden obtener un gran volumen de conocimiento de tu sector y empresa
              </p>
            </div>
          
          {/* Tags Carousel */}
          <div className="relative overflow-hidden mx-auto w-3/5">
            {/* Fade effect overlays */}
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#060010] to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#060010] to-transparent z-10 pointer-events-none"></div>
            
            <div className="flex animate-scroll-horizontal">
              {/* Tags row 1 */}
              <div className="flex items-center space-x-8 whitespace-nowrap">
                {[
                  { name: 'Utilities', icon: '⚡' },
                  { name: 'Comunicaciones', icon: '📡' },
                  { name: 'Seguros', icon: '🛡️' },
                  { name: 'Real Estate', icon: '🏢' },
                  { name: 'Salud', icon: '🏥' },
                  { name: 'Finanzas', icon: '💰' },
                  { name: 'Cobranzas', icon: '📊' }
                ].map((sector, index) => (
                  <div key={index} className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                    <div className="px-6 py-3 rounded-full bg-gray-900/80 border border-white/20 hover:border-purple-400/50 transition-all duration-300  hover:shadow-[0_8px_25px_rgba(182,117,255,0.15)] cursor-pointer">
                      <span className="text-white text-lg font-light tracking-wide group-hover:text-purple-300 transition-colors duration-300 flex items-center gap-2">
                        <span className="text-xl">{sector.icon}</span>
                        {sector.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Duplicate for seamless loop */}
              <div className="flex items-center space-x-8 whitespace-nowrap ml-8">
                {[
                  { name: 'Utilities', icon: '⚡' },
                  { name: 'Comunicaciones', icon: '📡' },
                  { name: 'Seguros', icon: '🛡️' },
                  { name: 'Real Estate', icon: '🏢' },
                  { name: 'Salud', icon: '🏥' },
                  { name: 'Finanzas', icon: '💰' },
                  { name: 'Cobranzas', icon: '📊' }
                ].map((sector, index) => (
                  <div key={`duplicate-${index}`} className="flex items-center space-x-4 text-gray-300 hover:text-white transition-colors">
                    <div className="px-6 py-3 rounded-full bg-gray-900/80 border border-white/20 hover:border-purple-400/50 transition-all duration-300  hover:shadow-[0_8px_25px_rgba(182,117,255,0.15)] cursor-pointer">
                      <span className="text-white text-lg font-light tracking-wide group-hover:text-purple-300 transition-colors duration-300 flex items-center gap-2">
                        <span className="text-xl">{sector.icon}</span>
                        {sector.name}
                      </span>
                    </div>
            </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Estadísticas Impresionantes */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#060010] relative overflow-hidden">
        {/* Subtle background elements */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'radial-gradient(circle at 40% 60%, rgba(182,117,255,0.4) 0%, transparent 50%), radial-gradient(circle at 60% 40%, rgba(168,85,247,0.3) 0%, transparent 50%)'}} />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-normal text-white mb-6 tracking-wide ${sora.className}`}>
              Resultados que <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">hablan por sí solos</span>
            </h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto font-light tracking-wide">
              Muchas empresas ya han transformado sus operaciones con Simbiosia
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Stat 1 */}
            <div className="group text-center">
              <div className="relative">
                <div className="relative border border-purple-400/30 rounded-xl p-3 sm:p-4 transition-all duration-500">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                    10,000+
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-gray-300 mb-1">Llamadas diarias</div>
                  <div className="text-xs text-gray-400">Por agente IA</div>
                </div>
              </div>
            </div>
            
            {/* Stat 2 */}
            <div className="group text-center">
              <div className="relative">
                <div className="relative border border-purple-400/30 rounded-xl p-3 sm:p-4 transition-all duration-500">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                    95%
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-gray-300 mb-1">Satisfacción</div>
                  <div className="text-xs text-gray-400">De clientes</div>
                </div>
              </div>
            </div>
            
            {/* Stat 3 */}
            <div className="group text-center">
              <div className="relative">
                <div className="relative border border-purple-400/30 rounded-xl p-3 sm:p-4 transition-all duration-500">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                    10x
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-gray-300 mb-1">Reducción</div>
                  <div className="text-xs text-gray-400">En costos operativos</div>
                </div>
              </div>
            </div>
            
            {/* Stat 4 */}
            <div className="group text-center">
              <div className="relative">
                <div className="relative border border-purple-400/30 rounded-xl p-3 sm:p-4 transition-all duration-500">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                    24/7
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-gray-300 mb-1">Disponibilidad</div>
                  <div className="text-xs text-gray-400">Sin interrupciones</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Electric Border Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#060010] relative">
        <div className="max-w-4xl mx-auto">


          <div className="flex justify-center">
            <ElectricBorder
              color="#B675FF"
              speed={1}
              chaos={0.3}
              thickness={2}
              style={{ borderRadius: 16 }}
            >
              <div className="p-12 text-center max-w-4xl">
                {/* Urgencia y Social Proof */}

                
                <h2 className={`text-2xl sm:text-3xl md:text-4xl font-normal text-white mb-4 sm:mb-6 tracking-wide ${sora.className}`}>
                  Tus clientes esperan.<br />
                  <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">Tu agente IA ya está listo.</span>
          </h2>
                <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed font-light tracking-wide">
            Únete a las empresas que ya han logrado una simbiosis perfecta entre sus equipos y la IA para escalar su negocio
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
                
                {/* CTA Button */}
                <div className="flex justify-center">
          <Link
                    href="/demo"
                    className="group relative px-6 sm:px-10 py-3 sm:py-5 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 shadow-[0_8px_32px_rgba(182,117,255,0.3)] hover:shadow-[0_16px_48px_rgba(182,117,255,0.4)] transition-all duration-300 border border-purple-400/30 hover:border-purple-300/50 text-sm sm:text-base"
          >
                    <span className="relative z-10">Solicitar demo gratuita</span>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </Link>
                </div>
              </div>
            </ElectricBorder>
          </div>
        </div>
      </section>


      {/* Footer Profesional */}
      <footer className="bg-[#060010] relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'radial-gradient(circle at 20% 80%, rgba(182,117,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(168,85,247,0.2) 0%, transparent 50%)'}} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          
          {/* Bottom Bar */}
          <div className="py-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex flex-wrap gap-6 mb-4 md:mb-0">
                <a href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">Política de Privacidad</a>
                <a href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">Términos de Servicio</a>
                <a href="/cookies" className="text-gray-400 hover:text-white text-sm transition-colors">Cookies</a>
              </div>
              <p className="text-gray-400 text-sm">
            © 2024 Simbiosia. Todos los derechos reservados.
          </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
