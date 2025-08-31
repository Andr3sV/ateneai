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
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-blue-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-blue-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-0 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <Quote className="h-8 w-8 text-blue-600 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <blockquote className="text-xl font-medium text-gray-900 leading-relaxed mb-3">
              "{quote.text}"
            </blockquote>
            <footer className="text-sm text-blue-700 font-medium">
              — {quote.author}
            </footer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
