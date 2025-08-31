"use client"

import { useEffect, useState } from 'react'
import { getQuoteOfTheDay, MotivationalQuote } from '@/lib/motivational-quotes'
import { Card, CardContent } from '@/components/ui/card'
import { Quote } from 'lucide-react'

export function QuoteOfTheDay() {
  const [quote, setQuote] = useState<MotivationalQuote | null>(null)

  useEffect(() => {
    setQuote(getQuoteOfTheDay())
  }, [])

  if (!quote) {
    return (
      <Card className="bg-gradient-to-br from-purple-100 via-pink-100 to-indigo-100 border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-purple-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-purple-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-purple-100 via-pink-100 to-indigo-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
      {/* Ola suave diagonal que se mueve */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-pink-200/30 to-transparent animate-gentle-wave"></div>
      
      {/* Segunda ola con retraso para efecto más natural */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-200/20 to-transparent animate-gentle-wave" style={{ animationDelay: '2s' }}></div>
      
      {/* Efecto de brillo sutil en el fondo */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Efectos de luz circular con respiración */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-300/30 to-pink-300/30 rounded-full blur-lg animate-breathe"></div>
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-indigo-300/30 to-purple-300/30 rounded-full blur-lg animate-breathe" style={{ animationDelay: '1.5s' }}></div>
      
      <CardContent className="p-6 relative z-10">
        <div className="flex items-start gap-3">
          <Quote className="h-8 w-8 text-purple-600 mt-1 flex-shrink-0 hover:scale-105 transition-transform duration-300" />
          <div className="flex-1">
            <blockquote className="text-xl font-medium text-gray-900 leading-relaxed mb-3">
              "{quote.text}"
            </blockquote>
            <footer className="text-sm text-purple-700 font-medium">
              — {quote.author}
            </footer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
