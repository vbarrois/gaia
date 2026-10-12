import * as THREE from 'three'
import { buildLowPolyClouds, generateCloudField } from './clouds.js'
import {
  GRID_SIZE,
  buildLowPolyTerrain,
  generateHeightmap,
  waterHeight,
  waterSurfaceColor,
  waterSurfaceOpacity,
} from './terrain.js'

function assignGeometry(mesh, data) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3))
  mesh.geometry.dispose()
  mesh.geometry = geometry
}

export class TerrainManager {
  constructor() {
    const terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.92,
      metalness: 0.02,
    })
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), terrainMaterial)

    const waterGeometry = new THREE.PlaneGeometry(GRID_SIZE + 8, GRID_SIZE + 8, 1, 1)
    waterGeometry.rotateX(-Math.PI / 2)
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a7a96,
      transparent: true,
      opacity: 0.38,
      roughness: 0.18,
      metalness: 0.12,
      depthWrite: false,
    })
    this.water = new THREE.Mesh(waterGeometry, waterMaterial)
    this.waterBaseY = 0

    const cloudMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      transparent: true,
      opacity: 0.58,
      roughness: 1,
      metalness: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.clouds = new THREE.Mesh(new THREE.BufferGeometry(), cloudMaterial)
    this.cloudAltitude = 24

    /** @type {object | null} */
    this.lastStats = null
  }

  /**
   * @param {import('../store/userStore.js').UserData & { size?: number }} options
   */
  rebuild(options) {
    const map = generateHeightmap(options)
    const meshData = buildLowPolyTerrain(map, {
      cellSize: 1,
      waterLevel: options.waterLevel,
    })
    assignGeometry(this.mesh, meshData)
    this.mesh.material.wireframe = options.wireframe

    this.waterBaseY = waterHeight(map, options.waterLevel)
    this.water.position.y = this.waterBaseY
    this.water.visible = options.waterLevel > 0
    const [wr, wg, wb] = waterSurfaceColor(options.pollution)
    this.water.material.color.setRGB(wr, wg, wb)
    this.water.material.opacity = waterSurfaceOpacity(options.pollution)

    this.cloudAltitude = options.cloudAltitude
    const clouds = generateCloudField({
      seed: options.seed,
      coverage: options.cloudCoverage,
      altitude: options.cloudAltitude,
      scale: Math.max(12, options.scale * 0.55),
    })
    const cloudMesh = buildLowPolyClouds(clouds, { worldSize: GRID_SIZE - 1 })
    assignGeometry(this.clouds, cloudMesh)
    this.clouds.material.wireframe = options.wireframe
    this.clouds.visible = options.cloudCoverage > 0.02 && cloudMesh.triangleCount > 0

    this.lastStats = {
      size: map.size,
      min: map.min,
      max: map.max,
      triangleCount: meshData.triangleCount,
      seed: options.seed,
      soilCounts: map.soilCounts,
      cloudTriangles: cloudMesh.triangleCount,
    }
    return this.lastStats
  }

  /**
   * @param {number} frame
   */
  update(frame) {
    this.water.position.y = this.waterBaseY + Math.sin(frame * 0.012) * 0.06
    this.clouds.position.x = Math.sin(frame * 0.0014) * 6
    this.clouds.position.z = Math.cos(frame * 0.0011) * 5
    this.clouds.position.y = Math.sin(frame * 0.002) * 0.4
  }
}
