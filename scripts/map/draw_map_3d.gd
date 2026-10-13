extends Node3D
## DrawMap3D — plateau 3D (équivalent SceneManager + TerrainManager JS).
## Caméra orbit, lumières Gaya, brouillard, eau, streaming chunks.

signal map_ready
signal focus_changed(focus: Vector3)

@onready var chunks_root: Node3D = $Chunks
@onready var camera: Camera3D = $CameraPivot/Camera3D
@onready var camera_pivot: Node3D = $CameraPivot
@onready var water: MeshInstance3D = $Water
@onready var sun: DirectionalLight3D = $Sun

@export var config: WorldConfig
@export var palette: TerrainPalette
@export var orbit_distance: float = 180.0
@export var min_distance: float = 42.0
@export var max_distance: float = 470.0
@export var orbit_sensitivity: float = 0.005
@export var pan_sensitivity: float = 0.35

@export_group("Éclairage")
@export var sun_energy_near: float = 0.72
@export var sun_energy_far: float = 0.42
@export var ambient_energy_near: float = 0.48
@export var ambient_energy_far: float = 0.28
@export var exposure_near: float = 0.95
@export var exposure_far: float = 0.82
@export var fog_enabled: bool = false

@export_group("Vent (lecture)")
## Nombre de traits sur le plan horizontal.
@export_range(40, 220) var wind_streak_count: int = 110
## Demi-taille de référence (à orbit ≈ 180) ; zoom/dézoom la scale.
@export_range(40.0, 200.0) var wind_streak_extent: float = 95.0
## Hauteur du plan au-dessus de l’eau.
@export_range(4.0, 80.0) var wind_streak_height: float = 32.0

@export_group("Debug")
## Affiche les bords des chunks (touche G).
@export var show_chunk_grid: bool = true

var focus: Vector3 = Vector3(0.0, 8.0, 0.0)
var _yaw: float = 0.7
var _pitch: float = 0.55
var _env: Environment
var _wind_streaks: MeshInstance3D
## Offsets XZ locaux au focus (évite les respawn massifs quand on pan).
var _streak_ox: PackedFloat32Array = PackedFloat32Array()
var _streak_oz: PackedFloat32Array = PackedFloat32Array()
var _streak_len: PackedFloat32Array = PackedFloat32Array()
## Étendue actuellement appliquée au wrap (suit le zoom).
var _streak_ext_live: float = 95.0
var _rng := RandomNumberGenerator.new()
var _source_root: Node3D
var _chunk_grid: MeshInstance3D
var _chunk_grid_dirty: bool = true


func _ready() -> void:
	if config == null:
		config = WorldConfig.defaults()
	config.sanitize()
	if palette == null:
		palette = preload("res://resources/configs/terrain_palette.tres")

	WorldManager.apply_config(config)
	WorldManager.apply_palette(palette, false)
	_setup_environment()
	_setup_water()
	_setup_wind_streaks()
	_setup_source_visuals()
	_setup_chunk_grid()
	_apply_camera_transform()

	ChunkManager.bind_draw_map(self)
	ChunkManager.refresh_around(focus)
	WorldManager.wind_changed.connect(_on_wind_changed)
	WorldManager.sources_changed.connect(_on_sources_changed)
	WorldManager.view_layer_changed.connect(_on_view_layer_changed)
	WorldManager.eco_changed.connect(_on_eco_changed)
	ChunkManager.chunk_loaded.connect(func(_c): _chunk_grid_dirty = true)
	ChunkManager.chunk_unloaded.connect(func(_c): _chunk_grid_dirty = true)

	_on_sources_changed()
	map_ready.emit()
	GameManager.notify_map_ready(self)


func _process(delta: float) -> void:
	# Eau suit le focus (plan quasi-infini cheap).
	water.global_position = Vector3(focus.x, config.water_level, focus.z)
	ChunkManager.refresh_around(focus)
	_update_wind_streaks(delta)
	if _chunk_grid_dirty:
		_rebuild_chunk_grid()


func _setup_environment() -> void:
	_env = Environment.new()
	_env.background_mode = Environment.BG_COLOR
	# Ciel un peu plus sombre que l’ancien #bdcfc8 (évite le voile blanc au dézoom).
	_env.background_color = Color(0.62, 0.70, 0.66)
	_env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	_env.ambient_light_color = Color(0.78, 0.84, 0.76)
	_env.ambient_light_energy = ambient_energy_near
	_env.fog_enabled = fog_enabled
	_env.fog_light_color = Color(0.62, 0.70, 0.66)
	_env.fog_density = 0.0012
	_env.tonemap_mode = Environment.TONE_MAPPER_ACES
	_env.tonemap_exposure = exposure_near
	$WorldEnvironment.environment = _env
	if sun:
		sun.light_energy = sun_energy_near
	_update_lighting_for_distance()


