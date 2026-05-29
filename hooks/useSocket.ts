'use client'
import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { ServerToClientEvents, ClientToServerEvents, Room } from '@/types'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let _socket: AppSocket | null = null

function getSocket(): AppSocket {
  if (_socket) return _socket
  _socket = io({
    path: '/api/socket',
    addTrailingSlash: false,
  })
  return _socket
}

export function useRoom() {
  const [socket, setSocket] = useState<AppSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [room, setRoom] = useState<Room | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)

  useEffect(() => {
    const s = getSocket()
    setSocket(s)
    setConnected(s.connected)

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onState = (r: Room) => setRoom(r)

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    s.on('state-update', onState)

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      s.off('state-update', onState)
    }
  }, [])

  return { socket, connected, room, roomId, setRoomId }
}
