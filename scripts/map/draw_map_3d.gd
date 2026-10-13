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
## Demi-taille du plan de traits autour du focus (unités monde).
@export_range(40.0, 200.0) var wind_streak_extent: float = 95.0
## Hauteur du plan au-dessus de l’eau.
@export_range(4.0, 80.0) var wind_streak_height: float = 32.0

var focus: Vector3 = Vector3(0.0, 8.0, 0.0)
var _yaw: float = 0.7
var _pitch: float = 0.55
var _env: Environment
var _wind_streaks: MeshInstance3D
## Offsets XZ locaux au focus (évite les respawn massifs quand on pan).
var _streak_ox: PackedFloat32Array = PackedFloat32Array()
var _streak_oz: PackedFloat32Array = PackedFloat32Array()
var _streak_len: PackedFloat32Array = PackedFloat32Array()
var _rng := RandomNumberGenerator.new()


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
	_apply_camera_transform()

	ChunkManager.bind_draw_map(self)
	ChunkManager.refresh_around(focus)
	WorldManager.wind_changed.connect(_on_wind_changed)

	map_ready.emit()
	GameManager.notify_map_ready(self)


func _process(delta: float) -> void:
	# Eau suit le focus (plan quasi-infini cheap).
	water.global_position = Vector3(focus.x, config.water_level, focus.z)
	ChunkManager.refresh_around(focus)
	_update_wind_streaks(delta)


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
	var ext := wind_streak_extent
	var strong := WorldManager.wind_speed_factor() >= 1.5
	for i in wind_streak_count:
		_streak_ox[i] = _rng.randf_range(-ext, ext)
		_streak_oz[i] = _rng.randf_range(-ext, ext)
		_streak_len[i] = _rng.randf_range(2.2, 4.0) * (1.45 if strong else 1.0)


func _on_wind_changed(_wind: WindState) -> void:
	# Longueurs suivent la force lissée dans _update_wind_streaks.
	pass


func _plane_y() -> float:
	return config.water_level + wind_streak_height


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
	var ext := wind_streak_extent
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
		var half := half_base * (_streak_len[i] * len_mul / 1.2)
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


func peek_at_screen(screen_pos: Vector2) -> Dictionary:
	var tile := screen_to_tile(screen_pos)
	return ChunkManager.peek_tile(tile)
