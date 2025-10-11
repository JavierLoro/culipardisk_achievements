import dataService from './data-service.js';

let statsData = {
  jugadores: {}
};

const achievementRequirements = {
  'puntual': { stat: 'puntual', required: 20, name: 'Puntual' },
  'llueva_truene': { stat: 'lluvia', required: 3, name: 'Llueva o Truene' },
  'as_calentamiento': { stat: 'calentamiento', required: 5, name: 'As del Calentamiento' },
  'as_estiramiento': { stat: 'estiramiento', required: 5, name: 'As de Estiramiento' },
  'content_creator': { stat: 'contenido', required: 5, name: 'Content Creator' },
  'promotor': { stat: 'eventos', required: 3, name: 'Promotor' },
  'primer_comentario': { stat: 'primero', required: 5, name: 'Madrugador (Secreto)' },
  'asistencia5': { stat: 'entrenamientos', required: 5, name: 'Asistencia Bronce' },
  'asistencia10': { stat: 'entrenamientos', required: 10, name: 'Asistencia Plata' },
  'asistencia20': { stat: 'entrenamientos', required: 20, name: 'Asistencia Oro' },
  'asistencia50': { stat: 'entrenamientos', required: 50, name: 'Asistencia Diamante' },
  'reclutador1': { stat: 'invitados', required: 1, name: 'Reclutador Bronce' },
  'reclutador3': { stat: 'invitados', required: 3, name: 'Reclutador Plata' },
  'reclutador5': { stat: 'invitados', required: 5, name: 'Reclutador Oro' },
  'reclutador10': { stat: 'invitados', required: 10, name: 'Reclutador Diamante' },
  'reportero3': { stat: 'fotos', required: 3, name: 'Reportero Bronce' },
  'reportero10': { stat: 'fotos', required: 10, name: 'Reportero Plata' },
  'reportero25': { stat: 'fotos', required: 25, name: 'Reportero Oro' },
  'reportero50': { stat: 'fotos', required: 50, name: 'Reportero Diamante' }
};

let currentPlayer = null;
let logrosData = null;

async function initialize() {
  await loadLogrosData();
  loadStats();
  populatePlayerSelect();
}

async function loadLogrosData() {
  try {
    logrosData = await dataService.fetchData();
  } catch (error) {
    console.error('Error cargando logros:', error);
    const notification = document.getElementById('notification');
    if (notification) {
      notification.textContent = 'Error al cargar logros. Revisa la configuración.';
      notification.style.display = 'block';
      notification.style.background = '#ff6b6b';
    }
  }
}

function resetPlayerStats() {
  if (confirm('⚠️ ¿Seguro que quieres borrar TODAS las estadísticas?\n\nEsta acción no se puede deshacer.')) {
    exportStats();
    localStorage.removeItem('playerStats');
    statsData = { jugadores: {} };
    loadStats();
    alert('✅ Estadísticas borradas. Se ha descargado un backup por seguridad.');
    location.reload();
  }
}

function resetPlayer(playerName) {
  if (confirm(`¿Borrar estadísticas de ${playerName}?`)) {
    delete statsData.jugadores[playerName];
    localStorage.setItem('playerStats', JSON.stringify(statsData));
    updatePlayerDisplay();
  }
}

function loadStats() {
  const saved = localStorage.getItem('playerStats');
  if (saved) {
    statsData = JSON.parse(saved);
  }

  if (logrosData) {
    logrosData.jugadores.forEach((player) => {
      if (!statsData.jugadores[player.nombre]) {
        statsData.jugadores[player.nombre] = {
          entrenamientos: 0,
          puntual: 0,
          primero: 0,
          lluvia: 0,
          calentamiento: 0,
          estiramiento: 0,
          contenido: 0,
          invitados: 0,
          eventos: 0,
          fotos: 0
        };
      }
    });
  }
}

function populatePlayerSelect() {
  const select = document.getElementById('playerSelect');
  if (!select) return;

  select.innerHTML = '<option value="">Selecciona un jugador...</option>';

  if (logrosData) {
    const sortedPlayers = [...logrosData.jugadores].sort((a, b) => a.nombre.localeCompare(b.nombre));
    sortedPlayers.forEach((player) => {
      const option = document.createElement('option');
      option.value = player.nombre;
      option.textContent = player.nombre;
      select.appendChild(option);
    });
  }
}

function selectPlayer() {
  const select = document.getElementById('playerSelect');
  if (!select) return;

  const playerName = select.value;
  if (!playerName) {
    document.getElementById('playerContent').style.display = 'none';
    return;
  }

  currentPlayer = playerName;
  document.getElementById('playerContent').style.display = 'block';
  document.getElementById('playerName').textContent = playerName;
  updatePlayerDisplay();
}

