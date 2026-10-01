import { dialog } from 'electron'
import { copyFileSync } from 'fs'
import { extname, join } from 'path'
import { randomUUID } from 'crypto'
import { filesDir } from '../db'
import { handle } from './handler'

/** Lets the user choose an image; stores a copy in the app's files folder and returns its file name. */
export function registerFiles(): void {
  handle<void, string | null>(
    'files:pickImage',
    { perm: ['employee.update', 'employee.create', 'company.update'] },
    async () => {
      const res = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
      })
      if (res.canceled || !res.filePaths[0]) return null
      const name = `${randomUUID()}${extname(res.filePaths[0]).toLowerCase()}`
      copyFileSync(res.filePaths[0], join(filesDir(), name))
      return name
    }
  )
}
