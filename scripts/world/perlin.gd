class_name Perlin
extends RefCounted
## Bruit de Perlin seedé (Ken Perlin 2002) — port de `js/world/perlinGaya.js`.
## Utilisé pour le relief, la pollution initiale, et plus tard la météo.

var _p: PackedInt32Array


func _init(seed: int = 0) -> void:
	_build_permutation(seed)


func _build_permutation(seed: int) -> void:
	var rand := RandomNumberGenerator.new()
	rand.seed = seed as int

	var base: Array[int] = []
	base.resize(256)
	for i in 256:
		base[i] = i
	for i in range(255, 0, -1):
		var j := rand.randi_range(0, i)
		var tmp := base[i]
		base[i] = base[j]
		base[j] = tmp

	_p = PackedInt32Array()
	_p.resize(512)
	for i in 512:
		_p[i] = base[i & 255]


func noise(x: float, y: float, z: float = 0.735) -> float:
	var X := int(floor(x)) & 255
	var Y := int(floor(y)) & 255
	var Z := int(floor(z)) & 255
	x -= floor(x)
	y -= floor(y)
	z -= floor(z)

	var u := _fade(x)
	var v := _fade(y)
	var w := _fade(z)

	var A := _p[X] + Y
	var AA := _p[A] + Z
	var AB := _p[A + 1] + Z
	var B := _p[X + 1] + Y
	var BA := _p[B] + Z
	var BB := _p[B + 1] + Z

	return _lerp(
		_lerp(
			_lerp(_grad(_p[AA], x, y, z), _grad(_p[BA], x - 1.0, y, z), u),
			_lerp(_grad(_p[AB], x, y - 1.0, z), _grad(_p[BB], x - 1.0, y - 1.0, z), u),
			v
		),
		_lerp(
			_lerp(_grad(_p[AA + 1], x, y, z - 1.0), _grad(_p[BA + 1], x - 1.0, y, z - 1.0), u),
			_lerp(_grad(_p[AB + 1], x, y - 1.0, z - 1.0), _grad(_p[BB + 1], x - 1.0, y - 1.0, z - 1.0), u),
			v
		),
		w
	)


## Fractional Brownian Motion — empile des octaves de Perlin.
func fbm(x: float, z: float, octaves: int, persistence: float) -> float:
	var value := 0.0
	var a := 1.0
	var total := 0.0
	var f := 1.0
	for o in octaves:
		value += noise(x * f, z * f, 0.735 + o * 0.411) * a
		total += a
		a *= persistence
		f *= 2.0
	return value / total if total > 0.0 else 0.0


static func _fade(t: float) -> float:
	return t * t * t * (t * (t * 6.0 - 15.0) + 10.0)


static func _lerp(a: float, b: float, t: float) -> float:
	return a + (b - a) * t


static func _grad(h: int, gx: float, gy: float, gz: float) -> float:
	h &= 15
	var u := gx if h < 8 else gy
	var v: float
	if h < 4:
		v = gy
	elif h == 12 or h == 14:
		v = gx
	else:
		v = gz
	return (-u if h & 1 else u) + (-v if h & 2 else v)
