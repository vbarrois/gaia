import * as THREE from 'three'
import { SIZE } from '../world/config.js'
import { buildRainOutline, buildWorldMesh } from '../world/colors.js'
import { buildLowPolyClouds, generateCloudField } from './clouds.js'

/**
 * Renders a World as low-poly terrain + water + clouds + rain outline + source marker.
 */
export class TerrainManager {
  constructor() {
    this.group = new THREE.Group()

    const terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 1,
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
      opacity: 0.42,
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
        color: 0xa8d4c8,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    )
    this.rainline.renderOrder = 4
    this.rainline.visible = false
    this.group.add(this.rainline)

    this.sourceMarker = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 12, 10),
      new THREE.MeshStandardMaterial({
        color: 0x7dcea0,
        emissive: 0x1a4030,
        roughness: 0.45,
      }),
    )
    this.sourceMarker.visible = false
    this.group.add(this.sourceMarker)

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
      this.sourceMarker.position.set(world.source.x, h + 2.2, world.source.z)
      this.sourceMarker.visible = true
    } else {
      this.sourceMarker.visible = false
    }

    this._cloudWireframe = wireframe
    const cloudStats = this.rebuildClouds()

    this.applyLayerVisibility()

    this.lastStats = {
      triangleCount: data.triangleCount,
      seed: world.config.seed,
      score: world.stats().score,
      cloudTriangles: cloudStats.triangleCount,
      rainSegments: outline.length / 6,
      resolution: world.config.resolution,
    }
    return this.lastStats
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
    if (this.sourceMarker) {
      this.sourceMarker.visible = (natural || rain) && !!this.world?.source
    }
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
    if (this.sourceMarker.visible) {
      this.sourceMarker.position.y += Math.sin(frame * 0.04) * 0.002
    }
  }
}
