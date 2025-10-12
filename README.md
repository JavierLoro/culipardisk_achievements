# Configuración detallada de Firebase Authentication y Google Sheets + Apps Script

El sitio puede funcionar únicamente en modo lectura con el archivo local
`logros.json`, pero para habilitar autenticación y escritura remota es necesario
crear tus propios recursos en Firebase y Google. Esta guía explica cada paso con
detalle.

## Requisitos previos

- Una cuenta de Google con acceso a Firebase y Google Apps Script.
- Permiso para crear proyectos en Firebase y para desplegar Apps Scripts.
- El archivo `scripts/config.js` copiado y listo para editar (no subas tus
  credenciales a repositorios públicos).

## Paso 1. Preparar Firebase Authentication

### 1.1 Crear el proyecto y la aplicación web

1. Entra a [Firebase Console](https://console.firebase.google.com/) y crea un
   nuevo proyecto (o usa uno existente).
2. En la tarjeta **Project Overview**, haz clic en el icono `</>` para registrar
   una app web. Asigna un nombre descriptivo y marca la opción de alojar si lo
   deseas (no es obligatorio para este proyecto).
3. Firebase mostrará un objeto `firebaseConfig` similar a:

   ```js
   const firebaseConfig = {
     apiKey: 'AIza...xyz',
     authDomain: 'tu-proyecto.firebaseapp.com',
     projectId: 'tu-proyecto',
     appId: '1:1234567890:web:abc123',
     // ...otros campos opcionales
   };
   ```

   Copia este objeto porque lo necesitarás en `scripts/config.js`.

### 1.2 Activar proveedores y dominios autorizados

1. Ve a **Build → Authentication → Sign-in method**.
2. Activa **Google** como proveedor de acceso y completa los campos requeridos
   (logotipo, correo de soporte y dominio autorizado). La aplicación sólo usa el
   botón «Iniciar sesión con Google», por lo que no necesitas correo/contraseña
   ni otros métodos.
3. En la pestaña **Settings → Authorized domains** agrega `localhost` (o el
   dominio donde alojes el sitio) para permitir el inicio de sesión durante el
   desarrollo.

### 1.3 Crear usuarios y restringir el acceso

- Para realizar pruebas rápidas puedes agregar cuentas en la pestaña **Users** o
  simplemente iniciar sesión con cualquier cuenta de Google permitida.
- Si quieres restringir quién entra al panel de administración, añade los
  correos válidos en `APP_CONFIG.auth.allowedEmails`. El código cerrará la sesión
  automáticamente a cualquiera que no esté en esa lista.
- Opcional: en **Authentication → Sign-in method → Authorized domains** puedes
  limitar los dominios de correo si usas Google Workspace.

### 1.4 Añadir la configuración al proyecto

Edita `scripts/config.js` y reemplaza `firebase: null` por el objeto que copiaste
de Firebase:

```js
window.APP_CONFIG = {
  firebase: {
    apiKey: 'AIza...xyz',
    authDomain: 'tu-proyecto.firebaseapp.com',
    projectId: 'tu-proyecto',
    appId: '1:1234567890:web:abc123'
  },
  googleSheet: {
    scriptUrl: '',
    sheetId: ''
  },
  auth: {
    allowedEmails: ['admin@tuclub.com']
  }
};
```

Guarda el archivo sin exponer claves en el repositorio público.

## Paso 2. Preparar Google Sheets y Apps Script

### 2.1 Crear la hoja de cálculo

1. Crea una hoja en [Google Sheets](https://sheets.google.com/).
2. Renombra la pestaña principal a `Datos` (puedes usar otro nombre, pero
   recuerda actualizarlo en el script).
3. Copia el contenido completo de `logros.json` y pégalo en la celda `A1`. Todo
   el JSON se almacenará en esa celda para mantener la estructura sin pérdidas.

### 2.2 Crear el Apps Script

1. Desde la hoja, abre **Extensiones → Apps Script**.
2. Borra el contenido generado automáticamente y pega el siguiente ejemplo,
   ajustándolo según tu preferencia:

   ```javascript
   const SHEET_NAME = 'Datos';
   const PROTECTED_METHODS = ['write'];

   function buildResponse(body) {
     return ContentService
       .createTextOutput(typeof body === 'string' ? body : JSON.stringify(body))
       .setMimeType(ContentService.MimeType.JSON);
   }

   function getSheet(sheetId) {
     const doc = SpreadsheetApp.openById(sheetId);
     const sheet = doc.getSheetByName(SHEET_NAME);
     if (!sheet) throw new Error(`No existe la pestaña "${SHEET_NAME}"`);
     return sheet;
   }

   function getFirebaseUser(authHeader) {
     if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
     const idToken = authHeader.substring(7);
     const apiKey = PropertiesService.getScriptProperties().getProperty('FIREBASE_API_KEY');
     if (!apiKey) throw new Error('Configura FIREBASE_API_KEY en las propiedades del script.');

     const response = UrlFetchApp.fetch(
       `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
       {
         method: 'post',
         contentType: 'application/json',
         payload: JSON.stringify({ idToken })
       }
     );

     const data = JSON.parse(response.getContentText());
     return data.users && data.users.length ? data.users[0] : null;
   }

   function doGet(e) {
     const sheetId = e.parameter.sheetId;
     if (!sheetId) return buildResponse({ error: 'sheetId requerido' });

     const sheet = getSheet(sheetId);
     const raw = sheet.getRange('A1').getValue();
     return buildResponse(raw || '{}');
   }

   function doPost(e) {
     const body = JSON.parse(e.postData.contents || '{}');
     const action = body.action;
     const sheetId = body.sheetId;
     const payload = body.payload;

     if (!action || !sheetId) {
       return buildResponse({ error: 'Petición incompleta' });
     }

     const headers = e.headers || {};
     const authHeader = headers.Authorization || headers.authorization || (e.parameter && e.parameter.Authorization);

     if (PROTECTED_METHODS.includes(action)) {
       const user = getFirebaseUser(authHeader);
       if (!user) return buildResponse({ error: 'No autorizado' });
     }

     if (action === 'write') {
       const sheet = getSheet(sheetId);
       sheet.getRange('A1').setValue(JSON.stringify(payload));
       return buildResponse({ status: 'ok' });
     }

     return buildResponse({ error: `Acción desconocida: ${action}` });
   }
   ```

3. En **Project Settings → Script properties** crea la clave
   `FIREBASE_API_KEY` con el mismo valor `apiKey` de tu configuración de
   Firebase. Así el script puede validar los `idToken`.

### 2.3 Publicar el Apps Script como aplicación web

1. Haz clic en el botón **Deploy** (en la esquina superior derecha) y elige
   **Test deployments**. En el panel lateral pulsa **Select type → Web app** y
   verifica que el campo **Sheet ID** esté lleno; luego haz clic en **Test**.
   Se abrirá una ventana con la URL temporal (termina en `/dev`). Ábrela para
   confirmar que devuelve el JSON almacenado en `A1`.
2. Cuando la prueba funcione, vuelve a **Deploy → New deployment**. Selecciona
   **Web app** como tipo, escribe una descripción y pulsa **Deploy**.
   - La primera vez Google te pedirá autorizar el script; sigue los pasos y
     acepta los permisos solicitados.
   - Configura **Execute as:** Tu usuario (para que use tus privilegios sobre
     la hoja).
   - Configura **Who has access:** *Anyone* (así cualquier visitante puede
     llamar al endpoint, pero el token de Firebase restringe las acciones de
     escritura).
3. Después del despliegue, copia la URL principal que termina en `/exec`; ese
   será el valor de `scriptUrl`.
4. Obtén el ID de la hoja desde la URL de Google Sheets (la cadena entre `/d/`
   y `/edit`).

### 2.4 Conectar la hoja con la aplicación

Actualiza `scripts/config.js` con los nuevos valores:

```js
window.APP_CONFIG = {
  firebase: {
    /* configuración de Firebase */
  },
  googleSheet: {
    scriptUrl: 'https://script.google.com/macros/s/AKfycb.../exec',
    sheetId: '1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890'
  },
  auth: {
    allowedEmails: ['admin@tuclub.com']
  }
};
```

## Paso 3. Probar la integración

1. Sirve el sitio de manera local, por ejemplo `python -m http.server 8000` en
   la raíz del proyecto.
2. Abre `http://localhost:8000/admin.html`, inicia sesión con Google y verifica
   que el banner muestre tu usuario.
