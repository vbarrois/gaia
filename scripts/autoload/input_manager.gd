extends Node
## InputManager — orbit caméra 3D + inspect tuile (port OrbitControls JS).
## Accès global : `InputManager.xxx`

signal tile_selected(tile: Vector2i, data: Dictionary)
signal tile_hovered(tile: Vector2i, data: Dictionary)

@export var pan_speed: float = 90.0
@export var drag_threshold_px: float = 5.0

enum DragMode { NONE, ORBIT, PAN }

var _drag_mode: DragMode = DragMode.NONE
var _drag_start: Vector2 = Vector2.ZERO
var _drag_moved: bool = false
var _hover_tile: Vector2i = Vector2i(999_999, 999_999)


func _ready() -> void:
	GameManager.map_bound.connect(_on_map_bound)


func _on_map_bound(_map: Node) -> void:
	print("[InputManager] 3D — molette clic = orbit, droit = pan, WASD = déplacer, molette = zoom")


func _map() -> Node:
	return GameManager.draw_map


func _process(delta: float) -> void:
	if GameManager.state != GameManager.State.PLAYING and GameManager.state != GameManager.State.MAP:
		return
	var map := _map()
	if map == null or not map.has_method("pan_xz"):
		return

	var move := Vector2.ZERO
	if Input.is_action_pressed("ui_left") or Input.is_key_pressed(KEY_A):
		move.x -= 1.0
	if Input.is_action_pressed("ui_right") or Input.is_key_pressed(KEY_D):
		move.x += 1.0
	if Input.is_action_pressed("ui_up") or Input.is_key_pressed(KEY_W):
		move.y -= 1.0
	if Input.is_action_pressed("ui_down") or Input.is_key_pressed(KEY_S):
		move.y += 1.0
	if move == Vector2.ZERO:
		return

	# Pan relatif à l’orientation caméra (yaw du pivot).
	var yaw: float = 0.0
	if map.has_node("CameraPivot"):
		yaw = map.get_node("CameraPivot").rotation.y
	var forward := Vector3(-sin(yaw), 0.0, -cos(yaw))
	var right := Vector3(cos(yaw), 0.0, -sin(yaw))
	var offset := (right * move.x + forward * move.y).normalized() * pan_speed * delta
	map.pan_xz(offset)


func _unhandled_input(event: InputEvent) -> void:
	var map := _map()
	if map == null or not map.has_method("orbit"):
		return

	if event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_WHEEL_UP and mb.pressed:
			map.zoom(0.08)
		elif mb.button_index == MOUSE_BUTTON_WHEEL_DOWN and mb.pressed:
			map.zoom(-0.08)
		elif mb.button_index == MOUSE_BUTTON_MIDDLE:
			if mb.pressed:
				_begin_drag(DragMode.ORBIT, mb.position)
			else:
				_end_drag(map, mb.position)
		elif mb.button_index == MOUSE_BUTTON_RIGHT:
			if mb.pressed:
				_begin_drag(DragMode.PAN, mb.position)
			else:
				_end_drag(map, mb.position)
		elif mb.button_index == MOUSE_BUTTON_LEFT:
			if mb.pressed:
				_begin_drag(DragMode.ORBIT, mb.position)
			else:
				if not _drag_moved:
					_select_at(map, mb.position)
				_end_drag(map, mb.position)

	elif event is InputEventMouseMotion:
		var mm := event as InputEventMouseMotion
		if _drag_mode == DragMode.NONE:
			_hover_at(map, mm.position)
			return
		if mm.position.distance_to(_drag_start) > drag_threshold_px:
			_drag_moved = true
		if _drag_mode == DragMode.ORBIT:
			map.orbit(-mm.relative.x * map.orbit_sensitivity, -mm.relative.y * map.orbit_sensitivity)
		elif _drag_mode == DragMode.PAN:
			var yaw: float = 0.0
			if map.has_node("CameraPivot"):
				yaw = map.get_node("CameraPivot").rotation.y
			var right := Vector3(cos(yaw), 0.0, -sin(yaw))
			var forward := Vector3(-sin(yaw), 0.0, -cos(yaw))
			var scale: float = map.orbit_distance * 0.0015 * map.pan_sensitivity
			map.pan_xz(-right * mm.relative.x * scale + forward * mm.relative.y * scale)

	elif event is InputEventKey and event.pressed and not event.echo:
		var key := event as InputEventKey
		if key.keycode == KEY_R:
			WorldManager.reseed()
		elif key.keycode == KEY_SPACE:
			GameManager.toggle_pause()
		elif key.keycode == KEY_MINUS or key.keycode == KEY_KP_SUBTRACT:
			TimeManager.slower()
		elif key.keycode == KEY_EQUAL or key.keycode == KEY_KP_ADD:
			TimeManager.faster()
		elif key.keycode == KEY_T:
			map.reset_camera(true)
		elif key.keycode == KEY_F:
			map.reset_camera(false)
		elif key.keycode == KEY_L:
			WorldManager.cycle_view_layer(1)
		elif key.keycode == KEY_1:
			WorldManager.set_view_layer(WorldManager.ViewLayer.NATURAL)
		elif key.keycode == KEY_2:
			WorldManager.set_view_layer(WorldManager.ViewLayer.SOIL)
		elif key.keycode == KEY_3:
			WorldManager.set_view_layer(WorldManager.ViewLayer.MOISTURE)
		elif key.keycode == KEY_4:
			WorldManager.set_view_layer(WorldManager.ViewLayer.POLLUTION)
		elif key.keycode == KEY_5:
			WorldManager.set_view_layer(WorldManager.ViewLayer.FERTILITY)
		elif key.keycode == KEY_G:
			if map.has_method("toggle_chunk_grid"):
				map.toggle_chunk_grid()


func _begin_drag(mode: DragMode, pos: Vector2) -> void:
	_drag_mode = mode
	_drag_start = pos
	_drag_moved = false


func _end_drag(_map: Node, _pos: Vector2) -> void:
	_drag_mode = DragMode.NONE
	_drag_moved = false


func _select_at(map: Node, screen_pos: Vector2) -> void:
	var data: Dictionary = map.peek_at_screen(screen_pos)
	if data.is_empty():
		return
	var tile := Vector2i(int(data.get("tile_x", 0)), int(data.get("tile_y", 0)))
	tile_selected.emit(tile, data)
	print(
		"[InputManager] select (%d,%d) pol=%.0f moist=%.0f soil=%.0f fert=%.0f source=%s"
		% [
			tile.x,
			tile.y,
			float(data.get("pollution", 0.0)),
			float(data.get("moisture", 0.0)),
			float(data.get("soil", 0.0)),
			float(data.get("fertility", 0.0)),
			str(data.get("is_source", false)),
		]
	)


func _hover_at(map: Node, screen_pos: Vector2) -> void:
	var data: Dictionary = map.peek_at_screen(screen_pos)
	if data.is_empty():
		return
	var tile := Vector2i(int(data.get("tile_x", 0)), int(data.get("tile_y", 0)))
	if tile == _hover_tile:
		return
	_hover_tile = tile
	tile_hovered.emit(tile, data)
