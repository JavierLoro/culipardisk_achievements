import dataService from './data-service.js';
import {
  onAuthStateChange,
  signInWithGoogle,
  signOutUser,
  isAuthConfigured
} from './firebase-auth.js';

let logrosData = null;
let changes = {};
let isSaving = false;
let authUser = null;

const elements = {};

function cacheElements() {
  elements.playersList = document.getElementById('playersList');
  elements.statsSummary = document.getElementById('statsSummary');
  elements.saveBtn = document.getElementById('saveBtn');
  elements.searchInput = document.getElementById('searchPlayer');
  elements.authBanner = document.getElementById('authBanner');
  elements.authMessage = document.getElementById('authMessage');
  elements.authButton = document.getElementById('authButton');
}

function setupSearch() {
  if (!elements.searchInput) return;

  elements.searchInput.addEventListener('input', (event) => {
    const search = event.target.value.toLowerCase();
    document.querySelectorAll('.player-admin-card').forEach((card) => {
      const playerName = card.dataset.player;
      card.style.display = playerName.includes(search) ? 'block' : 'none';
    });
  });
}

function updateSaveButtonState() {
  if (!elements.saveBtn) return;

  const hasChanges = Object.keys(changes).length > 0;
  elements.saveBtn.classList.toggle('has-changes', hasChanges);
  const requiresLogin = isAuthConfigured();
  elements.saveBtn.disabled = !hasChanges || isSaving || (requiresLogin && !authUser);
}

function updateAuthBanner() {
  if (!elements.authBanner) return;

  if (!isAuthConfigured()) {
    elements.authBanner.style.display = 'block';
    elements.authBanner.classList.remove('warning');
    if (dataService.isSheetConfigured()) {
      elements.authMessage.textContent = 'Guardado habilitado mediante adminKey definida en scripts/config.js.';
    } else {
      elements.authMessage.textContent = 'Modo lectura: edita el archivo logros.json para actualizar los datos.';
    }
    elements.authButton.textContent = 'Autenticación desactivada';
    elements.authButton.classList.add('secondary');
    elements.authButton.disabled = true;
    return;
  }

  elements.authBanner.style.display = 'flex';
  if (authUser) {
    elements.authBanner.classList.remove('warning');
    elements.authMessage.innerHTML = `Sesión iniciada como <strong>${authUser.displayName || authUser.email}</strong>`;
    elements.authButton.textContent = 'Cerrar sesión';
    elements.authButton.classList.add('secondary');
    elements.authButton.disabled = false;
  } else {
    elements.authBanner.classList.add('warning');
    elements.authMessage.textContent = 'Para editar los logros inicia sesión con Google.';
    elements.authButton.textContent = 'Iniciar sesión';
    elements.authButton.classList.remove('secondary');
    elements.authButton.disabled = false;
  }
}

function setupAuthButton() {
  if (!elements.authButton) return;

  elements.authButton.addEventListener('click', async () => {
    if (!isAuthConfigured()) return;

    try {
      if (authUser) {
        await signOutUser();
      } else {
        await signInWithGoogle();
      }
    } catch (error) {
      alert(`Error de autenticación: ${error.message}`);
    }
  });
}

async function loadAdminPanel() {
  if (!elements.playersList) return;

  elements.playersList.innerHTML = '<div class="loading">Cargando datos...</div>';

  try {
    logrosData = await dataService.fetchData();
    changes = {};
    renderStatsSummary();
    renderPlayers();
  } catch (error) {
    console.error('Error cargando datos:', error);
    elements.playersList.innerHTML = `
      <div class="error">
        Error al cargar los datos.<br>
        <small>${error.message}</small>
      </div>
    `;
  }
}

function renderStatsSummary() {
  if (!logrosData || !elements.statsSummary) return;

  const totalPlayers = logrosData.jugadores.length;
  const totalAchievements = logrosData.logros.length +
    (logrosData.logrosProgresivos ?
      logrosData.logrosProgresivos.reduce((sum, group) => sum + group.niveles.length, 0) : 0);

  let totalUnlocked = 0;
  let playersWithAchievements = 0;

  logrosData.jugadores.forEach((player) => {
    if (player.logrosDesbloqueados.length > 0) {
      playersWithAchievements += 1;
      totalUnlocked += player.logrosDesbloqueados.length;
    }
  });

  elements.statsSummary.innerHTML = `
    <div class="stat-box">
      <div class="stat-value">${totalPlayers}</div>
      <div class="stat-label">Jugadores Totales</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${playersWithAchievements}</div>
      <div class="stat-label">Jugadores con Logros</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${totalAchievements}</div>
      <div class="stat-label">Logros Disponibles</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${totalUnlocked}</div>
      <div class="stat-label">Logros Desbloqueados</div>
    </div>
  `;
}

function renderPlayers() {
  if (!logrosData || !elements.playersList) return;

  let html = '';
  const sortedPlayers = [...logrosData.jugadores].sort((a, b) => a.nombre.localeCompare(b.nombre));

  sortedPlayers.forEach((player, index) => {
    const points = calculatePlayerPoints(player);
    html += `
      <div class="player-admin-card" data-player="${player.nombre.toLowerCase()}">
        <div class="player-admin-header">
          <span class="player-admin-name">${player.nombre}</span>
          <span class="player-points">${points} puntos</span>
        </div>
        <div class="achievements-checkboxes">
          ${renderAchievementCheckboxes(player, index)}
        </div>
      </div>
    `;
  });

  elements.playersList.innerHTML = html;
  updateSaveButtonState();
}

