'use client'
import { useState, useEffect, useRef } from 'react'
import { useRoom } from '@/hooks/useSocket'
import { Room } from '@/types'

// ── アイコン ─────────────────────────────────────────────────────────────────
const TentIcon = () => (
  <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polygon points="32,4 4,56 60,56" />
    <line x1="32" y1="4" x2="32" y2="56" />
    <line x1="18" y1="56" x2="26" y2="36" />
    <line x1="46" y1="56" x2="38" y2="36" />
  </svg>
)

function getVoteCount(room: Room, answerId: string) {
  return room.votes.filter(v => v.answerId === answerId).length
}

// ── ローディング ──────────────────────────────────────────────────────────────
function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="h-[100dvh] flex items-center justify-center bg-amber-50">
      <div className="text-center">
        <p className="text-4xl mb-3 animate-spin">🔄</p>
        <p className="text-gray-500">{label}</p>
      </div>
    </div>
  )
}

// ── トップ画面 ────────────────────────────────────────────────────────────────
function TopScreen({ onHost, onJoin }: { onHost: () => void; onJoin: () => void }) {
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center px-6 bg-amber-50 gap-5">
      <div className="text-green-800"><TentIcon /></div>
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-green-800 mb-1">朝からそれ正解！</h1>
        <p className="text-sm text-green-700">Code for Scout 交流会</p>
      </div>
      <div className="w-full max-w-xs flex flex-col gap-3 mt-4">
        <button
          onClick={onHost}
          className="w-full bg-green-700 hover:bg-green-800 active:bg-green-900 text-white font-bold py-4 rounded-2xl text-lg shadow-lg transition-all active:scale-95"
        >
          🏕️ ルームを作る
        </button>
        <button
          onClick={onJoin}
          className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold py-4 rounded-2xl text-lg shadow-lg transition-all active:scale-95"
        >
          🙋 ルームに参加する
        </button>
      </div>
    </div>
  )
}

