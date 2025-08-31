'use client'

import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Phone, MessageSquare, TrendingUp, Zap, Shield, Users, CheckCircle, Star } from 'lucide-react'

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
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
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
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_100%] animate-gradient-x text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                Solicitar Demo
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-0 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="relative">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-3xl -z-10"></div>
            
            <div className="relative px-8 py-16">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
                Escala tus ventas y operaciones con{' '}
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_100%] animate-gradient-x bg-clip-text text-transparent">
                  IA
                </span>{' '}
                sin perder la{' '}
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_100%] animate-gradient-x bg-clip-text text-transparent">
                  calidez humana
                </span>
              </h1>
              
              <p className="mt-8 text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                Nuestros agentes IA hacen miles de llamadas en tiempo real, como un humano, pero sin límites.
              </p>
              
              <div className="mt-12">
                <Link
                  href="#demo"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_100%] animate-gradient-x text-white text-lg font-semibold rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  Solicitar una demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
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
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 font-medium">Logo {i}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sectores y Casos de Uso */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
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
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-purple-600" />
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
            
            {/* Telecomunicaciones */}
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
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
            
            {/* Finanzas */}
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-green-600" />
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
            
            {/* Salud */}
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="h-12 w-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-red-600" />
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
      </section>

      {/* Por qué elegirnos */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              ¿Por qué elegir SimbiosisAI?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ventajas únicas que te harán destacar en el mercado
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Escalabilidad infinita</h3>
              <p className="text-gray-600">Crece sin límites, tu AI agent se adapta</p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Costos reducidos hasta 10x</h3>
              <p className="text-gray-600">Ahorra significativamente en operaciones</p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Experiencia humana + velocidad AI</h3>
              <p className="text-gray-600">Lo mejor de ambos mundos</p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Fácil integración</h3>
              <p className="text-gray-600">Conecta con tus canales actuales</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Tus clientes esperan. Tu AI agent ya está listo.
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Únete a las empresas que ya están transformando su atención al cliente con IA
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_100%] animate-gradient-x text-white text-lg font-semibold rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            Solicita una demo gratuita
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
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
