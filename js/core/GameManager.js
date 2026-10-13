import { readPanelCollapsed } from '../ui/panel.js'
import { USER_DEFAULTS, clearUserData, loadUserData, saveUserData } from '../store/userStore.js'
import { TerrainManager } from '../terrain/TerrainManager.js'
import { UiManager } from '../ui/UiManager.js'
import { WorldManager } from '../world/WorldManager.js'
import { ECO_GOAL } from '../world/config.js'
import { DEFAULT_CAMERA, SceneManager } from './SceneManager.js'
import { InputManager } from './InputManager.js'
import { SoundManager } from './SoundManager.js'
import { EditorManager } from './EditorManager.js'
import { ActionManager } from './ActionManager.js'
import { TimeManager } from './TimeManager.js'

export class GameManager {
  /**
   * @param {HTMLElement} host
   */
  constructor(host) {
    this.storage = window.localStorage
    this.user = loadUserData(this.storage, window.innerWidth)
    this.scene = new SceneManager(host)
    this.terrain = new TerrainManager()
    this.worlds = new WorldManager()
    this.editor = new EditorManager(this.user)
    this.actions = new ActionManager()
    this.time = new TimeManager()
    this.sound = new SoundManager()
    this.ui = new UiManager({
      onRebuild: () => this.preview(),
      onRandomSeed: () => this.randomSeed(),
      onPreset: (name) => this.applyPreset(name),
      onCommit: () => this.commitWorld(),
      onCancel: () => this.cancelEditor(),
      onEnterEditor: () => this.enterEditor(),
      onToggleMute: () => this.toggleMute(),
      onExport: () => this.exportConfig(),
      onImportFile: (file) => this.importConfig(file),
      onDefaults: () => this.resetDefaults(),
      onTool: (tool) => this.setTool(tool),
      onBrush: (radius) => {
        this.actions.setRadius(radius)
        this.refreshBrushCursor()
      },
      onSpeed: (speed) => this.setSpeed(speed),
      onStepDay: () => this.stepDay(),
      onLayer: (layer) => this.setLayer(layer),
      onTopView: () => this.scene.resetCamera(true),
      onResetView: () => this.scene.resetCamera(false),
      onHelp: (open) => this.ui.setHelpOpen(open),
    })
    this.input = new InputManager({
      onAction: (action) => this.handleAction(action),
      onTap: (event) => {
        this.sound.unlock()
        this.handleTap(event)
      },
      onHover: (event) => this.handleHover(event),
      onHoverEnd: () => {
        if (this.selected) this.refreshBrushCursor()
        else this.terrain.clearBrushCursor()
      },
    })
    this.frame = 0
    this.running = false
    this.lastTs = 0
    this.rainVisAcc = 0
    /** @type {import('../world/World.js').Cell | null} */
    this.selected = null
    /** @type {{ x: number, z: number } | null} */
    this.hoverPoint = null

    this.scene.add(this.terrain.group)
    this.scene.controls.addEventListener('end', () => this.persist())
  }

  start() {
    this.sound.setMuted(!!this.user.muted)
    this.ui.applyUserData(this.user)
    if (this.user.camera) this.scene.applyCamera(this.user.camera)
    else this.scene.resetCamera(false)
    this.ui.bind()
    this.input.bind()
    this.input.bindCanvas(this.scene.renderer.domElement)
    this.ui.setTool(this.actions.tool)
    this.ui.setSpeed(this.time.speed)
    this.ui.setMode('editing')
    this.preview()
    this.ui.hideLoading()
    this.running = true
    this.lastTs = performance.now()
    this.tick(this.lastTs)
  }

  pickPoint(event) {
    const targets = this.terrain.water.visible
      ? [this.terrain.mesh, this.terrain.water]
      : [this.terrain.mesh]
    return this.scene.pickTerrain(event, targets)
  }

  brushRadius() {
    return this.actions.tool === 'inspect' ? this.terrain.inspectRadius() : this.actions.radius
  }

  refreshBrushCursor() {
    const point = this.hoverPoint || (this.selected ? { x: this.selected.px, z: this.selected.pz } : null)
    const show = this.editor.playing && !!point
    this.terrain.setBrushCursor(point, this.brushRadius(), show)
  }

  preview() {
    const options = this.ui.readWorldOptions()
    this.editor.updateDraft(options)
    const world = this.worlds.rebuild(this.editor.draft)
    const stats = this.terrain.rebuild(world, {
      layer: this.ui.getLayer(),
      wireframe: world.config.wireframe,
    })
    this.ui.setStats(stats)
    this.ui.updateFieldView(world, this.ui.getLayer())
    this.persist()
  }

  randomSeed() {
    this.ui.setRandomSeed()
    this.preview()
    this.sound.play('generate')
  }

