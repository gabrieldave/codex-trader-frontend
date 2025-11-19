# 🔧 Solución: Redirección a localhost después de confirmar email

## Problema
Cuando confirmas tu correo electrónico, Supabase te redirige a `localhost:3000` en lugar de tu URL de producción (`https://www.codextrader.tech`).

## Causa
Supabase está usando la URL de redirección configurada en el Dashboard, que probablemente está configurada como `localhost:3000` para desarrollo.

## Solución

### Paso 1: Actualizar Redirect URLs en Supabase Dashboard

1. Ve a tu [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **URL Configuration**
4. En la sección **Redirect URLs**, asegúrate de tener estas URLs:

```
http://localhost:3000/auth/callback
https://www.codextrader.tech/auth/callback
https://codextrader.tech/auth/callback
```

**IMPORTANTE:** Agrega ambas URLs (con y sin `www`) para evitar problemas.

### Paso 2: Verificar Site URL

En la misma página de **URL Configuration**, verifica que el campo **Site URL** esté configurado como:

```
https://www.codextrader.tech
```

### Paso 3: Verificar que el código use la URL correcta

El código ya está actualizado para usar `window.location.origin` en producción, lo que debería funcionar correctamente.

### Paso 4: Probar

1. Crea una nueva cuenta de prueba
2. Confirma el email
3. Verifica que te redirija a `https://www.codextrader.tech` (o tu dominio) en lugar de `localhost:3000`

## Notas Importantes

- **Las Redirect URLs deben coincidir exactamente** con las URLs que uses en tu aplicación
- Si tienes múltiples dominios (con y sin `www`), agrégalos todos
- Después de cambiar las URLs en Supabase, los cambios se aplican inmediatamente
- Los emails ya enviados seguirán usando la URL antigua, pero los nuevos usarán la correcta

## Verificación

Después de configurar, puedes verificar que funciona:

1. Crea una cuenta nueva
2. Revisa el email de confirmación
3. El enlace debería apuntar a `https://www.codextrader.tech/auth/callback?token=...` (no `localhost`)

## Si el problema persiste

Si después de configurar las URLs correctas en Supabase el problema persiste:

1. Verifica que el dominio esté correctamente configurado en Vercel
2. Verifica que `NEXT_PUBLIC_SITE_URL` esté configurada en Vercel (opcional, pero recomendado)
3. Limpia la caché del navegador
4. Prueba en modo incógnito







