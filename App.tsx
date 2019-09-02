import React, { useState, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import { useMachine } from '@xstate/react'
import createMachine from './machine'

const PageWrapper = styled.div`
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: left;
`

const Controls = styled.div`
  display: flex;
  flex-direction: row;
  align-self: stretch;
  justify-content: space-between;
  margin-top: 10px;
`

const Button = styled.button``

const Timer = styled.div`
  display: flex;
  flex-direction: row;
  font-family: sans-serif;
  font-size: 1.5em;
`

const Label = styled.div`
  font-weight: bold;
  margin-right: 5px;
`

const Result = styled.div`
  width: 142px;
`

const pad = (padCount: number) => (val: number) => {
  const chars = String(val)
  const length = padCount - chars.length
  const padChars = Array.from({ length })
    .map(() => '0')
    .join('')
  return `${padChars}${chars}`
}

const formatTime = (timeMS: number) => {
  const ms = Math.floor(timeMS) % 1000
  const secLeft = Math.floor(timeMS / 1000)
  const sec = secLeft % 60
  const minLeft = Math.floor(secLeft / 60)
  const min = minLeft % 60
  const hour = Math.floor(minLeft / 60)
  const pad2 = pad(2)
  const pad3 = pad(3)
  return `${pad2(hour)}:${pad2(min)}:${pad2(sec)}.${pad3(ms)}`
}

const useTimer = (isOn: boolean, time: number, setTime: Function) => {
  useEffect(() => {
    let isRunning = isOn
    if (isRunning) {
      let fromTime = performance.now()
      const step = (timestamp: number) => {
        const progress = timestamp - fromTime
        setTime(time + progress)
        if (isRunning) {
          window.requestAnimationFrame(step)
        }
      }
      window.requestAnimationFrame(step)
    }
    return () => {
      isRunning = false
    }
  }, [isOn, setTime, time])
}

const useStopWatch = () => {
  const [time, setTime] = useState(0)
  const machine = useMemo(() => {
    const clearTimer = () => setTime(0)
    return createMachine({ actions: { clearTimer } })
  }, [setTime])
  const [state, send] = useMachine(machine)

  useTimer(state.matches('running'), time, setTime)

  return { time, state, send }
}

const App = () => {
  const { time, state, send } = useStopWatch()

  return (
    <Layout
      time={
        <>
          <Label>Time:</Label>
          <Result>{formatTime(time)}</Result>
        </>
      }
      controls={
        <>
          {state.matches('initial') ? (
            <Button onClick={() => send('START')}>Start</Button>
          ) : (
            <Button onClick={() => send('CONTINUE')} disabled={state.matches('running')}>
              Continue
            </Button>
          )}

          {state.matches('running') ? (
            <Button onClick={() => send('PAUSE')}>Pause</Button>
          ) : (
            <Button onClick={() => send('CLEAR')} disabled={state.matches('initial')}>
              Clear
            </Button>
          )}
        </>
      }
    />
  )
}

const Layout: React.FC<{ time: React.ReactElement; controls: React.ReactElement }> = ({ time, controls }) => (
  <PageWrapper>
    <Container>
      <Timer>{time}</Timer>
      <Controls>{controls}</Controls>
    </Container>
  </PageWrapper>
)

export default App
