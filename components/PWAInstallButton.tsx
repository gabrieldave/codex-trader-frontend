'use client'

import { useState, useEffect } from 'react'

export default function PWAInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    // Verificar si la app ya está instalada
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isInWebAppiOS = (window.navigator as any).standalone === true
      return isStandalone || isInWebAppiOS
    }

    if (checkIfInstalled()) {
      setIsInstalled(true)
      return
    }

    // Verificar si el navegador soporta instalación PWA
    const checkPWAInstallable = () => {
      // Verificar si es un navegador que soporta PWA
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
      const isEdge = /Edg/.test(navigator.userAgent)
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
      
      // Chrome, Edge y Safari móvil soportan PWA
      return isMobile || isChrome || isEdge || (isSafari && isMobile)
    }

    setCanInstall(checkPWAInstallable())

    // Atrapar el evento de instalación
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevenir que el mini-infobar aparezca
      event.preventDefault()
      // Guardar el evento para que pueda ser disparado después
      setInstallPrompt(event)
      setCanInstall(true)
      console.log("PWA: Invitación de instalación atrapada.")
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // También escuchar si la app se instala después
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setInstallPrompt(null)
      setCanInstall(false)
      console.log('PWA: App instalada')
    })

    // Limpieza
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (installPrompt) {
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
    } else {
      // Si no tenemos el prompt pero el navegador soporta PWA, mostrar instrucciones
      if (canInstall && !isInstalled) {
        // Para iOS Safari, mostrar instrucciones
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        if (isIOS) {
          alert('Para instalar esta app en iOS:\n1. Toca el botón de compartir\n2. Selecciona "Añadir a pantalla de inicio"')
        } else {
          // Para otros navegadores, intentar abrir el menú de instalación
          alert('Para instalar esta app, busca el icono de instalación en la barra de direcciones de tu navegador.')
        }
      }
    }
  }

  // No mostrar el botón si ya está instalada
  if (isInstalled) {
    return null
  }

  // Mostrar el botón si podemos instalar (tengamos o no el prompt)
  if (!canInstall) {
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