function updatePlayerDisplay() {
  if (!currentPlayer || !statsData.jugadores[currentPlayer]) return;

  const stats = statsData.jugadores[currentPlayer];
  Object.keys(stats).forEach((stat) => {
    const countEl = document.getElementById(`count_${stat}`);
    const statEl = document.getElementById(`stat_${stat}`);

    if (countEl) countEl.textContent = stats[stat];
    if (statEl) statEl.textContent = stats[stat];
  });

  updateAchievementProgress();
}

function addStat(statName, value) {
  if (!currentPlayer) {
    showNotification('⚠️ Selecciona un jugador primero', 'warning');
    return;
  }

  const stats = statsData.jugadores[currentPlayer];
  stats[statName] = Math.max(0, (stats[statName] || 0) + value);

  updatePlayerDisplay();
  checkUnlockedAchievements(statName);

  localStorage.setItem('playerStats', JSON.stringify(statsData));

  if (value > 0) {
    showNotification(`✅ +1 ${statName}`, 'success');
  }
}

function quickAction(action) {
  switch (action) {
    case 'training':
      addStat('entrenamientos', 1);
      break;
    case 'onTime':
      addStat('entrenamientos', 1);
      addStat('puntual', 1);
      break;
    case 'firstArrive':
      addStat('entrenamientos', 1);
      addStat('puntual', 1);
      addStat('primero', 1);
      break;
    case 'rain':
      addStat('entrenamientos', 1);
      addStat('lluvia', 1);
      break;
  }
}

function checkUnlockedAchievements(statName) {
  if (!currentPlayer || !logrosData) return;

  const stats = statsData.jugadores[currentPlayer];
  const player = logrosData.jugadores.find((p) => p.nombre === currentPlayer);
  if (!player) return;

  Object.keys(achievementRequirements).forEach((achievementId) => {
    const req = achievementRequirements[achievementId];
    if (req.stat === statName && stats[req.stat] >= req.required) {
      if (!player.logrosDesbloqueados.includes(achievementId)) {
        showNotification(`🏆 ¡${req.name} DESBLOQUEADO!`, 'achievement');
      }
    }
  });
}

function updateAchievementProgress() {
  if (!currentPlayer || !logrosData) return;

  const stats = statsData.jugadores[currentPlayer];
  const player = logrosData.jugadores.find((p) => p.nombre === currentPlayer);
  if (!player) return;

  let html = '';

  Object.keys(achievementRequirements).forEach((achievementId) => {
    const req = achievementRequirements[achievementId];
    const current = stats[req.stat] || 0;
    const progress = Math.min(100, (current / req.required) * 100);
    const isUnlocked = player.logrosDesbloqueados.includes(achievementId);

    const fillColor = isUnlocked ? '#4CAF50' : (progress === 100 ? '#FFC107' : 'linear-gradient(90deg, #2196F3 0%, #1976D2 100%)');

    html += `
      <div class="progress-item">
        <div class="progress-header">
          <span>${req.name}</span>
          <span>${current}/${req.required} ${isUnlocked ? '<span class="unlocked-badge">✓ Desbloqueado</span>' : ''}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%; background: ${fillColor}"></div>
        </div>
      </div>
    `;
  });

  const progressList = document.getElementById('progressList');
  if (progressList) {
    progressList.innerHTML = html;
  }
}

function saveStats() {
  localStorage.setItem('playerStats', JSON.stringify(statsData));
  const report = generateReport();

  const blob = new Blob([report], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `estadisticas_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showNotification('💾 Estadísticas guardadas', 'success');
}

function generateReport() {
  let report = 'REPORTE DE ESTADÍSTICAS\n';
  report += '========================\n\n';

  Object.keys(statsData.jugadores).forEach((playerName) => {
    const stats = statsData.jugadores[playerName];
    const player = logrosData?.jugadores.find((p) => p.nombre === playerName);

    report += `${playerName}\n`;
    report += '-'.repeat(playerName.length) + '\n';

    Object.keys(stats).forEach((stat) => {
      if (stats[stat] > 0) {
        report += `  ${stat}: ${stats[stat]}\n`;
      }
    });

    report += '\n  Logros listos para desbloquear:\n';
    Object.keys(achievementRequirements).forEach((achievementId) => {
      const req = achievementRequirements[achievementId];
      if (stats[req.stat] >= req.required && player && !player.logrosDesbloqueados.includes(achievementId)) {
        report += `    ✓ ${req.name}\n`;
      }
    });

    report += '\n';
  });

  return report;
}

function exportStats() {
  const jsonStr = JSON.stringify(statsData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `estadisticas_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  if (!notification) return;

  notification.textContent = message;
  notification.style.background = type === 'achievement' ? '#FFD700' :
    type === 'warning' ? '#FF9800' : '#4CAF50';
  notification.style.color = type === 'achievement' ? '#333' : 'white';
  notification.style.display = 'block';

  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
}

document.addEventListener('DOMContentLoaded', initialize);

window.resetPlayerStats = resetPlayerStats;
window.resetPlayer = resetPlayer;
window.selectPlayer = selectPlayer;
window.addStat = addStat;
window.quickAction = quickAction;
window.saveStats = saveStats;
window.exportStats = exportStats;
