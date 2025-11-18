# Configurar Autenticación con Google en Supabase

Para que el botón "Continuar con Google" funcione, necesitas configurar Google OAuth en tu proyecto de Supabase.

## Pasos para Configurar Google OAuth

### 1. Crear Credenciales en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs & Services** > **Credentials**
4. Haz clic en **Create Credentials** > **OAuth client ID**
5. Si es la primera vez, configura la pantalla de consentimiento OAuth:
   - Tipo de aplicación: **External**
   - Nombre de la app: **PsicoBot** (o el que prefieras)
   - Email de soporte: Tu email
   - Guarda y continúa
6. Crea el OAuth Client ID:
   - Tipo de aplicación: **Web application**
   - Nombre: **PsicoBot Web**
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000`
     - `https://tu-dominio.com` (si tienes uno)
   - **Authorized redirect URIs**:
     - `https://tu-proyecto.supabase.co/auth/v1/callback`
     - Para encontrarlo: Ve a tu proyecto Supabase > Authentication > URL Configuration
7. Copia el **Client ID** y **Client Secret**

### 2. Configurar en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com/)
2. Ve a **Authentication** > **Providers**
3. Busca **Google** y haz clic para habilitarlo
4. Ingresa:
   - **Client ID (for OAuth)**: El Client ID que copiaste de Google
   - **Client Secret (for OAuth)**: El Client Secret que copiaste de Google
5. Haz clic en **Save**

### 3. Configurar URL de Redirección

1. En Supabase, ve a **Authentication** > **URL Configuration**
2. Agrega a **Redirect URLs**:
   - `http://localhost:3000`
   - `http://localhost:3000/**` (para desarrollo)
   - Tu dominio de producción (si lo tienes)

### 4. Probar

1. Reinicia tu frontend si está corriendo
2. Haz clic en "Continuar con Google"
3. Deberías ser redirigido a Google para autenticarte
4. Después de autenticarte, serás redirigido de vuelta a la app

## Notas Importantes

- **Desarrollo local**: Asegúrate de que `http://localhost:3000` esté en las URLs autorizadas de Google
- **Producción**: Cuando despliegues, agrega tu dominio real a las URLs autorizadas
- **Seguridad**: Nunca compartas tu Client Secret públicamente
- **Tokens**: Los usuarios que se registren con Google también recibirán 20,000 tokens iniciales automáticamente

## Solución de Problemas

### Error: "redirect_uri_mismatch"
- Verifica que la URL de redirección en Google coincida exactamente con la de Supabase
- Formato: `https://tu-proyecto.supabase.co/auth/v1/callback`

### Error: "access_denied"
- Verifica que Google OAuth esté habilitado en Supabase
- Verifica que las credenciales sean correctas

### No redirige después de autenticar
- Verifica que la URL de redirección en Supabase incluya `http://localhost:3000`
















