import yaml from 'js-yaml'
import debug from 'debug'
import { pick } from 'lodash'

import Agent from './Agent'
import Executor from './Executor'
import Flow from './Flow'

const log = debug('v:job')

class Job {
  // Accepted configuration keys
  static configKeys = [
    'name',
    'url',
    'concurrency',
    'delay'
  ]

  constructor (id, config) {
    this.id = id

    // Assign config values
    this.config = pick(config, Job.configKeys)

    // Parse flows
    const flows = config.flows || []
    this.flows = flows.map(flow => new Flow(this, flow))
  }

  /**
   * Creates a new Job from yaml text.
   *
   * @param {String} id
   * @returns {Job}
   */
  static yaml (id, text) {
    const config = yaml.safeLoad(text)
    return new Job(id, config)
  }

  /**
   * Executes a job with a new {@link Agent} and {@link Executor}, executing
   * each flow sequentially, while building a cummulative output that is
   * eventually returned.
   *
   * @returns {Object} final context/output
   */
  async execute () {
    const { config, flows } = this
    log(`Executing job: ${this.config.name}`)

    // Build agent
    const agentOptions = {}

    if (config.concurrency > 0) {
      agentOptions.concurrency = config.concurrency
    }

    if (config.delay > 0) {
      agentOptions.delay = config.delay
    }

    this.agent = new Agent(agentOptions)

    // Build executor
    const ex = new Executor(this)

    // Execute flows and collect output
    const output = []
    for (const flow of flows) {
      const flowOutput = await ex.execute(flow)

      if (flowOutput != null) {
        output.push(flowOutput)
      }
    }

    return output
  }
}

export default Job
