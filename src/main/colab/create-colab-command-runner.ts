import type { ColabCommandRunner } from './colab-command-runner'
import { NativeColabRunner } from './native-colab-runner'
import { WslColabRunner } from './wsl-colab-runner'
import { WslService, type WslDistribution } from '../wsl/wsl-service'

export interface CreateColabCommandRunnerOptions {
  platform?: NodeJS.Platform
  wslService?: WslService
  preferredWslDistribution?: string
}

function chooseWslDistribution(
  distributions: readonly WslDistribution[],
  preferredDistribution?: string
): WslDistribution | null {
  if (preferredDistribution) {
    const preferred = distributions.find(
      (distribution) => distribution.name === preferredDistribution
    )

    if (preferred) {
      return preferred
    }
  }

  return distributions.find((distribution) => distribution.isDefault) ?? distributions[0] ?? null
}

export async function createColabCommandRunner(
  options: CreateColabCommandRunnerOptions = {}
): Promise<ColabCommandRunner> {
  const platform = options.platform ?? process.platform

  if (platform === 'linux' || platform === 'darwin') {
    return new NativeColabRunner({
      platform
    })
  }

  if (platform !== 'win32') {
    throw new Error(`Colab CLI is not supported on platform "${platform}".`)
  }

  const wslService =
    options.wslService ??
    new WslService({
      platform
    })

  if (!(await wslService.isAvailable())) {
    throw new Error('WSL is required to use Colab CLI on Windows.')
  }

  const distributions = await wslService.listDistributions()

  const distribution = chooseWslDistribution(distributions, options.preferredWslDistribution)

  if (!distribution) {
    throw new Error('No WSL distributions are available.')
  }

  return new WslColabRunner({
    distribution: distribution.name,
    wslService
  })
}
