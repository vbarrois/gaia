import { GameManager } from './core/GameManager.js'

function boot() {
  const host = document.getElementById('canvas-host')
  const error = document.getElementById('webgl-error')
  if (!host || !error) return
  try {
    const game = new GameManager(host)
    game.start()
  } catch (err) {
    error.classList.remove('hidden')
    error.textContent =
      err instanceof Error ? err.message : 'WebGL est indisponible sur cette machine.'
  }
}

boot()