func _setup_water() -> void:
	var plane := PlaneMesh.new()
	plane.size = Vector2(2000.0, 2000.0)
	water.mesh = plane
	var water_col := WorldManager.palette.color_water_plane() if WorldManager.palette else Color(0.18, 0.52, 0.55, 0.82)
	water.material_override = TerrainMaterialFactory.make_water(water_col)
	water.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	water.position.y = config.water_level


func _setup_wind_streaks() -> void:
	_rng.randomize()
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.88, 0.94, 0.86, 0.55)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.roughness = 1.0

	_wind_streaks = MeshInstance3D.new()
	_wind_streaks.name = "WindStreaks"
	_wind_streaks.material_override = mat
	_wind_streaks.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_wind_streaks.gi_mode = GeometryInstance3D.GI_MODE_DISABLED
	add_child(_wind_streaks)

	_streak_ox.resize(wind_streak_count)
	_streak_oz.resize(wind_streak_count)
	_streak_len.resize(wind_streak_count)
	_streak_ext_live = _wind_extent_for_zoom()
	var ext := _streak_ext_live
	var strong := WorldManager.wind_speed_factor() >= 1.5
	for i in wind_streak_count:
		_streak_ox[i] = _rng.randf_range(-ext, ext)
		_streak_oz[i] = _rng.randf_range(-ext, ext)
		_streak_len[i] = _rng.randf_range(2.2, 4.0) * (1.45 if strong else 1.0)


func _on_wind_changed(_wind: WindState) -> void:
	# Longueurs suivent la force lissée dans _update_wind_streaks.
	pass


func _on_view_layer_changed(_layer: int) -> void:
	# Couleurs vertex dans le mesh → rebuild sur place (pas reload_all).
	ChunkManager.rebuild_loaded_meshes()


func _on_eco_changed() -> void:
	# Arbres suivent la fertilité (humidité source) même en vue naturelle.
	ChunkManager.request_eco_tree_rebuild()
	# Couches colorimétriques : recolor mesh près des sources.
	if WorldManager.view_layer != WorldManager.ViewLayer.NATURAL:
		ChunkManager.request_eco_mesh_rebuild()


func _setup_source_visuals() -> void:
	_source_root = Node3D.new()
	_source_root.name = "Sources"
	add_child(_source_root)


func _setup_chunk_grid() -> void:
	_chunk_grid = MeshInstance3D.new()
	_chunk_grid.name = "ChunkGrid"
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.95, 0.85, 0.25, 0.75)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	_chunk_grid.material_override = mat
	_chunk_grid.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_chunk_grid.gi_mode = GeometryInstance3D.GI_MODE_DISABLED
	add_child(_chunk_grid)
	_chunk_grid_dirty = true


func toggle_chunk_grid() -> void:
	show_chunk_grid = not show_chunk_grid
	_chunk_grid_dirty = true
	print("[DrawMap3D] grille chunks = %s" % ("on" if show_chunk_grid else "off"))


func _rebuild_chunk_grid() -> void:
	_chunk_grid_dirty = false
	if _chunk_grid == null or config == null:
		return
	if not show_chunk_grid:
		_chunk_grid.mesh = null
		_chunk_grid.visible = false
		return
	_chunk_grid.visible = true
	var unit := config.world_unit_per_tile
	var csize := config.chunk_size
	var world_side := float(csize) * unit
	var lift := 0.55
	var verts := PackedVector3Array()
	# Segments par bord pour suivre le relief (évite de plonger dans le terrain).
	var segs := maxi(csize, 8)
	for coord in ChunkManager.loaded_coords():
		var x0 := float(coord.x) * world_side
		var z0 := float(coord.y) * world_side
		var x1 := x0 + world_side
		var z1 := z0 + world_side
		_append_chunk_edge(verts, x0, z0, x1, z0, segs, unit, lift)  # nord
		_append_chunk_edge(verts, x0, z1, x1, z1, segs, unit, lift)  # sud
		_append_chunk_edge(verts, x0, z0, x0, z1, segs, unit, lift)  # ouest
		_append_chunk_edge(verts, x1, z0, x1, z1, segs, unit, lift)  # est
	if verts.is_empty():
		_chunk_grid.mesh = null
		return
	var arrays: Array = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = verts
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_LINES, arrays)
	_chunk_grid.mesh = mesh


