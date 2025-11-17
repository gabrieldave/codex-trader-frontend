# 📧 Templates de Email para Supabase Dashboard

Este archivo contiene los templates HTML personalizados para los emails de autenticación de Supabase. Copia y pega cada template en el dashboard de Supabase.

**Ubicación en Supabase:** Authentication → Email Templates

---

## ✅ 1. Confirm signup (Confirmación de Registro)

**Asunto del Email:**
```
Confirma tu cuenta en Codex Trader
```

**Contenido HTML:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🧠📈 Codex Trader</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Confirma tu cuenta</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #1e40af; margin-top: 0; font-size: 24px;">¡Bienvenido a Codex Trader!</h2>
      
      <p style="font-size: 16px; margin-bottom: 20px;">
        Hola <strong>{{ .Email }}</strong>,
      </p>
      
      <p style="font-size: 16px; margin-bottom: 20px;">
        Gracias por registrarte en Codex Trader. Para completar tu registro y comenzar a usar nuestra plataforma de trading inteligente, por favor confirma tu dirección de correo electrónico haciendo clic en el botón de abajo:
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
          Confirmar mi cuenta
        </a>
      </div>
      
      <!-- Alternative Link -->
      <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        Si el botón no funciona, copia y pega este enlace en tu navegador:
        <br>
        <a href="{{ .ConfirmationURL }}" style="color: #2563eb; word-break: break-all;">{{ .ConfirmationURL }}</a>
      </p>
      
      <!-- Security Notice -->
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 30px; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>⚠️ Importante:</strong> Si no solicitaste esta cuenta, puedes ignorar este email de forma segura.
        </p>
      </div>
      
      <p style="font-size: 14px; color: #666; margin-top: 30px;">
        Este enlace expirará en 24 horas por seguridad.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        © 2024 Codex Trader. Todos los derechos reservados.
        <br>
        Este es un email automático, por favor no respondas.
      </p>
    </div>
  </div>
</body>
</html>
```

---

## ✅ 2. Magic Link (Enlace Mágico)

**Asunto del Email:**
```
Tu enlace de acceso a Codex Trader
```

**Contenido HTML:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🧠📈 Codex Trader</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Acceso rápido y seguro</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #1e40af; margin-top: 0; font-size: 24px;">Haz clic para iniciar sesión</h2>
      
      <p style="font-size: 16px; margin-bottom: 20px;">
        Hola <strong>{{ .Email }}</strong>,
      </p>
      
      <p style="font-size: 16px; margin-bottom: 20px;">
        Has solicitado un enlace mágico para acceder a tu cuenta de Codex Trader. Haz clic en el botón de abajo para iniciar sesión de forma segura sin necesidad de contraseña:
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
          Iniciar sesión
        </a>
      </div>
      
      <!-- Alternative Link -->
      <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        Si el botón no funciona, copia y pega este enlace en tu navegador:
        <br>
        <a href="{{ .ConfirmationURL }}" style="color: #2563eb; word-break: break-all;">{{ .ConfirmationURL }}</a>
      </p>
      
      <!-- Security Notice -->
      <div style="background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin-top: 30px; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #1e40af;">
          <strong>🔒 Seguridad:</strong> Este enlace es único y solo puede usarse una vez. Expirará en 1 hora por tu seguridad.
        </p>
      </div>
      
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 20px; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>⚠️ Importante:</strong> Si no solicitaste este enlace, ignora este email de forma segura. Tu cuenta permanecerá protegida.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        © 2024 Codex Trader. Todos los derechos reservados.
        <br>
        Este es un email automático, por favor no respondas.
      </p>
    </div>
  </div>
</body>
</html>
```

---

## ✅ 3. Change Email Address (Cambio de Email)

**Asunto del Email:**
```
Confirma tu nuevo correo electrónico - Codex Trader
```

**Contenido HTML:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🧠📈 Codex Trader</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Cambio de correo electrónico</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #1e40af; margin-top: 0; font-size: 24px;">Confirma tu nuevo correo</h2>
      
      <p style="font-size: 16px; margin-bottom: 20px;">
        Hola,
      </p>
      
      <p style="font-size: 16px; margin-bottom: 20px;">
        Has solicitado cambiar la dirección de correo electrónico asociada a tu cuenta de Codex Trader. Para completar este cambio, confirma tu nueva dirección haciendo clic en el botón de abajo:
      </p>
      
      <!-- Email Info -->
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
        <p style="margin: 0; font-size: 14px; color: #666;">
          <strong>Nuevo correo:</strong> {{ .Email }}
        </p>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
          Confirmar nuevo correo
        </a>
      </div>
      
      <!-- Alternative Link -->
      <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        Si el botón no funciona, copia y pega este enlace en tu navegador:
        <br>
        <a href="{{ .ConfirmationURL }}" style="color: #2563eb; word-break: break-all;">{{ .ConfirmationURL }}</a>
      </p>
      
      <!-- Security Notice -->
      <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin-top: 30px; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #991b1b;">
          <strong>🔒 Importante:</strong> Si no solicitaste este cambio, por favor ignora este email y contacta con nuestro equipo de soporte inmediatamente. Tu cuenta actual permanecerá segura.
        </p>
      </div>
      
      <p style="font-size: 14px; color: #666; margin-top: 30px;">
        Este enlace expirará en 24 horas por seguridad.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        © 2024 Codex Trader. Todos los derechos reservados.
        <br>
        Este es un email automático, por favor no respondas.
      </p>
    </div>
  </div>
