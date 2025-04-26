import type { NextRequest } from "next/server"
import { WebSocket } from "ws"

// Stockage des connexions WebSocket actives
const clients = new Map<string, WebSocket>()

export async function GET(req: NextRequest) {
  // @ts-ignore: Deno is not defined in this environment
  const { socket: res, response } = new WebSocketServer({ noServer: true }).handleRequest(req)

  // Générer un ID unique pour ce client
  const clientId = Math.random().toString(36).substring(2, 9)

  // Stocker la connexion
  clients.set(clientId, res)

  // Gérer les messages
  res.onmessage = (event: any) => {
    try {
      const data = JSON.parse(event.data)

      // Ajouter l'ID de l'expéditeur
      data.from = clientId

      if (data.type === "join") {
        // Informer les autres clients qu'un nouveau participant a rejoint
        broadcastToOthers(clientId, {
          type: "new-peer",
          from: clientId,
        })
      } else if (data.to) {
        // Message destiné à un client spécifique
        const targetClient = clients.get(data.to)
        if (targetClient) {
          targetClient.send(JSON.stringify(data))
        }
      } else {
        // Diffuser à tous les autres clients
        broadcastToOthers(clientId, data)
      }
    } catch (error) {
      console.error("Erreur de traitement du message:", error)
    }
  }

  // Gérer la déconnexion
  res.onclose = () => {
    clients.delete(clientId)

    // Informer les autres clients
    broadcastToOthers(clientId, {
      type: "peer-left",
      from: clientId,
    })
  }

  return new Response(null, { status: 101, headers: { "Sec-WebSocket-Accept": req.headers.get("sec-websocket-key") } })
}

// Fonction pour diffuser un message à tous les clients sauf l'expéditeur
function broadcastToOthers(senderId: string, data: any) {
  clients.forEach((client, id) => {
    if (id !== senderId && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data))
    }
  })
}

class WebSocketServer {
  options: any
  constructor(options: any) {
    this.options = options
  }

  handleRequest(req: NextRequest) {
    const socket = new WebSocket("ws://localhost:3000")
    const response = new Response(null, {
      status: 101,
      headers: { "Sec-WebSocket-Accept": req.headers.get("sec-websocket-key") || "" },
    })
    return { socket, response }
  }
}
