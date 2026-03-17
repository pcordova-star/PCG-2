
# Firebase Studio - PCG 2.0

Este proyecto es una plataforma de gestión de obras construida con Next.js y potenciada por IA.

## Infraestructura Profesional
- **Hosting:** Firebase App Hosting (Despliegue automático vía Git Push).
- **IA Framework:** Genkit con modelos Gemini 2.0.
- **Base de Datos:** Cloud Firestore.
- **Autenticación:** Firebase Auth con Custom Claims para Roles.
- **Backend:** Next.js API Routes y Firebase Cloud Functions.

## Flujo de Despliegue
Para actualizar la aplicación y ver los cambios en producción:
1. `git add .`
2. `git commit -m "descripción del cambio"`
3. `git push origin main`

Firebase detectará el push y construirá el contenedor de Next.js automáticamente.

## Solución de Problemas: Variables de Entorno
Si el despliegue falla por "Secret mal configurado":
1. **Consola de Firebase:** Ve a **App Hosting > Tu Backend > Configuración > Entorno**.
2. **Verificar Nombres:** Asegúrate de que las claves coincidan exactamente con `apphosting.yaml`:
   - `GENAI_API_KEY` (Tu llave de Gemini)
   - `ADMIN_SERVICE_ACCOUNT` (El JSON de tu cuenta de servicio)
   - `APP_BASE_URL` (https://pcgoperacion.com)

## Documentación del Desarrollador
- [Manual de Comandos Git](/docs/GIT_COMMANDS_CHEATSHEET.md)
- [Alcance del Producto IA](/docs/ALCANCE_PRODUCTO_INDUCCION_IA.md)
- [Plan de Implementación Noticias](/docs/IMPLEMENTACION_MODULO_NOTICIAS.md)

<!-- Helper comment to register this interaction. -->
