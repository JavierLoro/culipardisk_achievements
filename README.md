# Conectar la hoja de logros con Google Sheets sin Firebase

El sitio puede funcionar únicamente en modo lectura usando el archivo local
`logros.json`. Si quieres leer y escribir desde una hoja en Google Sheets, sigue
estos pasos para publicar un Google Apps Script que exponga un endpoint web
simple protegido con una clave compartida (`adminKey`).

## Requisitos previos

- Una cuenta de Google con acceso a Google Sheets y Google Apps Script.
- Permiso para desplegar Apps Scripts como aplicación web.
- El archivo `scripts/config.js` listo para editar (no subas claves reales al
  repositorio público).

## Paso 1. Preparar la hoja de cálculo

1. Crea una hoja en [Google Sheets](https://sheets.google.com/).
2. Renombra la pestaña principal a `Datos` (puedes usar otro nombre, pero
   recuerda actualizarlo en el script).
3. Copia el contenido completo de `logros.json` y pégalo en la celda `A1`. Todo
   el JSON se almacena en esa celda para mantener la estructura intacta.

## Paso 2. Crear el Apps Script

1. Desde la hoja, abre **Extensiones → Apps Script**.
2. Borra el contenido generado automáticamente y pega el siguiente código. Ajusta
   `SHEET_NAME` y la clave `ADMIN_KEY` según tus necesidades.

   ```javascript
   const SHEET_NAME = 'Datos';
   const ADMIN_KEY = 'clave123'; // Simple admin key replaces previous Firebase validation.

   function buildResponse(body) {
     const text = typeof body === 'string' ? body : JSON.stringify(body);
     return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
   }

   function getSheet(sheetId) {
     if (!sheetId) throw new Error('sheetId requerido');
     const doc = SpreadsheetApp.openById(sheetId);
     const sheet = doc.getSheetByName(SHEET_NAME);
     if (!sheet) throw new Error(`No existe la pestaña "${SHEET_NAME}"`);
     return sheet;
   }

   function readSheetData(sheetId) {
     const sheet = getSheet(sheetId);
     const raw = sheet.getRange('A1').getValue();
     try {
       return raw ? JSON.parse(raw) : {};
     } catch (error) {
       return raw || {};
     }
   }

   function doGet(e) {
     try {
       const sheetId = e.parameter.sheetId;
       const data = readSheetData(sheetId);
       return buildResponse(data);
     } catch (error) {
       return buildResponse({ error: error.message });
     }
   }

   function doPost(e) {
     try {
       const body = JSON.parse(e.postData.contents || '{}');
       const action = body.action;
       const sheetId = body.sheetId;

       if (!action || !sheetId) {
         return buildResponse({ error: 'Petición incompleta' });
       }

       if (action === 'read') {
         const data = readSheetData(sheetId);
         return buildResponse(data);
       }

       if (action === 'write') {
         if (body.adminKey !== ADMIN_KEY) {
           return buildResponse({ error: 'No autorizado' });
         }

         const sheet = getSheet(sheetId);
         sheet.getRange('A1').setValue(JSON.stringify(body.payload || {}));
         return buildResponse({ status: 'ok' });
       }

       return buildResponse({ error: `Acción desconocida: ${action}` });
     } catch (error) {
       return buildResponse({ error: error.message });
     }
   }
   ```

3. (Opcional) Guarda el archivo con un nombre descriptivo, por ejemplo
   `SheetConnector`.

## Paso 3. Publicar el Apps Script como aplicación web

1. Haz clic en **Deploy → Test deployments**. En el panel lateral elige
   **Select type → Web app** y completa los campos.
   - **Execute as:** tu cuenta (el script usará tus permisos sobre la hoja).
   - **Who has access:** *Anyone*. Así cualquier visitante puede leer y escribir
     usando la clave compartida.
2. Pulsa **Test**. Se abrirá una URL temporal (termina en `/dev`). Ábrela en una
   pestaña nueva y añade los parámetros `?action=read&sheetId=ID_DE_LA_HOJA` para
   confirmar que devuelve el JSON almacenado en `A1`.
3. Cuando la prueba funcione, vuelve a **Deploy → New deployment** y repite la
   configuración como **Web app**. Pulsa **Deploy**.
   - La primera vez Google te pedirá autorizar el script; sigue los pasos y
     acepta los permisos.
4. Copia la URL principal que termina en `/exec`; será el valor de `scriptUrl`.
5. Obtén el ID de la hoja desde la URL de Google Sheets (la cadena entre `/d/` y
   `/edit`).

## Paso 4. Conectar la hoja con la aplicación

Edita `scripts/config.js` con los nuevos valores:

```js
window.APP_CONFIG = {
  googleSheet: {
    scriptUrl: 'https://script.google.com/macros/s/AKfycb.../exec',
    sheetId: '1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890',
    adminKey: 'clave123'
  }
};
```

Guarda el archivo sin exponer claves reales en el repositorio.

## Paso 5. Probar la integración

1. Sirve el sitio de manera local (por ejemplo, `python -m http.server 8000`).
2. Abre `http://localhost:8000/index.html` y verifica que los datos se cargan
   desde la hoja.
3. Desde `admin.html`, realiza un cambio y pulsa **Guardar**. El sitio enviará
   una petición `POST` con la `adminKey`. Si todo está correcto, verás el estado
   `ok` en la consola del navegador.

## Solucionar «Error al cargar los datos. Failed to fetch»

Si aún ves este mensaje:

- Asegúrate de que `scriptUrl` apunta a la URL que termina en `/exec`.
- Comprueba que el despliegue está publicado como aplicación web con acceso
  abierto (*Anyone*).
- Verifica que tu hoja permite conexiones externas y que el Apps Script no está
  en modo borrador.
- Revisa la consola del navegador: si la respuesta contiene `{ error: 'No
  autorizado' }`, confirma que `adminKey` en `scripts/config.js` coincide con la
  del script.

## Recomendaciones de seguridad

- Usa una clave suficientemente difícil de adivinar y cámbiala periódicamente.
- Limita quién conoce la URL del Apps Script y considera añadir filtros
  adicionales (por ejemplo, comprobar direcciones IP) si la publicas en un sitio
  público.
- Evita compartir capturas donde se vea la clave o el ID de la hoja.
