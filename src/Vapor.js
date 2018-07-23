import fs from 'fs-promise'
import Job from './Job'

class Vapor {
  static async file (id, file) {
    const text = await fs.readFile(file)
    return Vapor.run(id, text)
  }

  static run (id, text) {
    return Job.yaml(id, text).execute()
  }
}

export default Vapor
