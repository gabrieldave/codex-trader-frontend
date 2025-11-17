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
      setCanInstall(false)
      return
    }

    // Verificar si el navegador soporta instalación PWA
    const checkPWAInstallable = () => {
      // Verificar si es un navegador que soporta PWA
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
      const isEdge = /Edg/.test(navigator.userAgent)
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
      const isFirefox = /Firefox/.test(navigator.userAgent)
      
      // Chrome, Edge, Firefox y Safari móvil soportan PWA
      // Mostrar el botón si es móvil o si es un navegador moderno
      return isMobile || isChrome || isEdge || isFirefox || (isSafari && isMobile)
    }

    // Siempre establecer canInstall si el navegador lo soporta
    // Esto asegura que el botón aparezca incluso si el evento ya se consumió
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
        // Si falla, mostrar instrucciones
        showInstallInstructions()
      }
    } else {
      // Si no tenemos el prompt, mostrar instrucciones
      showInstallInstructions()
    }
  }

  const showInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
    const isEdge = /Edg/.test(navigator.userAgent)
    const isFirefox = /Firefox/.test(navigator.userAgent)
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)

    let message = ''

    if (isIOS) {
      message = 'Para instalar esta app en iOS:\n\n1. Toca el botón de compartir (cuadrado con flecha) en la parte inferior\n2. Desplázate y selecciona "Añadir a pantalla de inicio"\n3. Toca "Añadir" en la esquina superior derecha'
    } else if (isAndroid) {
      if (isChrome) {
        message = 'Para instalar esta app en Android:\n\n1. Busca el icono de instalación (➕) en la barra de direcciones\n2. O ve al menú (⋮) y selecciona "Instalar app"\n3. Confirma la instalación'
      } else {
        message = 'Para instalar esta app en Android:\n\n1. Ve al menú del navegador (⋮)\n2. Busca la opción "Añadir a pantalla de inicio" o "Instalar app"\n3. Confirma la instalación'
      }
    } else if (isChrome || isEdge) {
      message = 'Para instalar esta app:\n\n1. Busca el icono de instalación (➕) en la barra de direcciones (al lado de la URL)\n2. Haz clic en él y confirma la instalación\n\nSi no ves el icono, recarga la página o espera unos segundos.'
    } else if (isFirefox) {
      message = 'Para instalar esta app en Firefox:\n\n1. Ve al menú (☰)\n2. Busca "Instalar" o "Añadir a pantalla de inicio"\n3. Confirma la instalación'
    } else if (isSafari) {
      message = 'Para instalar esta app en Safari:\n\n1. Ve al menú "Archivo"\n2. Selecciona "Añadir a pantalla de inicio"\n3. Confirma la instalación'
    } else {
      message = 'Para instalar esta app:\n\nBusca el icono de instalación en la barra de direcciones de tu navegador o en el menú. Si no lo ves, tu navegador puede no soportar instalación de PWAs.'
    }

    alert(message)
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