func _append_chunk_edge(
	verts: PackedVector3Array,
	ax: float, az: float, bx: float, bz: float,
	segs: int, unit: float, lift: float
) -> void:
	for i in segs:
		var t0 := float(i) / float(segs)
		var t1 := float(i + 1) / float(segs)
		var x0 := lerpf(ax, bx, t0)
		var z0 := lerpf(az, bz, t0)
		var x1 := lerpf(ax, bx, t1)
		var z1 := lerpf(az, bz, t1)
		var tx0 := floori(x0 / unit)
		var tz0 := floori(z0 / unit)
		var tx1 := floori(x1 / unit)
		var tz1 := floori(z1 / unit)
		var y0 := WorldManager.height_at_tile(tx0, tz0) + lift
		var y1 := WorldManager.height_at_tile(tx1, tz1) + lift
		verts.append(Vector3(x0, y0, z0))
		verts.append(Vector3(x1, y1, z1))


func _on_sources_changed() -> void:
	_rebuild_source_markers()
	# Centre la vue sur la source principale.
	var primary := WorldManager.primary_source()
	if primary:
		var unit := config.world_unit_per_tile
		set_focus(Vector3(
			(float(primary.tile.x) + 0.5) * unit,
			8.0,
			(float(primary.tile.y) + 0.5) * unit
		))
	# Fertilité / oasis à jour → rescan arbres.
	ChunkManager.rebuild_all_trees()


func _rebuild_source_markers() -> void:
	if _source_root == null:
		return
	for child in _source_root.get_children():
		child.queue_free()
	var unit := config.world_unit_per_tile
	for src in WorldManager.sources:
		var marker := _make_source_marker(src)
		var h := WorldManager.height_at_tile(src.tile.x, src.tile.y)
		marker.position = Vector3(
			(float(src.tile.x) + 0.5) * unit,
			h + 0.8,
			(float(src.tile.y) + 0.5) * unit
		)
		_source_root.add_child(marker)


func _make_source_marker(src: WaterSource) -> Node3D:
	var root := Node3D.new()
	root.name = "Source_%d_%d" % [src.tile.x, src.tile.y]
	root.set_meta("source_tile", src.tile)

	var ring := MeshInstance3D.new()
	var torus := TorusMesh.new()
	torus.inner_radius = 1.6
	torus.outer_radius = 1.85
	torus.rings = 8
	torus.ring_segments = 24
	ring.mesh = torus
	var ring_mat := StandardMaterial3D.new()
	ring_mat.albedo_color = Color(0.73, 0.93, 0.94)
	ring_mat.emission_enabled = true
	ring_mat.emission = Color(0.3, 0.55, 0.58)
	ring_mat.emission_energy_multiplier = 0.6
	ring.material_override = ring_mat
	ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(ring)

	var beacon := MeshInstance3D.new()
	var oct := SphereMesh.new()
	oct.radius = 0.55
	oct.height = 1.1
	beacon.mesh = oct
	var bmat := StandardMaterial3D.new()
	bmat.albedo_color = Color(0.51, 0.85, 0.87)
	bmat.emission_enabled = true
	bmat.emission = Color(0.29, 0.51, 0.55)
	bmat.emission_energy_multiplier = 0.8
	beacon.material_override = bmat
	beacon.position = Vector3(0.0, 1.2, 0.0)
	beacon.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(beacon)
	return root


func _plane_y() -> float:
	return config.water_level + wind_streak_height


## Demi-étendue du calque vent selon le zoom (suit le champ de vue).
func _wind_extent_for_zoom() -> float:
	# Réf. exportée ≈ orbit 180 ; near plus serré, far plus large.
	var ref_orbit := 180.0
	var scale := orbit_distance / ref_orbit
	return clampf(wind_streak_extent * scale, 36.0, 360.0)


## Wrap toroïdal dans [-ext, ext].
static func _wrap_extent(v: float, ext: float) -> float:
	var span := ext * 2.0
	var t := fposmod(v + ext, span) - ext
	return t


