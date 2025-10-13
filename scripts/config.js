/**
 * Configuración de la aplicación. Ajusta estos valores para conectar el sitio
 * con tu Apps Script de Google Sheets protegido por una adminKey.
 *
 * Copia este archivo y rellena los campos antes de desplegar en producción.
 */
window.APP_CONFIG = {
  /**
   * Configuración del conector de Google Sheets. Debe apuntar a un Google
   * Apps Script desplegado como aplicación web que acepte peticiones GET para
   * lectura y POST para escritura.
   */
  googleSheet: {
    scriptUrl: '',
    sheetId: '',
    adminKey: 'clave123'
  }
};
