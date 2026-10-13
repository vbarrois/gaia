extends Node
## GameManager — orchestration haut niveau (équivalent `js/core/GameManager.js`).
## Accès global : `GameManager.xxx`

enum State { BOOT, MAP, PLAYING, PAUSED, EDITOR }

signal state_changed(new_state: State)
signal map_bound(map_node: Node)

var state: State = State.BOOT
## DrawMap3D (Node3D) — plateau actif.
var draw_map: Node = null


func _ready() -> void:
	print("[GameManager] boot — Gaïa Godot 3D")
	set_state(State.BOOT)


func set_state(new_state: State) -> void:
	if state == new_state:
		return
	state = new_state
	state_changed.emit(state)
	print("[GameManager] state → %s" % State.keys()[state])


func notify_map_ready(map_node: Node) -> void:
	draw_map = map_node
	map_bound.emit(map_node)
	set_state(State.MAP)
	set_state(State.PLAYING)


func is_playing() -> bool:
	return state == State.PLAYING


func toggle_pause() -> void:
	if state == State.PLAYING:
		TimeManager.set_paused(true)
	elif state == State.PAUSED:
		TimeManager.set_paused(false)
