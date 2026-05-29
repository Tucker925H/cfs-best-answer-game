import { NextApiRequest, NextApiResponse } from 'next'
import { networkInterfaces } from 'os'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const nets = networkInterfaces()
  const ips: string[] = []

  for (const list of Object.values(nets)) {
    for (const net of list ?? []) {
      // IPv4 かつ内部ループバック以外
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address)
      }
    }
  }

  res.json({ ips })
}
