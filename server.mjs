import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server as IOServer } from 'socket.io'

// ── メモリストア ──────────────────────────────────────────────────────────────
const rooms = new Map()

function genRoomId() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

function createRoom(id, name) {
  const room = { id, name, phase: 'waiting', currentQuestion: '', participants: [], answers: [], votes: [], answersRevealed: false }
  rooms.set(id, room)
  return room
}

function getRoom(id) { return rooms.get(id) }

function setRoom(id, updater) {
  const room = rooms.get(id)
  if (!room) return null
  const updated = updater(room)
  rooms.set(id, updated)
  return updated
}

function resetRoom(id) {
  const existing = rooms.get(id)
  if (!existing) return null
  return setRoom(id, r => ({ ...r, phase: 'waiting', currentQuestion: '', participants: [], answers: [], votes: [], answersRevealed: false }))
}

// ── サンプルお題 ──────────────────────────────────────────────────────────────
const QUESTIONS = [
  '100万円と半年あったら作りたいスカウトITプロジェクトは？',
  '2035年のスカウト活動にありそうな技術は？',
  'スカウト活動で最初にAI化したいことは？',
  '全国のスカウト全員が使うアプリを作るなら何を作る？',
  'BPが今生きていたら作りそうなアプリは？',
  'スカウト活動で一番面倒なことは何？',
  'スカウト活動にドローンを活用するとしたら？',
  '入隊希望者が増えるためのIT施策は？',
  'スカウトの記録・写真管理をもっと楽にするアイデアは？',
  '野外活動をもっと安全にするためのテクノロジーは？',
  'スカウト同士がオンラインで繋がれる機能を作るなら？',
  '保護者とのコミュニケーションをITで改善するとしたら？',
  '地域の課題をスカウトITで解決するとしたら？',
  '次のジャンボリーで使いたいデジタルツールは？',
  '活動計画・日程調整を楽にするアプリのアイデアは？',
  'SDGsとスカウト活動をITで繋ぐアイデアは？',
  'スカウト技能をゲーム感覚で学べる仕組みを作るなら？',
  '指導者の負担をITで減らすには何をすべき？',
  'スカウト手帳をデジタル化するなら何を盛り込む？',
  'Code for Scoutが来年取り組むべきテーマは？',
]

function getRandomQuestion() {
  return QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)]
}

// ── Socket.io ─────────────────────────────────────────────────────────────────
function initSocket(io) {
  io.on('connection', (socket) => {
    socket.on('create-room', (roomName, cb) => {
      const id = genRoomId()
      const room = createRoom(id, roomName || 'スカウトゲーム')
      socket.join(id)
      cb(id)
      io.to(id).emit('state-update', room)
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
      io.to(roomId).emit('state-update', updated)
    })

    socket.on('set-question', (roomId, question) => {
      const updated = setRoom(roomId, r => ({ ...r, currentQuestion: question, phase: 'answering', answers: [], votes: [], answersRevealed: false }))
      if (updated) io.to(roomId).emit('state-update', updated)
    })

    socket.on('random-question', (cb) => { cb(getRandomQuestion()) })

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
      io.to(roomId).emit('state-update', updated)
    })

    socket.on('reveal-answers', (roomId) => {
      const updated = setRoom(roomId, r => ({ ...r, answersRevealed: true }))
      if (updated) io.to(roomId).emit('state-update', updated)
    })

    socket.on('start-voting', (roomId) => {
      const updated = setRoom(roomId, r => ({ ...r, phase: 'voting', votes: [] }))
      if (updated) io.to(roomId).emit('state-update', updated)
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
      io.to(roomId).emit('state-update', updated)
    })

    socket.on('show-results', (roomId) => {
      const updated = setRoom(roomId, r => ({ ...r, phase: 'results' }))
      if (updated) io.to(roomId).emit('state-update', updated)
    })

    socket.on('reset', (roomId) => {
      const updated = resetRoom(roomId)
      if (updated) io.to(roomId).emit('state-update', updated)
    })

    socket.on('disconnecting', () => {
      for (const roomId of socket.rooms) {
        if (roomId === socket.id) continue
        const updated = setRoom(roomId, r => ({
          ...r,
          participants: r.participants.filter(p => p.socketId !== socket.id),
        }))
        if (updated) io.to(roomId).emit('state-update', updated)
      }
    })
  })
}

// ── Next.js + HTTP サーバー起動 ───────────────────────────────────────────────
const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  const io = new IOServer(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: { origin: '*' },
  })
  initSocket(io)

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})