  /** @param {string} name */
  applyPreset(name) {
    const draft = this.editor.applyPreset(name)
    this.ui.applyWorldConfig(draft)
    this.preview()
  }

  resetDefaults() {
    const draft = this.editor.resetDefaults()
    this.ui.applyWorldConfig(draft)
    this.preview()
  }

  commitWorld() {
    const options = this.ui.readWorldOptions()
    this.editor.updateDraft(options)
    this.editor.commit()
    const world = this.worlds.rebuild(this.editor.draft)
    this.worlds.commit()
    this.time.setSpeed(0)
    this.ui.setSpeed(0)
    this.ui.setMode('playing', { day: world.day, hasGame: true })
    this.terrain.rebuild(world, { layer: this.ui.getLayer(), wireframe: world.config.wireframe })
    this.ui.setGameHud(world)
    this.ui.setStats(this.terrain.lastStats)
    this.ui.updateFieldView(world, this.ui.getLayer())
    this.ui.setInspection(null)
    this.selected = null
    this.hoverPoint = null
    this.terrain.clearBrushCursor()
    this.persist()
    this.sound.play('generate')
    this.ui.toast('Monde créé — partie en pause.')
  }

  enterEditor() {
    this.editor.enterEditor(this.worlds.hasGame)
    this.time.setSpeed(0)
    this.ui.setSpeed(0)
    this.ui.setMode('editing', { hasGame: this.worlds.hasGame })
    this.ui.applyWorldConfig(this.editor.draft)
    this.hoverPoint = null
    this.terrain.clearBrushCursor()
    this.preview()
  }

  cancelEditor() {
    const { restored } = this.editor.cancel()
    if (restored && this.worlds.restoreCommitted()) {
      const world = this.worlds.world
      this.ui.setMode('playing', { day: world.day, hasGame: true })
      this.terrain.rebuild(world, { layer: this.ui.getLayer(), wireframe: world.config.wireframe })
      this.ui.setGameHud(world)
      this.ui.setStats(this.terrain.lastStats)
      this.ui.updateFieldView(world, this.ui.getLayer())
      this.ui.toast('Aperçu annulé — retour à la partie.')
      return
    }
    this.ui.setMode('editing')
  }

  /** @param {string} tool */
  setTool(tool) {
    this.actions.setTool(tool)
    this.ui.setTool(this.actions.tool)
    this.refreshBrushCursor()
  }

  /** @param {number} speed */
  setSpeed(speed) {
    if (!this.editor.playing || !this.worlds.world) return
    this.time.setSpeed(speed)
    this.ui.setSpeed(this.time.speed)
  }

  stepDay() {
    if (!this.editor.playing || !this.worlds.world) return
    this.advanceDay()
  }

  advanceDay() {
    const world = this.worlds.world
    if (!world) return
    const before = world.stats().score
    world.step()
    this.terrain.refreshRainField()
    this.ui.setGameHud(world)
    this.ui.setStats(this.terrain.lastStats)
    this.ui.updateFieldView(world, this.ui.getLayer())
    if (this.selected) this.ui.setInspection(world.cellAt(this.selected.px, this.selected.pz))
    this.sound.play('ui')
    if (before < ECO_GOAL && world.stats().score >= ECO_GOAL) {
      this.ui.toast('Objectif atteint ! La vie retrouve sa place.')
    }
  }

  /** @param {string} layer */
  setLayer(layer) {
    this.terrain.setLayer(layer)
    this.ui.updateFieldView(this.worlds.world, layer)
    this.ui.setStats(this.terrain.lastStats)
    this.persist()
  }

  /**
   * Curseur de zone sous la souris (aperçu du rayon).
   * @param {PointerEvent} event
   */
  handleHover(event) {
    if (!this.editor.playing || !this.worlds.world) {
      this.hoverPoint = null
      this.terrain.clearBrushCursor()
      return
    }
    const hit = this.pickPoint(event)
    if (!hit) {
      this.hoverPoint = null
      if (this.selected) this.refreshBrushCursor()
      else this.terrain.clearBrushCursor()
      return
    }
    this.hoverPoint = { x: hit.x, z: hit.z }
    this.terrain.setBrushCursor(this.hoverPoint, this.brushRadius(), true)
  }