function renderAchievementCheckboxes(player, playerIndex) {
  let html = '';

  logrosData.logros.forEach((achievement) => {
    const isChecked = player.logrosDesbloqueados.includes(achievement.id);
    const typeClass = `type-${achievement.tipo}`;
    const displayName = achievement.tipo === 'secreto' && achievement.nombre === '???'
      ? `Secreto: ${achievement.descripcion}`
      : achievement.nombre;

    html += `
      <div class="achievement-checkbox">
        <input type="checkbox"
          id="${playerIndex}_${achievement.id}"
          ${isChecked ? 'checked' : ''}
          onchange="toggleAchievement('${player.nombre}', '${achievement.id}', this)">
        <label for="${playerIndex}_${achievement.id}">
          <span title="${achievement.descripcion}">${displayName}</span>
          <span class="achievement-type ${typeClass}">${achievement.tipo}</span>
        </label>
      </div>
    `;
  });

  if (logrosData.logrosProgresivos) {
    logrosData.logrosProgresivos.forEach((group) => {
      group.niveles.forEach((level) => {
        const isChecked = player.logrosDesbloqueados.includes(level.id);

        html += `
          <div class="achievement-checkbox">
            <input type="checkbox"
              id="${playerIndex}_${level.id}"
              ${isChecked ? 'checked' : ''}
              onchange="toggleAchievement('${player.nombre}', '${level.id}', this)">
            <label for="${playerIndex}_${level.id}">
              <span title="${level.descripcion}">${level.nombre}</span>
              <span class="achievement-type type-progresivo">Nivel ${level.nivel}</span>
            </label>
          </div>
        `;
      });
    });
  }

  return html;
}

function calculatePlayerPoints(player) {
  let points = 0;
  const config = logrosData.configuracion?.valoresPorDefecto || {
    publico: 10,
    especial: 25,
    secreto: 15,
    progresivo_nivel1: 5,
    progresivo_nivel2: 10,
    progresivo_nivel3: 20,
    progresivo_nivel4: 30
  };

  player.logrosDesbloqueados.forEach((achievementId) => {
    const achievement = logrosData.logros.find((a) => a.id === achievementId);
    if (achievement) {
      points += achievement.valor || config[achievement.tipo] || 10;
    }

    if (logrosData.logrosProgresivos) {
      logrosData.logrosProgresivos.forEach((group) => {
        const level = group.niveles.find((l) => l.id === achievementId);
        if (level) {
          points += level.valor || config[`progresivo_nivel${level.nivel}`] || 5;
        }
      });
    }
  });

  return points;
}

function toggleAchievement(playerName, achievementId, checkboxElement) {
  const isChecked = checkboxElement.checked;

  if (isAuthConfigured() && !authUser) {
    checkboxElement.checked = !isChecked;
    alert('Debes iniciar sesión para editar logros.');
    return;
  }

  if (!changes[playerName]) {
    const player = logrosData.jugadores.find((p) => p.nombre === playerName);
    changes[playerName] = [...player.logrosDesbloqueados];
  }

  if (isChecked) {
    if (!changes[playerName].includes(achievementId)) {
      changes[playerName].push(achievementId);
    }
  } else {
    changes[playerName] = changes[playerName].filter((id) => id !== achievementId);
  }

  updateSaveButtonState();
}

async function saveChanges() {
  if (isAuthConfigured() && !authUser) {
    alert('Debes iniciar sesión para guardar cambios.');
    return;
  }

  if (Object.keys(changes).length === 0) {
    alert('No hay cambios para guardar');
    return;
  }

  Object.keys(changes).forEach((playerName) => {
    const player = logrosData.jugadores.find((p) => p.nombre === playerName);
    if (player) {
      player.logrosDesbloqueados = changes[playerName];
    }
  });

  isSaving = true;
  updateSaveButtonState();

  try {
    await dataService.saveData(logrosData);
    alert('✅ Cambios guardados en Google Sheets');
    changes = {};
    updateSaveButtonState();
    renderStatsSummary();
    renderPlayers();
  } catch (error) {
    console.error('Error guardando datos:', error);
    alert(`Error al guardar datos: ${error.message}`);
  } finally {
    isSaving = false;
    updateSaveButtonState();
  }
}

function exportData() {
  if (!logrosData) {
    alert('Aún no hay datos cargados.');
    return;
  }

  const date = new Date().toISOString().split('T')[0];
  const jsonStr = JSON.stringify(logrosData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `logros_backup_${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function initialize() {
  cacheElements();
  setupSearch();
  setupAuthButton();
  updateAuthBanner();

  if (!isAuthConfigured()) {
    loadAdminPanel();
  }

  onAuthStateChange((user) => {
    authUser = user;
    updateAuthBanner();
    updateSaveButtonState();

    if (user) {
      loadAdminPanel();
    } else if (isAuthConfigured()) {
      logrosData = null;
      dataService.clearCache();
      elements.playersList.innerHTML = '<div class="loading">Inicia sesión para ver y editar los logros.</div>';
    }
  });
}

document.addEventListener('DOMContentLoaded', initialize);

window.toggleAchievement = toggleAchievement;
window.saveChanges = saveChanges;
window.exportData = exportData;
window.calculatePlayerPoints = calculatePlayerPoints;
window.loadAdminPanel = loadAdminPanel;
