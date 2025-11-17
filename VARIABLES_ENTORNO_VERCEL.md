# 🔐 Variables de Entorno para Vercel

Este documento lista todas las variables de entorno que necesitas configurar en Vercel para que tu aplicación funcione correctamente.

---

## 📝 Variables Requeridas

### 1. NEXT_PUBLIC_SUPABASE_URL
**Tipo:** Pública (visible en el navegador)  
**Descripción:** URL de tu proyecto Supabase  
**Ejemplo:** `https://hozhyzdurdopkjoehqrh.supabase.co`  
**Dónde encontrarla:**
- Ve a tu [Dashboard de Supabase](https://app.supabase.com)
- Selecciona tu proyecto
- Ve a **Settings** → **API**
- Copia el valor de **"Project URL"**

---

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
**Tipo:** Pública (visible en el navegador)  
**Descripción:** Clave pública/anónima de Supabase para autenticación  
**Ejemplo:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`  
**Dónde encontrarla:**
- Ve a tu [Dashboard de Supabase](https://app.supabase.com)
- Selecciona tu proyecto
- Ve a **Settings** → **API**
- Copia el valor de **"anon public"** key
- ⚠️ **NO** uses la "service_role" key aquí (es secreta)

---

### 3. NEXT_PUBLIC_BACKEND_URL
**Tipo:** Pública (visible en el navegador)  
**Descripción:** URL de tu backend en producción (Railway, Render, etc.)  
**Ejemplo:** `https://web-production-9ab2.up.railway.app`  
**Dónde encontrarla:**
- En Railway: Ve a tu proyecto → **Settings** → **Domains** → Copia la URL
- En Render: Ve a tu servicio → Copia la URL del dashboard
- Asegúrate de que sea HTTPS y accesible públicamente

---

## 🔒 Variables Opcionales (Solo para API Routes)

Estas variables solo son necesarias si usas API Routes del servidor que necesitan comunicarse con el backend de forma privada.

### 4. BACKEND_URL
**Tipo:** Privada (solo en servidor)  
**Descripción:** URL del backend para API Routes del servidor  
**Ejemplo:** `https://web-production-9ab2.up.railway.app`  
**Nota:** Generalmente es la misma que `NEXT_PUBLIC_BACKEND_URL`, pero esta es privada

---

## 📋 Cómo Agregar Variables en Vercel

### Paso 1: Acceder a la Configuración
1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Haz clic en **Settings**
3. En el menú lateral, haz clic en **Environment Variables**

### Paso 2: Agregar Variable
1. Haz clic en **Add New**
2. En **Key**, ingresa el nombre de la variable (ej: `NEXT_PUBLIC_SUPABASE_URL`)
3. En **Value**, ingresa el valor
4. Selecciona los **Environments** donde aplicará:
   - ✅ **Production** (obligatorio)
   - ✅ **Preview** (recomendado)
   - ⚠️ **Development** (opcional, solo para desarrollo local)

### Paso 3: Guardar
1. Haz clic en **Save**
2. Repite para cada variable

### Paso 4: Reiniciar Despliegue
Después de agregar variables nuevas, **debes reiniciar el despliegue**:
1. Ve a **Deployments**
2. Haz clic en los tres puntos (⋯) del último deployment
3. Selecciona **Redeploy**

---

## ✅ Verificación

Después de configurar las variables, verifica que estén correctas:

1. **En Vercel:**
   - Ve a **Settings** → **Environment Variables**
   - Verifica que todas las variables estén listadas
   - Verifica que estén marcadas para **Production**

2. **En la Aplicación:**
   - Despliega la aplicación
   - Abre la consola del navegador (F12)
   - Verifica que no haya errores de variables faltantes

3. **Funcionalidad:**
   - Prueba el login/registro
   - Verifica que se conecte a Supabase
   - Verifica que se conecte al backend

---

## 🔄 Actualizar Variables

Si necesitas actualizar una variable:

1. Ve a **Settings** → **Environment Variables**
2. Encuentra la variable que quieres actualizar
3. Haz clic en los tres puntos (⋯) → **Edit**
4. Actualiza el valor
5. Haz clic en **Save**
6. **Reinicia el despliegue** (importante)

---

## ⚠️ Notas Importantes

### Variables Públicas vs Privadas

- **`NEXT_PUBLIC_*`**: Son visibles en el navegador. Solo usa estas para valores que no sean secretos.
- **Sin `NEXT_PUBLIC_`**: Solo están disponibles en el servidor (API Routes). Úsalas para secretos.

### Seguridad

- ⚠️ **NUNCA** pongas la `service_role` key de Supabase en variables públicas
- ⚠️ **NUNCA** pongas API keys secretas en variables `NEXT_PUBLIC_*`
- ✅ Usa variables privadas para secretos

### Case Sensitivity

- Los nombres de variables son **case-sensitive**
- Asegúrate de escribirlos exactamente como se muestran aquí

---

## 📝 Template de Variables

Copia y pega esto en un documento temporal mientras configuras Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://hozhyzdurdopkjoehqrh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
NEXT_PUBLIC_BACKEND_URL=https://web-production-9ab2.up.railway.app
BACKEND_URL=https://web-production-9ab2.up.railway.app
```

---

## 🆘 Problemas Comunes

### "Environment variable not found"
- Verifica que el nombre sea exacto (case-sensitive)
- Verifica que esté marcada para **Production**
- Reinicia el despliegue después de agregar la variable

### "Supabase connection failed"
- Verifica que `NEXT_PUBLIC_SUPABASE_URL` sea correcta
- Verifica que `NEXT_PUBLIC_SUPABASE_ANON_KEY` sea la anon key (no service_role)
- Verifica que el proyecto de Supabase esté activo

### "Backend connection failed"
- Verifica que `NEXT_PUBLIC_BACKEND_URL` sea correcta
- Verifica que el backend esté desplegado y accesible
- Verifica que el backend permita CORS desde tu dominio de Vercel

---

**¡Configuración completada! 🎉**

