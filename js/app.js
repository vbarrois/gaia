import { GameManager } from './core/GameManager.js'

function boot() {
  const host = document.getElementById('viewport')
  const error = document.getElementById('webglError')
  const loading = document.getElementById('loading')
  if (!host) return
  try {
    const game = new GameManager(host)
    game.start()
  } catch (err) {
    if (error) {
      error.classList.remove('hidden')
      const message = err instanceof Error ? err.message : `${err}`
      const stack = err instanceof Error && err.stack ? `\n${err.stack}` : ''
      error.textContent = message + stack
    }
    console.error(err)
  } finally {
    loading?.classList.add('hidden')
  }
}

boot()
