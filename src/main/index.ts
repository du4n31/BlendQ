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
import icon from '../../resources/icon.png?asset'
import { detectBlenderInstallations, inspectBlendProject } from './services/blender'

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

async function validateBlendFilePath(value: unknown): Promise<string> {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Invalid Blender project path.')
  }

  if (extname(value).toLowerCase() !== '.blend') {
    throw new Error('The selected file is not a Blender project.')
  }

  let fileStats

  try {
    fileStats = await stat(value)
  } catch {
    throw new Error('The Blender project file does not exist or cannot be accessed.')
  }

  if (!fileStats.isFile()) {
    throw new Error('The Blender project path does not point to a file.')
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
