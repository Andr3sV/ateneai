'use client'

import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Phone, MessageSquare, TrendingUp, Zap, Shield, Users, CheckCircle, Star } from 'lucide-react'
import LaserFlow from '@/components/ui/laserflow'

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/home')
    }
  }, [isLoaded, isSignedIn, router])

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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100">
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
                />
              </div>
              <span className="ml-1 text-xl font-bold text-gray-900">SimbiosisAI</span>
            </div>
            
            {/* CTAs */}
            <div className="flex items-center space-x-4">
              <Link
                href="/sign-in"
                className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg transition-colors"
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
      <section className="relative pt-32 pb-0 px-4 sm:px-6 lg:px-8 min-h-[70vh] md:min-h-[80vh] overflow-hidden">

        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <div className="px-8 py-20">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight tracking-tight">
              Escala tus ventas y operaciones con{' '}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_100%] animate-gradient-x bg-clip-text text-transparent">
                IA
              </span>{' '}
              sin perder la{' '}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_100%] animate-gradient-x bg-clip-text text-transparent">
                calidez humana
              </span>
            </h1>
            {/* Waterfall container between title and subtitle */}
            <div className="relative mx-auto max-w-6xl h-48 md:h-60 lg:h-72 mt-4">
              <div className="absolute inset-0 bg-[radial-gradient(700px_240px_at_50%_10%,rgba(124,58,237,0.12),transparent_70%)]" />
              <div className="absolute inset-0">
                <LaserFlow
                  className="w-full h-full"
                  color="#7C3AED"
                  horizontalBeamOffset={0.0}
                  verticalBeamOffset={-0.18}
                  fogIntensity={0.75}
                  wispIntensity={7.2}
                  wispDensity={1.35}
                  flowStrength={0.5}
                />
              </div>
              {/* Side chips */}
              <div className="hidden md:block">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2">
                  <span className="rounded-full bg-white/80 backdrop-blur-sm px-3 py-1 text-sm font-medium text-gray-800 shadow-sm">Tu equipo</span>
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2">
                  <span className="rounded-full bg-white/80 backdrop-blur-sm px-3 py-1 text-sm font-medium text-gray-800 shadow-sm">IA</span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-sm md:text-base text-gray-700">
              trabajando en sintonía para potenciar tus ventas y operaciones.
            </div>

            <p className="mt-8 text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
              Nuestros agentes IA hacen miles de llamadas en tiempo real, como un humano, pero sin límites.
            </p>

            <div className="mt-12">
              <Link
                href="#demo"
                className="inline-flex items-center px-8 py-4 rounded-xl text-lg font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_100%] animate-gradient-x text-white shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
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
