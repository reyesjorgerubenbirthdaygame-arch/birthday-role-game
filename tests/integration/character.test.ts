import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.TEST_SUPABASE_URL!,
  process.env.TEST_SUPABASE_ANON_KEY!
)

describe('Character integration', () => {
  const testEmail = `test-${Date.now()}@example.com`
  const testPassword = 'Test1234!'
  let playerId: string

  afterAll(async () => {
    if (playerId) await supabase.from('players').delete().eq('id', playerId)
  })

  it('creates a player row via insert', async () => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    })
    expect(authError).toBeNull()
    const userId = authData.user!.id

    const { data, error } = await supabase.from('players').insert({
      user_id: userId,
      character_name: 'Test Hero',
      creature: 'human',
      is_complete: false,
    }).select().single()

    expect(error).toBeNull()
    expect(data.character_name).toBe('Test Hero')
    playerId = data.id
  })

  it('is_complete stays false when fields are missing', async () => {
    const { data } = await supabase
      .from('players').select('is_complete').eq('id', playerId).single()
    expect(data!.is_complete).toBe(false)
  })
})
