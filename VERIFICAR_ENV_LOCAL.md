# 🔍 Verificar y Corregir .env.local

## ❌ Problema Detectado

El error `ERR_NAME_NOT_RESOLVED` indica que la URL de Supabase no se puede resolver. 
El navegador está intentando conectarse a: `eixvqedpyuybfywmdulg.supabase.co`

## ✅ Solución

### 1. Verifica tu archivo `.env.local`

Abre el archivo `.env.local` en la carpeta del frontend y verifica que tenga:

```env
NEXT_PUBLIC_SUPABASE_URL=https://hozhyzdurdopkjoehqrh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY_AQUI
NEXT_PUBLIC_BACKEND_URL=https://web-production-9ab2.up.railway.app
```

### 2. Si la URL es incorrecta:

Si ves `eixvqedpyuybfywmdulg.supabase.co`, cámbiala a:
```
https://hozhyzdurdopkjoehqrh.supabase.co
```

### 3. Obtener la Anon Key:

1. Ve a: https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a: **Settings > API**
4. Copia el valor de **"anon public"** key
5. Pégalo en `NEXT_PUBLIC_SUPABASE_ANON_KEY=`

### 4. Reiniciar el servidor:

Después de cambiar el `.env.local`:
1. Detén el servidor (Ctrl+C)
2. Inícialo de nuevo: `npm run dev`
3. Recarga la página en el navegador (Ctrl+Shift+R)

## 🔍 Verificar que funcione:

Abre la consola del navegador (F12) y verifica que:
- ✅ No aparezca el error `ERR_NAME_NOT_RESOLVED`
- ✅ Las peticiones a Supabase se resuelvan correctamente

