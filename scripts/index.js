import dataService from './data-service.js';

function showTooltip(event, text) {
  const tooltip = document.getElementById('floatingTooltip');
  tooltip.innerHTML = text;
  tooltip.style.display = 'block';
  updateTooltipPosition(event);
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('floatingTooltip');
  const x = event.clientX;
  const y = event.clientY;

  let tooltipX = x + 10;
  let tooltipY = y - tooltip.offsetHeight - 10;

  if (tooltipY < 10) {
    tooltipY = y + 20;
  }

  if (tooltipX + tooltip.offsetWidth > window.innerWidth - 10) {
    tooltipX = x - tooltip.offsetWidth - 10;
  }

  if (tooltipX < 10) {
    tooltipX = 10;
  }

  tooltip.style.left = `${tooltipX}px`;
  tooltip.style.top = `${tooltipY}px`;
}

function hideTooltip() {
  const tooltip = document.getElementById('floatingTooltip');
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}

window.showTooltip = showTooltip;
window.hideTooltip = hideTooltip;
window.updateTooltipPosition = updateTooltipPosition;

document.addEventListener('mousemove', (event) => {
  const tooltip = document.getElementById('floatingTooltip');
  if (tooltip?.style.display === 'block') {
    updateTooltipPosition(event);
  }
});

class AchievementSystem {
  constructor() {
    this.data = null;
    this.init();
  }

  async init() {
    try {
      const data = await dataService.fetchData();
      this.data = data;
      this.render();
      this.hideLoading();
      this.renderStats();
    } catch (error) {
      console.error(error);
      this.showError(`Error al cargar los datos: ${error.message}`);
    }
  }

  getHighestProgressiveAchievements(jugador) {
    const progresivos = {};

    if (!this.data?.logrosProgresivos) {
      return progresivos;
    }

    this.data.logrosProgresivos.forEach((grupo) => {
      let highestLevel = 0;
      let highestAchievement = null;

      grupo.niveles.forEach((nivel) => {
        if (jugador.logrosDesbloqueados.includes(nivel.id) && nivel.nivel > highestLevel) {
          highestLevel = nivel.nivel;
          highestAchievement = nivel;
        }
      });

      if (!highestAchievement) {
        highestAchievement = grupo.niveles[0];
      }

      progresivos[grupo.grupo] = {
        achievement: highestAchievement,
        unlocked: jugador.logrosDesbloqueados.includes(highestAchievement.id),
        nextLevel: highestLevel < grupo.niveles.length ? grupo.niveles[highestLevel] : null
      };
    });

    return progresivos;
  }

  getPlayerPoints(jugador) {
    let totalPoints = 0;
    const config = this.data?.configuracion?.valoresPorDefecto || {
      publico: 10,
      especial: 25,
      secreto: 15,
      progresivo_nivel1: 5,
      progresivo_nivel2: 10,
      progresivo_nivel3: 20,
      progresivo_nivel4: 30
    };

    jugador.logrosDesbloqueados.forEach((logroId) => {
      const logro = this.data.logros.find((l) => l.id === logroId);
      if (logro) {
        totalPoints += logro.valor || config[logro.tipo] || 10;
      }

      if (this.data.logrosProgresivos) {
        this.data.logrosProgresivos.forEach((grupo) => {
          const nivel = grupo.niveles.find((n) => n.id === logroId);
          if (nivel) {
            totalPoints += nivel.valor || config[`progresivo_nivel${nivel.nivel}`] || 5;
          }
        });
      }
    });

    return totalPoints;
  }

