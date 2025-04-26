import { type NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

// Initialiser la connexion Redis
// Remplacez ces valeurs par vos propres informations d'Upstash Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || "",
  token: process.env.UPSTASH_REDIS_TOKEN || "",
})

export async function POST(req: NextRequest) {
  try {
    const { message, roomId, senderId } = await req.json()

    if (!roomId || !senderId || !message) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
    }

    // Canal spécifique à la salle
    const channel = `room:${roomId}`

    // Publier le message sur le canal Redis
    await redis.publish(
      channel,
      JSON.stringify({
        senderId,
        message,
        timestamp: Date.now(),
      }),
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur de signalisation:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
