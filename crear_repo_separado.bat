@echo off
echo ========================================
echo Crear Repositorio Separado del Frontend
echo ========================================
echo.

echo Paso 1: Verificando que estamos en la carpeta frontend...
cd /d "%~dp0"
echo Directorio actual: %CD%
echo.

echo Paso 2: Agregando todos los archivos...
git add .
echo.

echo Paso 3: Haciendo commit...
git commit -m "Initial commit: Codex Trader Frontend"
echo.

echo Paso 4: Configurando remote para nuevo repositorio...
echo IMPORTANTE: Primero crea el repositorio en GitHub:
echo   1. Ve a: https://github.com/new
echo   2. Nombre: codex-trader-frontend
echo   3. NO marques nada (sin README, sin .gitignore)
echo   4. Crea el repositorio
echo.
pause

git remote set-url origin https://github.com/gabrieldave/codex-trader-frontend.git
echo Remote configurado.
echo.

echo Paso 5: Cambiando branch a main...
git branch -M main
echo.

echo Paso 6: Subiendo codigo a GitHub...
git push -u origin main
echo.

echo ========================================
echo ¡Listo! Ahora conecta Vercel con:
echo https://github.com/gabrieldave/codex-trader-frontend
echo ========================================
pause

