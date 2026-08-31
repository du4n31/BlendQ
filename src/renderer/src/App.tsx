import { useEffect, useMemo, useState } from 'react'

import type {
  BlenderInstallation,
  BlendProjectFile,
  BlendProjectInfo,
  LocalWorkerSettings,
  RenderEvent,
  RenderOutputMode,
  ColabEnvironmentStatus
} from '../../shared/types'

type BlenderStatus = 'loading' | 'success' | 'not-found' | 'error'

type ProjectStatus = 'idle' | 'loading' | 'success' | 'error'

type RenderStatus = 'idle' | 'running' | 'completed' | 'error'

function App(): React.JSX.Element {
  const [blenderInstallations, setBlenderInstallations] = useState<BlenderInstallation[]>([])

  const [blenderStatus, setBlenderStatus] = useState<BlenderStatus>('loading')

  const [blenderErrorMessage, setBlenderErrorMessage] = useState<string | null>(null)

  const [selectedProject, setSelectedProject] = useState<BlendProjectFile | null>(null)

  const [projectInfo, setProjectInfo] = useState<BlendProjectInfo | null>(null)

  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('idle')

  const [selectedSceneName, setSelectedSceneName] = useState('')

  const [frameStart, setFrameStart] = useState(1)

  const [frameEnd, setFrameEnd] = useState(1)

  const [frameStep, setFrameStep] = useState(1)

  const [outputMode, setOutputMode] = useState<RenderOutputMode>('scene-output')

  const [outputDirectory, setOutputDirectory] = useState<string | null>(null)

  const [localWorkerMode, setLocalWorkerMode] = useState<'automatic' | 'manual'>('automatic')

  const [manualWorkerCount, setManualWorkerCount] = useState(2)

  const [renderStatus, setRenderStatus] = useState<RenderStatus>('idle')

  const [renderEvents, setRenderEvents] = useState<RenderEvent[]>([])

  const [renderErrorMessage, setRenderErrorMessage] = useState<string | null>(null)

  const selectedScene = useMemo(() => {
    return projectInfo?.scenes.find((scene) => scene.name === selectedSceneName) ?? null
  }, [projectInfo, selectedSceneName])

  const [colabStatus, setColabStatus] = useState<ColabEnvironmentStatus | null>(null)

  const [colabDetecting, setColabDetecting] = useState(false)

  async function detectColab(): Promise<void> {
    setColabDetecting(true)

    try {
      const status = await window.api.detectColabEnvironment()

      setColabStatus(status)
    } catch (error) {
      console.error('Failed to detect Google Colab CLI environment.', error)

      setColabStatus({
        state: 'error',
        message: 'BlendQ could not detect the Google Colab CLI environment.'
      })
    } finally {
      setColabDetecting(false)
    }
  }

  async function loadBlenderInstallations(): Promise<BlenderInstallation[]> {
    return window.api.detectBlender()
  }

  async function detectBlender(): Promise<void> {
    setBlenderStatus('loading')
    setBlenderErrorMessage(null)

    try {
      const installations = await loadBlenderInstallations()

      setBlenderInstallations(installations)

      setBlenderStatus(installations.length === 0 ? 'not-found' : 'success')
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

      const firstScene = result.info.scenes[0]

      if (firstScene) {
        setSelectedSceneName(firstScene.name)

        setFrameStart(firstScene.frameStart)

        setFrameEnd(firstScene.frameEnd)

        setFrameStep(firstScene.frameStep)
      } else {
        setSelectedSceneName('')
      }

      setOutputDirectory(null)

      setLocalWorkerMode('automatic')

      setManualWorkerCount(2)

      setRenderEvents([])
      setRenderStatus('idle')
      setRenderErrorMessage(null)
    } catch (error) {
      console.error('Failed to open Blender project.', error)

      setProjectInfo(null)
      setProjectStatus('error')
    }
  }

  async function selectOutputDirectory(): Promise<void> {
    try {
      const directory = await window.api.selectRenderOutputDirectory()

      if (directory !== null) {
        setOutputDirectory(directory)
      }
    } catch (error) {
      console.error('Failed to select render output directory.', error)
    }
  }

  async function startRender(): Promise<void> {
    if (selectedProject === null || selectedScene === null || outputDirectory === null) {
      return
    }

    const localWorkerSettings: LocalWorkerSettings =
      localWorkerMode === 'automatic'
        ? {
            mode: 'automatic'
          }
        : {
            mode: 'manual',
            workerCount: manualWorkerCount
          }

    setRenderStatus('running')
    setRenderEvents([])
    setRenderErrorMessage(null)

    try {
      await window.api.startLocalRender({
        blendFilePath: selectedProject.path,
        sceneName: selectedScene.name,
        frameRange: {
          start: frameStart,
          end: frameEnd,
          step: frameStep
        },
        outputMode,
        outputDirectory,
        localWorkerSettings
      })
    } catch (error) {
      console.error('Failed to start Blender render job.', error)

      setRenderErrorMessage('The render job could not be started.')

      setRenderStatus('error')
    }
  }

  useEffect(() => {
    let cancelled = false

    async function initialize(): Promise<void> {
      try {
        const installations = await loadBlenderInstallations()

        if (cancelled) {
          return
        }

        setBlenderInstallations(installations)

        setBlenderStatus(installations.length === 0 ? 'not-found' : 'success')
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

    void initialize()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const unsubscribe = window.api.onRenderEvent((event) => {
      setRenderEvents((currentEvents) => [...currentEvents, event])

      if (event.type === 'error') {
        setRenderErrorMessage(event.message)

        setRenderStatus('error')
      }

      if (event.type === 'job-completed') {
        setRenderStatus('completed')
      }
    })

    return unsubscribe
  }, [])

  function handleSceneChange(sceneName: string): void {
    setSelectedSceneName(sceneName)

    const scene = projectInfo?.scenes.find((candidate) => candidate.name === sceneName)

    if (scene) {
      setFrameStart(scene.frameStart)

      setFrameEnd(scene.frameEnd)

      setFrameStep(scene.frameStep)
    }
  }

  const hasValidManualWorkerCount =
    Number.isSafeInteger(manualWorkerCount) && manualWorkerCount >= 1

  const canRender =
    selectedProject !== null &&
    selectedScene !== null &&
    outputDirectory !== null &&
    renderStatus !== 'running' &&
    (localWorkerMode === 'automatic' || hasValidManualWorkerCount)

  return (
    <main>
      <h1>BlendQ</h1>

      <p>Local Blender rendering</p>

      <section>
        <h2>Blender</h2>

        {blenderStatus === 'loading' && <p>Detecting Blender...</p>}

        {blenderStatus === 'not-found' && <p>No compatible Blender installation was found.</p>}

        {blenderStatus === 'error' && (
          <p>{blenderErrorMessage ?? 'An unexpected Blender detection error occurred.'}</p>
        )}

        {blenderStatus === 'success' &&
          blenderInstallations.map((installation) => (
            <div key={installation.executablePath}>
              <strong>{installation.version}</strong>

              {installation.isLts && <span> LTS</span>}

              <p>{installation.executablePath}</p>
            </div>
          ))}

        <button type="button" onClick={detectBlender} disabled={blenderStatus === 'loading'}>
          {blenderStatus === 'loading' ? 'Scanning...' : 'Scan Again'}
        </button>
      </section>

      <section>
        <h2>Google Colab CLI</h2>

        <button type="button" onClick={detectColab} disabled={colabDetecting}>
          {colabDetecting ? 'Checking...' : 'Check Colab CLI'}
        </button>

        {colabStatus === null && <p>Colab CLI has not been checked yet.</p>}

        {colabStatus?.state === 'available' && (
          <>
            <p>Available</p>
            <p>{colabStatus.version}</p>
          </>
        )}

        {colabStatus?.state === 'cli-missing' && (
          <>
            <p>Not installed</p>
            <p>{colabStatus.message}</p>
          </>
        )}

        {colabStatus?.state === 'runner-unavailable' && (
          <>
            <p>Runtime unavailable</p>
            <p>{colabStatus.message}</p>
          </>
        )}

        {colabStatus?.state === 'error' && (
          <>
            <p>Detection failed</p>
            <p>{colabStatus.message}</p>
          </>
        )}
      </section>

      <section>
        <h2>Project</h2>

        <button
          type="button"
          onClick={openProject}
          disabled={projectStatus === 'loading' || renderStatus === 'running'}
        >
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
      </section>

      {projectInfo !== null && (
        <section>
          <h2>Render</h2>

          {projectInfo.scenes.length === 0 ? (
            <p>No scenes were found in this project.</p>
          ) : (
            <>
              <div>
                <label htmlFor="scene">Scene</label>

                <select
                  id="scene"
                  value={selectedSceneName}
                  onChange={(event) => handleSceneChange(event.target.value)}
                  disabled={renderStatus === 'running'}
                >
                  {projectInfo.scenes.map((scene) => (
                    <option key={scene.name} value={scene.name}>
                      {scene.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedScene !== null && (
                <>
                  <p>Engine: {selectedScene.renderEngine}</p>

                  <p>
                    Resolution: {selectedScene.resolution.width}×{selectedScene.resolution.height}{' '}
                    at {selectedScene.resolution.percentage}%
                  </p>

                  <p>
                    Frame range: {selectedScene.frameStart}–{selectedScene.frameEnd}
                  </p>

                  <div>
                    <label htmlFor="frame-start">Start Frame</label>

                    <input
                      id="frame-start"
                      type="number"
                      min={selectedScene.frameStart}
                      max={selectedScene.frameEnd}
                      step={selectedScene.frameStep}
                      value={frameStart}
                      onChange={(event) => setFrameStart(Number(event.target.value))}
                      disabled={renderStatus === 'running'}
                    />
                  </div>

                  <div>
                    <label htmlFor="frame-end">End Frame</label>

                    <input
                      id="frame-end"
                      type="number"
                      min={selectedScene.frameStart}
                      max={selectedScene.frameEnd}
                      step={selectedScene.frameStep}
                      value={frameEnd}
                      onChange={(event) => setFrameEnd(Number(event.target.value))}
                      disabled={renderStatus === 'running'}
                    />
                  </div>

                  <div>
                    <label htmlFor="frame-step">Step</label>

                    <input
                      id="frame-step"
                      type="number"
                      min={1}
                      step={1}
                      value={frameStep}
                      onChange={(event) => setFrameStep(Number(event.target.value))}
                      disabled={renderStatus === 'running'}
                    />
                  </div>
                </>
              )}

              <fieldset disabled={renderStatus === 'running'}>
                <legend>Output Mode</legend>

                <label>
                  <input
                    type="radio"
                    name="output-mode"
                    value="scene-output"
                    checked={outputMode === 'scene-output'}
                    onChange={() => setOutputMode('scene-output')}
                  />
                  Scene Output
                </label>

                <p>Use the output format configured in Blender Render Properties.</p>

                <label>
                  <input
                    type="radio"
                    name="output-mode"
                    value="compositor-file-outputs"
                    checked={outputMode === 'compositor-file-outputs'}
                    onChange={() => setOutputMode('compositor-file-outputs')}
                  />
                  Compositor File Outputs
                </label>

                <p>Save every configured File Output from the compositor.</p>
              </fieldset>

              <fieldset disabled={renderStatus === 'running'}>
                <legend>Local Workers</legend>

                <label>
                  <input
                    type="radio"
                    name="local-worker-mode"
                    value="automatic"
                    checked={localWorkerMode === 'automatic'}
                    onChange={() => setLocalWorkerMode('automatic')}
                  />
                  Automatic
                </label>

                <p>
                  BlendQ chooses a conservative local worker count based on available system
                  resources.
                </p>

                <label>
                  <input
                    type="radio"
                    name="local-worker-mode"
                    value="manual"
                    checked={localWorkerMode === 'manual'}
                    onChange={() => setLocalWorkerMode('manual')}
                  />
                  Manual
                </label>

                {localWorkerMode === 'manual' && (
                  <div>
                    <label htmlFor="local-worker-count">Worker Count</label>

                    <input
                      id="local-worker-count"
                      type="number"
                      min={1}
                      step={1}
                      value={manualWorkerCount}
                      onChange={(event) => setManualWorkerCount(Number(event.target.value))}
                    />

                    <p>
                      Running multiple Blender instances can significantly increase RAM and GPU
                      memory usage.
                    </p>

                    {!hasValidManualWorkerCount && <p>Worker count must be a positive integer.</p>}
                  </div>
                )}
              </fieldset>

              <div>
                <h3>Output Folder</h3>

                <button
                  type="button"
                  onClick={selectOutputDirectory}
                  disabled={renderStatus === 'running'}
                >
                  Select Output Folder
                </button>

                <p>{outputDirectory ?? 'No output folder selected.'}</p>
              </div>

              <button type="button" onClick={startRender} disabled={!canRender}>
                {renderStatus === 'running' ? 'Rendering...' : 'Render Range'}
              </button>
            </>
          )}
        </section>
      )}

      <section>
        <h2>Render Activity</h2>

        {renderStatus === 'idle' && <p>No render has been started.</p>}

        {renderStatus === 'running' && <p>Rendering frames...</p>}

        {renderStatus === 'completed' && <p>Render completed successfully.</p>}

        {renderStatus === 'error' && <p>{renderErrorMessage ?? 'The render failed.'}</p>}

        {renderEvents.length > 0 && (
          <ul>
            {renderEvents.map((event, index) => (
              <li key={`${event.renderId}-${event.type}-${index}`}>
                {event.type === 'job-started' &&
                  `Render job started with ${event.totalFrames} frame(s).`}

                {event.type === 'frame-started' &&
                  `Worker ${event.workerId} is rendering frame ${event.frame} (${event.completedFrames + 1} of ${event.totalFrames}).`}

                {event.type === 'output-saved' && `Worker ${event.workerId} saved ${event.path}`}

                {event.type === 'frame-completed' &&
                  `Worker ${event.workerId} completed frame ${event.frame} (${event.completedFrames} of ${event.totalFrames}) with ${event.outputCount} output file(s).`}

                {event.type === 'job-completed' &&
                  `Render job completed: ${event.completedFrames} of ${event.totalFrames} frame(s).`}

                {event.type === 'error' && event.message}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
