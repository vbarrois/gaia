extends Node
## TimeManager — vitesse de simulation (port de `js/core/TimeManager.js`).
## Paliers : pause / 0.5× / 1× / 2× / 3× / 10× / 100× / 300×.
## Accès global : `TimeManager.xxx`

signal speed_changed(speed: float)
## Émis au plus 1× / frame (day = jour courant, count = jours écoulés cette frame).
signal days_advanced(day: int, count: int)
## Alias pratique (même cadence que days_advanced, sans count).
signal day_advanced(day: int)

const DAY_SECONDS := 8.0
## Évite les hitchs en ×100/×300 (simu + rebuilds).
const MAX_DAYS_PER_FRAME := 4
## Paliers de tempo (0 = pause).
const SPEED_STEPS: Array[float] = [0.0, 0.5, 1.0, 2.0, 3.0, 10.0, 100.0, 300.0]

var speed: float = 1.0
var paused: bool = false
var day: int = 1
var _day_accum: float = 0.0


func _process(delta: float) -> void:
	if paused or speed <= 0.0:
		return
	if GameManager.state != GameManager.State.PLAYING:
		return
	_day_accum += delta * speed
	var n := 0
	while _day_accum >= DAY_SECONDS and n < MAX_DAYS_PER_FRAME:
		_day_accum -= DAY_SECONDS
		day += 1
		n += 1
	# Surplus : on garde l’accum mais on plafonne le travail (lisse le ×100).
	if _day_accum > DAY_SECONDS * float(MAX_DAYS_PER_FRAME):
		_day_accum = DAY_SECONDS * float(MAX_DAYS_PER_FRAME)
	if n > 0:
		days_advanced.emit(day, n)
		day_advanced.emit(day)


func set_speed(new_speed: float) -> void:
	speed = maxf(0.0, new_speed)
	paused = is_zero_approx(speed)
	_sync_game_state()
	speed_changed.emit(effective_speed())


func set_paused(value: bool) -> void:
	paused = value
	# Reprise depuis le palier « Pause » (speed 0) → 1×.
	if not paused and is_zero_approx(speed):
		speed = 1.0
	_sync_game_state()
	speed_changed.emit(effective_speed())


## Vitesse effectivement appliquée (0 si pause).
func effective_speed() -> float:
	if paused or speed <= 0.0:
		return 0.0
	return speed


func speed_label() -> String:
	var s := effective_speed()
	if s <= 0.0:
		return "Pause"
	if is_equal_approx(s, 0.5):
		return "0.5×"
	return "%d×" % int(round(s))


func slower() -> void:
	var idx := _step_index(effective_speed())
	set_speed(SPEED_STEPS[maxi(idx - 1, 0)])


func faster() -> void:
	var idx := _step_index(effective_speed())
	set_speed(SPEED_STEPS[mini(idx + 1, SPEED_STEPS.size() - 1)])


func step_day() -> void:
	day += 1
	_day_accum = 0.0
	days_advanced.emit(day, 1)
	day_advanced.emit(day)


func reset() -> void:
	day = 1
	_day_accum = 0.0
	days_advanced.emit(day, 0)
	day_advanced.emit(day)


func _step_index(s: float) -> int:
	var best := 0
	var best_d := INF
	for i in SPEED_STEPS.size():
		var d := absf(SPEED_STEPS[i] - s)
		if d < best_d:
			best_d = d
			best = i
	return best


func _sync_game_state() -> void:
	if not GameManager:
		return
	if effective_speed() <= 0.0:
		if GameManager.state == GameManager.State.PLAYING:
			GameManager.set_state(GameManager.State.PAUSED)
	elif GameManager.state == GameManager.State.PAUSED:
		GameManager.set_state(GameManager.State.PLAYING)
