class_name MapChunk3D
extends MeshInstance3D
## Un chunk terrain 3D = un seul ArrayMesh (flat-shaded).
## Conçu pour être poolé : recycle() au lieu de queue_free.

signal built(chunk_coord: Vector2i, triangle_count: int)

var chunk_coord: Vector2i = Vector2i.ZERO
var lod_resolution: int = 16
var triangle_count: int = 0
var is_built: bool = false

var _config: WorldConfig
var _generator: TerrainGenerator


func setup(coord: Vector2i, config: WorldConfig, generator: TerrainGenerator, material: Material, resolution: int) -> void:
	chunk_coord = coord
	_config = config
	_generator = generator
	lod_resolution = resolution
	name = "Chunk3D_%d_%d" % [coord.x, coord.y]
	material_override = material
	cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	gi_mode = GeometryInstance3D.GI_MODE_DISABLED
	# Position = 0 : vertices déjà en world space (évite double transform).
	position = Vector3.ZERO
	visible = false


func build() -> void:
	var mesh := TerrainMeshBuilder.build_chunk_mesh(
		_generator,
		chunk_coord,
		_config.chunk_size,
		_config.world_unit_per_tile,
		lod_resolution,
		_config.water_level,
		_config.skirt_depth
	)
	self.mesh = mesh
	triangle_count = lod_resolution * lod_resolution * 2
	is_built = true
	visible = true
	# AABB explicite pour le frustum culling moteur.
	var unit := _config.world_unit_per_tile
	var size := float(_config.chunk_size) * unit
	var origin := Vector3(
		float(chunk_coord.x) * size,
		-20.0,
		float(chunk_coord.y) * size
	)
	custom_aabb = AABB(origin, Vector3(size, 80.0, size))
	built.emit(chunk_coord, triangle_count)


func recycle() -> void:
	visible = false
	mesh = null
	triangle_count = 0
	is_built = false
	chunk_coord = Vector2i(999_999, 999_999)
