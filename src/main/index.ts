import { app, BrowserWindow, dialog, net, protocol, session, shell } from 'electron'
import { appendFileSync } from 'fs'
import { join, basename } from 'path'
import { pathToFileURL } from 'url'
import { filesDir, initDatabase } from './db'
import { seed } from './seed'
import { registerIpc } from './ipc'

// Images chosen by the user are served from the app's files folder via appfile://<name>.
protocol.registerSchemesAsPrivileged([{ scheme: 'appfile', privileges: { secure: true, supportFetchAPI: true } }])

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    title: 'Salary Management System',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  win.once('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(async () => {
  protocol.handle('appfile', (req) => {
    const name = basename(decodeURIComponent(new URL(req.url).hostname + new URL(req.url).pathname))
    return net.fetch(pathToFileURL(join(filesDir(), name)).toString())
  })

  if (app.isPackaged) {
    session.defaultSession.webRequest.onHeadersReceived((details, cb) =>
      cb({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; img-src 'self' data: appfile:; style-src 'self' 'unsafe-inline'; script-src 'self'"
          ]
        }
      })
    )
  }

  try {
    await initDatabase()
    await seed()
  } catch (e) {
    const msg = e instanceof Error ? (e.stack ?? e.message) : String(e)
    try {
      appendFileSync(join(app.getPath('userData'), 'error.log'), `${new Date().toISOString()} ${msg}
`)
    } catch {
      /* logging is best effort */
    }
    dialog.showErrorBox('Salary Management System could not start', msg)
    app.exit(1)
    return
  }
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