3. Realiza un cambio en los logros de un jugador y pulsa **Guardar cambios**.
   Revisa en Google Sheets que la celda `A1` se haya actualizado.
4. Abre `index.html` y `stats.html` para confirmar que la lectura proviene de la
   hoja remota.

## Solución de problemas comunes

### Error «Error al cargar los datos. Failed to fetch»

Este mensaje indica que el navegador no pudo llegar al Apps Script indicado en
`googleSheet.scriptUrl`.

- Asegúrate de que la URL usada en `scriptUrl` sea la que termina en `/exec` del
  despliegue publicado como aplicación web.
- Comprueba que abriste el sitio desde un servidor (por ejemplo
  `python -m http.server 8000`); si lo cargas con `file://` el navegador puede
  bloquear las peticiones externas.
- Verifica en Apps Script que el despliegue esté activo, que el parámetro
  **Who has access** esté configurado como *Anyone* y que el proyecto tenga
  permisos sobre la hoja.
- Abre la URL del script en una pestaña aparte: si ves el JSON de la celda `A1`
  todo está funcionando; si aparece un error, corrígelo antes de volver al
  sitio.
- Revisa la consola del navegador para obtener el detalle técnico exacto (por
  ejemplo bloqueos de CORS o problemas de red).

## Recomendaciones de seguridad

- Nunca expongas tu `apiKey` ni la URL del Apps Script en repositorios públicos
  si la instancia es de producción. Usa variables de entorno o carga dinámica.
- Considera crear una segunda hoja o historial para versionar los cambios antes
  de sobreescribir `A1`.
- Si compartes la hoja con otras personas, limítate a permisos de lectura y usa
  copias de respaldo frecuentes.
