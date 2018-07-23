import { pick } from 'lodash'

class Flow {
  constructor (job, config) {
    const keys = [
      'name',
      'request',
      'extract',
      'foreach'
    ]

    this.config = pick(config, keys)
    this.job = job
  }
}

export default Flow
