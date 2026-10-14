class_name WorldConfig
extends Resource
## Paramètres de génération du monde (port de `js/world/config.js`).
## Éditable dans l’inspecteur Godot — c’est le bon endroit pour tweaker le relief.

@export_group("Seed & relief")
@export var seed: int = 7429
@export_range(0.0, 48.0) var amplitude: float = 26.0
@export_range(18.0, 120.0) var scale: float = 57.0
@export_range(1, 7) var octaves: int = 4
@export_range(0.2, 0.8) var persistence: float = 0.48
@export_range(-14.0, 22.0) var water_level: float = 3.0
@export_range(0.0, 100.0) var falloff: float = 72.0
@export_range(0.0, 35.0) var warp: float = 12.0

@export_group("Écologie de départ")
@export_range(0.0, 100.0) var pollution: float = 72.0
## Nombre de cicatrices toxiques (hotspots) autour de la source.
@export_range(0, 16) var hotspot_count: int = 7
@export_range(2, 12) var hotspot_radius_min: int = 4
@export_range(3, 16) var hotspot_radius_max: int = 8
@export_range(10.0, 80.0) var hotspot_peak_min: float = 48.0
@export_range(20.0, 100.0) var hotspot_peak_max: float = 78.0
## Distance Chebyshev source → hotspot (évite le cœur d’oasis).
@export_range(4, 40) var hotspot_min_dist: int = 7
@export_range(8, 64) var hotspot_max_dist: int = 18

@export_group("Chunks (Godot)")
## Taille d’un chunk en tuiles (16×16 recommandé).
@export_range(8, 64) var chunk_size: int = 16
## Rayon Chebyshev autour du focus (0 = 1 chunk, comme le monde fixe JS 36×36
## si chunk_size≈36 ; 1 = 3×3 ≈ emprise JS à chunk 16).
@export_range(0, 12) var load_radius: int = 1
## Taille d’une tuile (réf. 2D / conversion).
@export_range(8, 64) var tile_size: int = 16
## Échelle monde (unités → tuiles). 3.33 = CELL JS (SIZE 120 / GRID 36).
@export var world_unit_per_tile: float = 3.33

@export_group("Terrain 3D / opti")
## Quads par côté (tous les chunks si LOD off → raccords parfaits).
@export_range(4, 32) var mesh_resolution: int = 16
## LOD mesh : OFF par défaut (évite T-junctions entre chunks).
@export var enable_mesh_lod: bool = false
## Distance Chebyshev (chunks) : LOD plein / demi / quart (si enable_mesh_lod).
@export_range(0, 4) var lod_near: int = 1
@export_range(1, 6) var lod_mid: int = 2
@export_range(2, 8) var lod_far: int = 3
## Profondeur des jupes anti-fissures (unités monde).
@export_range(0.0, 80.0) var skirt_depth: float = 28.0
## Max chunks meshés par frame (évite les hitchs).
@export_range(1, 8) var build_budget_per_frame: int = 2
## Taille initiale du pool de chunks recyclés.
@export_range(0, 64) var chunk_pool_prewarm: int = 4


static func defaults() -> WorldConfig:
	return WorldConfig.new()


func sanitize() -> void:
	seed = clampi(seed, 1, 999_999)
	amplitude = clampf(amplitude, 0.0, 48.0)
	scale = clampf(scale, 18.0, 120.0)
	octaves = clampi(octaves, 1, 7)
	persistence = clampf(persistence, 0.2, 0.8)
	water_level = clampf(water_level, -14.0, 22.0)
	falloff = clampf(falloff, 0.0, 100.0)
	warp = clampf(warp, 0.0, 35.0)
	pollution = clampf(pollution, 0.0, 100.0)
	hotspot_count = clampi(hotspot_count, 0, 16)
	hotspot_radius_min = clampi(hotspot_radius_min, 2, 12)
	hotspot_radius_max = clampi(hotspot_radius_max, hotspot_radius_min, 16)
	hotspot_peak_min = clampf(hotspot_peak_min, 10.0, 80.0)
	hotspot_peak_max = clampf(hotspot_peak_max, hotspot_peak_min, 100.0)
	hotspot_min_dist = clampi(hotspot_min_dist, 4, 40)
	hotspot_max_dist = clampi(hotspot_max_dist, hotspot_min_dist + 2, 64)
	chunk_size = clampi(chunk_size, 8, 64)
	load_radius = clampi(load_radius, 0, 12)
	tile_size = clampi(tile_size, 8, 64)
	mesh_resolution = clampi(mesh_resolution, 4, 32)
	lod_near = clampi(lod_near, 0, 4)
	lod_mid = clampi(lod_mid, lod_near, 6)
	lod_far = clampi(lod_far, lod_mid, 8)
	skirt_depth = clampf(skirt_depth, 0.0, 80.0)
	build_budget_per_frame = clampi(build_budget_per_frame, 1, 8)
	chunk_pool_prewarm = clampi(chunk_pool_prewarm, 0, 64)


func duplicate_config() -> WorldConfig:
	var copy := WorldConfig.new()
	copy.seed = seed
	copy.amplitude = amplitude
	copy.scale = scale
	copy.octaves = octaves
	copy.persistence = persistence
	copy.water_level = water_level
	copy.falloff = falloff
	copy.warp = warp
	copy.pollution = pollution
	copy.hotspot_count = hotspot_count
	copy.hotspot_radius_min = hotspot_radius_min
	copy.hotspot_radius_max = hotspot_radius_max
	copy.hotspot_peak_min = hotspot_peak_min
	copy.hotspot_peak_max = hotspot_peak_max
	copy.hotspot_min_dist = hotspot_min_dist
	copy.hotspot_max_dist = hotspot_max_dist
	copy.chunk_size = chunk_size
	copy.load_radius = load_radius
	copy.tile_size = tile_size
	copy.world_unit_per_tile = world_unit_per_tile
	copy.mesh_resolution = mesh_resolution
	copy.enable_mesh_lod = enable_mesh_lod
	copy.lod_near = lod_near
	copy.lod_mid = lod_mid
	copy.lod_far = lod_far
	copy.skirt_depth = skirt_depth
	copy.build_budget_per_frame = build_budget_per_frame
	copy.chunk_pool_prewarm = chunk_pool_prewarm
	copy.sanitize()
	return copy


## Taille monde d’un côté de chunk (unités 3D).
func chunk_world_size() -> float:
	return float(chunk_size) * world_unit_per_tile

