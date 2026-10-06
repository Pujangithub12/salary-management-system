import { contextBridge, ipcRenderer } from 'electron'

// Only these channels may be invoked from the renderer.
const CHANNELS = new Set([
  'auth:login', 'auth:me', 'auth:logout',
  'company:get', 'company:update',
  'departments:list', 'departments:create', 'departments:update',
  'designations:list', 'designations:create', 'designations:update',
  'lookups:organization',
  'employees:list', 'employees:get', 'employees:options', 'employees:create', 'employees:update', 'employees:deactivate',
  'salary-components:list', 'salary-components:create', 'salary-components:update',
  'users:list', 'users:create', 'users:update', 'roles:list',
  'files:pickImage',
  'app:shell', 'dashboard:summary',
  'contracts:defaults', 'contracts:preview', 'contracts:generate'
])

contextBridge.exposeInMainWorld('api', {
  invoke: (channel: string, payload?: unknown): Promise<unknown> => {
    if (!CHANNELS.has(channel)) return Promise.reject(new Error(`Blocked IPC channel: ${channel}`))
    return ipcRenderer.invoke(channel, payload)
  }
})
