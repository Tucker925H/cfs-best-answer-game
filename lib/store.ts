import { Room } from '@/types'

declare global {
  // eslint-disable-next-line no-var
  var __rooms: Map<string, Room> | undefined
}

function getRooms(): Map<string, Room> {
  if (!globalThis.__rooms) globalThis.__rooms = new Map()
  return globalThis.__rooms
}

export function getRoom(id: string): Room | undefined {
  return getRooms().get(id)
}

export function setRoom(id: string, updater: (r: Room) => Room): Room {
  const rooms = getRooms()
  const room = rooms.get(id)
  if (!room) throw new Error(`Room ${id} not found`)
  const updated = updater(room)
  rooms.set(id, updated)
  return updated
}

export function createRoom(id: string, name: string): Room {
  const room: Room = {
    id,
    name,
    phase: 'waiting',
    currentQuestion: '',
    participants: [],
    answers: [],
    votes: [],
    answersRevealed: false,
  }
  getRooms().set(id, room)
  return room
}

export function resetRoom(id: string): Room {
  const rooms = getRooms()
  const existing = rooms.get(id)
  if (!existing) throw new Error(`Room ${id} not found`)
  const room: Room = {
    id,
    name: existing.name,
    phase: 'waiting',
    currentQuestion: '',
    participants: [],
    answers: [],
    votes: [],
    answersRevealed: false,
  }
  rooms.set(id, room)
  return room
}
