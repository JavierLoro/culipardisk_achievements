class DataService {
  constructor(config) {
    this.config = config;
    this.cachedData = null;
  }

  get sheetConfig() {
    return this.config?.googleSheet || {};
  }

  isSheetConfigured() {
    const { scriptUrl, sheetId } = this.sheetConfig;
    return Boolean(scriptUrl && sheetId);
  }

  async fetchData() {
    if (this.cachedData) {
      return this.cachedData;
    }

    if (!this.isSheetConfigured()) {
      const response = await fetch('logros.json');
      if (!response.ok) {
        throw new Error('No se pudo cargar logros.json');
      }
      this.cachedData = await response.json();
      return this.cachedData;
    }

    const url = new URL(this.sheetConfig.scriptUrl);
    url.searchParams.set('action', 'read');
    url.searchParams.set('sheetId', this.sheetConfig.sheetId);

    let response;
    try {
      response = await fetch(url.toString());
    } catch (networkError) {
      throw this.createAppsScriptNetworkError(networkError);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error al cargar datos (${response.status}): ${text}`);
    }

    const payload = await response.json();
    if (payload && payload.error) {
      console.error('Error al leer datos desde Apps Script:', payload.error);
      throw new Error(payload.error);
    }
    this.cachedData = payload;
    return payload;
  }

  async saveData(updatedData) {
    if (!this.isSheetConfigured()) {
      throw new Error('La integración con Google Sheets no está configurada.');
    }

    const response = await fetch(this.sheetConfig.scriptUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'write',
        sheetId: this.sheetConfig.sheetId,
        payload: updatedData,
        adminKey: this.sheetConfig.adminKey || 'clave123' // Simple shared key gate replaces Firebase auth.
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error al guardar datos (${response.status}): ${text}`);
    }

    const result = await response.json();
    if (result && result.error) {
      console.error('Error al guardar datos en Apps Script:', result.error);
      throw new Error(result.error);
    }
    this.cachedData = updatedData;
    return result;
  }

  clearCache() {
    this.cachedData = null;
  }

  createAppsScriptNetworkError(error) {
    const hints = [
      'No se pudo conectar con el Apps Script publicado.',
      'Verifica que `googleSheet.scriptUrl` apunte a la URL de despliegue que termina en `/exec` y que el proyecto esté desplegado como aplicación web.',
      'Si estás abriendo el sitio directamente con `file://`, levanta un servidor local (por ejemplo `python -m http.server 8000`).',
      'Revisa en Google Apps Script que el despliegue esté activo y que la hoja acepte conexiones externas.'
    ];

    if (error?.message) {
      hints.push(`Detalle técnico: ${error.message}`);
    }

    return new Error(hints.join(' '));
  }
}

const dataService = new DataService(window.APP_CONFIG || {});

export default dataService;
export { DataService };