  render() {
    const playersList = document.getElementById('playersList');
    if (!playersList) return;

    let html = '';
    const jugadoresOrdenados = [...this.data.jugadores].sort((a, b) => this.getPlayerPoints(b) - this.getPlayerPoints(a));

    jugadoresOrdenados.forEach((jugador, index) => {
      const animationDelay = index * 0.1;
      const isLeader = index === 0 && jugador.logrosDesbloqueados.length > 0;
      const points = this.getPlayerPoints(jugador);

      html += `
        <div class="player-card ${isLeader ? 'leader' : ''}" style="animation-delay: ${animationDelay}s">
          <div class="player-header">
            <div class="player-info">
              <h3 class="player-name">${jugador.nombre} - ${points} pts</h3>
              ${isLeader ? '<span class="leader-badge">👑</span>' : ''}
            </div>
            <span class="achievement-count">${jugador.logrosDesbloqueados.length}/${this.data.logros.length}</span>
          </div>
          <div class="achievements-scroll-wrapper">
            <div class="achievements-scroll-outer">
              <div class="achievements-scroll-container">
                <div class="achievements-grid">
                  ${this.renderPlayerAchievements(jugador)}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    playersList.innerHTML = html;
  }

  getTotalUniqueAchievements() {
    let total = this.data?.logros?.length || 0;
    if (this.data?.logrosProgresivos) {
      total += this.data.logrosProgresivos.length;
    }
    return total;
  }

  renderPlayerAchievements(jugador) {
    let achievementsHTML = '';

    const publicosDesbloqueados = [];
    const especialesDesbloqueados = [];
    const secretosDesbloqueados = [];
    const publicosBloqueados = [];
    const especialesBloqueados = [];
    const secretosBloqueados = [];

    this.data.logros.forEach((logro) => {
      const isUnlocked = jugador.logrosDesbloqueados.includes(logro.id);

      if (logro.tipo === 'secreto') {
        if (isUnlocked) {
          secretosDesbloqueados.push(logro);
        } else {
          secretosBloqueados.push(logro);
        }
      } else if (logro.tipo === 'especial') {
        if (isUnlocked) {
          especialesDesbloqueados.push(logro);
        } else {
          especialesBloqueados.push(logro);
        }
      } else {
        if (isUnlocked) {
          publicosDesbloqueados.push(logro);
        } else {
          publicosBloqueados.push(logro);
        }
      }
    });

    const progresivos = this.getHighestProgressiveAchievements(jugador);
    const progresivosArray = Object.values(progresivos);
    const progresivosDesbloqueados = progresivosArray.filter((p) => p.unlocked);
    const progresivosBloqueados = progresivosArray.filter((p) => !p.unlocked);

    [...publicosDesbloqueados, ...especialesDesbloqueados].forEach((logro) => {
      achievementsHTML += this.renderAchievement(logro, true);
    });

    secretosDesbloqueados.forEach((logro) => {
      achievementsHTML += this.renderAchievement(logro, true);
    });

    progresivosDesbloqueados.forEach((prog) => {
      achievementsHTML += this.renderProgressiveAchievement(prog.achievement, true, prog.nextLevel);
    });

    [...publicosBloqueados, ...especialesBloqueados].forEach((logro) => {
      achievementsHTML += this.renderAchievement(logro, false);
    });

    progresivosBloqueados.forEach((prog) => {
      achievementsHTML += this.renderProgressiveAchievement(prog.achievement, false, prog.nextLevel);
    });

    secretosBloqueados.forEach((logro) => {
      achievementsHTML += this.renderAchievement(logro, false);
    });

    return achievementsHTML;
  }

  renderAchievement(logro, isUnlocked) {
    let imgSrc;
    let tooltipText;
    let imgClass;
    let altText = logro.nombre;

    if (isUnlocked) {
      imgSrc = logro.imagenDesbloqueada;

      if (logro.tipo === 'especial') {
        imgClass = 'achievement-img special-unlocked';
        tooltipText = `<strong>${logro.nombre}</strong><br>${logro.descripcion}`;
      } else if (logro.tipo === 'publico') {
        imgClass = 'achievement-img unlocked';
        tooltipText = `<strong>${logro.nombre}</strong><br>${logro.descripcion}`;
      } else {
        imgClass = 'achievement-img unlocked';
        tooltipText = `<strong>${logro.descripcion}</strong>`;
      }
    } else {
      imgSrc = logro.imagenBloqueada;

      if (logro.tipo === 'especial') {
        imgClass = 'achievement-img special-locked';
        tooltipText = `<strong>${logro.nombre}</strong><br>${logro.descripcion}`;
      } else if (logro.tipo === 'secreto') {
        imgClass = 'achievement-img secret-locked';
        tooltipText = '<strong>Secreto</strong>';
        altText = 'Secreto';
      } else {
        imgClass = 'achievement-img locked';
        tooltipText = `<strong>${logro.nombre}</strong><br>${logro.descripcion}`;
      }
    }

    const safeTooltip = tooltipText.replace(/`/g, '\\`');

    return `
      <div class="achievement-cell" onmouseenter="showTooltip(event, \`${safeTooltip}\`)" onmouseleave="hideTooltip()">
        <img src="${imgSrc}" alt="${altText}" class="${imgClass}">
      </div>
    `;
  }

  renderProgressiveAchievement(logro, isUnlocked, nextLevel) {
    let imgSrc;
    let tooltipText;
    let imgClass;

    if (isUnlocked) {
      imgSrc = logro.imagenDesbloqueada;
      const levelIndicator = this.getLevelIndicator(logro.nivel);

      if (logro.tipo === 'especial') {
        imgClass = 'achievement-img unlocked progressive';
      } else {
        imgClass = 'achievement-img unlocked progressive';
      }

      tooltipText = `<strong>${logro.nombre} ${levelIndicator}</strong><br>${logro.descripcion}`;

      if (nextLevel) {
        tooltipText += `<br><em style="color:#ffd700;">Próximo: ${nextLevel.descripcion}</em>`;
      } else {
        tooltipText += `<br><em style="color:#4CAF50;">¡Nivel máximo alcanzado!</em>`;
      }
    } else {
      imgSrc = logro.imagenBloqueada;
      imgClass = 'achievement-img locked progressive';
      tooltipText = `<strong>${logro.nombre}</strong><br>${logro.descripcion}`;
    }

    const levelBadge = this.getLevelBadge(logro.nivel, isUnlocked);

    return `
      <div class="achievement-cell progressive-cell"
        onmouseenter='showTooltip(event, ${JSON.stringify(tooltipText)})'
        onmouseleave="hideTooltip()">
        <div class="achievement-wrapper">
          <img src="${imgSrc}" alt="${logro.nombre}" class="${imgClass}">
          ${levelBadge}
        </div>
      </div>
    `;
  }

  getLevelIndicator(level) {
    const indicators = ['', '🥉', '🥈', '🥇', '💎'];
    return indicators[level] || '';
  }

  getLevelBadge(level, isUnlocked) {
    if (!isUnlocked) return '';

    const badges = {
      1: '<span class="level-badge bronze">I</span>',
      2: '<span class="level-badge silver">II</span>',
      3: '<span class="level-badge gold">III</span>',
      4: '<span class="level-badge diamond">IV</span>'
    };

    return badges[level] || '';
  }

  renderStats() {
    const statsDiv = document.getElementById('stats');
    if (!statsDiv) return;

    const totalJugadores = this.data.jugadores.filter((j) => j.logrosDesbloqueados.includes('socio')).length;
    const totalUniqueAchievements = this.getTotalUniqueAchievements();

    const logrosSecretos = this.data.logros.filter((l) => l.tipo === 'secreto');
    const secretosDesbloqueados = new Set();

    this.data.jugadores.forEach((jugador) => {
      jugador.logrosDesbloqueados.forEach((logroId) => {
        const logro = this.data.logros.find((l) => l.id === logroId);
        if (logro && logro.tipo === 'secreto') {
          secretosDesbloqueados.add(logroId);
        }
      });
    });

    let puntosTotales = 0;
    this.data.jugadores.forEach((jugador) => {
      puntosTotales += this.getPlayerPoints(jugador);
    });

    statsDiv.innerHTML = `
      <div class="stat-card fade-in">
        <div class="stat-number">${totalJugadores}</div>
        <div class="stat-label">Socios</div>
      </div>
      <div class="stat-card fade-in" style="animation-delay: 0.1s;">
        <div class="stat-number">${totalUniqueAchievements}</div>
        <div class="stat-label">Total logros</div>
      </div>
      <div class="stat-card fade-in" style="animation-delay: 0.2s;">
        <div class="stat-number">${secretosDesbloqueados.size}/${logrosSecretos.length}</div>
        <div class="stat-label">Secretos revelados</div>
      </div>
      <div class="stat-card fade-in" style="animation-delay: 0.3s;">
        <div class="stat-number">${puntosTotales}</div>
        <div class="stat-label">Puntos totales</div>
      </div>
    `;
  }

  hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }

  showError(message) {
    this.hideLoading();
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AchievementSystem();
});
