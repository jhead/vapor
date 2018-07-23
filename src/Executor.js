import url from 'url'
import debug from 'debug'
import surgeon from 'surgeon'
import tpl from 'string-template'
import { cloneDeep } from 'lodash'

import subroutines from './subroutines'

const log = debug(`v:exec`)

class Executor {
  constructor (job, context = {}) {
    this.job = job
    this.context = cloneDeep(context)
  }

  getIterator () {
    const { context, flow } = this
    const { config } = flow

    let iterator = [ 1 ]

    if (config.foreach) {
      iterator = context.out[config.foreach]
    }

    if (!Array.isArray(iterator) && iterator != null) {
      iterator = [ iterator ]
    }

    return iterator
  }

  async execute (flow) {
    const { context } = this

    log(`Executing flow: ${flow.config.name}`)
    this.flow = flow

    const iterator = this.getIterator()
    const promises = iterator.map(item => this.executeForEach(item))

    const rawOutput = await Promise.all(promises)
    const output = {}

    if (iterator.length === 1) {
      Object.assign(output, rawOutput[0])
    } else {
      rawOutput.forEach((flowOut, i) => {
        output[iterator[i]] = flowOut
      })
    }

    this.context.out = Object.assign({}, context.out, output)

    return output
  }

  async executeForEach (item) {
    const { context, flow } = this
    context.foreach = item

    log(`Executing flow foreach: ${flow.config.name} - ${item}`)
    const { text } = await this.request()

    return this.extract(text)
  }

  async request () {
    const { context, flow, job } = this
    const { request } = flow.config
    const { foreach } = context
    const tplReplace = Object.assign({}, context.out, { foreach })

    const formattedURL = tpl(request.url, tplReplace)
    const fullURL = url.resolve(job.config.url, formattedURL)

    return job.agent.request(fullURL, request)
  }

  async extract (text) {
    const { flow } = this
    const { extract } = flow.config

    // Skip if no extract config
    if (!extract) {
      return
    }

    const out = surgeon({ subroutines })(extract, text)

    return out
  }
}

export default Executor
