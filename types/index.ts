export type Phase = 'waiting' | 'answering' | 'voting' | 'results'

export interface Participant {
  id: string
  name: string
  socketId: string
}

export interface Answer {
  id: string
  participantId: string
  text: string
}

export interface Vote {
  voterId: string
  answerId: string
}

export interface Room {
  id: string
  name: string
  phase: Phase
  currentQuestion: string
  participants: Participant[]
  answers: Answer[]
  votes: Vote[]
  answersRevealed: boolean
}

export interface ServerToClientEvents {
  'state-update': (room: Room) => void
  'error': (msg: string) => void
}

export interface ClientToServerEvents {
  'create-room': (roomName: string, cb: (roomId: string) => void) => void
  'join-room': (roomId: string, name: string, cb: (result: { ok: boolean; participantId?: string; room?: Room; error?: string }) => void) => void
  'set-question': (roomId: string, question: string) => void
  'random-question': (cb: (question: string) => void) => void
  'submit-answer': (roomId: string, text: string, cb: (ok: boolean) => void) => void
  'reveal-answers': (roomId: string) => void
  'start-voting': (roomId: string) => void
  'cast-vote': (roomId: string, answerId: string, cb: (ok: boolean) => void) => void
  'show-results': (roomId: string) => void
  'reset': (roomId: string) => void
}
