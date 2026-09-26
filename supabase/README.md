# Nube opcional (Supabase)

Forja funciona sin nube. Esta carpeta añade, **solo si se configura**, cuentas sin contraseña,
sincronización mínima entre dispositivos y el asistente en la nube (Gemini con cuota diaria).
Todo cabe en los planes gratuitos de Supabase y Google AI Studio.

- `migrations/`: tablas con RLS (`sync_rows`, `assistant_usage`, `entitlements`).
- `functions/assistant`: asistente en la nube (cuota por persona, clave de Gemini solo aquí).
- `functions/delete-account`: borrado de la cuenta y de todos sus datos en la nube.

El workflow `.github/workflows/supabase.yml` aplica las migraciones y publica las funciones al
actualizar `main`.

## Puesta en marcha (una vez)

1. **Proyecto**: crea una cuenta gratuita en <https://supabase.com> y un proyecto nuevo con
   región **Central EU (Frankfurt)**. Guarda la contraseña de la base de datos.
2. **Datos del proyecto** (_Project Settings › API_ o _Connect_): copia la _Project URL_, la
   clave pública _anon_ y el _Project ref_ (el identificador que aparece en la URL).
3. **Token de acceso**: en <https://supabase.com/dashboard/account/tokens> crea un token.
4. **Clave de Gemini** (opcional, para el asistente en la nube): en
   <https://aistudio.google.com/apikey> crea una clave de API gratuita.
5. **GitHub** (_Settings › Secrets and variables › Actions_):
   - Secretos: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` y,
     si quieres el asistente en la nube, `GEMINI_API_KEY`.
   - Variables (pestaña _Variables_): `SUPABASE_URL` y `SUPABASE_ANON_KEY` (son públicas por
     diseño; la seguridad la dan las políticas RLS).
6. **Autenticación** (_Authentication_ en Supabase):
   - _URL Configuration_: pon la URL de la app como _Site URL_ y añádela a _Redirect URLs_.
   - _Emails › Magic Link_: añade el código al mensaje, por ejemplo
     `<p>Tu código de Forja: <strong>{{ .Token }}</strong></p>`.
7. Lanza los workflows _Supabase_ y _Despliegue_ desde la pestaña _Actions_ (o haz un push a
   `main`). En Perfil aparecerá «Cuenta y sincronización».

## Límites de los planes gratuitos

- Supabase pausa los proyectos gratuitos tras una semana sin actividad; se reactivan desde el
  panel. Mientras tanto la app sigue funcionando en local y sincroniza al volver.
- El envío de correos integrado de Supabase solo llega a los miembros del proyecto y con un
  límite bajo por hora: sirve para uso personal. Para abrir las cuentas a más personas hay que
  configurar un SMTP propio (_Authentication › Emails › SMTP_); una opción gratuita es Brevo
  (300 correos al día).
- Gemini (plan gratuito) tiene límites de peticiones por minuto y por día; la función aplica
  además una cuota por persona (`DAILY_LIMIT_FREE`, 15 por defecto). En el plan gratuito Google
  puede usar las preguntas para mejorar sus productos: por eso la app nunca envía datos
  personales ni de salud.
