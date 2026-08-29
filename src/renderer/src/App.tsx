import { useEffect, useState } from 'react'
import type { BlenderInstallation, BlendProjectFile, BlendProjectInfo } from '../../shared/types'

type BlenderStatus = 'loading' | 'success' | 'not-found' | 'error'

type ProjectStatus = 'idle' | 'loading' | 'success' | 'error'

function App(): React.JSX.Element {
  const [blenderInstallations, setBlenderInstallations] = useState<BlenderInstallation[]>([])

  const [blenderStatus, setBlenderStatus] = useState<BlenderStatus>('loading')

  const [blenderErrorMessage, setBlenderErrorMessage] = useState<string | null>(null)

  const [selectedProject, setSelectedProject] = useState<BlendProjectFile | null>(null)

  const [projectInfo, setProjectInfo] = useState<BlendProjectInfo | null>(null)

  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('idle')

  async function loadBlenderInstallations(): Promise<BlenderInstallation[]> {
    return window.api.detectBlender()
  }

  async function detectBlender(): Promise<void> {
    setBlenderStatus('loading')
    setBlenderErrorMessage(null)

    try {
      const installations = await loadBlenderInstallations()

      setBlenderInstallations(installations)

      if (installations.length === 0) {
        setBlenderStatus('not-found')
      } else {
        setBlenderStatus('success')
      }
    } catch (error) {
      console.error('Failed to detect Blender installations.', error)

      setBlenderInstallations([])
      setBlenderErrorMessage('BlendQ could not detect Blender installations.')
      setBlenderStatus('error')
    }
  }

  async function openProject(): Promise<void> {
    setProjectStatus('loading')

    try {
      const result = await window.api.openBlendProject()

      if (result === null) {
        setProjectStatus(selectedProject === null ? 'idle' : 'success')

        return
      }

      setSelectedProject(result.file)
      setProjectInfo(result.info)
      setProjectStatus('success')
    } catch (error) {
      console.error('Failed to open Blender project.', error)

      setProjectInfo(null)
      setProjectStatus('error')
    }
  }

  useEffect(() => {
    let cancelled = false

    async function initializeBlenderDetection(): Promise<void> {
      try {
        const installations = await loadBlenderInstallations()

        if (cancelled) {
          return
        }

        setBlenderInstallations(installations)

        if (installations.length === 0) {
          setBlenderStatus('not-found')
        } else {
          setBlenderStatus('success')
        }
      } catch (error) {
        console.error('Failed to detect Blender installations.', error)

        if (cancelled) {
          return
        }

        setBlenderInstallations([])
        setBlenderErrorMessage('BlendQ could not detect Blender installations.')
        setBlenderStatus('error')
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

      <section>
        <h2>Blender</h2>

        {blenderStatus === 'loading' && <p>Detecting Blender...</p>}

        {blenderStatus === 'not-found' && <p>No compatible Blender installation was found.</p>}

        {blenderStatus === 'error' && (
          <p>{blenderErrorMessage ?? 'An unexpected Blender detection error occurred.'}</p>
        )}

        {blenderStatus === 'success' && (
          <>
            {blenderInstallations.map((installation) => (
              <div key={installation.executablePath}>
                <strong>Blender {installation.version}</strong>

                <p>{installation.executablePath}</p>

                {installation.isLts && <p>LTS</p>}
              </div>
            ))}
          </>
        )}

        <button type="button" onClick={detectBlender} disabled={blenderStatus === 'loading'}>
          {blenderStatus === 'loading' ? 'Scanning...' : 'Scan Again'}
        </button>
      </section>

      <section>
        <h2>Project</h2>

        <button type="button" onClick={openProject} disabled={projectStatus === 'loading'}>
          {projectStatus === 'loading' ? 'Loading Project...' : 'Select Blender Project'}
        </button>

        {selectedProject === null && projectStatus !== 'loading' && <p>No project selected.</p>}

        {selectedProject !== null && (
          <div>
            <strong>{selectedProject.name}</strong>
            <p>{selectedProject.path}</p>
          </div>
        )}

        {projectStatus === 'loading' && <p>Inspecting Blender project...</p>}

        {projectStatus === 'error' && <p>The Blender project could not be loaded.</p>}

        {projectStatus === 'success' && projectInfo !== null && (
          <div>
            <h3>Scenes</h3>

            {projectInfo.scenes.length === 0 ? (
              <p>No scenes were found.</p>
            ) : (
              <ul>
                {projectInfo.scenes.map((scene) => (
                  <li key={scene.name}>
                    <strong>{scene.name}</strong>

                    <br />

                    <span>
                      Frames {scene.frameStart}–{scene.frameEnd}
                    </span>

                    <br />

                    <span>Step: {scene.frameStep}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
