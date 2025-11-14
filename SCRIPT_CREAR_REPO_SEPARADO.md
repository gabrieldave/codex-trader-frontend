# 🚀 Script para Crear Repositorio Separado del Frontend

## 📋 Pasos Rápidos

### 1. Crear Repositorio en GitHub

1. Ve a: https://github.com/new
2. Repository name: `codex-trader-frontend`
3. Description: "Frontend de Codex Trader"
4. **NO** marques nada (sin README, sin .gitignore)
5. Haz clic en **"Create repository"**

### 2. Ejecutar Estos Comandos

Abre PowerShell en la carpeta `frontend` y ejecuta:

```powershell
# Estar en la carpeta frontend
cd "C:\Users\dakyo\Documents\Proyectos de apps\MI_SAAS_BOT\frontend"

# Verificar que estás en el lugar correcto
pwd

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Initial commit: Codex Trader Frontend"

# Conectar con el nuevo repositorio (reemplaza TU_USUARIO)
git remote set-url origin https://github.com/gabrieldave/codex-trader-frontend.git

# O si no tiene remote:
# git remote add origin https://github.com/gabrieldave/codex-trader-frontend.git

# Cambiar branch a main
git branch -M main

# Subir código
git push -u origin main
```

### 3. Conectar Vercel

1. Ve a Vercel Dashboard
2. **Add New Project**
3. Selecciona: `codex-trader-frontend`
4. Vercel detectará automáticamente Next.js
5. **NO necesitas configurar Root Directory** (será `/` automáticamente)
6. Agrega las variables de entorno
7. Deploy

---

**¡Listo! Vercel detectará todo automáticamente.** 🎉

