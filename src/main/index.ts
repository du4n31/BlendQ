import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
  type IpcMainInvokeEvent,
  type WebFrameMain
} from 'electron'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { basename, extname, join } from 'node:path'
import { stat } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import icon from '../../resources/icon.png?asset'
import { detectBlenderInstallations, inspectBlendProject } from './services/blender'
import type { RenderOutputMode, StartLocalRenderRequest } from '../shared/types'
import { startLocalRenderJob } from './render/local-render-job'
import { createRenderWorkerPool } from './render/render-worker-pool'
import type { RenderWorkerConfiguration } from './render/render-worker-configuration'
import {
  resolveLocalWorkerCount,
  validateLocalWorkerSettings
} from './render/local-worker-settings'
import { detectHostCapabilities } from './system/host-capabilities'
import { recommendLocalConcurrency } from './render/local-concurrency-recommendation'

function isTrustedSender(frame: WebFrameMain | null): boolean {
  if (!frame) {
    return false
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const senderUrl = new URL(frame.url)
    const rendererUrl = new URL(process.env['ELECTRON_RENDERER_URL'])

    return senderUrl.origin === rendererUrl.origin
  }

  const rendererUrl = pathToFileURL(join(__dirname, '../renderer/index.html'))

  return frame.url === rendererUrl.href
}

function assertTrustedSender(event: IpcMainInvokeEvent): void {
  if (!isTrustedSender(event.senderFrame)) {
    throw new Error('Blocked IPC request from an untrusted sender.')
  }
}

async function validateStartLocalRenderRequest(value: unknown): Promise<StartLocalRenderRequest> {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid local render request.')
  }

  const request = value as Record<string, unknown>

  const blendFilePath = await validateBlendFilePath(request.blendFilePath)

  if (typeof request.sceneName !== 'string' || request.sceneName.length === 0) {
    throw new Error('Invalid render scene name.')
  }

  if (typeof request.outputDirectory !== 'string' || request.outputDirectory.length === 0) {
    throw new Error('Invalid render output directory.')
  }

  const frameRange = validateFrameRange(request.frameRange)

  const localWorkerSettings =
    request.localWorkerSettings === undefined
      ? {
          mode: 'automatic' as const
        }
      : validateLocalWorkerSettings(request.localWorkerSettings)

  if (localWorkerSettings.mode === 'off') {
    throw new Error('Local rendering requires at least one local worker.')
  }

  return {
    blendFilePath,
    sceneName: request.sceneName,
    frameRange,
    outputMode: validateRenderOutputMode(request.outputMode),
    outputDirectory: request.outputDirectory,
    localWorkerSettings
  }
}

function validateFrameRange(value: unknown): StartLocalRenderRequest['frameRange'] {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid render frame range.')
  }

  const frameRange = value as Record<string, unknown>

  const { start, end, step } = frameRange

  if (typeof start !== 'number' || !Number.isSafeInteger(start)) {
    throw new Error('Render frame range start must be an integer.')
  }

  if (typeof end !== 'number' || !Number.isSafeInteger(end)) {
    throw new Error('Render frame range end must be an integer.')
  }

  if (typeof step !== 'number' || !Number.isSafeInteger(step) || step < 1) {
    throw new Error('Render frame range step must be a positive integer.')
  }

  if (start > end) {
    throw new Error('Render frame range start cannot be greater than the end.')
  }

  return {
    start,
    end,
    step
  }
}

function validateRenderOutputMode(value: unknown): RenderOutputMode {
  if (value !== 'scene-output' && value !== 'compositor-file-outputs') {
    throw new Error('Invalid render output mode.')
  }

  return value
}

async function validateBlendFilePath(value: unknown): Promise<string> {
  if (typeof value !== 'string') {
    throw new Error('Invalid Blender project path.')
  }

  if (extname(value).toLowerCase() !== '.blend') {
    throw new Error('The selected file is not a Blender project.')
  }

  const fileStats = await stat(value)

  if (!fileStats.isFile()) {
    throw new Error('The selected Blender project is not a file.')
  }

  return value
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)

    return {
      action: 'deny'
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('blender:detect', async (event) => {
    assertTrustedSender(event)

    return detectBlenderInstallations()
  })

  ipcMain.handle('project:open', async (event) => {
    assertTrustedSender(event)

    const result = await dialog.showOpenDialog({
      title: 'Open Blender Project',
      properties: ['openFile'],
      filters: [
        {
          name: 'Blender Projects',
          extensions: ['blend']
        }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const blendFilePath = await validateBlendFilePath(result.filePaths[0])

    const installations = await detectBlenderInstallations()

    if (installations.length === 0) {
      throw new Error('No compatible Blender installation was found.')
    }

    const blender = installations[0]

    const info = await inspectBlendProject(blender.executablePath, blendFilePath)

    return {
      file: {
        name: basename(blendFilePath),
        path: blendFilePath
      },
      info
    }
  })

  ipcMain.handle('render:select-output-directory', async (event) => {
    assertTrustedSender(event)

    const result = await dialog.showOpenDialog({
      title: 'Select Render Output Folder',
      properties: ['openDirectory']
    })

    if (result.canceled) {
      return null
    }

    return result.filePaths[0] ?? null
  })

  ipcMain.handle('render:start-local', async (event, value: unknown) => {
    assertTrustedSender(event)

    const request = await validateStartLocalRenderRequest(value)

    const installations = await detectBlenderInstallations()

    if (installations.length === 0) {
      throw new Error('No compatible Blender installation was found.')
    }

    const blender = installations[0]
    const renderId = randomUUID()
    const sender = event.sender

    const hostCapabilities = detectHostCapabilities()

    const concurrencyRecommendation = recommendLocalConcurrency(hostCapabilities)

    const localWorkerCount = resolveLocalWorkerCount(
      request.localWorkerSettings ?? {
        mode: 'automatic'
      },
      concurrencyRecommendation
    )

    const workerConfigurations: RenderWorkerConfiguration[] = Array.from(
      {
        length: localWorkerCount
      },
      (_, index) => ({
        id: `local-${index + 1}`,
        source: {
          type: 'local' as const
        },
        overrides: {}
      })
    )

    const workers = createRenderWorkerPool({
      configurations: workerConfigurations,
      blenderInstallation: blender
    })

    void startLocalRenderJob({
      renderId,
      workers: workers,
      request,
      onEvent: (renderEvent) => {
        if (!sender.isDestroyed()) {
          sender.send('render:event', renderEvent)
        }
      }
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)

      console.error('Local render job failed.', error)

      if (!sender.isDestroyed()) {
        sender.send('render:event', {
          type: 'error',
          renderId,
          message
        })
      }
    })

    return renderId
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
