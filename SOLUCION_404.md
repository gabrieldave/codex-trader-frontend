# Solución para Error 404 en /api/tokens/reset

## Problema
El endpoint `/api/tokens/reset` devuelve 404 (Not Found).

## Solución

### Paso 1: Reiniciar el servidor de Next.js

1. Detén el servidor de desarrollo (Ctrl+C en la terminal donde está corriendo)
2. Elimina la carpeta `.next` (caché de Next.js):
   ```bash
   cd frontend
   rmdir /s /q .next
   ```
3. Reinicia el servidor:
   ```bash
   npm run dev
   ```

### Paso 2: Verificar que el archivo existe

El archivo debe estar en: `frontend/app/api/tokens/reset/route.ts`

### Paso 3: Verificar en el navegador

Abre en el navegador: `http://localhost:3000/api/tokens/reset`

Deberías ver un JSON con el mensaje: "Endpoint de reset de tokens disponible"

### Paso 4: Verificar el backend

Asegúrate de que el backend esté corriendo en `http://localhost:8000`

Puedes verificar con: `http://localhost:8000/` (debería mostrar los endpoints disponibles)

## Si el problema persiste

1. Verifica la consola del servidor de Next.js (donde corre `npm run dev`)
2. Verifica la consola del navegador (F12)
3. Verifica que el backend esté corriendo




















