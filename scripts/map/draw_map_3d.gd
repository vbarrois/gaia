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
@export var sun_energy_near: float = 1.05
@export var sun_energy_far: float = 0.55
@export var ambient_energy_near: float = 0.28
@export var ambient_energy_far: float = 0.12
@export var exposure_near: float = 1.0
@export var exposure_far: float = 0.82
@export var fog_enabled: bool = false

var focus: Vector3 = Vector3(0.0, 8.0, 0.0)
var _yaw: float = 0.7
var _pitch: float = 0.55
var _env: Environment


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
	_apply_camera_transform()

	ChunkManager.bind_draw_map(self)
	ChunkManager.refresh_around(focus)

	map_ready.emit()
	GameManager.notify_map_ready(self)


func _process(_delta: float) -> void:
	# Eau suit le focus (plan quasi-infini cheap).
	water.global_position = Vector3(focus.x, config.water_level, focus.z)
	ChunkManager.refresh_around(focus)


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
