import { useState } from 'react'
import type { BlenderInstallation } from '../../shared/types'

function App(): React.JSX.Element {
  const [installations, setInstallations] = useState<BlenderInstallation[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function detectBlender(): Promise<void> {
    setStatus('loading')
    setErrorMessage('')

    try {
      const result = await window.api.detectBlender()

      setInstallations(result)
      setStatus('success')
    } catch (error) {
      console.error(error)

      setInstallations([])
      setStatus('error')
      setErrorMessage('No se pudo detectar Blender.')
    }
  }

  return (
    <main>
      <h1>BlendQ</h1>
      <p>Blender Render Manager</p>

      <button onClick={detectBlender} disabled={status === 'loading'}>
        {status === 'loading' ? 'Detectando...' : 'Detectar Blender'}
      </button>

      {status === 'idle' && <p>Comprueba si hay una instalación compatible de Blender.</p>}

      {status === 'loading' && <p>Buscando Blender 5.0 o superior...</p>}

      {status === 'success' && installations.length === 0 && (
        <p>No se encontró Blender 5.0 o superior.</p>
      )}

      {status === 'success' && installations.length > 0 && (
        <ul>
          {installations.map((installation) => (
            <li key={installation.executablePath}>
              <strong>{installation.version}</strong>
              <br />
              <span>{installation.executablePath}</span>
            </li>
          ))}
        </ul>
      )}

      {status === 'error' && <p>{errorMessage}</p>}
    </main>
  )
}

export default App
