import { EventEmitter } from 'events'
import superagent from 'superagent'
import debug from 'debug'
import { pick } from 'lodash'

const log = debug('v:agent')

class Agent {
  // Accepted configuration keys
  static optionKeys = [
    'concurrency',
    'delay'
  ]

  // Delay between requests in ms
  delay = 0

  // Max concurrent requests
  concurrency = 1

  // Current request count
  currentRequests = 0

  // Currently pending requests
  // An array of Promise.prototype.resolve functions
  pendingResolvers = []

  // Emitter for signaling finished requests
  emitter = new EventEmitter()

  // Shared HTTP agent for multiple requests to retain cookies
  agent = superagent.agent()

  constructor (options) {
    // Assign option values
    Object.assign(this, pick(options, Agent.optionKeys))

    // Setup event handlers
    this.emitter.on('req', this.onRequest)
    this.emitter.on('done', this.onRequestComplete)
  }

  /**
   * Sanitize and validate HTTP request method.
   *
   * @param {String} method
   * @returns {String}
   * @throws {Error} if an invalid method is provided
   */
  static getMethod (method) {
    method = `${method}`.toLowerCase()

    const methodMatch = /(get|post|put)/.exec(method)
    if (!methodMatch) {
      throw new Error(`Invalid request method: ${method}`)
    }

    return methodMatch[1]
  }

  /**
   * Performs HTTP request.
   *
   * @param {String} url
   * @param {Object} config
   * @returns {http.Response}
   */
  async request (url, config) {
    // Validate HTTP method
    config.method = Agent.getMethod(config.method)

    await this.waitForNextRequest()

    try {
      return await this.buildRequest(url, config)
    } finally {
      this.emitter.emit('done')
    }
  }

  /**
   * Builds request via superagent and returns thenable request object.
   *
   * @param {String} url
   * @param {Object} config
   * @returns {superagent.SuperAgentRequest}
   */
  async buildRequest (url, config) {
    log(`Requesting: ${config.method} ${url}`)

    const req = this.agent[config.method](url)

    req.redirects(0)

    for (const key in config.form) {
      req.field(key, config.form[key])
    }

    if (config.expectStatus) {
      req.ok(res => res.statusCode === config.expectStatus)
    }

    return req
  }

  /**
   * Creates and returns a new Promise that is automatically resolved once the
   * agent can begin executing the next request. This allows us to limit
   * concurrent requests to a specific number.
   *
   * Awaiting this function will act as an arbitrary sleep until the next
   * request can be processed.
   *
   * @returns {Promise}
   */
  async waitForNextRequest () {
    let resolver

    // Create new Promise, extract resolve func, expose
    const waitPromise = new Promise(resolve => {
      resolver = resolve
    })

    this.emitter.emit('req', resolver)

    return waitPromise
  }

  /**
   * Event handler triggered by  {@link Agent#request} when a new request is
   * submitted.
   */
  onRequest = (resolver) => {
    if (this.currentRequests < this.concurrency) {
      this.currentRequests++
      setTimeout(resolver, this.delay)
    } else {
      this.pendingResolvers.push(resolver)
    }
  }

  /**
   * Event handler triggered when a request is completed, notifying pending
   * requests that they can proceed.
   */
  onRequestComplete = () => {
    this.currentRequests--

    if (this.pendingResolvers.length > 0) {
      const resolver = this.pendingResolvers.shift()
      setTimeout(resolver, this.delay)
    }
  }
}

export default Agent
