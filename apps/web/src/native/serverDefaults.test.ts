import { Capacitor } from '@capacitor/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { asrBase, DEFAULT_ASR_BASE } from '../call/asr'
import { apiBase, DEFAULT_API_BASE } from '../dashboard/api'

// The installed Android app is built on someone's PC and is not updated when a setting changes. When its build did not set a server address it
// must use the project's default (Settings used to show "Not configured" for both servers); the website keeps its old behaviour.
const env = import.meta.env as Record<string, unknown>
const saved = { asr: env.VITE_ASR_BASE, api: env.VITE_API_BASE }

afterEach(() => {
  vi.restoreAllMocks()
  env.VITE_ASR_BASE = saved.asr
  env.VITE_API_BASE = saved.api
})

const native = (on: boolean) => vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(on)

describe('server addresses in the installed Android app', () => {
  it('uses the default speech and reports addresses when the build set none', () => {
    delete env.VITE_ASR_BASE
    delete env.VITE_API_BASE
    native(true)
    expect(asrBase()).toBe(DEFAULT_ASR_BASE)
    expect(apiBase()).toBe(DEFAULT_API_BASE)
  })

  it('still lets a build set its own address, and still lets the speech server be switched off', () => {
    native(true)
    env.VITE_ASR_BASE = 'https://speech.example.com/'
    env.VITE_API_BASE = 'https://api.example.com/'
    expect(asrBase()).toBe('https://speech.example.com')
    expect(apiBase()).toBe('https://api.example.com')
    env.VITE_ASR_BASE = 'disabled'
    expect(asrBase()).toBeNull()
  })

  it('leaves the website alone: no address in the build means no server', () => {
    delete env.VITE_ASR_BASE
    delete env.VITE_API_BASE
    native(false)
    expect(asrBase()).toBeNull()
    expect(apiBase()).toBe('')
  })
})
