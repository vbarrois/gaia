import * as THREE from 'three'
import { CELL, GRID, SIZE } from '../world/config.js'
import { clamp } from '../world/math.js'
import { buildRainOutline, buildWorldMesh } from '../world/colors.js'
import { buildLowPolyClouds, generateCloudField } from './clouds.js'
import { collectTreePlacements } from './trees.js'

/**
 * Renders a World as low-poly terrain + water + clouds + trees + rain outline + source.
 */
export class TerrainManager {
  constructor() {
    this.group = new THREE.Group()
    this._dummy = new THREE.Object3D()
    this._treeColor = new THREE.Color()

    const terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: false,
      roughness: 0.92,
      metalness: 0.02,
    })
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), terrainMaterial)
    this.group.add(this.mesh)

    const waterMaterial = new THREE.MeshPhongMaterial({
      color: 0x4babb3,
      transparent: true,
      opacity: 0.78,
      shininess: 85,
      specular: 0xc0e7df,
      depthWrite: false,
    })
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(SIZE - 0.06, SIZE - 0.06), waterMaterial)
    this.water.rotation.x = -Math.PI / 2
    this.water.renderOrder = 2
    this.group.add(this.water)

    const cloudMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      transparent: true,
      opacity: 0.55,
      roughness: 1,
      metalness: 0,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
    })
    this.clouds = new THREE.Mesh(new THREE.BufferGeometry(), cloudMaterial)
    this.group.add(this.clouds)

    this.rainline = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: 0xd7f6ff,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        depthTest: false,
      }),
    )
    this.rainline.renderOrder = 4
    this.rainline.visible = false
    this.group.add(this.rainline)

    // Zone de sélection / curseur pinceau (Gaya LineLoop #e6ff99)
    this.brushLine = new THREE.LineLoop(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: 0xe6ff99,
        depthTest: false,
        transparent: true,
        opacity: 0.92,
      }),
    )
    this.brushLine.renderOrder = 8
    this.brushLine.visible = false
    this.group.add(this.brushLine)
    /** @type {{ x: number, z: number } | null} */
    this.brushFocus = null

    const treeMax = GRID * GRID
    this.trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.14, 0.22, 1.5, 5),
      new THREE.MeshStandardMaterial({ color: 0x72654a, roughness: 1, flatShading: true }),
      treeMax,
    )
    this.crowns = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1.0, 2.7, 6),
      new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }),
      treeMax,
    )
    this.tops = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.72, 2.1, 6),
      new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }),
      treeMax,
    )
    for (const mesh of [this.trunks, this.crowns, this.tops]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      mesh.frustumCulled = false
      mesh.count = 0
      mesh.visible = false
      this.group.add(mesh)
    }

    // Source Gaya : anneau #bbeef0 + balise #83d8df
    this.sourceGroup = new THREE.Group()
    this.sourceGroup.visible = false
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.1, 0.16, 6, 32),
      new THREE.MeshBasicMaterial({ color: 0xbbeef0 }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.7
    const beacon = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.85),
      new THREE.MeshStandardMaterial({
        color: 0x83d8df,
        emissive: 0x49828a,
        emissiveIntensity: 0.35,
        roughness: 0.3,
      }),
    )
    beacon.position.y = 3
    this.sourceGroup.add(ring, beacon)
    this.sourceMarker = this.sourceGroup
    this.group.add(this.sourceGroup)

    /** @type {string} */
    this.layer = 'natural'
    /** @type {import('../world/World.js').World | null} */
    this.world = null
    this.waterBaseY = 0
    /** @type {object | null} */
    this.lastStats = null
  }

  /**
   * @param {import('../world/World.js').World} world
   * @param {{ layer?: string, wireframe?: boolean }} [options]
   */
  rebuild(world, options = {}) {
    this.world = world
    this.layer = options.layer ?? this.layer
    const wireframe = options.wireframe ?? world.config.wireframe
    const data = buildWorldMesh(world, this.layer)

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3))
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1))
    geometry.computeVertexNormals()
    this.mesh.geometry.dispose()
    this.mesh.geometry = geometry
    this.mesh.material.wireframe = wireframe

    this.waterBaseY = data.waterY
    this.water.position.y = this.waterBaseY

    const outline = buildRainOutline(world, data.positions, data.indices)
    this.rainline.geometry.dispose()
    const rainGeo = new THREE.BufferGeometry()
    rainGeo.setAttribute('position', new THREE.BufferAttribute(outline, 3))
    this.rainline.geometry = rainGeo

    if (world.source) {
      const h = world.height(world.source.x, world.source.z)
      this.sourceGroup.position.set(world.source.x, h, world.source.z)
      this.sourceGroup.visible = true
    } else {
      this.sourceGroup.visible = false
    }

    this._cloudWireframe = wireframe
    const cloudStats = this.rebuildClouds()
    const treeCount = this.rebuildTrees()

    this.applyLayerVisibility()

    this.lastStats = {
      triangleCount: data.triangleCount,
      seed: world.config.seed,
      score: world.stats().score,
      cloudTriangles: cloudStats.triangleCount,
      rainSegments: outline.length / 6,
      treeCount,
      resolution: world.config.resolution,
    }
    return this.lastStats
  }

  /** Arbres low-poly Gaya (InstancedMesh troncs / couronnes). */
  rebuildTrees() {
    const world = this.world
    if (!world) {
      for (const mesh of [this.trunks, this.crowns, this.tops]) mesh.count = 0
      return 0
    }
    const placements = collectTreePlacements(world)
    let count = 0
    for (const t of placements) {
      const { x, y, z, s, r, veg } = t
      this._dummy.rotation.set(0, r * 7, 0)
      this._dummy.scale.set(s, s, s)
      this._dummy.position.set(x, y + s * 0.72, z)
      this._dummy.updateMatrix()
      this.trunks.setMatrixAt(count, this._dummy.matrix)
      this._dummy.position.y = y + s * 2
      this._dummy.updateMatrix()
      this.crowns.setMatrixAt(count, this._dummy.matrix)
      this._dummy.position.y = y + s * 3.1
      this._dummy.updateMatrix()
      this.tops.setMatrixAt(count, this._dummy.matrix)
      this._treeColor.setHSL(0.22 + r * 0.035, 0.2 + clamp(veg / 110) * 0.24, 0.25 + r * 0.15)
      this.crowns.setColorAt(count, this._treeColor)
      this._treeColor.multiplyScalar(1.17)
      this.tops.setColorAt(count, this._treeColor)
      count += 1
    }
    for (const mesh of [this.trunks, this.crowns, this.tops]) {
      mesh.count = count
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
    return count
  }

  /**
   * Nuages fixes en place : le vent fait défiler le bruit, pas le maillage
   * (évite le « rectangle blanc » des bords du tapis).
   */
  rebuildClouds() {
    const world = this.world
    if (!world) return { triangleCount: 0 }
    const coverage = Math.min(0.85, 0.12 + world.cloud / 140)
    const clouds = generateCloudField({
      seed: world.config.seed + 91,
      coverage,
      altitude: 28 + world.cloud * 0.08,
      scale: Math.max(18, world.config.scale * 0.45),
      size: 48,
      offsetX: this._cloudOx ?? 0,
      offsetZ: this._cloudOz ?? 0,
    })
    const cloudMesh = buildLowPolyClouds(clouds, { worldSize: SIZE * 0.98 })
    this.clouds.geometry.dispose()
    if (cloudMesh.triangleCount === 0) {
      this.clouds.geometry = new THREE.BufferGeometry()
      this.clouds.visible = false
      this.clouds.position.set(0, 0, 0)
      return { triangleCount: 0 }
    }
    const cloudGeo = new THREE.BufferGeometry()
    cloudGeo.setAttribute('position', new THREE.BufferAttribute(cloudMesh.positions, 3))
    cloudGeo.setAttribute('normal', new THREE.BufferAttribute(cloudMesh.normals, 3))
    cloudGeo.setAttribute('color', new THREE.BufferAttribute(cloudMesh.colors, 3))
    this.clouds.geometry = cloudGeo
    this.clouds.material.wireframe = !!this._cloudWireframe
    this.clouds.position.set(0, 0, 0)
    this.clouds.visible = true
    return { triangleCount: cloudMesh.triangleCount }
  }

  applyLayerVisibility() {
    const natural = this.layer === 'natural'
    const rain = this.layer === 'rain'
    this.water.visible = natural
    this.rainline.visible = (natural || rain) && this.rainline.geometry.attributes.position?.count > 0
    this.clouds.visible = natural && this.clouds.geometry.attributes.position?.count > 0
    for (const mesh of [this.trunks, this.crowns, this.tops]) {
      mesh.visible = natural && mesh.count > 0
    }
    this.sourceGroup.visible = (natural || rain) && !!this.world?.source
    if (!natural && !rain) this.brushLine.visible = false
  }

  /**
   * Anneau de ciblage au sol (rayon = taille de zone / inspect = petite cellule).
   * @param {{ x: number, z: number } | null} point
   * @param {number} radius
   * @param {boolean} [visible]
   */
  setBrushCursor(point, radius, visible = true) {
    if (!point || !this.world || !visible) {
      this.brushFocus = point
      this.brushLine.visible = false
      return
    }
    this.brushFocus = { x: point.x, z: point.z }
    const water = this.world.config.water
    const coords = []
    const segments = 80
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2
      let x = point.x + Math.cos(a) * radius
      let z = point.z + Math.sin(a) * radius
      x = clamp(x, -SIZE / 2, SIZE / 2)
      z = clamp(z, -SIZE / 2, SIZE / 2)
      const y = Math.max(this.world.height(x, z), water) + 0.3
      coords.push(x, y, z)
    }
    this.brushLine.geometry.dispose()
    this.brushLine.geometry = new THREE.BufferGeometry()
    this.brushLine.geometry.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3))
    this.brushLine.visible = true
  }

  clearBrushCursor() {
    this.brushFocus = null
    this.brushLine.visible = false
  }

  /** @returns {number} rayon inspect (petite cellule) */
  inspectRadius() {
    return CELL * 0.75
  }

  /**
   * Rebuild rain outline + colors after the rain field drifted.
   * @param {{ outline?: boolean, colors?: boolean }} [opts]
   */
  refreshRainField(opts = {}) {
    if (!this.world || !this.mesh.geometry.index) return
    const doOutline = opts.outline !== false
    const doColors = opts.colors !== false
    if (doOutline) {
      const positions = /** @type {Float32Array} */ (this.mesh.geometry.attributes.position.array)
      const indices = /** @type {Uint32Array} */ (this.mesh.geometry.index.array)
      const outline = buildRainOutline(this.world, positions, indices)
      this.rainline.geometry.setAttribute('position', new THREE.BufferAttribute(outline, 3))
      this.rainline.geometry.computeBoundingSphere()
      if (this.lastStats) this.lastStats.rainSegments = outline.length / 6
    }
    if (doColors) this.refreshColors()
    else this.applyLayerVisibility()
  }

  /**
   * Re-color without regenerating heights (after act/step).
   * @param {string} [layer]
   */
  refreshColors(layer) {
    if (!this.world) return
    if (layer) this.layer = layer
    const data = buildWorldMesh(this.world, this.layer)
    this.mesh.geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3))
    this.mesh.geometry.attributes.color.needsUpdate = true
    this.mesh.material.wireframe = this.world.config.wireframe
    const treeCount = this.rebuildTrees()
    if (this.lastStats) this.lastStats.treeCount = treeCount
    this.applyLayerVisibility()
  }

  /** @param {string} layer */
  setLayer(layer) {
    this.layer = layer
    if (this.world) this.rebuild(this.world, { layer, wireframe: this.world.config.wireframe })
  }

  /**
   * @param {number} frame
   * @param {number} [dt]
   */
  update(frame, dt = 1 / 60) {
    this.water.position.y = this.waterBaseY + Math.sin(frame * 0.012) * 0.08
    const world = this.world
    const wind = world?.wind ?? 1
    const angle = world?.windAngle ?? 0.85
    // Défilement dans l’espace du bruit uniquement (position mesh toujours à l’origine).
    const speed = wind * Math.min(0.12, dt) * 14
    this._cloudOx = (this._cloudOx ?? 0) + Math.cos(angle) * speed
    this._cloudOz = (this._cloudOz ?? 0) + Math.sin(angle) * speed
    this._cloudRebuildAcc = (this._cloudRebuildAcc ?? 0) + dt
    if (this._cloudRebuildAcc >= 0.1 && this.layer === 'natural') {
      this._cloudRebuildAcc = 0
      const stats = this.rebuildClouds()
      if (this.lastStats) this.lastStats.cloudTriangles = stats.triangleCount
      this.applyLayerVisibility()
    }
    // Pas de translation XZ : uniquement un léger souffle vertical.
    this.clouds.position.set(0, Math.sin(frame * 0.002) * 0.35, 0)
    if (this.sourceGroup.visible) {
      const beacon = this.sourceGroup.children[1]
      if (beacon) beacon.position.y = 3 + Math.sin(frame * 0.04) * 0.15
    }
  }
}
