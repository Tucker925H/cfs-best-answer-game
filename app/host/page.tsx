'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRoom } from '@/hooks/useSocket'
import { Room } from '@/types'

function getVoteCount(room: Room, answerId: string) {
  return room.votes.filter(v => v.answerId === answerId).length
}

function PhaseLabel({ phase }: { phase: Room['phase'] }) {
  const map: Record<Room['phase'], { label: string; color: string }> = {
    waiting:   { label: '待機中',   color: 'bg-gray-400' },
    answering: { label: '回答中',   color: 'bg-blue-500' },
    voting:    { label: '投票中',   color: 'bg-amber-500' },
    results:   { label: '結果発表', color: 'bg-green-600' },
  }
  const { label, color } = map[phase]
  return <span className={`${color} text-white text-xs font-bold px-3 py-1 rounded-full`}>{label}</span>
}

// ── ルームID入力画面（URLにroomがない場合） ───────────────────────────────────
function HostJoinScreen({ onJoin }: { onJoin: (roomId: string) => void }) {
  const { socket } = useRoom()
  const [roomName, setRoomName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [mode, setMode] = useState<'choose' | 'create' | 'enter'>('choose')

  function handleCreate() {
    if (!socket || !roomName.trim()) return
    socket.emit('create-room', roomName.trim(), (id) => {
      onJoin(id)
    })
  }

  if (mode === 'choose') return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-amber-50 gap-4">
      <h2 className="text-xl font-extrabold text-green-800">🏕️ ホスト画面</h2>
      <div className="w-full max-w-xs flex flex-col gap-3">
        <button onClick={() => setMode('create')} className="w-full bg-green-700 text-white font-bold py-4 rounded-2xl text-lg shadow active:scale-95">
          新しいルームを作る
        </button>
        <button onClick={() => setMode('enter')} className="w-full bg-amber-500 text-white font-bold py-4 rounded-2xl text-lg shadow active:scale-95">
          既存のルームIDを入力
        </button>
      </div>
    </div>
  )

  if (mode === 'create') return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-amber-50">
      <button onClick={() => setMode('choose')} className="text-green-700 font-semibold mb-6 text-sm self-start">← 戻る</button>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 border border-amber-200">
        <label className="block text-sm font-semibold text-gray-600 mb-2">ルーム名</label>
        <input
          className="w-full border-2 border-amber-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-green-500 mb-4"
          placeholder="例：CfS交流会 2025"
          value={roomName}
          onChange={e => setRoomName(e.target.value)}
          autoFocus
        />
        <button
          onClick={handleCreate}
          disabled={!roomName.trim()}
          className="w-full bg-green-700 text-white font-bold py-3 rounded-xl text-lg shadow active:scale-95 disabled:opacity-40"
        >
          作成する
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-amber-50">
      <button onClick={() => setMode('choose')} className="text-green-700 font-semibold mb-6 text-sm self-start">← 戻る</button>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 border border-amber-200">
        <label className="block text-sm font-semibold text-gray-600 mb-2">ルームID（4桁）</label>
        <input
          className="w-full border-2 border-amber-300 rounded-xl px-4 py-3 text-2xl font-mono text-center tracking-widest focus:outline-none focus:border-green-500 mb-4"
          placeholder="0000"
          value={roomId}
          onChange={e => setRoomId(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          autoFocus
        />
        <button
          onClick={() => roomId.length === 4 && onJoin(roomId)}
          disabled={roomId.length < 4}
          className="w-full bg-green-700 text-white font-bold py-3 rounded-xl text-lg shadow active:scale-95 disabled:opacity-40"
        >
          入室する
        </button>
      </div>
    </div>
  )
}

// ── ホストコントロール画面 ─────────────────────────────────────────────────────
export default function HostPage() {
  const { socket, connected, room, setRoomId } = useRoom()
  const [roomIdParam, setRoomIdParam] = useState<string | null>(null)
  const [question, setQuestion] = useState('')

  // URLの ?room=XXXX を読む
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const r = params.get('room')
    if (r) {
      setRoomIdParam(r)
      setRoomId(r)
    }
  }, [])

  useEffect(() => {
    if (room?.currentQuestion) setQuestion(room.currentQuestion)
  }, [room?.currentQuestion])

  function handleJoinAsHost(id: string) {
    setRoomIdParam(id)
    setRoomId(id)
    // URLを更新（リロードなし）
    window.history.replaceState(null, '', `/host?room=${id}`)
  }

  function emit<T extends keyof typeof socket>(event: string, ...args: unknown[]) {
    if (!socket || !roomIdParam) return
    ;(socket as any).emit(event, roomIdParam, ...args)
  }

  function handleSetQuestion() {
    if (!question.trim() || !roomIdParam) return
    socket?.emit('set-question', roomIdParam, question.trim())
  }

  function handleRandomQuestion() {
    socket?.emit('random-question', (q) => setQuestion(q))
  }

  function handleReset() {
    if (!confirm('ゲームをリセットしますか？参加者データもすべて消えます。')) return
    if (!roomIdParam) return
    socket?.emit('reset', roomIdParam)
    setQuestion('')
  }

  if (!connected) return (
    <div className="flex items-center justify-center min-h-screen bg-amber-50">
      <div className="text-center"><p className="text-4xl mb-3 animate-spin">🔄</p><p className="text-gray-500">接続中…</p></div>
    </div>
  )

  if (!roomIdParam) return <HostJoinScreen onJoin={handleJoinAsHost} />

  return (
    <div className="min-h-screen bg-amber-50 pb-10">
      {/* Header */}
      <div className="bg-green-800 text-white px-5 py-4 shadow-md sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-base font-extrabold">🏕️ {room?.name ?? 'ホスト画面'}</h1>
            <p className="text-xs text-green-200">ルームID：<span className="font-mono font-bold tracking-widest text-white">{roomIdParam}</span></p>
          </div>
          {room && <PhaseLabel phase={room.phase} />}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* ルームID表示（大きく） */}
        <div className="bg-green-700 rounded-2xl p-5 text-center shadow">
          <p className="text-green-200 text-sm mb-1">参加者に伝えるルームID</p>
          <p className="text-white font-mono font-extrabold text-5xl tracking-[0.2em]">{roomIdParam}</p>
          <p className="text-green-200 text-xs mt-2">アプリを開いて「ルームに参加する」→ このIDを入力</p>
        </div>

        {/* 参加者 */}
        <div className="bg-white rounded-2xl shadow p-4 border border-amber-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-green-800">👥 参加者</h2>
            <span className="text-2xl font-extrabold text-green-700">{room?.participants.length ?? 0}人</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {room?.participants.map(p => (
              <span key={p.id} className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">{p.name}</span>
            ))}
            {(!room || room.participants.length === 0) && <p className="text-sm text-gray-400">まだ参加者がいません</p>}
          </div>
        </div>

        {/* お題設定 */}
        <div className="bg-white rounded-2xl shadow p-4 border border-amber-200">
          <h2 className="font-bold text-green-800 mb-3">📝 お題設定</h2>
          <textarea
            className="w-full border-2 border-amber-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none mb-3"
            placeholder="お題を入力、またはランダム出題ボタンを押してください"
            rows={3}
            value={question}
            onChange={e => setQuestion(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={handleRandomQuestion} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl text-sm shadow transition-all active:scale-95">
              🎲 ランダム
            </button>
            <button onClick={handleSetQuestion} disabled={!question.trim()} className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2 rounded-xl text-sm shadow transition-all active:scale-95 disabled:opacity-40">
              ✅ お題を出す
            </button>
          </div>
        </div>

        {/* 回答一覧 */}
        {room && room.phase !== 'waiting' && (
          <div className="bg-white rounded-2xl shadow p-4 border border-amber-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-green-800">💬 回答一覧</h2>
              <span className="text-sm text-gray-500">{room.answers.length} / {room.participants.length} 人</span>
            </div>
            {room.answers.length === 0 && <p className="text-sm text-gray-400">まだ回答がありません</p>}
            <div className="space-y-2">
              {room.answers.map((a, i) => {
                const p = room.participants.find(pp => pp.id === a.participantId)
                return (
                  <div key={a.id} className="bg-amber-50 rounded-xl px-3 py-2 text-sm flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="text-gray-400 mr-1">{String.fromCharCode(64 + i + 1)}.</span>
                      <span className="text-gray-700">{room.answersRevealed ? a.text : '（公開前）'}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">{p?.name}</span>
                      {room.phase !== 'answering' && (
                        <span className="text-xs font-bold text-green-700">{getVoteCount(room, a.id)}票</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 進行操作 */}
        <div className="bg-white rounded-2xl shadow p-4 border border-amber-200 space-y-3">
          <h2 className="font-bold text-green-800">🎮 進行操作</h2>

          {room?.phase === 'waiting' && (
            <p className="text-sm text-gray-400 text-center">お題を設定してゲームを開始してください</p>
          )}

          {room?.phase === 'answering' && !room.answersRevealed && (
            <button onClick={() => socket?.emit('reveal-answers', roomIdParam!)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow transition-all active:scale-95">
              👁️ 回答を公開する
            </button>
          )}

          {room?.phase === 'answering' && room.answersRevealed && (
            <button onClick={() => socket?.emit('start-voting', roomIdParam!)} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl shadow transition-all active:scale-95">
              🗳️ 投票を開始する
            </button>
          )}

          {room?.phase === 'voting' && (
            <div className="space-y-2">
              {!room.answersRevealed && (
                <button onClick={() => socket?.emit('reveal-answers', roomIdParam!)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow transition-all active:scale-95">
                  👁️ 回答を公開する
                </button>
              )}
              <p className="text-sm text-gray-500 text-center">投票数: {room.votes.length}票</p>
              <button onClick={() => socket?.emit('show-results', roomIdParam!)} className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl shadow transition-all active:scale-95">
                🏆 結果を発表する
              </button>
            </div>
          )}

          {room?.phase === 'results' && (
            <div className="bg-amber-50 rounded-xl p-4">
              <h3 className="font-bold text-green-800 mb-3">🏆 最終結果</h3>
              {[...room.answers]
                .map(a => ({ ...a, votes: getVoteCount(room, a.id), participant: room.participants.find(p => p.id === a.participantId) }))
                .sort((a, b) => b.votes - a.votes)
                .map((a, i) => (
                  <div key={a.id} className="flex items-center gap-2 py-1 border-b border-amber-100 last:border-0">
                    <span className="text-lg">{['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`}</span>
                    <span className="flex-1 text-sm text-gray-700">{a.text}</span>
                    <span className="text-xs text-gray-500">{a.participant?.name}</span>
                    <span className="font-bold text-green-700 text-sm">{a.votes}票</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* 次のお題 / リセット */}
        {room && room.phase !== 'waiting' && (
          <button
            onClick={() => { if (!roomIdParam) return; socket?.emit('set-question', roomIdParam, '') ; setQuestion('') }}
            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 rounded-xl shadow transition-all active:scale-95 border border-blue-200"
          >
            ➡️ 次のお題へ（回答・投票をリセット）
          </button>
        )}

        <button onClick={handleReset} className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl shadow transition-all active:scale-95 border border-red-200">
          🔄 ゲーム全体をリセット（参加者も消去）
        </button>
      </div>
    </div>
  )
}