  /**
   * Tap court : sélection + action (drag caméra ignoré).
   * @param {PointerEvent} event
   */
  handleTap(event) {
    const world = this.worlds.world
    if (!world) return
    const hit = this.pickPoint(event)
    if (!hit) return
    const cell = world.cellAt(hit.x, hit.z)
    this.selected = cell
    this.hoverPoint = { x: hit.x, z: hit.z }
    this.ui.setInspection(cell)
    this.refreshBrushCursor()

    if (this.editor.editing) {
      this.ui.toast(
        `Altitude ${cell.h.toFixed(1)} · pollution ${Math.round(cell.pollution)} · sol ${Math.round(cell.soil)}`,
      )
      this.sound.play('ui')
      return
    }

    if (!this.editor.playing) return

    if (this.actions.tool === 'inspect') {
      this.sound.play('ui')
      return
    }

    const result = this.actions.apply(world, hit.x, hit.z)
    this.ui.toast(result.message, !result.ok)
    if (result.ok) {
      this.terrain.refreshColors()
      this.ui.setGameHud(world)
      this.ui.setInspection(world.cellAt(hit.x, hit.z))
      this.sound.play('generate')
    } else {
      this.sound.play('ui')
    }
  }

  togglePanel() {
    this.ui.toggleCollapsed()
    this.sound.play('panel')
    this.persist()
  }

  toggleMute() {
    this.user.muted = !this.sound.muted
    this.sound.setMuted(this.user.muted)
    this.ui.setMuted(this.user.muted)
    if (!this.user.muted) this.sound.play('mute')
    this.persist()
  }

  exportConfig() {
    const blob = new Blob([this.editor.exportJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gaia-config-${this.editor.draft.seed}.json`
    a.click()
    URL.revokeObjectURL(url)
    this.ui.toast('Réglages exportés.')
  }

  /** @param {File} file */
  async importConfig(file) {
    try {
      const text = await file.text()
      const draft = this.editor.importJson(text)
      this.ui.applyWorldConfig(draft)
      this.preview()
      this.ui.toast('Réglages importés.')
    } catch {
      this.ui.toast('Fichier JSON invalide.', true)
    }
  }

  reset() {
    clearUserData(this.storage)
    const collapsed = readPanelCollapsed(this.storage, window.innerWidth)
    this.user = {
      ...USER_DEFAULTS,
      panelCollapsed: collapsed,
      camera: DEFAULT_CAMERA,
      muted: false,
    }
    this.editor = new EditorManager(this.user)
    this.worlds = new WorldManager()
    this.sound.setMuted(false)
    this.ui.applyUserData(this.user)
    this.scene.resetCamera()
    this.ui.setMode('editing')
    this.preview()
    this.sound.play('generate')
  }

  /**
   * @param {string} action
   */
  handleAction(action) {
    if (action === 'randomSeed') this.randomSeed()
    if (action === 'toggleWireframe') {
      this.ui.toggleWireframe()
      if (this.editor.editing) this.preview()
      else if (this.worlds.world) {
        this.worlds.world.config.wireframe = this.ui.readWorldOptions().wireframe
        this.terrain.rebuild(this.worlds.world, {
          layer: this.ui.getLayer(),
          wireframe: this.worlds.world.config.wireframe,
        })
      }
      this.sound.play('ui')
    }
    if (action === 'togglePanel') this.togglePanel()
    if (action === 'toggleMute') this.toggleMute()
    if (action === 'reset') this.reset()
  }

  persist() {
    const options = this.editor.editing ? this.ui.readWorldOptions() : this.editor.draft
    saveUserData(this.storage, {
      ...options,
      muted: this.sound.muted,
      panelCollapsed: this.ui.isCollapsed(),
      camera: this.scene.getCameraState(),
      layer: this.ui.getLayer(),
    })
  }

  /** @param {number} ts */
  tick(ts) {
    if (!this.running) return
    const dt = Math.min(0.1, (ts - this.lastTs) / 1000)
    this.lastTs = ts
    this.frame += 1
    const world = this.worlds.world
    if (world) {
      const layer = this.ui.getLayer()
      const playSpeed = this.editor.playing ? this.time.speed : 0
      // En jeu : suit la vitesse. En atelier : animation douce sur Naturel / Pluie.
      const weatherScale = playSpeed > 0 ? playSpeed : layer === 'rain' || layer === 'natural' ? 0.85 : 0
      if (weatherScale > 0) {
        world.driftWeather(dt, weatherScale)
        // Couleurs chaque frame (fluide) ; liseré un peu moins souvent (coût).
        const outlineEvery = playSpeed >= 3 ? 1 : 2
        this.terrain.refreshRainField({
          colors: true,
          outline: this.frame % outlineEvery === 0,
        })
        this.rainVisAcc += dt
        if (this.rainVisAcc >= 0.2) {
          this.rainVisAcc = 0
          if (layer === 'rain' || layer === 'perlin') this.ui.updateFieldView(world, layer)
          if (this.selected) this.ui.setInspection(world.cellAt(this.selected.px, this.selected.pz))
        }
      }
    }
    if (this.editor.playing) {
      this.time.update(dt, () => this.advanceDay())
    }
    this.terrain.update(this.frame, dt)
    this.scene.render()
    requestAnimationFrame((next) => this.tick(next))
  }
}
