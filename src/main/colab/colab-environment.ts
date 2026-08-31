import type { ColabEnvironmentStatus } from '../../shared/types'
import type { ColabCommandRunner } from './colab-command-runner'

export async function detectColabEnvironment(
  createRunner: () => Promise<ColabCommandRunner>
): Promise<ColabEnvironmentStatus> {
  let runner: ColabCommandRunner

  try {
    runner = await createRunner()
  } catch (error) {
    return {
      state: 'runner-unavailable',
      message: error instanceof Error ? error.message : String(error)
    }
  }

  const available = await runner.isAvailable()

  if (!available) {
    return {
      state: 'cli-missing',
      message: 'Google Colab CLI is not available.'
    }
  }

  try {
    const result = await runner.execute(['version'])

    if (result.exitCode !== 0) {
      return {
        state: 'error',
        message: result.stderr.trim() || 'Failed to read Google Colab CLI version.'
      }
    }

    return {
      state: 'available',
      version: result.stdout.trim()
    }
  } catch (error) {
    return {
      state: 'error',
      message: error instanceof Error ? error.message : String(error)
    }
  }
}
