import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { basename, extname, join } from 'node:path'
import { detectBlenderInstallations, inspectBlendProject } from './services/blender'
import { stat } from 'node:fs/promises'
import type { IpcMainInvokeEvent, WebFrameMain } from 'electron'
import { pathToFileURL } from 'node:url'

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
  // Create the browser window.
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
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('blender:detect', async (event) => {
    assertTrustedSender(event)

    return detectBlenderInstallations()
  })

  ipcMain.handle('project:select-file', async (event) => {
    assertTrustedSender(event)

    const result = await dialog.showOpenDialog({
      title: 'Select Blender Project',
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

    const filePath = result.filePaths[0]

    if (extname(filePath).toLowerCase() !== '.blend') {
      throw new Error('The selected file is not a Blender project.')
    }

    const fileStats = await stat(filePath)

    if (!fileStats.isFile()) {
      throw new Error('The selected path is not a file.')
    }

    return {
      name: basename(filePath),
      path: filePath
    }
  })

  ipcMain.handle('blender:inspect-project', async (event, blendFilePath: unknown) => {
    assertTrustedSender(event)

    const validatedBlendFilePath = await validateBlendFilePath(blendFilePath)

    const installations = await detectBlenderInstallations()

    if (installations.length === 0) {
      throw new Error('No compatible Blender installation was found.')
    }

    const blender = installations[0]

    return inspectBlendProject(blender.executablePath, validatedBlendFilePath)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
