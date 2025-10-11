/**
 * Configuración de la aplicación. Rellena estos valores para habilitar la
 * integración con Firebase Authentication y Google Sheets a través de un
 * Google Apps Script.
 *
 * Copia este archivo y ajusta los valores según tus credenciales. No subas
 * claves reales al repositorio público.
 */
window.APP_CONFIG = {
  /**
   * Configuración de Firebase. Si se deja como null, la aplicación
   * continuará funcionando en modo de solo lectura utilizando el archivo
   * local logros.json.
   */
  firebase: null,

  /**
   * Configuración del conector de Google Sheets. Debe apuntar a un Google
   * Apps Script desplegado como aplicación web que acepte peticiones GET
   * para lectura y POST para escritura.
   */
  googleSheet: {
    scriptUrl: '',
    sheetId: ''
  },

  /**
   * Opciones adicionales para el flujo de autenticación. Puedes limitar el
   * acceso al panel de administración a determinados correos.
   */
  auth: {
    allowedEmails: []
  }
};
