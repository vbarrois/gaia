class_name HashUtil
extends RefCounted
## Hash déterministe 0..1 — port de `js/world/math.js` `hash()`.


static func hash01(n: int) -> float:
	var x: int = n & 0xFFFFFFFF
	x = int((x ^ (x >> 16)) * 0x45d9f3b) & 0xFFFFFFFF
	x = int((x ^ (x >> 16)) * 0x45d9f3b) & 0xFFFFFFFF
	x = (x ^ (x >> 16)) & 0xFFFFFFFF
	return float(x) / 4294967296.0
