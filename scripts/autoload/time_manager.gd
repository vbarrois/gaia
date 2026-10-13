extends Node
## TimeManager — vitesse de simulation (port de `js/core/TimeManager.js`).
## Pour l’instant : pause / 1× / 3×. La boucle tour-par-tour viendra avec P2/P3.
## Accès global : `TimeManager.xxx`

signal speed_changed(speed: float)
signal day_advanced(day: int)

const DAY_SECONDS := 8.0

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
	while _day_accum >= DAY_SECONDS:
		_day_accum -= DAY_SECONDS
		day += 1
		day_advanced.emit(day)


func set_speed(new_speed: float) -> void:
	speed = maxf(0.0, new_speed)
	paused = is_zero_approx(speed)
	speed_changed.emit(speed)


func set_paused(value: bool) -> void:
	paused = value
	if paused:
		speed_changed.emit(0.0)
	else:
		speed_changed.emit(speed)


func step_day() -> void:
	day += 1
	_day_accum = 0.0
	day_advanced.emit(day)


func reset() -> void:
	day = 1
	_day_accum = 0.0
	day_advanced.emit(day)
