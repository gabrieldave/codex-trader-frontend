'use client'

import { useEffect } from 'react'

export default function PWAMetaTags() {
  useEffect(() => {
    // Agregar meta tags para PWA que no están soportados directamente en metadata
    const metaTags = [
      { name: 'application-name', content: 'Codex Trader' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'apple-mobile-web-app-title', content: 'Codex Trader' },
      { name: 'mobile-web-app-capable', content: 'yes' },
    ]

    metaTags.forEach(tag => {
      let element = document.querySelector(`meta[name="${tag.name}"]`)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute('name', tag.name)
        document.head.appendChild(element)
      }
      element.setAttribute('content', tag.content)
    })

    // Agregar link al manifest
    let manifestLink = document.querySelector('link[rel="manifest"]')
    if (!manifestLink) {
      manifestLink = document.createElement('link')
      manifestLink.setAttribute('rel', 'manifest')
      document.head.appendChild(manifestLink)
    }
    manifestLink.setAttribute('href', '/manifest.json')

    // Agregar favicon
    let favicon = document.querySelector('link[rel="icon"]')
    if (!favicon) {
      favicon = document.createElement('link')
      favicon.setAttribute('rel', 'icon')
      document.head.appendChild(favicon)
    }
    favicon.setAttribute('type', 'image/png')
    favicon.setAttribute('href', '/icons/icon-192x192.png')

    // Agregar apple-touch-icon
    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]')
    if (!appleIcon) {
      appleIcon = document.createElement('link')
      appleIcon.setAttribute('rel', 'apple-touch-icon')
      document.head.appendChild(appleIcon)
    }
    appleIcon.setAttribute('href', '/icons/icon-192x192.png')
  }, [])

  return null
}






