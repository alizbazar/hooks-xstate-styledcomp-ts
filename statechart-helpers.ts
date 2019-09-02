// @ts-check
/* eslint no-console:0 */

import {
  assign,
  Machine,
  ActionFunctionMap,
  DefaultContext,
  EventObject,
  Guard,
  MachineConfig,
  MachineOptions,
  ConditionPredicate,
} from 'xstate'

export const saveError = assign({
  error: (_: any, e: any) => {
    if (/^xstate\.after/.test(e.type)) {
      return {
        code: 'TIMEOUT',
        message: 'Operation failed. Please try again.',
      }
    }
    // Errors can come in several forms: for services throwing an error results in the error
    // being stored in data. If the error is forward in the machine, it is stored in .error propery.
    // Lastly, if the error is just an internal event, let's just store the whole event.
    const isExternalError = e.data && e.data instanceof Error
    const err = isExternalError ? e.data : e.error || e
    const code = err.code || e.type || 'UNKNOWN_ERROR'
    const message = err.message || 'An error occurred. Please try again.'
    return { message, code }
  },
})

interface FunctionMap {
  [key: string]: Function
}

export const connectActions = (actionDefinitions: FunctionMap, extActions: FunctionMap) =>
  Object.keys(actionDefinitions).reduce((acc: FunctionMap, key) => {
    if (extActions[key]) {
      acc[key] = (ctx: any, e: any) => {
        const actionArgs = actionDefinitions[key](ctx, e)
        return extActions[key](...actionArgs)
      }
    } else {
      console.warn(`Action '${key}' was not provided`)
    }
    return acc
  }, {})

export const connectServices = (services: FunctionMap, extServices: FunctionMap) =>
  Object.keys(services).reduce((acc: FunctionMap, key) => {
    if (extServices[key]) {
      acc[key] = (ctx: any, e: any) => {
        const serviceSpec = services[key](ctx, e)
        return extServices[key](...serviceSpec.args)
      }
    } else {
      console.warn(`Service '${key}' was not provided`)

      // only run in xstate visualizer:
      if (typeof module === 'undefined' && typeof __DEV__ === 'undefined') {
        console.warn('Running in XState Visualizer')
        acc[key] = (ctx: any, e: any) => {
          const serviceSpec = services[key](ctx, e)
          console.log(`Invoking service '${key}' (${serviceSpec.type})`)
          if (serviceSpec.type === 'promise') {
            return new Promise(resolve => {
              setTimeout(() => {
                console.log(`Service '${key}' resolved`)
                resolve()
              }, 3000)
            })
          }
          return (_: any, onEvent: Function) => {
            onEvent((e: any) => {
              console.log(`Event '${JSON.stringify(e)}' received by service '${key}'`)
            })
            return () => {
              console.log(`Service '${key}' detached`)
            }
          }
        }
      }
    }
    return acc
  }, {})

export const serviceTypes = {
  promise: (...args: any[]) => ({ type: 'promise', args }),
  callback: (...args: any[]) => ({ type: 'callback', args }),
  machine: (...args: any[]) => ({ type: 'machine', args }),
}

type ServiceType = {
  type: string
  args: any[]
}

class MachineBuilder {
  statechart: MachineConfig<any, any, EventObject>
  internalActions = {}
  internalGuards?: Record<string, ConditionPredicate<any, EventObject>>
  actionDefinitions = {}
  serviceDefinitions = {}
  defaultExtContext: DefaultContext = {}

  constructor(statechart: MachineConfig<any, any, EventObject>) {
    this.statechart = statechart
  }

  /**
   * Set internal actions
   */
  actions(actions: ActionFunctionMap<DefaultContext, EventObject>) {
    this.internalActions = actions
    return this
  }

  /**
   * Set guards
   */
  guards(guards: Record<string, ConditionPredicate<any, EventObject>>) {
    this.internalGuards = guards
    return this
  }

  /**
   * Set signatures for expected actions
   */
  expectingActions(actionDefinitions: FunctionMap) {
    this.actionDefinitions = actionDefinitions
    return this
  }

  /**
   * Set signatures for expected services
   */
  expectingServices(serviceDefinitions: { [key: string]: (ctx: DefaultContext, e: EventObject) => ServiceType }) {
    this.serviceDefinitions = serviceDefinitions
    return this
  }

  /**
   * Set default context expected to be received from outside
   */
  expectingContext(defaultExtContext: DefaultContext) {
    this.defaultExtContext = defaultExtContext
    return this
  }

  /**
   * Build createMachine({ context, actions, services }) factory
   */
  build() {
    /**
     * Create machine by supplying context, actions, or services
     * @param {{ context?: any, actions?: Object<string, Function>, services?: Object<string, Function>}} options
     */
    const createMachine = ({ context = this.defaultExtContext, actions = {}, services = {} } = {}) => {
      const options: Partial<MachineOptions<any, EventObject>> = {
        actions: {
          ...this.internalActions,
          ...connectActions(this.actionDefinitions, actions),
        },
        services: connectServices(this.serviceDefinitions, services),
        guards: this.internalGuards,
      }
      const machineContext = {
        ...(this.statechart.context || {}),
        ...context,
      }
      return Machine(this.statechart, options, machineContext)
    }
    return createMachine
  }
}

export const createMachineFactory = (statechart: MachineConfig<any, any, EventObject>) => {
  return new MachineBuilder(statechart)
}

export default createMachineFactory
