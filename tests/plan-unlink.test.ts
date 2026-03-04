import { describe, expect, it, vi } from 'vitest'

import { planUnlinkWithFS } from '../src/core/plan.js'
import type { FS } from '../src/core/fs.js'

function createFsMock(
  overrides: Partial<FS> = {},
): FS {
  return {
    pathExists: vi.fn(async () => false),
    lstat: vi.fn(async () => {
      throw new Error('ENOENT')
    }),
    readlink: vi.fn(async () => ''),
    ...overrides,
  }
}

describe('planUnlinkWithFS', () => {
  it('plans unlink for dangling symlink even when pathExists would be false', async () => {
    const fsMock = createFsMock({
      pathExists: vi.fn(async () => false),
      lstat: vi.fn(async () => ({ isSymbolicLink: () => true } as any)),
    })

    const steps = await planUnlinkWithFS(fsMock, { targetAbs: '/target' })

    expect(steps).toEqual([
      {
        kind: 'unlink',
        message: 'Remove target symlink',
        paths: { target: '/target' },
      },
    ])
  })

  it('returns empty plan when target does not exist', async () => {
    const fsMock = createFsMock({
      lstat: vi.fn(async () => {
        throw new Error('ENOENT')
      }),
    })

    const steps = await planUnlinkWithFS(fsMock, { targetAbs: '/missing' })

    expect(steps).toEqual([])
  })
})
