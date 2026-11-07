import { deploymentErrors } from '../shared/deployment.mjs'

const app = process.argv[2]
const errors = deploymentErrors(app)
if (errors.length) {
  console.error(`FitSync ${app}: Vercel environment needs configuration:\n${errors.map(error => `- ${error}`).join('\n')}`)
  process.exitCode = 1
} else if (process.env.VERCEL === '1') console.log(`FitSync ${app}: deployment environment checks passed.`)
