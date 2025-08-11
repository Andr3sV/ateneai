"use client"

import { useEffect } from 'react'

export function usePageTitle(title: string, subtitle?: string) {
  useEffect(() => {
    const titleElement = document.getElementById('page-title')
    if (titleElement) {
      titleElement.innerHTML = `
        <div>
          <h1 class="text-xl font-semibold text-foreground">${title}</h1>
          ${subtitle ? `<p class="text-sm text-muted-foreground mt-0.5">${subtitle}</p>` : ''}
        </div>
      `
    }

    // Cleanup function
    return () => {
      if (titleElement) {
        titleElement.innerHTML = ''
      }
    }
  }, [title, subtitle])
}
