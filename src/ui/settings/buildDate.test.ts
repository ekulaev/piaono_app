import { describe, expect, it } from 'vitest'
import { formatBuildDate } from './buildDate'

describe('Дата сборки (C-APP-1, OB-12)', () => {
  it('ДД.ММ.ГГГГ с ведущими нулями', () => {
    expect(formatBuildDate(new Date(2026, 8, 7, 12).toISOString())).toBe('07.09.2026')
  })

  it('сборщик подставляет дату сборки', () => {
    expect(formatBuildDate(__BUILD_DATE__)).toMatch(/^\d{2}\.\d{2}\.\d{4}$/)
  })
})
