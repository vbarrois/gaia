import { ACTIONS } from '../world/actions.js'
import { paintFieldImage } from '../world/colors.js'
import { ECO_GOAL } from '../world/config.js'
import { USER_DEFAULTS } from '../store/userStore.js'

const EDITOR_FIELDS = [
  'seed',
  'amplitude',
  'scale',
  'octaves',
  'persistence',
  'water',
  'falloff',
  'warp',
  'resolution',
  'pollution',
  'wireframe',
]

const OUTPUTS = {
  amplitude: 'out-amplitude',
  scale: 'out-scale',
  octaves: 'out-octaves',
  persistence: 'out-persistence',
  water: 'out-water',
  falloff: 'out-falloff',
  warp: 'out-warp',
  resolution: 'out-resolution',
  pollution: 'out-pollution',
  brush: 'out-brush',
}

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function byId(id) {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Missing #${id}`)
  return el
}

/** @param {string} id */
function inputEl(id) {
  return /** @type {HTMLInputElement} */ (byId(id))
}

/** @param {string} id */
function selectEl(id) {
  return /** @type {HTMLSelectElement} */ (byId(id))
}

function readNumber(id, fallback) {
  const value = +inputEl(id).value
  return value === value && value !== Infinity && value !== -Infinity ? value : fallback
}

export class UiManager {
  /**
   * @param {{
   *   onRebuild: () => void,
   *   onRandomSeed: () => void,
   *   onPreset: (name: string) => void,
   *   onCommit: () => void,
   *   onCancel: () => void,
   *   onEnterEditor: () => void,
   *   onToggleMute: () => void,
   *   onExport: () => void,
   *   onImportFile: (file: File) => void,
   *   onDefaults: () => void,
   *   onTool: (tool: string) => void,
   *   onBrush: (radius: number) => void,
   *   onSpeed: (speed: number) => void,
   *   onStepDay: () => void,
   *   onLayer: (layer: string) => void,
   *   onTopView: () => void,
   *   onResetView: () => void,
   *   onHelp: (open: boolean) => void,
   * }} handlers
   */
  constructor(handlers) {
    this.handlers = handlers
    this.muteBtn = byId('toggleMute')
    this.toastTimer = 0
    this._collapsed = false
  }

