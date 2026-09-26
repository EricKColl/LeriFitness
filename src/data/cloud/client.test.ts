import { describe, expect, it } from 'vitest'

import { authParamsIn } from './client'

describe('enlace de inicio de sesión', () => {
  it('detecta la sesión o el error en el fragmento de la URL', () => {
    expect(
      authParamsIn('https://forja.pages.dev/perfil/cuenta#access_token=abc&type=magiclink'),
    ).toBe(true)
    expect(
      authParamsIn('https://forja.pages.dev/#error=access_denied&error_description=Expired'),
    ).toBe(true)
    expect(authParamsIn('https://forja.pages.dev/hoy')).toBe(false)
    expect(authParamsIn('https://forja.pages.dev/ejercicios?q=access_token')).toBe(false)
  })
})
