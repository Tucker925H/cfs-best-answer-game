import { Server as HTTPServer } from 'http'
import { NextApiRequest, NextApiResponse } from 'next'
import { Server as IOServer, Socket } from 'socket.io'
import { getRoom, setRoom, createRoom, resetRoom } from '@/lib/store'
import { getRandomQuestion } from '@/lib/questions'
import { Room, ClientToServerEvents, ServerToClientEvents } from '@/types'

type NextApiResponseWithSocket = NextApiResponse & {
  socket: { server: HTTPServer & { io?: IOServer } }
}

function genRoomId(): string {
  // 4桁の数字（例：2847）
  return String(Math.floor(1000 + Math.random() * 9000))
}

function broadcast(io: IOServer, room: Room) {
  io.to(room.id).emit('state-update', room)
}

function initSocket(io: IOServer) {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {

    socket.on('create-room', (roomName, cb) => {
      const id = genRoomId()
      const room = createRoom(id, roomName || 'スカウトゲーム')
      socket.join(id)
      cb(id)
      broadcast(io, room)
    })

    socket.on('join-room', (roomId, name, cb) => {
      const room = getRoom(roomId)
      if (!room) { cb({ ok: false, error: 'ルームが見つかりません' }); return }

      const participantId = Math.random().toString(36).slice(2, 9)
      const updated = setRoom(roomId, r => ({
        ...r,
        participants: [...r.participants, { id: participantId, name, socketId: socket.id }],
      }))
      socket.join(roomId)
      cb({ ok: true, participantId, room: updated })
      broadcast(io, updated)
    })

    socket.on('set-question', (roomId, question) => {
      try {
        const room = setRoom(roomId, r => ({
          ...r,
          currentQuestion: question,
          phase: 'answering',
          answers: [],
          votes: [],
          answersRevealed: false,
        }))
        broadcast(io, room)
      } catch {}
    })

    socket.on('random-question', (cb) => {
      cb(getRandomQuestion())
    })

    socket.on('submit-answer', (roomId, text, cb) => {
      const room = getRoom(roomId)
      if (!room) { cb(false); return }
      const participant = room.participants.find(p => p.socketId === socket.id)
      if (!participant || room.answers.find(a => a.participantId === participant.id)) { cb(false); return }

      const updated = setRoom(roomId, r => ({
        ...r,
        answers: [...r.answers, { id: Math.random().toString(36).slice(2, 9), participantId: participant.id, text }],
      }))
      cb(true)
      broadcast(io, updated)
    })

    socket.on('reveal-answers', (roomId) => {
      try { broadcast(io, setRoom(roomId, r => ({ ...r, answersRevealed: true }))) } catch {}
    })

    socket.on('start-voting', (roomId) => {
      try { broadcast(io, setRoom(roomId, r => ({ ...r, phase: 'voting', votes: [] }))) } catch {}
    })

    socket.on('cast-vote', (roomId, answerId, cb) => {
      const room = getRoom(roomId)
      if (!room) { cb(false); return }
      const voter = room.participants.find(p => p.socketId === socket.id)
      if (!voter) { cb(false); return }
      const voterVotes = room.votes.filter(v => v.voterId === voter.id)
      if (voterVotes.length >= 3 || voterVotes.find(v => v.answerId === answerId)) { cb(false); return }
      const answer = room.answers.find(a => a.id === answerId)
      if (answer?.participantId === voter.id) { cb(false); return }

      const updated = setRoom(roomId, r => ({ ...r, votes: [...r.votes, { voterId: voter.id, answerId }] }))
      cb(true)
      broadcast(io, updated)
    })

    socket.on('show-results', (roomId) => {
      try { broadcast(io, setRoom(roomId, r => ({ ...r, phase: 'results' }))) } catch {}
    })

    socket.on('reset', (roomId) => {
      try { broadcast(io, resetRoom(roomId)) } catch {}
    })

    socket.on('disconnecting', () => {
      for (const roomId of socket.rooms) {
        if (roomId === socket.id) continue
        try {
          const room = setRoom(roomId, r => ({
            ...r,
            participants: r.participants.filter(p => p.socketId !== socket.id),
          }))
          broadcast(io, room)
        } catch {}
      }
    })
  })
}

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server, { path: '/api/socket', addTrailingSlash: false })
    res.socket.server.io = io
    initSocket(io)
  }
  res.end()
}
