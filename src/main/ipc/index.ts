import { registerAuth } from './auth'
import { registerCompany } from './company'
import { registerOrganization } from './organization'
import { registerEmployees } from './employees'
import { registerSalary } from './salary'
import { registerUsers } from './users'
import { registerFiles } from './files'
import { registerDashboard } from './dashboard'

export function registerIpc(): void {
  registerAuth()
  registerCompany()
  registerOrganization()
  registerEmployees()
  registerSalary()
  registerUsers()
  registerFiles()
  registerDashboard()
}
