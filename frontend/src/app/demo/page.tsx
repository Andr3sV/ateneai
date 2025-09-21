'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Sora } from 'next/font/google'
import { ArrowLeft, CheckCircle, Star, Zap, Users, Shield, User, Building, Target, Clock } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import Stepper, { Step } from '@/components/ui/stepper'

const sora = Sora({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'] })

export default function DemoPage() {
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    industry: '',
    teamSize: '',
    currentChallenges: '',
    expectedResults: '',
    timeline: '',
    budget: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleFinalStepCompleted = async () => {
    setIsSubmitting(true)
    
    // Simular envío del formulario
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  const handleStepChange = (step: number) => {
    console.log(`Changed to step: ${step}`)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#060010] flex items-center justify-center px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className={`text-4xl md:text-5xl font-light text-white mb-6 tracking-wide ${sora.className}`}>
              ¡Solicitud <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">enviada!</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Gracias por tu interés en Simbiosia. Nuestro equipo se pondrá en contacto contigo en las próximas 24 horas.
            </p>
          </div>
          
          <div className="bg-gray-900/50 backdrop-blur-sm border border-green-400/30 rounded-2xl p-8 mb-8">
            <h3 className="text-white text-lg font-medium mb-4">¿Qué sigue?</h3>
            <div className="space-y-3 text-left">
              <div className="flex items-center text-gray-300">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                <span>Revisaremos tu solicitud y necesidades específicas</span>
              </div>
              <div className="flex items-center text-gray-300">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                <span>Programaremos una demo personalizada para tu empresa</span>
              </div>
              <div className="flex items-center text-gray-300">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                <span>Te mostraremos cómo Simbiosia puede transformar tu negocio</span>
              </div>
            </div>
          </div>
          
          <Link 
            href="/"
            className="inline-flex items-center px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 shadow-[0_8px_32px_rgba(182,117,255,0.3)] hover:shadow-[0_16px_48px_rgba(182,117,255,0.4)] transition-all duration-300 border border-purple-400/30 hover:border-purple-300/50"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#060010] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(182,117,255,0.4) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(168,85,247,0.3) 0%, transparent 50%),
          radial-gradient(circle at 40% 60%, rgba(147,51,234,0.2) 0%, transparent 50%)
        `
      }} />
      
      {/* Navigation */}
      <nav className="relative z-10 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <div className="h-10 w-10 flex items-center justify-center">
              <Image
                src="/simbiosis-logo.svg"
                alt="Simbiosia Logo"
                width={28}
                height={28}
                className="brightness-0 invert"
              />
            </div>
            <span className="ml-2 text-xl font-normal text-white tracking-wide">Simbiosia</span>
          </Link>
          
          <Link 
            href="/"
            className="flex items-center text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </div>
      </nav>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12 text-center">
            <h1 className={`text-3xl md:text-4xl font-light text-white mb-6 tracking-wide ${sora.className}`}>
              Solicita tu <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">demo personalizada</span>
            </h1>
            <p className="text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto mb-30">
              Descubre cómo Simbiosia puede transformar tu atención al cliente en menos de 30 minutos.
            </p>
          </div>

          <Stepper
            initialStep={1}
            onStepChange={handleStepChange}
            onFinalStepCompleted={handleFinalStepCompleted}
            backButtonText="Anterior"
            nextButtonText="Siguiente"
            finalButtonText={isSubmitting ? "Enviando..." : "Solicitar demo"}
            isSubmitting={isSubmitting}
          >
            {/* Step 1: Información Personal */}
            <Step>
              <div className="text-center mb-10">
                <h2 className={`text-2xl font-light text-white mb-3 tracking-wide ${sora.className}`}>
                  Cuéntanos sobre ti
                </h2>
                <p className="text-gray-300 text-lg">Información básica para personalizar tu demo</p>
              </div>
              
              <div className="space-y-8 max-w-2xl mx-auto">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-300"
                    placeholder="Tu nombre completo"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email corporativo *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-300"
                    placeholder="tu@empresa.com"
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-300"
                    placeholder="+34 600 000 000"
                  />
                </div>
              </div>
            </Step>

            {/* Step 2: Información de Empresa */}
            <Step>
              <div className="text-center mb-10">
                <h2 className={`text-2xl font-light text-white mb-3 tracking-wide ${sora.className}`}>
                  Tu empresa
                </h2>
                <p className="text-gray-300 text-lg">Ayúdanos a entender tu contexto empresarial</p>
              </div>
              
              <div className="space-y-8 max-w-2xl mx-auto">
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
                    Empresa *
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    required
                    value={formData.company}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-300"
                    placeholder="Nombre de tu empresa"
                  />
                </div>
                
                <div>
                  <label htmlFor="industry" className="block text-sm font-medium text-gray-300 mb-2">
                    Sector *
                  </label>
                  <select
                    id="industry"
                    name="industry"
                    required
                    value={formData.industry}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-300"
                  >
                    <option value="">Selecciona tu sector</option>
                    <option value="finanzas">Finanzas y Seguros</option>
                    <option value="salud">Salud</option>
                    <option value="retail">Retail y E-commerce</option>
                    <option value="inmobiliaria">Real Estate</option>
                    <option value="telecomunicaciones">Telecomunicaciones</option>
                    <option value="utilities">Utilities</option>
                    <option value="tecnologia">Tecnología</option>
                    <option value="educacion">Educación</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="teamSize" className="block text-sm font-medium text-gray-300 mb-2">
                    Tamaño del equipo
                  </label>
                  <select
                    id="teamSize"
                    name="teamSize"
                    value={formData.teamSize}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-300"
                  >
                    <option value="">Selecciona el tamaño</option>
                    <option value="1-10">1-10 empleados</option>
                    <option value="11-50">11-50 empleados</option>
                    <option value="51-200">51-200 empleados</option>
                    <option value="201-1000">201-1000 empleados</option>
                    <option value="1000+">Más de 1000 empleados</option>
                  </select>
                </div>
              </div>
            </Step>

            {/* Step 3: Desafíos y Objetivos */}
            <Step>
              <div className="text-center mb-10">
                <h2 className={`text-2xl font-light text-white mb-3 tracking-wide ${sora.className}`}>
                  Tus objetivos
                </h2>
                <p className="text-gray-300 text-lg">Entendamos qué quieres lograr</p>
              </div>
              
              <div className="space-y-8 max-w-2xl mx-auto">
                <div>
                  <label htmlFor="currentChallenges" className="block text-sm font-medium text-gray-300 mb-2">
                    ¿Cuáles son tus principales desafíos actuales?
                  </label>
                  <textarea
                    id="currentChallenges"
                    name="currentChallenges"
                    rows={4}
                    value={formData.currentChallenges}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-300 resize-none"
                    placeholder="Ej: Alto volumen de llamadas, personalización del servicio, escalabilidad..."
                  />
                </div>
                
                <div>
                  <label htmlFor="expectedResults" className="block text-sm font-medium text-gray-300 mb-2">
                    ¿Qué resultados esperas lograr?
                  </label>
                  <textarea
                    id="expectedResults"
                    name="expectedResults"
                    rows={4}
                    value={formData.expectedResults}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all duration-300 resize-none"
                    placeholder="Ej: Reducir tiempo de respuesta, aumentar conversiones, mejorar satisfacción del cliente..."
                  />
                </div>
              </div>
            </Step>

          </Stepper>
        </div>
      </div>
    </div>
  )
}
