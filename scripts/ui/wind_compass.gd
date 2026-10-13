class_name WindCompass
extends SubViewportContainer
## Boussole vent 3D (cône) — même POV orbit que la caméra principale.
## Sol = plan XZ (identique à la surface d’eau / tuiles).

const VIEW_SIZE := Vector2i(96, 96)
const CONE_HEIGHT := 2.2

var _viewport: SubViewport
var _cam_pivot: Node3D
var _camera: Camera3D
var _cone: MeshInstance3D
var _strength: int = WindState.STRENGTH_WEAK


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	stretch = true
	custom_minimum_size = Vector2(VIEW_SIZE)
	_build_scene()
	if WorldManager:
		WorldManager.wind_changed.connect(_on_wind)
		if WorldManager.wind:
			_on_wind(WorldManager.wind)
	set_process(true)


func _build_scene() -> void:
	_viewport = SubViewport.new()
	_viewport.name = "WindView"
	_viewport.size = VIEW_SIZE
	_viewport.transparent_bg = true
	_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_viewport.own_world_3d = true
	add_child(_viewport)

	var world_root := Node3D.new()
	world_root.name = "Root"
	_viewport.add_child(world_root)

	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.08, 0.12, 0.1, 0.0)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.85, 0.9, 0.82)
	e.ambient_light_energy = 0.85
	env.environment = e
	world_root.add_child(env)

	var light := DirectionalLight3D.new()
	light.light_energy = 0.9
	light.rotation_degrees = Vector3(-42, 35, 0)
	world_root.add_child(light)

	_cam_pivot = Node3D.new()
	_cam_pivot.name = "CamPivot"
	world_root.add_child(_cam_pivot)

	_camera = Camera3D.new()
	_camera.fov = 36.0
	_camera.near = 0.05
	_camera.far = 40.0
	_camera.current = true
	_camera.position = Vector3(0.0, 0.0, 6.5)
	_cam_pivot.add_child(_camera)

	# Cercle à plat sur le sol (plan XZ = même plan que l’eau / les tuiles).
	var disc := MeshInstance3D.new()
	disc.name = "GroundRing"
	var disc_mesh := CylinderMesh.new()
	disc_mesh.top_radius = 1.25
	disc_mesh.bottom_radius = 1.25
	disc_mesh.height = 0.04
	disc_mesh.radial_segments = 32
	disc.mesh = disc_mesh
	var disc_mat := StandardMaterial3D.new()
	disc_mat.albedo_color = Color(0.45, 0.55, 0.42, 0.55)
	disc_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	disc_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	disc.material_override = disc_mat
	disc.position = Vector3(0.0, 0.0, 0.0)
	world_root.add_child(disc)

	# Anneau fin pour lire le bord du disque.
	var rim := MeshInstance3D.new()
	var rim_mesh := TorusMesh.new()
	rim_mesh.inner_radius = 1.22
	rim_mesh.outer_radius = 1.32
	rim_mesh.rings = 8
	rim_mesh.ring_segments = 28
	rim.mesh = rim_mesh
	var rim_mat := StandardMaterial3D.new()
	rim_mat.albedo_color = Color(0.78, 0.88, 0.72, 0.7)
	rim_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	rim_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	rim.material_override = rim_mat
	rim.position = Vector3(0.0, 0.03, 0.0)
	world_root.add_child(rim)

	var cone_mesh := CylinderMesh.new()
	cone_mesh.top_radius = 0.02
	cone_mesh.bottom_radius = 0.42
	cone_mesh.height = CONE_HEIGHT
	cone_mesh.radial_segments = 10
	cone_mesh.rings = 1

	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.86, 0.94, 0.78)
	mat.roughness = 0.75
	mat.metallic = 0.05

	_cone = MeshInstance3D.new()
	_cone.name = "WindCone"
	_cone.mesh = cone_mesh
	_cone.material_override = mat
	world_root.add_child(_cone)


func _on_wind(wind: WindState) -> void:
	_strength = wind.strength


func _orient_cone(dir: Vector3) -> void:
	if _cone == null:
		return
	var d := Vector3(dir.x, 0.0, dir.z).normalized()
	if d.is_zero_approx():
		d = Vector3(-1.0, 0.0, 0.0)
	# Cône le long de +Y → aligné sur le vent courant (lissé).
	_cone.basis = Basis(Quaternion(Vector3.UP, d))
	var str_f := WorldManager.wind_speed_factor() if WorldManager else float(_strength)
	var s := lerpf(0.88, 1.1, clampf(str_f - 1.0, 0.0, 1.0))
	_cone.scale = Vector3(s, s, s)
	# Base au centre du disque, pointe vers l’extérieur (ne traverse plus le sol).
	var half_h := CONE_HEIGHT * 0.5 * s
	_cone.position = d * half_h + Vector3(0.0, 0.35, 0.0)


func _process(_delta: float) -> void:
	_sync_pov()
	if WorldManager and WorldManager.wind_ready and _cone:
		_orient_cone(WorldManager.wind_vector())


func _sync_pov() -> void:
	if _cam_pivot == null:
		return
	var map := GameManager.draw_map if GameManager else null
	if map == null or not map.has_method("get_orbit_angles"):
		return
	var angles: Vector2 = map.get_orbit_angles()
	_cam_pivot.rotation = Vector3(-angles.y, angles.x, 0.0)
