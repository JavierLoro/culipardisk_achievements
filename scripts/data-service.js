import { getAuthToken, isAuthConfigured } from './firebase-auth.js';

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

    const headers = new Headers();
    if (isAuthConfigured()) {
      const token = await getAuthToken();
      if (token) {
        headers.append('Authorization', `Bearer ${token}`);
      }
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error al cargar datos (${response.status}): ${text}`);
    }

    const payload = await response.json();
    this.cachedData = payload;
    return payload;
  }

  async saveData(updatedData) {
    if (!this.isSheetConfigured()) {
      throw new Error('La integración con Google Sheets no está configurada.');
    }

    const token = await getAuthToken(true);
    if (!token) {
      throw new Error('Debes iniciar sesión para guardar cambios.');
    }

    const response = await fetch(this.sheetConfig.scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'write',
        sheetId: this.sheetConfig.sheetId,
        payload: updatedData
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error al guardar datos (${response.status}): ${text}`);
    }

    const result = await response.json();
    this.cachedData = updatedData;
    return result;
  }

  clearCache() {
    this.cachedData = null;
  }
}

const dataService = new DataService(window.APP_CONFIG || {});

export default dataService;
export { DataService };