// ── ルーム作成画面（ホスト用） ────────────────────────────────────────────────
function CreateRoomScreen({ onCreated, onBack }: {
  onCreated: (roomId: string) => void
  onBack: () => void
}) {
  const { socket } = useRoom()
  const [roomName, setRoomName] = useState('')

  function handleCreate() {
    if (!socket || !roomName.trim()) return
    socket.emit('create-room', roomName.trim(), (roomId) => {
      onCreated(roomId)
    })
  }

  return (
    <div className="h-[100dvh] flex flex-col px-6 py-8 bg-amber-50">
      <button onClick={onBack} className="text-green-700 font-semibold mb-6 text-sm self-start">← 戻る</button>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-green-800 mb-4"><TentIcon /></div>
        <h2 className="text-xl font-extrabold text-green-800 mb-6">ルームを作る</h2>
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 border border-amber-200">
          <label className="block text-sm font-semibold text-gray-600 mb-2">ルーム名</label>
          <input
            className="w-full border-2 border-amber-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-green-500 mb-4"
            placeholder="例：CfS交流会 2025"
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && roomName.trim() && handleCreate()}
            autoFocus
          />
          <button
            className="w-full bg-green-700 hover:bg-green-800 active:bg-green-900 text-white font-bold py-3 rounded-xl text-lg shadow transition-all active:scale-95 disabled:opacity-40"
            onClick={handleCreate}
            disabled={!roomName.trim()}
          >
            作成する
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ルーム参加画面 ────────────────────────────────────────────────────────────
function JoinRoomScreen({ onJoined, onBack }: {
  onJoined: (roomId: string, participantId: string, name: string, room: Room) => void
  onBack: () => void
}) {
  const { socket } = useRoom()
  const [roomId, setRoomId] = useState('')
  const [name, setName] = useState('')
  const [step, setStep] = useState<'roomId' | 'name'>('roomId')
  const [error, setError] = useState('')

  function handleCheckRoom() {
    if (roomId.trim().length < 4) { setError('ルームIDを入力してください'); return }
    setError('')
    setStep('name')
  }

  function handleJoin() {
    if (!socket || !name.trim()) return
    socket.emit('join-room', roomId.trim(), name.trim(), (result) => {
      if (!result.ok || !result.participantId || !result.room) {
        setError(result.error ?? '参加に失敗しました')
        setStep('roomId')
      } else {
        onJoined(roomId.trim(), result.participantId, name.trim(), result.room)
      }
    })
  }

  return (
    <div className="h-[100dvh] flex flex-col px-6 py-8 bg-amber-50">
      <button onClick={onBack} className="text-green-700 font-semibold mb-6 text-sm self-start">← 戻る</button>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-green-800 mb-4"><TentIcon /></div>
        <h2 className="text-xl font-extrabold text-green-800 mb-6">ルームに参加する</h2>
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 border border-amber-200">
          {step === 'roomId' ? (
            <>
              <label className="block text-sm font-semibold text-gray-600 mb-2">ルームID（4桁の数字）</label>
              <input
                className="w-full border-2 border-amber-300 rounded-xl px-4 py-3 text-2xl font-mono text-center tracking-widest focus:outline-none focus:border-green-500 mb-2"
                placeholder="0000"
                value={roomId}
                onChange={e => setRoomId(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={e => e.key === 'Enter' && handleCheckRoom()}
                inputMode="numeric"
                autoFocus
              />
              {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
              <button
                className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold py-3 rounded-xl text-lg shadow transition-all active:scale-95 disabled:opacity-40 mt-2"
                onClick={handleCheckRoom}
                disabled={roomId.length < 4}
              >
                次へ
              </button>
            </>
          ) : (
            <>
              <div className="text-center mb-4">
                <span className="text-xs text-gray-400">ルームID</span>
                <p className="text-3xl font-mono font-bold text-green-700 tracking-widest">{roomId}</p>
              </div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">あなたの名前</label>
              <input
                className="w-full border-2 border-amber-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-green-500 mb-2"
                placeholder="例：田中 太郎"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && name.trim() && handleJoin()}
                autoFocus
              />
              {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
              <button
                className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl text-lg shadow transition-all active:scale-95 disabled:opacity-40 mt-2"
                onClick={handleJoin}
                disabled={!name.trim()}
              >
                参加する 🏕️
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 待機画面 ──────────────────────────────────────────────────────────────────
function WaitingScreen({ room, myName }: { room: Room; myName: string }) {
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center px-6 bg-amber-50">
      <div className="text-green-800 mb-3"><TentIcon /></div>
      <h2 className="text-xl font-bold text-green-800 mb-1">こんにちは、{myName}さん！</h2>
      <p className="text-sm text-gray-500 mb-5">{room.name}</p>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-5 border border-amber-200">
        <p className="text-center text-gray-400 text-sm mb-3">参加者 ({room.participants.length}人)</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {room.participants.map(p => (
            <span key={p.id} className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
              {p.name}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-6 text-gray-400 text-sm">ホストがお題を準備中です…</p>
      <p className="mt-3 text-3xl animate-bounce">⏳</p>
    </div>
  )
}

// ── 回答画面 ──────────────────────────────────────────────────────────────────
function AnswerScreen({ room, myId, roomId, onSubmit }: {
  room: Room; myId: string; roomId: string; onSubmit: (text: string) => void
}) {
  const [text, setText] = useState('')
  const hasAnswered = room.answers.some(a => a.participantId === myId)

  return (
    <div className="h-[100dvh] flex flex-col px-5 py-5 bg-amber-50">
      <div className="bg-green-700 rounded-2xl p-4 mb-4 shadow shrink-0">
        <p className="text-xs text-green-200 font-semibold mb-1">📝 お題</p>
        <p className="text-white font-bold text-base leading-snug">{room.currentQuestion}</p>
      </div>
      {hasAnswered ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-5xl mb-4">✅</p>
          <p className="text-xl font-bold text-green-700">回答送信済み！</p>
          <p className="text-sm text-gray-500 mt-2">他の参加者を待っています…</p>
          <p className="mt-5 text-sm text-gray-400">回答数: {room.answers.length} / {room.participants.length}</p>
        </div>
      ) : (
        <>
          <label className="text-sm font-semibold text-gray-600 mb-2 shrink-0">あなたの回答</label>
          <textarea
            className="flex-1 w-full border-2 border-amber-300 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-green-500 resize-none bg-white"
            placeholder="自由に入力してください…"
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <button
            className="mt-4 w-full bg-green-700 hover:bg-green-800 active:bg-green-900 text-white font-bold py-4 rounded-xl text-lg shadow transition-all active:scale-95 disabled:opacity-40 shrink-0"
            onClick={() => text.trim() && onSubmit(text.trim())}
            disabled={!text.trim()}
          >
            送信する 🚀
          </button>
        </>
      )}
    </div>
  )
}

// ── 投票画面 ──────────────────────────────────────────────────────────────────
function VotingScreen({ room, myId, myVotes, onVote }: {
  room: Room; myId: string; myVotes: string[]; onVote: (id: string) => void
}) {
  const myAnswer = room.answers.find(a => a.participantId === myId)
  const othersAnswers = room.answersRevealed ? room.answers.filter(a => a.participantId !== myId) : []

  return (
    <div className="h-[100dvh] flex flex-col px-5 py-5 bg-amber-50">
      <div className="bg-green-700 rounded-2xl p-3 mb-3 shadow shrink-0">
        <p className="text-xs text-green-200 font-semibold mb-0.5">📝 お題</p>
        <p className="text-white font-bold text-sm leading-snug">{room.currentQuestion}</p>
      </div>
      <div className="flex justify-between items-center mb-3 shrink-0">
        <h2 className="text-lg font-bold text-green-800">投票タイム！</h2>
        <span className="bg-amber-400 text-white text-sm font-bold px-3 py-1 rounded-full">残り {3 - myVotes.length} 票</span>
      </div>
      {!room.answersRevealed ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-4xl mb-3">🔒</p>
            <p className="text-gray-500 text-sm">ホストが回答を公開するのを待っています…</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pb-2">
          {othersAnswers.map((answer, i) => {
            const voted = myVotes.includes(answer.id)
            return (
              <button
                key={answer.id}
                onClick={() => !voted && myVotes.length < 3 && onVote(answer.id)}
                className={`w-full text-left rounded-2xl p-4 border-2 shadow transition-all active:scale-95 ${
                  voted ? 'border-green-500 bg-green-50' :
                  myVotes.length >= 3 ? 'border-gray-200 bg-white opacity-50 cursor-not-allowed' :
                  'border-amber-200 bg-white hover:border-green-400 hover:bg-green-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-700 leading-snug flex-1">
                    <span className="text-gray-400 mr-2">{String.fromCharCode(64 + i + 1)}.</span>
                    {answer.text}
                  </p>
                  {voted && <span className="text-green-600 text-lg shrink-0">👍</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}
      {myAnswer && (
        <div className="mt-3 rounded-2xl p-3 border-2 border-dashed border-gray-300 bg-gray-50 shrink-0">
          <p className="text-xs text-gray-400 mb-1">あなたの回答（投票不可）</p>
          <p className="text-sm text-gray-600 line-clamp-2">{myAnswer.text}</p>
        </div>
      )}
    </div>
  )
}

// ── 結果画面 ──────────────────────────────────────────────────────────────────
function ResultsScreen({ room, myId }: { room: Room; myId: string }) {
  const ranked = [...room.answers]
    .map(a => ({ ...a, votes: getVoteCount(room, a.id), participant: room.participants.find(p => p.id === a.participantId) }))
    .sort((a, b) => b.votes - a.votes)
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="h-[100dvh] flex flex-col px-5 py-5 bg-amber-50">
      <div className="shrink-0 mb-4">
        <h2 className="text-2xl font-extrabold text-center text-green-800 mb-1">🏆 結果発表！</h2>
        <p className="text-center text-xs text-gray-500 leading-snug">{room.currentQuestion}</p>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {ranked.map((answer, i) => (
          <div key={answer.id} className={`rounded-2xl p-4 shadow-md border-2 ${
            i === 0 ? 'border-yellow-400 bg-yellow-50' :
            i === 1 ? 'border-gray-300 bg-gray-50' :
            i === 2 ? 'border-orange-300 bg-orange-50' : 'border-amber-100 bg-white'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{medals[i] ?? `${i + 1}位`}</span>
                  <span className="text-xs font-semibold text-gray-500">{answer.participant?.name ?? '匿名'}</span>
                  {answer.participantId === myId && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">あなた</span>
                  )}
                </div>
                <p className="text-sm text-gray-700 leading-snug">{answer.text}</p>
              </div>
              <div className="text-center ml-2 shrink-0">
                <p className="text-2xl font-extrabold text-green-700">{answer.votes}</p>
                <p className="text-xs text-gray-400">票</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── メイン ────────────────────────────────────────────────────────────────────
type Screen = 'top' | 'create' | 'join'

export default function ParticipantPage() {
  const { socket, connected, room, setRoomId } = useRoom()
  const [screen, setScreen] = useState<Screen>('top')
  const [myId, setMyId] = useState<string | null>(null)
  const [myName, setMyName] = useState<string | null>(null)
  const [myRoomId, setMyRoomId] = useState<string | null>(null)
  const [myVotes, setMyVotes] = useState<string[]>([])
  const joinedRef = useRef(false)

  // 再接続時：保存済みセッションで自動再入室
  useEffect(() => {
    if (!socket || !connected) return
    const savedRoomId = sessionStorage.getItem('cfs_roomId')
    const savedName = sessionStorage.getItem('cfs_myName')
    if (!savedRoomId || !savedName || joinedRef.current) return
    joinedRef.current = true
    socket.emit('join-room', savedRoomId, savedName, (result) => {
      if (result.ok && result.participantId && result.room) {
        setMyId(result.participantId)
        setMyName(savedName)
        setMyRoomId(savedRoomId)
        setRoomId(savedRoomId)
        sessionStorage.setItem('cfs_participantId', result.participantId)
      }
    })
  }, [socket, connected])

  useEffect(() => {
    if (!room || !myId) return
    setMyVotes(room.votes.filter(v => v.voterId === myId).map(v => v.answerId))
  }, [room, myId])

  function handleRoomCreated(roomId: string) {
    // ホスト用にルームIDをセッション保存してホスト画面へ
    sessionStorage.setItem('cfs_hostRoomId', roomId)
    window.location.href = `/host?room=${roomId}`
  }

  function handleJoined(roomId: string, participantId: string, name: string, initialRoom: Room) {
    joinedRef.current = true
    setMyId(participantId)
    setMyName(name)
    setMyRoomId(roomId)
    setRoomId(roomId)
    sessionStorage.setItem('cfs_roomId', roomId)
    sessionStorage.setItem('cfs_myName', name)
    sessionStorage.setItem('cfs_participantId', participantId)
  }

  function handleSubmitAnswer(text: string) {
    if (!myRoomId) return
    socket?.emit('submit-answer', myRoomId, text, () => {})
  }

  function handleVote(answerId: string) {
    if (!myRoomId) return
    socket?.emit('cast-vote', myRoomId, answerId, (ok) => {
      if (ok) setMyVotes(prev => [...prev, answerId])
    })
  }

  if (!connected) return <LoadingScreen label="接続中…" />

  // 参加済みの場合はゲーム画面へ
  if (myId && myName && room) {
    if (room.phase === 'waiting') return <WaitingScreen room={room} myName={myName} />
    if (room.phase === 'answering') return <AnswerScreen room={room} myId={myId} roomId={myRoomId!} onSubmit={handleSubmitAnswer} />
    if (room.phase === 'voting') return <VotingScreen room={room} myId={myId} myVotes={myVotes} onVote={handleVote} />
    if (room.phase === 'results') return <ResultsScreen room={room} myId={myId} />
  }

  if (screen === 'create') return <CreateRoomScreen onCreated={handleRoomCreated} onBack={() => setScreen('top')} />
  if (screen === 'join') return <JoinRoomScreen onJoined={handleJoined} onBack={() => setScreen('top')} />
  return <TopScreen onHost={() => setScreen('create')} onJoin={() => setScreen('join')} />
}
