import { describe, expect, it, vi } from 'vitest'

const plugin = vi.hoisted(() => ({ getChatMessages: vi.fn() }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' }, registerPlugin: () => plugin }))

import { readChatMessages } from './sms'

describe('Chat messages read from notifications', () => {
  it('keeps a WhatsApp message tagged WhatsApp and marks every other one as Chat', async () => {
    plugin.getChatMessages.mockResolvedValue({
      enabled: true,
      messages: [
        { id: '1', sender: 'A', body: 'from whatsapp', date: 3, via: 'whatsapp' },
        { id: '2', sender: 'B', body: 'from google messages', date: 2, via: 'chat' },
        { id: '3', sender: 'C', body: 'older build without the field', date: 1 },
      ],
    })
    const r = await readChatMessages()
    expect(r.messages.map((m) => m.via)).toEqual(['whatsapp', 'chat', 'chat'])
    expect(r.enabled).toBe(true)
  })

  it('reports an older app build that cannot read Chat messages as unsupported', async () => {
    plugin.getChatMessages.mockRejectedValue(new Error('not implemented'))
    expect(await readChatMessages()).toEqual({ supported: false, enabled: false, messages: [] })
  })
})
