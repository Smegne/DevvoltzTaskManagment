import path from 'path'
import { app } from 'electron'

export const getElectronDatabasePath = () => {
  // In Electron, use app.getPath('userData')
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'task-database.sqlite')
}

export const electronDbConfig = {
  client: 'sqlite3',
  connection: {
    filename: getElectronDatabasePath()
  },
  useNullAsDefault: true,
  migrations: {
    directory: './migrations'
  }
}