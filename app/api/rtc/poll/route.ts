import { type NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

// Initialiser la connexion Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || "",
  token: process.env.UPSTASH_REDIS_TOKEN || "",
})

// Map pour stocker les messages en attente par utilisateur et par salle
const pendingMessages: Record<string, any[]> = {}

// Améliorer la gestion des erreurs dans la fonction GET du polling
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const roomId = url.searchParams.get("roomId")
    const userId = url.searchParams.get("userId")

    if (!roomId || !userId) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
    }

    // Clé unique pour cet utilisateur dans cette salle
    const userRoomKey = `${roomId}:${userId}`

    // Récupérer les messages en attente
    const messages = pendingMessages[userRoomKey] || []

    // Vider la file d'attente
    pendingMessages[userRoomKey] = []

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Erreur lors du polling des messages:", error)
    return NextResponse.json({ error: "Erreur serveur", messages: [] }, { status: 500 })
  }
}

// Fonction pour s'abonner aux messages Redis et les stocker
// Note: Cette fonction est appelée au démarrage du serveur
// Dans un environnement serverless, vous devrez utiliser une approche différente
async function subscribeToRoomMessages() {
  try {
    // Créer un client Redis séparé pour les abonnements
    const subClient = new Redis({
      url: process.env.UPSTASH_REDIS_URL || "",
      token: process.env.UPSTASH_REDIS_TOKEN || "",
    })

    // S'abonner à tous les canaux de salle
    await subClient.psubscribe("room:*")

    // Écouter les messages
    subClient.on("pmessage", (pattern, channel, message) => {
      try {
        const roomId = channel.split(":")[1]
        const data = JSON.parse(message)

        // Stocker le message pour tous les utilisateurs de la salle sauf l'expéditeur
        const roomData = redis
          .hgetall(`room:${roomId}`)
          .then((roomData) => {
            if (!roomData || !roomData.participants) return

            const participants = JSON.parse(roomData.participants || "[]")

            participants.forEach((participant: any) => {
              // Ne pas envoyer le message à l'expéditeur
              if (participant.userId !== data.senderId) {
                const userRoomKey = `${roomId}:${participant.userId}`

                if (!pendingMessages[userRoomKey]) {
                  pendingMessages[userRoomKey] = []
                }

                pendingMessages[userRoomKey].push(data)
              }
            })
          })
          .catch(console.error)
      } catch (error) {
        console.error("Erreur de traitement du message Redis:", error)
      }
    })
  } catch (error) {
    console.error("Erreur d'abonnement Redis:", error)
  }
}

// Note: Cette fonction ne sera pas exécutée dans un environnement serverless
// Vous devrez utiliser une approche différente, comme un service de webhook Redis
// ou un service tiers comme Pusher ou Ably
if (process.env.NODE_ENV !== "production") {
  subscribeToRoomMessages().catch(console.error)
}

export const dynamic = "force-dynamic"
