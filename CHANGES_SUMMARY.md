# Lista de cambios introducidos

## Configuración y servicios compartidos
- Se agregó `scripts/config.js` con la estructura `window.APP_CONFIG` para centralizar las credenciales de Firebase y Google Sheets y permitir restringir correos autorizados.【F:scripts/config.js†L1-L35】
- Se creó `scripts/firebase-auth.js` que inicializa Firebase Authentication de forma perezosa, gestiona los listeners de sesión, expone helpers de inicio/cierre de sesión y controla la lista de correos permitidos.【F:scripts/firebase-auth.js†L1-L103】
- Se implementó `scripts/data-service.js` como capa única de acceso a datos que lee del Google Apps Script cuando está configurado o recurre al `logros.json` local, cachea respuestas y envía escrituras autenticadas.【F:scripts/data-service.js†L1-L94】

## Sitio público (`index.html` y `scripts/index.js`)
- `index.html` ahora carga la configuración, el módulo de autenticación y el servicio de datos antes del script principal que renderiza todo dinámicamente.【F:index.html†L1-L37】
- El nuevo `scripts/index.js` reemplaza la lógica inline por la clase `AchievementSystem`, calcula puntos por jugador, renderiza tarjetas animadas, agrupa logros por tipo y muestra estadísticas y tooltips flotantes.【F:scripts/index.js†L1-L200】

## Panel de administración (`admin.html` y `scripts/admin.js`)
- `admin.html` se reescribió para integrar banner de autenticación, buscador, resumen de métricas y botón flotante de guardado que responde al estado de sesión.【F:admin.html†L1-L120】
- El módulo `scripts/admin.js` gestiona el estado global, escucha cambios de autenticación, calcula puntos, pinta checkboxes por jugador/tipo, realiza búsquedas, detecta cambios pendientes y envía escrituras a la hoja sólo si hay sesión activa.【F:scripts/admin.js†L1-L200】

## Panel de estadísticas (`stats.html` y `scripts/stats.js`)
- `stats.html` estructura el dashboard con acciones rápidas, selector de jugador, contadores y barra de progreso, además de cargar la configuración compartida y los módulos reutilizables.【F:stats.html†L1-L200】
- `scripts/stats.js` crea un dashboard de estadísticas por jugador, inicializa datos desde el servicio común, sincroniza con `localStorage`, ofrece acciones rápidas, cálculo de logros potenciales y exportaciones/resets con notificaciones visuales.【F:scripts/stats.js†L1-L120】

## Otros ajustes
- `styles.css` conserva la paleta original y define la maquetación de tarjetas, scroll horizontal de logros, tooltips y badges utilizados por el nuevo frontend modular.【F:styles.css†L120-L360】
- `logros.json` permanece como respaldo local para modo lectura y para inicializar la caché de datos cuando no hay configuración remota.【F:logros.json†L1-L200】
