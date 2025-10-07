# Configuración de Firebase y Google Sheets

Este proyecto puede funcionar únicamente con el archivo local `logros.json`, pero
para habilitar la escritura remota y la autenticación necesitas completar tu
propia configuración. A continuación se resumen los pasos y los parámetros que
debes ajustar.

## 1. Firebase Authentication

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Dentro del proyecto, registra una *Web App* y copia la configuración del
   objeto `firebaseConfig` que entrega Firebase (apiKey, authDomain, etc.).
3. En el menú **Authentication**, habilita el proveedor de correo/contraseña u
   otro método que quieras utilizar.
4. Opcionalmente, limita qué usuarios pueden entrar al panel de administración:
   - Puedes mantener una lista de correos en `APP_CONFIG.auth.allowedEmails`.
   - También puedes restringirlos directamente en Firebase mediante reglas.

Coloca el objeto de configuración en `scripts/config.js` en la propiedad
`firebase`. Si mantienes `firebase: null` la aplicación funcionará en modo de
solo lectura con `logros.json`.

## 2. Google Sheets + Apps Script

1. Crea una hoja de cálculo en Google Sheets y comparte acceso de edición con la
   cuenta de servicio que usará el Apps Script.
2. En Google Sheets abre **Extensiones → Apps Script** y crea un script que
   exponga las operaciones `doGet` y `doPost` que ya esperaba la aplicación
   previa. El script debe leer y escribir los datos en la hoja.
3. Despliega el script como **Aplicación web**, permitiendo el acceso a cualquiera
   con el enlace (o a usuarios autenticados si también manejas auth allí).
4. Copia la URL de la aplicación web y el ID de la hoja de cálculo.

Actualiza `scripts/config.js` con estos valores:

```js
window.APP_CONFIG = {
  firebase: { /* ...configuración generada por Firebase... */ },
  googleSheet: {
    scriptUrl: 'https://script.google.com/macros/s/.../exec',
    sheetId: '1ABCDEF...'
  },
  auth: {
    allowedEmails: ['admin@ejemplo.com']
  }
};
```

## 3. Despliegue y pruebas

1. Sirve el sitio estático (por ejemplo con `python -m http.server 8000`).
2. Abre el panel de administración (`/admin.html`) e inicia sesión con un correo
   autorizado para confirmar que la escritura funciona.
3. Comprueba que la página pública (`/index.html`) carga los datos desde la hoja
   y que las estadísticas (`/stats.html`) se actualizan.

> **Importante:** No publiques tus credenciales reales en repositorios públicos.
> Utiliza variables de entorno o archivos ignorados por Git si vas a desplegar
> el sitio.
