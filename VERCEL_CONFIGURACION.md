# ⚙️ Configuración de Vercel para Frontend

## ❌ Error Actual

```
Error: A Serverless Function has exceeded the unzipped maximum size of 250 MB
```

**Causa:** Vercel está intentando construir el backend (que tiene dependencias pesadas) junto con el frontend.

---

## ✅ Solución: Configurar Root Directory en Vercel

### Paso 1: Configurar en Vercel Dashboard

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **General**
4. Busca **"Root Directory"**
5. Establece: `frontend`
6. Haz clic en **"Save"**

### Paso 2: Verificar Configuración

Después de configurar el Root Directory, Vercel:
- ✅ Solo construirá el código en la carpeta `frontend/`
- ✅ Ignorará el backend y otras carpetas
- ✅ El build será mucho más rápido y ligero

---

## 🔧 Configuración Alternativa: vercel.json

Si prefieres configurarlo en el código, el archivo `vercel.json` ya está actualizado para usar `frontend/` como directorio base.

---

## 📋 Variables de Entorno en Vercel

Después de configurar el Root Directory, agrega estas variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://eixvqedpyuybfywmdulg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
NEXT_PUBLIC_BACKEND_URL=https://web-production-3ab35.up.railway.app
```

---

## ✅ Verificación

Después de configurar:

1. **Haz un nuevo despliegue:**
   - Ve a **Deployments**
   - Haz clic en los tres puntos (⋯) → **Redeploy**
   - O haz un nuevo commit y push

2. **Verifica los logs:**
   - El build debería ser mucho más rápido
   - No debería intentar instalar dependencias de Python
   - Solo debería instalar dependencias de Node.js

3. **Verifica el tamaño:**
   - El build debería ser < 50 MB (muy por debajo del límite de 250 MB)

---

## 🆘 Si Aún Hay Problemas

### Opción 1: Crear Repositorio Separado

Si el problema persiste, considera crear un repositorio separado solo para el frontend:

1. Crea un nuevo repositorio en GitHub: `codex-trader-frontend`
2. Copia solo la carpeta `frontend/` al nuevo repositorio
3. Conecta ese repositorio a Vercel

### Opción 2: Usar .vercelignore

El archivo `.vercelignore` en la raíz del proyecto debería ayudar a ignorar el backend.

---

**⚠️ IMPORTANTE:** El Root Directory es la configuración más importante. Asegúrate de configurarlo en el Dashboard de Vercel.

