import createMachineFactory from './statechart-helpers'

const statechart = {
  id: 'timer',
  initial: 'initial',
  states: {
    initial: {
      onEntry: 'clearTimer',
      on: {
        START: 'running',
      },
    },
    running: {
      on: {
        PAUSE: 'paused',
      },
    },
    paused: {
      on: {
        CONTINUE: 'running',
        CLEAR: 'initial',
      },
    },
  },
}

const expectedActions = {
  clearTimer: () => [],
}

export default createMachineFactory(statechart)
  .expectingActions(expectedActions)
  .build()