</body>
</html>
```

---

## ✅ 4. Reset Password (Restablecer Contraseña)

**Asunto del Email:**
```
Restablece tu contraseña - Codex Trader
```

**Contenido HTML:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🧠📈 Codex Trader</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Restablecer contraseña</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #1e40af; margin-top: 0; font-size: 24px;">Restablece tu contraseña</h2>
      
      <p style="font-size: 16px; margin-bottom: 20px;">
        Hola <strong>{{ .Email }}</strong>,
      </p>
      
      <p style="font-size: 16px; margin-bottom: 20px;">
        Has solicitado restablecer la contraseña de tu cuenta en Codex Trader. Haz clic en el botón de abajo para crear una nueva contraseña segura:
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
          Restablecer contraseña
        </a>
      </div>
      
      <!-- Alternative Link -->
      <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        Si el botón no funciona, copia y pega este enlace en tu navegador:
        <br>
        <a href="{{ .ConfirmationURL }}" style="color: #2563eb; word-break: break-all;">{{ .ConfirmationURL }}</a>
      </p>
      
      <!-- Security Notice -->
      <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin-top: 30px; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #991b1b;">
          <strong>🔒 Seguridad:</strong> Este enlace es único y solo puede usarse una vez. Expirará en 1 hora por tu seguridad.
        </p>
      </div>
      
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 20px; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>⚠️ Importante:</strong> Si no solicitaste restablecer tu contraseña, ignora este email de forma segura. Tu contraseña actual permanecerá sin cambios y tu cuenta estará protegida.
        </p>
      </div>
      
      <!-- Password Tips -->
      <div style="background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin-top: 20px; border-radius: 4px;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #1e40af; font-weight: 600;">
          💡 Consejos para una contraseña segura:
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #1e40af;">
          <li>Usa al menos 8 caracteres</li>
          <li>Combina letras mayúsculas y minúsculas</li>
          <li>Incluye números y símbolos</li>
          <li>No uses información personal</li>
        </ul>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        © 2024 Codex Trader. Todos los derechos reservados.
        <br>
        Este es un email automático, por favor no respondas.
      </p>
    </div>
  </div>
</body>
</html>
```

---

## 📋 Instrucciones de Uso

### Paso 1: Acceder a Supabase Dashboard
1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Authentication** → **Email Templates**

### Paso 2: Configurar cada Template
Para cada uno de los 4 templates:

1. **Selecciona el template** de la lista (Confirm signup, Magic Link, Change Email Address, Reset Password)
2. **Copia el asunto** del email y pégalo en el campo "Subject"
3. **Copia el contenido HTML** completo y pégalo en el editor HTML
4. **Guarda los cambios**

### Paso 3: Variables Disponibles

Los templates usan estas variables de Supabase:
- `{{ .ConfirmationURL }}` - URL de confirmación/acción
- `{{ .Email }}` - Dirección de correo del usuario
- `{{ .Token }}` - Token de confirmación (si está disponible)
- `{{ .TokenHash }}` - Hash del token (si está disponible)

### Paso 4: Probar los Templates

Después de configurar los templates:
1. Prueba el flujo de registro para verificar el template "Confirm signup"
2. Prueba el reset de contraseña para verificar el template "Reset Password"
3. Verifica que los emails se vean bien en diferentes clientes de correo (Gmail, Outlook, etc.)

---

## 🎨 Características de los Templates

✅ **Diseño Responsive** - Se adaptan a móviles y escritorio  
✅ **Estilo Moderno** - Gradientes y sombras profesionales  
✅ **Branding Consistente** - Colores y estilo de Codex Trader  
✅ **Seguridad** - Mensajes claros sobre seguridad y expiración  
✅ **Accesibilidad** - Texto alternativo y enlaces claros  
✅ **Compatibilidad** - Funcionan en la mayoría de clientes de correo  

---

## 📝 Notas Importantes

- Los templates están optimizados para clientes de correo modernos
- Los colores usan el esquema de Codex Trader (azul #2563eb)
- Todos los enlaces usan `{{ .ConfirmationURL }}` que Supabase genera automáticamente
- Los mensajes de seguridad son claros y visibles
- Los templates son completamente personalizables desde el dashboard de Supabase

---

**Última actualización:** Diciembre 2024


