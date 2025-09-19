'use client'

import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Phone, MessageSquare, TrendingUp, Zap, Shield, Users, CheckCircle, Star } from 'lucide-react'
import { Sora } from 'next/font/google'
import LaserFlow from '@/components/ui/laserflow'

const sora = Sora({ subsets: ['latin'], weight: ['600','700','800'] })

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth()
  const heroRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const pedestalRef = useRef<HTMLDivElement | null>(null)
  const [onLightSection, setOnLightSection] = useState(false)
  const [labelTop, setLabelTop] = useState<number>(120)
  const router = useRouter()

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
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b transition-colors duration-300 ${onLightSection ? 'bg-gray-900/80 border-white/10' : 'bg-transparent border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="h-12 w-12 flex items-center justify-center">
                <Image
                  src="/simbiosis-logo.svg"
                  alt="SimbiosisAI Logo"
                  width={32}
                  height={32}
                  className="brightness-0 invert"
                />
              </div>
              <span className="ml-1 text-xl font-bold text-white">SimbiosisAI</span>
            </div>
            
            {/* CTAs */}
            <div className="flex items-center space-x-4">
              <Link
                href="/sign-in"
                className="text-white hover:text-white/90 px-4 py-2 rounded-lg transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="#demo"
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_100%] animate-gradient-x text-white px-6 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
              >
                Solicitar Demo
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pb-0 px-0 min-h-[80vh] md:min-h-[90vh] overflow-hidden bg-[#060010]">

        <div className="relative z-10 mx-auto text-center h-[80vh] md:h-[90vh] max-w-none">
          <div className="px-0 py-0 h-full">
            {/* Dark hero panel stretched to fill the hero container */}
            <div ref={panelRef} className="relative w-screen h-full rounded-none border-y border-white/10 bg-[#090414] overflow-hidden">
              {/* LaserFlow canvas */}
              <div className="absolute inset-0 z-0">
                <LaserFlow
                  className="w-full h-full"
                  color="#B675FF"
                  horizontalBeamOffset={0.0}
                  verticalBeamOffset={-0.24}
                  fogIntensity={0.95}
                  wispIntensity={8.0}
                  wispDensity={1.4}
                  flowStrength={0.55}
                />
              </div>
              {/* Subtle vignette */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_700px_at_50%_10%,rgba(182,117,255,0.18),transparent_65%)]" />
              {/* Left/Right labels refined and centered relative to the beam */}
              <div className="absolute inset-x-0 flex items-center justify-between px-12 md:px-48 select-none" style={{ top: '35%', transform: 'translateY(-50%)' }}>
                <span
                  className={`${sora.className} text-2xl sm:text-3xl md:text-5xl font-semibold tracking-wide bg-gradient-to-r from-fuchsia-300 via-pink-300 to-violet-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(182,117,255,0.25)] text-right`}
                >
                  Tu equipo
                </span>
                <span
                  className={`${sora.className} text-2xl sm:text-3xl md:text-5xl font-semibold tracking-wide bg-gradient-to-r from-violet-300 via-pink-300 to-fuchsia-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(182,117,255,0.25)]`}
                >
                  y la IA
                </span>
              </div>

              {/* Bottom pedestal grid with message */}
              <div ref={pedestalRef} className="absolute left-6 right-6 bottom-6 h-[140px] md:h-[180px] rounded-[22px] border-2 border-[#C084FC] bg-[#0B0614] overflow-hidden">
                <div className="absolute inset-0 opacity-40" style={{backgroundImage:'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)',backgroundSize:'16px 16px',backgroundPosition:'0 0'}} />
                <div className="absolute inset-0 ring-1 ring-white/5 rounded-[22px]" />
                <div className="relative h-full w-full flex items-center justify-center px-6">
                  <p className={`text-white/95 text-lg md:text-2xl lg:text-3xl text-center ${sora.className}`}>
                    Trabajando en sintonía para aumentar tus ventas y operaciones
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-10 text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Nuestros agentes IA hacen miles de llamadas en tiempo real, como un humano, pero sin límites.
            </p>

            <div className="mt-12">
              <Link
                href="#demo"
                className="inline-flex items-center px-8 py-4 rounded-xl text-lg font-semibold bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-fuchsia-600 bg-[length:200%_100%] animate-gradient-x text-white shadow-[0_0_40px_rgba(168,85,247,0.35)] hover:shadow-[0_0_60px_rgba(168,85,247,0.6)] transition-all duration-300 hover:scale-105"
              >
                Solicitar una demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-2xl font-semibold text-gray-900 mb-12">
            Líderes en el sector de servicio han multiplicado sus ventas gracias a SimbiosisAI
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-gray-50 border border-gray-100 rounded-2xl p-8">
            <div className="flex justify-center opacity-90 hover:opacity-100 transition-opacity">
              <Image
                src="/intercard-logo.png"
                alt="Intercard Solutions Logo"
                width={240}
                height={120}
                className="h-24 w-auto object-contain"
              />
            </div>
            <div className="flex justify-center opacity-90 hover:opacity-100 transition-opacity">
              <Image
                src="/limforce-logo.png"
                alt="LIMFORCE Logo"
                width={240}
                height={120}
                className="h-24 w-auto object-contain"
              />
            </div>
            <div className="flex justify-center opacity-90 hover:opacity-100 transition-opacity">
              <Image
                src="/fjdenegia-logo.png"
                alt="FJD Energía Logo"
                width={240}
                height={120}
                className="h-24 w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Sectores y Casos de Uso */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Soluciones para todos los sectores
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Nuestros agentes AI se adaptan a las necesidades específicas de tu industria
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            {/* Utilities */}
            <div className="rounded-2xl p-px bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-blue-600/20">
              <div className="bg-white rounded-2xl p-6 hover:bg-gray-50 transition-colors">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-4 bg-gray-100">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Utilities</h3>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Recordatorios de pago masivos
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Notificaciones de cortes
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Cualificación de leads - venta en frío
                  </li>
                </ul>
                <p className="text-sm text-gray-500 italic">
                  "Procesos repetitivos resueltos de forma instantánea."
                </p>
              </div>
            </div>
            
            {/* Telecomunicaciones */}
            <div className="rounded-2xl p-px bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-blue-600/20">
              <div className="bg-white rounded-2xl p-6 hover:bg-gray-50 transition-colors">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-4 bg-gray-100">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Telecomunicaciones</h3>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Retención de clientes
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Upselling de planes y bundles
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Avisos de facturación
                  </li>
                </ul>
                <p className="text-sm text-gray-500 italic">
                  "Reduce tus costos de call center y aumenta la retención con IA."
                </p>
              </div>
            </div>
            
            {/* Finanzas */}
            <div className="rounded-2xl p-px bg-gradient-to-br from-emerald-600/20 via-teal-600/10 to-emerald-600/20">
              <div className="bg-white rounded-2xl p-6 hover:bg-gray-50 transition-colors">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-4 bg-gray-100">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Finanzas & Cobranzas</h3>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Cobranza preventiva y reactiva
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Negociación inicial de refinanciamientos
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Avisos de deuda vencida
                  </li>
                </ul>
                <p className="text-sm text-gray-500 italic">
                  "Miles de llamadas diarias sin necesidad de call centers gigantes."
                </p>
              </div>
            </div>
            
            {/* Salud */}
            <div className="rounded-2xl p-px bg-gradient-to-br from-rose-600/20 via-pink-600/10 to-rose-600/20">
              <div className="bg-white rounded-2xl p-6 hover:bg-gray-50 transition-colors">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-4 bg-gray-100">
                  <Shield className="h-6 w-6 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Salud</h3>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Recordatorios de citas
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Seguimiento post-consulta
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Adherencia a tratamientos
                  </li>
                </ul>
                <p className="text-sm text-gray-500 italic">
                  "Mejor experiencia del paciente, menos ausentismo."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Por qué elegirnos */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              ¿Por qué elegir SimbiosisAI?
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Ventajas únicas que te harán destacar en el mercado
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Escalabilidad infinita</h3>
              <p className="text-gray-300">Crece sin límites, tu AI agent se adapta</p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Costos reducidos hasta 10x</h3>
              <p className="text-gray-300">Ahorra significativamente en operaciones</p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Experiencia humana + velocidad AI</h3>
              <p className="text-gray-300">Lo mejor de ambos mundos</p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Fácil integración</h3>
              <p className="text-gray-300">Conecta con tus canales actuales</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section id="demo" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="relative max-w-4xl mx-auto text-center rounded-[28px] p-[1px] bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600">
          <div className="relative rounded-[28px] bg-white px-8 py-16 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-40" style={{background:"radial-gradient(1200px 400px at 50% 120%, rgba(29,78,216,.12), transparent), radial-gradient(600px 200px at 0% 0%, rgba(91,33,182,.12), transparent)"}} />
            <h2 className="relative text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Tus clientes esperan. Tu AI agent ya está listo.
            </h2>
            <p className="relative text-xl text-gray-600 mb-8">
              Únete a las empresas que ya están transformando su atención al cliente con IA
            </p>
            <Link
              href="/sign-up"
              className="relative inline-flex items-center px-8 py-4 rounded-xl text-lg font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_100%] animate-gradient-x text-white shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
            >
              Solicita una demo gratuita
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="h-12 w-12 flex items-center justify-center">
              <Image
                src="/simbiosis-logo.svg"
                alt="SimbiosisAI Logo"
                width={32}
                height={32}
              />
            </div>
            <span className="ml-1 text-xl font-bold text-white">SimbiosisAI</span>
          </div>
          <p className="text-gray-400">
            © 2024 SimbiosisAI. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
