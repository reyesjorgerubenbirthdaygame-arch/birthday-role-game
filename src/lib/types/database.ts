export type TraitType = 'positive' | 'negative'
export type GameStatus = 'pending' | 'active' | 'finished'
export type StepType = 'instructions' | 'status' | 'results' | 'team_arrangement'
export type GameType = 'strongness' | 'mental' | 'cooperation' | 'velocity' | 'deception'

export interface Event {
  id: string
  name: string
  event_start_at: string
  created_at: string
}

export interface Profile {
  id: string
  email: string
  is_admin: boolean
  created_at: string
}

export interface TraitOption {
  id: string
  name: string
  type: TraitType
  is_selectable?: boolean
}

export interface BackgroundOption {
  id: string
  name: string
}

export interface Player {
  id: string
  user_id: string
  character_name: string | null
  creature: string | null
  positive_trait_1: string | null
  positive_trait_2: string | null
  negative_trait_1: string | null
  negative_trait_2: string | null
  background: string | null
  is_complete: boolean
  created_at: string
  updated_at: string
}

export interface InstructionsContent {
  text: string
  images: string[]
}

export interface StatusContent {
  label: string
}

export interface ResultsContent {
  label: string
}

export type StepContent = InstructionsContent | StatusContent | ResultsContent | Record<string, never>

export interface GameStep {
  id: string
  game_id: string
  step_type: StepType
  order_index: number
  content: StepContent
}

export interface Game {
  id: string
  title: string
  order_index: number
  status: GameStatus
  current_step_id: string | null
  team_size: number
  game_type: GameType
}

export interface GameWithSteps extends Game {
  steps: GameStep[]
}

export interface GameStatusEntry {
  id: string
  game_id: string
  player_id: string
  status: string
  updated_at: string
}

export interface LeaderboardEntry {
  id: string
  game_id: string
  player_id: string
  points: number
}

export interface GlobalLeaderboardRow {
  player_id: string
  character_name: string | null
  total_points: number
  rank: number
}