func _update_wind_streaks(delta: float) -> void:
	if _wind_streaks == null or config == null or not WorldManager.wind_ready:
		return
	var dir := WorldManager.wind_vector()
	var speed := lerpf(9.0, 18.0, clampf(WorldManager.wind_speed_factor() - 1.0, 0.0, 1.0))
	var len_mul := lerpf(1.0, 1.45, clampf(WorldManager.wind_speed_factor() - 1.0, 0.0, 1.0))
	var y := _plane_y()
	var ext := _wind_extent_for_zoom()
	# Rescale les offsets si le zoom a changé l’étendue (évite trou / densité bizarre).
	if _streak_ext_live > 0.01 and not is_equal_approx(ext, _streak_ext_live):
		var s := ext / _streak_ext_live
		for i in _streak_ox.size():
			_streak_ox[i] *= s
			_streak_oz[i] *= s
	_streak_ext_live = ext
	# Traits un peu plus longs au dézoom pour rester lisibles.
	var zoom_len := clampf(ext / wind_streak_extent, 0.65, 2.4)
	var dx := dir.x * speed * delta
	var dz := dir.z * speed * delta

	var verts := PackedVector3Array()
	verts.resize(_streak_ox.size() * 2)
	var half_base := dir * 0.5
	for i in _streak_ox.size():
		# Offsets locaux au focus → le pan ne déclenche plus de respawn.
		_streak_ox[i] = _wrap_extent(_streak_ox[i] + dx, ext)
		_streak_oz[i] = _wrap_extent(_streak_oz[i] + dz, ext)
		var p := Vector3(focus.x + _streak_ox[i], y, focus.z + _streak_oz[i])
		var half := half_base * (_streak_len[i] * len_mul * zoom_len / 1.2)
		verts[i * 2] = p - half
		verts[i * 2 + 1] = p + half

	var arrays: Array = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = verts
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_LINES, arrays)
	_wind_streaks.mesh = mesh


func _apply_camera_transform() -> void:
	_pitch = clampf(_pitch, 0.08, 1.35)
	orbit_distance = clampf(orbit_distance, min_distance, max_distance)
	camera_pivot.global_position = focus
	camera_pivot.rotation = Vector3(-_pitch, _yaw, 0.0)
	# Camera3D regarde vers -Z local → placée en +Z elle vise le pivot.
	camera.position = Vector3(0.0, 0.0, orbit_distance)
	camera.rotation = Vector3.ZERO
	_update_lighting_for_distance()


## Au dézoom : moins d’ambiance / soleil, un peu plus de fog (moins « flashé »).
func _update_lighting_for_distance() -> void:
	if _env == null:
		return
	var t := inverse_lerp(min_distance, max_distance, orbit_distance)
	t = smoothstep(0.0, 1.0, t)
	_env.ambient_light_energy = lerpf(ambient_energy_near, ambient_energy_far, t)
	_env.tonemap_exposure = lerpf(exposure_near, exposure_far, t)
	if sun:
		sun.light_energy = lerpf(sun_energy_near, sun_energy_far, t)


func get_camera() -> Camera3D:
	return camera


func get_chunks_root() -> Node3D:
	return chunks_root


## yaw (x) / pitch (y) — pour boussole vent 3D synchronisée au POV.
func get_orbit_angles() -> Vector2:
	return Vector2(_yaw, _pitch)


func get_focus() -> Vector3:
	return focus


func set_focus(world_pos: Vector3) -> void:
	focus = world_pos
	focus.y = 8.0
	_apply_camera_transform()
	focus_changed.emit(focus)
	ChunkManager.refresh_around(focus)


func orbit(delta_yaw: float, delta_pitch: float) -> void:
	_yaw += delta_yaw
	_pitch += delta_pitch
	_apply_camera_transform()


func zoom(delta: float) -> void:
	orbit_distance *= 1.0 - delta
	_apply_camera_transform()


func pan_xz(offset: Vector3) -> void:
	focus += offset
	focus.y = 8.0
	_apply_camera_transform()
	focus_changed.emit(focus)


func reset_camera(top: bool = false) -> void:
	focus = Vector3(0.0, 8.0, 0.0)
	orbit_distance = 180.0
	if top:
		_yaw = 0.0
		_pitch = 1.35
	else:
		_yaw = 0.7
		_pitch = 0.55
	_apply_camera_transform()
	ChunkManager.refresh_around(focus)


## Ray → plan horizontal à y ≈ hauteur focus, puis tuile.
func screen_to_tile(screen_pos: Vector2) -> Vector2i:
	var hit := screen_to_ground(screen_pos)
	return ChunkManager.world_to_tile(hit)


func screen_to_ground(screen_pos: Vector2) -> Vector3:
	var from := camera.project_ray_origin(screen_pos)
	var dir := camera.project_ray_normal(screen_pos)
	var plane_y := config.water_level + 6.0
	if absf(dir.y) < 0.0001:
		return focus
	var t := (plane_y - from.y) / dir.y
	if t < 0.0:
		return focus
	return from + dir * t


func peek_at_screen(screen_pos: Vector2, _snap_sources: bool = false) -> Dictionary:
	return ChunkManager.peek_tile(screen_to_tile(screen_pos))
