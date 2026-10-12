import { USER_DEFAULTS } from '../store/userStore.js'
import { GRID_SIZE } from '../terrain/terrain.js'

const FIELD_IDS = [
  'seed',
  'scale',
  'octaves',
  'persistence',
  'lacunarity',
  'amplitude',
  'warp',
  'waterLevel',
  'hydrometry',
  'pollution',
  'cloudAltitude',
  'cloudCoverage',
  'wireframe',
]

/**
 * @param {string} id
 */
function $(id) {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Missing #${id}`)
  return el
}

function readNumber(id, fallback) {
  const value = Number($(id).value)
  return Number.isFinite(value) ? value : fallback
}

export class UiManager {
  /**
   * @param {{
   *   onRebuild: () => void,
   *   onRandomSeed: () => void,
   *   onReset: () => void,
   *   onTogglePanel: () => void,
   *   onToggleMute: () => void,
   * }} handlers
   */
  constructor(handlers) {
    this.handlers = handlers
    this.panel = $('properties-panel')
    this.toggle = $('toggle-panel')
    this.muteBtn = $('toggle-mute')
    this.stats = $('stats')
  }

  bind() {
    let debounceId = 0
    const scheduleRebuild = () => {
      this.syncLabels()
      window.clearTimeout(debounceId)
      debounceId = window.setTimeout(() => this.handlers.onRebuild(), 60)
    }
    for (const id of FIELD_IDS) {
      $(id).addEventListener('input', scheduleRebuild)
    }
    this.toggle.addEventListener('click', () => this.handlers.onTogglePanel())
    this.muteBtn.addEventListener('click', () => this.handlers.onToggleMute())
    $('random-seed').addEventListener('click', () => this.handlers.onRandomSeed())
    $('reset').addEventListener('click', () => this.handlers.onReset())
  }

  readWorldOptions() {
    return {
      size: GRID_SIZE,
      seed: Math.trunc(readNumber('seed', USER_DEFAULTS.seed)),
      scale: readNumber('scale', USER_DEFAULTS.scale),
      octaves: Math.round(readNumber('octaves', USER_DEFAULTS.octaves)),
      persistence: readNumber('persistence', USER_DEFAULTS.persistence),
      lacunarity: readNumber('lacunarity', USER_DEFAULTS.lacunarity),
      amplitude: readNumber('amplitude', USER_DEFAULTS.amplitude),
      warp: readNumber('warp', USER_DEFAULTS.warp),
      waterLevel: readNumber('waterLevel', USER_DEFAULTS.waterLevel),
      hydrometry: readNumber('hydrometry', USER_DEFAULTS.hydrometry),
      pollution: readNumber('pollution', USER_DEFAULTS.pollution),
      cloudAltitude: readNumber('cloudAltitude', USER_DEFAULTS.cloudAltitude),
      cloudCoverage: readNumber('cloudCoverage', USER_DEFAULTS.cloudCoverage),
      wireframe: $('wireframe').checked,
    }
  }

  /**
   * @param {import('../store/userStore.js').UserData} data
   */
  applyUserData(data) {
    $('seed').value = String(data.seed)
    $('scale').value = String(data.scale)
    $('octaves').value = String(data.octaves)
    $('persistence').value = String(data.persistence)
    $('lacunarity').value = String(data.lacunarity)
    $('amplitude').value = String(data.amplitude)
    $('warp').value = String(data.warp)
    $('waterLevel').value = String(data.waterLevel)
    $('hydrometry').value = String(data.hydrometry)
    $('pollution').value = String(data.pollution)
    $('cloudAltitude').value = String(data.cloudAltitude)
    $('cloudCoverage').value = String(data.cloudCoverage)
    $('wireframe').checked = data.wireframe
    this.setCollapsed(Boolean(data.panelCollapsed))
    this.setMuted(Boolean(data.muted))
    this.syncLabels()
  }

  setCollapsed(collapsed) {
    this.panel.classList.toggle('is-collapsed', collapsed)
    this.toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true')
    this.toggle.textContent = collapsed ? 'Propriétés' : 'Réduire'
    this.toggle.title = collapsed ? 'Ouvrir les propriétés' : 'Réduire le panneau'
  }

  isCollapsed() {
    return this.panel.classList.contains('is-collapsed')
  }

  toggleCollapsed() {
    this.setCollapsed(!this.isCollapsed())
  }

  setMuted(muted) {
    this.muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false')
    this.muteBtn.textContent = muted ? 'Son off' : 'Son'
    this.muteBtn.title = muted ? 'Activer le son' : 'Couper le son'
  }

  setRandomSeed() {
    $('seed').value = String(Math.floor(Math.random() * 1_000_000))
    this.syncLabels()
  }

  toggleWireframe() {
    $('wireframe').checked = !$('wireframe').checked
  }

  /**
   * @param {{
   *   size: number,
   *   min: number,
   *   max: number,
   *   triangleCount: number,
   *   seed: number,
   *   soilCounts?: { rock: number, earth: number, vegetation: number, land: number },
   * }} stats
   */
  setStats(stats) {
    const parts = [
      `Grille ${stats.size}×${stats.size}`,
      `${stats.triangleCount.toLocaleString('fr-FR')} triangles`,
      `graine ${stats.seed}`,
      `relief ${stats.min.toFixed(1)}–${stats.max.toFixed(1)}`,
    ]
    if (stats.soilCounts && stats.soilCounts.land > 0) {
      const { rock, earth, vegetation, land } = stats.soilCounts
      const pct = (n) => `${Math.round((n / land) * 100)}%`
      parts.push(`roche ${pct(rock)} · terre ${pct(earth)} · végét. ${pct(vegetation)}`)
    }
    this.stats.textContent = parts.join(' · ')
  }

  syncLabels() {
    const options = this.readWorldOptions()
    $('scale-value').textContent = options.scale.toFixed(0)
    $('octaves-value').textContent = String(options.octaves)
    $('persistence-value').textContent = options.persistence.toFixed(2)
    $('lacunarity-value').textContent = options.lacunarity.toFixed(2)
    $('amplitude-value').textContent = options.amplitude.toFixed(0)
    $('warp-value').textContent = options.warp.toFixed(2)
    $('water-value').textContent = `${Math.round(options.waterLevel * 100)}%`
    $('hydrometry-value').textContent = `${Math.round(options.hydrometry * 100)}%`
    $('pollution-value').textContent = `${Math.round(options.pollution * 100)}%`
    $('cloud-altitude-value').textContent = String(options.cloudAltitude)
    $('cloud-coverage-value').textContent = `${Math.round(options.cloudCoverage * 100)}%`
  }
}
