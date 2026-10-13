class_name WindState
extends RefCounted
## Vent discret v0 — 4 directions × faible/fort (cible journalière).
## L’affichage tourne en continu via WorldManager (lerp d’angle).

enum Dir { NORTH, EAST, SOUTH, WEST }

const STRENGTH_WEAK := 1
const STRENGTH_STRONG := 2

var direction: int = Dir.WEST
var strength: int = STRENGTH_WEAK


func _init(p_dir: int = Dir.WEST, p_strength: int = STRENGTH_WEAK) -> void:
	direction = p_dir
	strength = p_strength


func label() -> String:
	var force := "fort" if strength >= STRENGTH_STRONG else "faible"
	return "%s %s" % [_dir_name(direction), force]


func arrow_glyph() -> String:
	match direction:
		Dir.NORTH:
			return "↑"
		Dir.EAST:
			return "→"
		Dir.SOUTH:
			return "↓"
		Dir.WEST:
			return "←"
		_:
			return "·"


func banner() -> String:
	return "Vent : %s %s" % [arrow_glyph(), label()]


## Angle yaw monde (rad) : 0 = Nord (−Z), +π/2 = Est (+X).
func angle_radians() -> float:
	match direction:
		Dir.NORTH:
			return 0.0
		Dir.EAST:
			return PI * 0.5
		Dir.SOUTH:
			return PI
		Dir.WEST:
			return -PI * 0.5
		_:
			return -PI * 0.5


## Vecteur XZ unitaire (direction cible cardinale).
func vector() -> Vector3:
	return vector_from_angle(angle_radians())


static func vector_from_angle(angle: float) -> Vector3:
	# 0 → Nord (−Z), tourne vers Est.
	return Vector3(sin(angle), 0.0, -cos(angle))


func duplicate_state() -> WindState:
	return WindState.new(direction, strength)


static func _dir_name(dir: int) -> String:
	match dir:
		Dir.NORTH:
			return "Nord"
		Dir.EAST:
			return "Est"
		Dir.SOUTH:
			return "Sud"
		Dir.WEST:
			return "Ouest"
		_:
			return "?"


## Hasard de partie : jet dédié (seed + jour), indépendant du Perlin relief.
## Même seed + même jour → même jet (rejouable) ; chaque jour est un jet différent.
static func from_day(world_seed: int, day: int, _perlin: Variant = null) -> WindState:
	var d := maxi(day, 1)
	# Deux hashes distincts : direction / force (pas liés au bruit de terrain).
	var dir_roll := HashUtil.hash01(world_seed * 73856093 + d * 19349663 + 17)
	var str_roll := HashUtil.hash01(world_seed * 83492791 + d * 83492791 + 91)
	var dir: int = int(floor(dir_roll * 4.0)) % 4
	# ~45 % fort — paramètre de hasard fort pour la boucle.
	var strength := STRENGTH_STRONG if str_roll < 0.45 else STRENGTH_WEAK
	return WindState.new(dir, strength)