  bind() {
    let debounceId = 0
    const scheduleRebuild = () => {
      this.syncLabels()
      window.clearTimeout(debounceId)
      debounceId = window.setTimeout(() => this.handlers.onRebuild(), 60)
    }
    for (const id of EDITOR_FIELDS) {
      byId(id).addEventListener('input', scheduleRebuild)
    }
    this.muteBtn.addEventListener('click', () => this.handlers.onToggleMute())
    byId('randomSeed').addEventListener('click', () => this.handlers.onRandomSeed())
    byId('commitWorld').addEventListener('click', () => this.handlers.onCommit())
    byId('cancelEditor').addEventListener('click', () => this.handlers.onCancel())
    byId('editBtn').addEventListener('click', () => {
      if (document.body.classList.contains('editing')) this.handlers.onCancel()
      else this.handlers.onEnterEditor()
    })
    byId('gameEdit').addEventListener('click', () => this.handlers.onEnterEditor())
    byId('exportConfig').addEventListener('click', () => this.handlers.onExport())
    byId('importConfig').addEventListener('click', () => byId('configFile').click())
    byId('configFile').addEventListener('change', (event) => {
      const input = /** @type {HTMLInputElement} */ (event.target)
      const file = input.files?.[0]
      if (file) this.handlers.onImportFile(file)
      input.value = ''
    })
    byId('defaultConfig').addEventListener('click', () => this.handlers.onDefaults())
    document.querySelector('.presets')?.addEventListener('click', (event) => {
      const btn = event.target instanceof Element ? event.target.closest('[data-preset]') : null
      if (btn instanceof HTMLElement && btn.dataset.preset) {
        this.handlers.onPreset(btn.dataset.preset)
      }
    })
    byId('actionDock').addEventListener('click', (event) => {
      const btn = event.target instanceof Element ? event.target.closest('[data-action]') : null
      if (btn instanceof HTMLElement && btn.dataset.action) {
        this.handlers.onTool(btn.dataset.action)
      }
    })
    const onBrush = () => {
      this.syncLabels()
      const radius = readNumber('brush', 8)
      this.handlers.onBrush(radius)
      const mobile = document.getElementById('brushMobile')
      if (mobile instanceof HTMLInputElement) mobile.value = `${radius}`
    }
    byId('brush').addEventListener('input', onBrush)
    const brushMobile = document.getElementById('brushMobile')
    if (brushMobile) {
      brushMobile.addEventListener('input', () => {
        inputEl('brush').value = /** @type {HTMLInputElement} */ (brushMobile).value
        onBrush()
      })
    }
    document.querySelectorAll('[data-speed]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!(btn instanceof HTMLElement)) return
        if (btn.hasAttribute('data-step')) {
          this.handlers.onStepDay()
          return
        }
        this.handlers.onSpeed(+btn.dataset.speed)
      })
    })
    document.querySelectorAll('[data-step]').forEach((btn) => {
      btn.addEventListener('click', () => this.handlers.onStepDay())
    })
    byId('layer').addEventListener('change', () => this.handlers.onLayer(this.getLayer()))
    byId('topView').addEventListener('click', () => this.handlers.onTopView())
    byId('resetView').addEventListener('click', () => this.handlers.onResetView())
    byId('helpBtn').addEventListener('click', () => this.handlers.onHelp(true))
    byId('closeHelp').addEventListener('click', () => this.handlers.onHelp(false))
    byId('help').addEventListener('click', (event) => {
      if (event.target === byId('help')) this.handlers.onHelp(false)
    })
  }

  readWorldOptions() {
    return {
      seed: Math.trunc(readNumber('seed', USER_DEFAULTS.seed)),
      scale: readNumber('scale', USER_DEFAULTS.scale),
      octaves: Math.round(readNumber('octaves', USER_DEFAULTS.octaves)),
      persistence: readNumber('persistence', USER_DEFAULTS.persistence),
      amplitude: readNumber('amplitude', USER_DEFAULTS.amplitude),
      warp: readNumber('warp', USER_DEFAULTS.warp),
      water: readNumber('water', USER_DEFAULTS.water),
      falloff: readNumber('falloff', USER_DEFAULTS.falloff),
      resolution: readNumber('resolution', USER_DEFAULTS.resolution),
      pollution: readNumber('pollution', USER_DEFAULTS.pollution),
      wireframe: inputEl('wireframe').checked,
    }
  }

  /**
   * @param {import('../store/userStore.js').UserData | import('../world/config.js').WorldConfig} data
   */
  applyWorldConfig(data) {
    inputEl('seed').value = `${data.seed}`
    inputEl('scale').value = `${data.scale}`
    inputEl('octaves').value = `${data.octaves}`
    inputEl('persistence').value = `${data.persistence}`
    inputEl('amplitude').value = `${data.amplitude}`
    inputEl('warp').value = `${data.warp}`
    inputEl('water').value = `${data.water}`
    inputEl('falloff').value = `${data.falloff}`
    inputEl('resolution').value = `${data.resolution}`
    inputEl('pollution').value = `${data.pollution}`
    inputEl('wireframe').checked = !!data.wireframe
    if ('layer' in data && typeof data.layer === 'string') {
      selectEl('layer').value = data.layer
    }
    this.syncLabels()
    this.updateSeedLabel(data.seed)
  }

  /** @param {import('../store/userStore.js').UserData} data */
  applyUserData(data) {
    this.applyWorldConfig(data)
    this.setCollapsed(!!data.panelCollapsed)
    this.setMuted(!!data.muted)
  }

  syncLabels() {
    for (const [id, outId] of Object.entries(OUTPUTS)) {
      const input = inputEl(id)
      const out = byId(outId)
      if (id === 'persistence') out.textContent = (+input.value).toFixed(2)
      else out.textContent = input.value
    }
    const mobileOut = document.getElementById('out-brushMobile')
    if (mobileOut) mobileOut.textContent = inputEl('brush').value
  }

  /** @param {number} seed */
  updateSeedLabel(seed) {
    const padded = `${seed}`.padStart(6, '0')
    byId('seedLabel').textContent = `Graine ${padded}`
  }

  /**
   * @param {'editing' | 'playing'} mode
   * @param {{ hasGame?: boolean, day?: number }} [meta]
   */
  setMode(mode, meta = {}) {
    document.body.classList.toggle('editing', mode === 'editing')
    document.body.classList.toggle('playing', mode === 'playing')
    for (const id of ['editorHead', 'editorScroll', 'editorBottom']) {
      byId(id).classList.toggle('hidden', mode !== 'editing')
    }
    byId('gamePanel').classList.toggle('hidden', mode !== 'playing')
    byId('actionDock').classList.toggle('hidden', mode !== 'playing')
    const editBtn = byId('editBtn')
    editBtn.classList.toggle('hidden', !meta.hasGame)
    editBtn.textContent = mode === 'editing' && meta.hasGame ? 'Revenir' : 'Terrain'
    byId('cancelEditor').hidden = !(mode === 'editing' && meta.hasGame)
    for (const id of ['mobileHud', 'mobileTime', 'mobileInspect', 'mobileBrush']) {
      const el = document.getElementById(id)
      if (el) el.classList.toggle('hidden', mode === 'editing')
    }
    byId('dayBadge').textContent = mode === 'editing' ? 'APERÇU' : `JOUR ${meta.day ?? 1}`
    byId('worldTitle').textContent = mode === 'editing' ? 'Le relief, à ta main' : 'Le commencement'
    const eyebrow = document.querySelector('.viewtag .eyebrow')
    if (eyebrow) {
      eyebrow.textContent = mode === 'editing' ? 'ATELIER / APERÇU' : 'EXPLORATION / TERRAIN FINI'
    }
  }

  /** @param {string} tool */
  setTool(tool) {
    document.querySelectorAll('#actionDock [data-action]').forEach((btn) => {
      const active = /** @type {HTMLElement} */ (btn).dataset.action === tool
      btn.classList.toggle('selected', active)
      btn.setAttribute('aria-pressed', active ? 'true' : 'false')
    })
    const help = ACTIONS[tool]
    const box = byId('actionHelp')
    box.textContent = ''
    if (help) {
      const strong = document.createElement('strong')
      strong.textContent = help.name
      box.append(strong, document.createTextNode(` ${help.text}`))
    }
  }

  /** @param {number} speed */
  setSpeed(speed) {
    document.querySelectorAll('[data-speed]').forEach((btn) => {
      if (!(btn instanceof HTMLElement) || btn.hasAttribute('data-step')) return
      const value = +btn.dataset.speed
      btn.classList.toggle('selected', value === speed)
    })
  }

  /**
   * @param {import('../world/World.js').World} world
   */
  setGameHud(world) {
    const stats = world.stats()
    byId('energy').textContent = `${Math.floor(world.energy)}`
    byId('reserve').textContent = `${Math.floor(world.water)}`
    byId('compost').textContent = `${Math.floor(world.compost)}`
    byId('waste').textContent = `${Math.round(world.waste)}`
    byId('ecoscore').textContent = `${stats.score}`
    byId('ecobar').style.width = `${stats.score}%`
    byId('ecotext').textContent =
      stats.score >= ECO_GOAL
        ? 'Objectif atteint : continue à faire vivre ce monde.'
        : `Objectif : ${ECO_GOAL} · Pollution moyenne ${Math.round(stats.pollution)} %`
    const dry = world.cells.filter((c) => !c.wet).length
    const rainPct = dry ? Math.round((world.cells.filter((c) => c.rains).length / dry) * 100) : 0
    const weather = `${Math.round(world.temp)} °C · ${
      world.raining ? `pluie sur ${rainPct} % des terres` : 'ciel clair'
    } · nuages ${Math.round(world.cloud)} %`
    byId('weather').textContent = weather
    const mEnergy = document.getElementById('mEnergy')
    if (mEnergy) {
      mEnergy.textContent = `⚡ ${Math.floor(world.energy)}`
      byId('mWater').textContent = `Eau ${Math.floor(world.water)}`
      byId('mCompost').textContent = `Compost ${Math.floor(world.compost)}`
      byId('mEco').textContent = `Éco ${stats.score}`
      byId('mWeather').textContent = `${Math.round(world.temp)} °C${world.raining ? ' · Pluie' : ''}`
    }
    if (document.body.classList.contains('playing')) {
      byId('dayBadge').textContent = `JOUR ${world.day}`
    }
  }

  /**
   * @param {import('../world/World.js').Cell | null} cell
   */
  setInspection(cell) {
    const popup = document.getElementById('selectionPopup')
    if (!cell) {
      byId('noSelection').hidden = false
      byId('tileFields').hidden = true
      byId('tileTitle').textContent = 'Observer une zone'
      byId('tileHeight').textContent = ''
      const mobile = document.getElementById('mobileInspect')
      if (mobile) mobile.textContent = ''
      popup?.classList.add('hidden')
      return
    }
    const title = cell.wet ? 'Plan d’eau' : `Sol · ${cell.x + 1}, ${cell.z + 1}`
    const meta = `Alt. ${cell.h.toFixed(1)}${cell.rains ? ' · pluie' : ''}`
    byId('noSelection').hidden = true
    byId('tileFields').hidden = false
    byId('tileTitle').textContent = title
    byId('tileHeight').textContent = meta
    byId('val-pollution').textContent = `${Math.round(cell.pollution)}`
    byId('val-moisture').textContent = `${Math.round(cell.moisture)}`
    byId('val-soil').textContent = `${Math.round(cell.soil)}`
    byId('val-veg').textContent = `${Math.round(cell.veg)}`
    byId('bar-pollution').style.width = `${cell.pollution}%`
    byId('bar-moisture').style.width = `${cell.moisture}%`
    byId('bar-soil').style.width = `${cell.soil}%`
    byId('bar-veg').style.width = `${cell.veg}%`
    const mobile = document.getElementById('mobileInspect')
    if (mobile) {
      mobile.textContent = cell.wet
        ? 'Plan d’eau'
        : `Zone ${cell.x + 1},${cell.z + 1} · pollution ${Math.round(cell.pollution)} · humidité ${Math.round(cell.moisture)}`
    }
    if (popup) {
      popup.classList.remove('hidden')
      byId('popupTitle').textContent = title
      byId('popupMeta').textContent = meta
      byId('popup-pollution').textContent = `${Math.round(cell.pollution)}`
      byId('popup-moisture').textContent = `${Math.round(cell.moisture)}`
      byId('popup-soil').textContent = `${Math.round(cell.soil)}`
      byId('popup-veg').textContent = `${Math.round(cell.veg)}`
    }
  }

  /**
   * @param {object | null} stats
   */
  setStats(stats) {
    if (!stats) {
      byId('terrainSummary').textContent = 'Génération du terrain'
      byId('engineBadge').textContent = 'THREE.JS'
      return
    }
    byId('terrainSummary').textContent = `${stats.triangleCount} triangles · seed ${stats.seed}`
    byId('terrainWet').textContent = stats.score != null ? `éco ${stats.score}` : ''
    byId('engineBadge').textContent = 'THREE.JS · OK'
    this.updateSeedLabel(stats.seed)
  }

  /** @param {string} message @param {boolean} [isError] */
  toast(message, isError = false) {
    const el = byId('toast')
    el.textContent = message
    el.classList.toggle('error', isError)
    el.classList.add('show')
    window.clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => el.classList.remove('show'), 2600)
  }

  setRandomSeed() {
    inputEl('seed').value = `${1 + Math.floor(Math.random() * 999999)}`
    this.syncLabels()
  }

  toggleWireframe() {
    const input = inputEl('wireframe')
    input.checked = !input.checked
  }

  /** @param {boolean} collapsed */
  setCollapsed(collapsed) {
    this._collapsed = collapsed
    document.body.classList.toggle('sidebar-collapsed', collapsed)
  }

  toggleCollapsed() {
    this.setCollapsed(!this._collapsed)
    return this._collapsed
  }

  isCollapsed() {
    return this._collapsed
  }

  /** @param {boolean} muted */
  setMuted(muted) {
    this.muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false')
    this.muteBtn.title = muted ? 'Réactiver le son' : 'Couper le son'
    this.muteBtn.textContent = muted ? '🔇' : '♪'
  }

  getLayer() {
    return selectEl('layer').value
  }

  /**
   * Mini-carte Perlin / Pluie (comme Gaya).
   * @param {import('../world/World.js').World | null} world
   * @param {string} [layer]
   */
  updateFieldView(world, layer = this.getLayer()) {
    const figure = document.getElementById('fieldView')
    const canvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById('fieldCanvas'))
    const caption = document.getElementById('fieldCaption')
    if (!figure || !canvas || !caption) return
    const show = !!world && (layer === 'perlin' || layer === 'rain')
    figure.classList.toggle('hidden', !show)
    if (!show || !world) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const image = ctx.createImageData(canvas.width, canvas.height)
    paintFieldImage(world, /** @type {'perlin' | 'rain'} */ (layer), image)
    ctx.putImageData(image, 0, 0)
    caption.textContent =
      layer === 'perlin'
        ? 'Champ de bruit de Perlin\nnoir = creux, blanc = crête'
        : 'Zones qui reçoivent la pluie'
  }

  /** @param {boolean} open */
  setHelpOpen(open) {
    byId('help').classList.toggle('hidden', !open)
  }

  hideLoading() {
    byId('loading').classList.add('hidden')
  }
}
