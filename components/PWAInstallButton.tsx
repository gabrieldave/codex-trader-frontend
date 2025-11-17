'use client'

import { useState, useEffect } from 'react'

export default function PWAInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Verificar si la app ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Atrapar el evento de instalación
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevenir que el mini-infobar aparezca
      event.preventDefault()
      // Guardar el evento para que pueda ser disparado después
      setInstallPrompt(event)
      console.log("PWA: Invitación de instalación atrapada.")
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // También escuchar si la app se instala después
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setInstallPrompt(null)
      console.log('PWA: App instalada')
    })

    // Limpieza
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!installPrompt) {
      return // No hay evento que disparar
    }

    try {
      // Mostrar el pop-up de instalación
      await (installPrompt as any).prompt()

      // Esperar a que el usuario responda
      const { outcome } = await (installPrompt as any).userChoice

      if (outcome === 'accepted') {
        console.log('PWA: Usuario aceptó la instalación')
        setIsInstalled(true)
      } else {
        console.log('PWA: Usuario canceló la instalación')
      }

      // Limpiar el evento, ya que solo se puede usar una vez
      setInstallPrompt(null)
    } catch (error) {
      console.error('Error al instalar PWA:', error)
    }
  }

  // No mostrar el botón si ya está instalada o si no hay prompt disponible
  if (isInstalled || !installPrompt) {
    return null
  }

  return (
    <button
      onClick={handleInstallClick}
      className="px-1.5 sm:px-4 py-1 sm:py-2 text-[10px] sm:text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg transition-all transform hover:scale-105 shadow-md hover:shadow-lg flex items-center gap-1 sm:gap-2"
      title="Instalar aplicación"
    >
      <span className="hidden sm:inline">📱 Instalar App</span>
      <span className="sm:hidden text-xs">📱</span>
    </button>
  )
}

