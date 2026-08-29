import { useEffect, useState } from 'react'
import type { BlenderInstallation, BlendProjectFile } from '../../shared/types'

function App(): React.JSX.Element {
  const [installations, setInstallations] = useState<BlenderInstallation[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedProject, setSelectedProject] = useState<BlendProjectFile | null>(null)

  async function loadBlenderInstallations(): Promise<BlenderInstallation[]> {
    return window.api.detectBlender()
  }

  async function detectBlender(): Promise<void> {
    setStatus('loading')
    setErrorMessage('')

    try {
      const result = await loadBlenderInstallations()

      setInstallations(result)
      setStatus('success')
    } catch (error) {
      console.error('Failed to detect Blender installations.', error)

      setInstallations([])
      setStatus('error')
      setErrorMessage('Blender could not be detected.')
    }
  }

  async function selectProject(): Promise<void> {
    try {
      const project = await window.api.selectBlendFile()

      if (project === null) {
        return
      }

      setSelectedProject(project)
    } catch (error) {
      console.error('Failed to select Blender project.', error)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function initializeBlenderDetection(): Promise<void> {
      try {
        const result = await loadBlenderInstallations()

        if (cancelled) {
          return
        }

        setInstallations(result)
        setStatus('success')
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error('Failed to detect Blender installations.', error)

        setInstallations([])
        setStatus('error')
        setErrorMessage('Blender could not be detected.')
      }
    }

    void initializeBlenderDetection()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main>
      <h1>BlendQ</h1>
      <p>Blender Render Manager</p>

      <button onClick={detectBlender} disabled={status === 'loading'}>
        {status === 'loading' ? 'Detecting...' : 'Scan again'}
      </button>

      {status === 'idle' && <p>Preparing Blender detection...</p>}

      {status === 'loading' && <p>Looking for Blender 5.0 or newer...</p>}

      {status === 'success' && installations.length === 0 && (
        <p>No compatible Blender installation was found.</p>
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

      <section>
        <h2>Project</h2>

        <button onClick={selectProject}>Select Blender Project</button>

        {selectedProject === null ? (
          <p>No project selected.</p>
        ) : (
          <div>
            <strong>{selectedProject.name}</strong>
            <p>{selectedProject.path}</p>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
