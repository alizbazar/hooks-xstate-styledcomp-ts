const rollup = require('rollup')
const includePaths = require('rollup-plugin-includepaths')
const path = require('path')
const typescript = require('rollup-plugin-typescript')

const file = process.argv[2]

function pbcopy(data) {
  const proc = require('child_process').spawn('pbcopy')
  proc.stdin.write(data)
  proc.stdin.end()
}

const includePathOptions = {
  include: {},
  paths: ['.'],
  external: [],
  extensions: ['.js'],
}

const config = {
  input: path.resolve(file),
  external: ['xstate'],
  plugins: [typescript(), includePaths(includePathOptions)],
}

const outputConfig = {
  format: 'iife',
  exports: 'named',
  name: 'moduleExports',
  globals: {
    xstate: 'XState',
  },
}

async function build() {
  const bundle = await rollup.rollup(config)
  const { output } = await bundle.generate(outputConfig)
  return output[0].code
}

const replaceLast = (subject, searchFor, replaceWith) => {
  const pieces = subject.split(searchFor)
  const end = pieces.pop()
  return `${pieces.join(searchFor)}${replaceWith}${end}`
}

build().then(output => {
  // Interpreter provides synthetic Machine function and intercepts machine created
  // Thus Machine cannot be imported directly from XState
  let code = replaceLast(output, 'xstate.Machine(', 'Machine(')

  // Machine is created by running exported createMachine() function
  code += `\nmoduleExports.default()`
  pbcopy(code)
  process.stdout.write('\nOpen https://xstate.js.org/viz/ and paste code into window 👌\n\n')
})
