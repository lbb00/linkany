import { describe, expect, it, vi, beforeEach } from 'vitest'
import fs from 'fs-extra'

import { install } from '../src/api/install.js'

vi.mock('fs-extra')

describe('audit can be disabled', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(fs.appendFile).mockResolvedValue(undefined as any)
    vi.mocked(fs.ensureDir).mockResolvedValue(undefined as any)
    vi.mocked(fs.readJson).mockResolvedValue({ version: 1, installs: [] } as any)
    vi.mocked(fs.pathExists).mockResolvedValue(true as any)
  })

  it('does not write audit log when opts.audit=false', async () => {
    const { result } = await install('/m.json', { audit: false })
    expect(result.ok).toBe(true)
    expect(fs.appendFile).not.toHaveBeenCalled()
  })
})


