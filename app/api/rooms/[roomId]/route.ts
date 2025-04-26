import { type NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

// Initialiser la connexion Redis
let redis: Redis

try {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL || "",
    token: process.env.UPSTASH_REDIS_TOKEN || "",
  })
} catch (error) {
  console.error("Erreur d'initialisation Redis:", error)
}

// Fonction utilitaire pour vérifier si Redis est disponible
async function isRedisAvailable() {
  if (!redis) return false

  try {
    // Tester la connexion avec une opération simple
    await redis.ping()
    return true
  } catch (error) {
    console.error("Redis n'est pas disponible:", error)
    return false
  }
}

// Obtenir les détails d'une salle
export async function GET(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const { roomId } = params

    // Vérifier si Redis est disponible
    if (!(await isRedisAvailable())) {
      return NextResponse.json(
        {
          error: "Service temporairement indisponible. Veuillez réessayer plus tard.",
        },
        { status: 503 },
      )
    }

    // Vérifier si la salle existe
    const exists = await redis.exists(`room:${roomId}`)

    if (!exists) {
      return NextResponse.json({ error: "Salle non trouvée" }, { status: 404 })
    }

    // Récupérer les informations de la salle
    const roomData = await redis.hgetall(`room:${roomId}`)

    // Gérer avec précaution le parsing des participants
    let participants = []
    try {
      if (roomData.participants) {
        participants = JSON.parse(roomData.participants)
      }
    } catch (parseError) {
      console.error(`Erreur parsing participants pour room:${roomId}:`, parseError)
    }

    return NextResponse.json({
      id: roomData.id || roomId,
      name: roomData.name || "Salle sans nom",
      creatorId: roomData.creatorId || "",
      participants,
    })
  } catch (error) {
    console.error("Erreur récupération salle:", error)
    return NextResponse.json({ error: "Erreur serveur", details: String(error) }, { status: 500 })
  }
}

// Rejoindre une salle
export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const { roomId } = params
    const { userId, username } = await req.json()

    // Vérifier si Redis est disponible
    if (!(await isRedisAvailable())) {
      return NextResponse.json(
        {
          error: "Service temporairement indisponible. Veuillez réessayer plus tard.",
        },
        { status: 503 },
      )
    }

    if (!userId || !username) {
      return NextResponse.json({ error: "ID utilisateur et nom requis" }, { status: 400 })
    }

    // Vérifier si la salle existe
    const exists = await redis.exists(`room:${roomId}`)

    if (!exists) {
      return NextResponse.json({ error: "Salle non trouvée" }, { status: 404 })
    }

    // Récupérer la liste actuelle des participants
    const participantsStr = (await redis.hget(`room:${roomId}`, "participants")) || "[]"
    const participants = JSON.parse(participantsStr)

    // Ajouter le participant s'il n'est pas déjà présent
    if (!participants.some((p: any) => p.userId === userId)) {
      participants.push({
        userId,
        username,
        joinedAt: Date.now(),
      })

      // Mettre à jour la liste des participants
      await redis.hset(`room:${roomId}`, {
        participants: JSON.stringify(participants),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur rejoindre salle:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// Quitter une salle
export async function DELETE(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const { roomId } = params
    const { userId } = await req.json()

    // Vérifier si Redis est disponible
    if (!(await isRedisAvailable())) {
      return NextResponse.json(
        {
          error: "Service temporairement indisponible. Veuillez réessayer plus tard.",
        },
        { status: 503 },
      )
    }

    if (!userId) {
      return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 })
    }

    // Vérifier si la salle existe
    const exists = await redis.exists(`room:${roomId}`)

    if (!exists) {
      return NextResponse.json({ error: "Salle non trouvée" }, { status: 404 })
    }

    // Récupérer la liste actuelle des participants
    const participantsStr = (await redis.hget(`room:${roomId}`, "participants")) || "[]"
    const participants = JSON.parse(participantsStr)

    // Filtrer le participant qui quitte
    const updatedParticipants = participants.filter((p: any) => p.userId !== userId)

    // Mettre à jour la liste des participants
    await redis.hset(`room:${roomId}`, {
      participants: JSON.stringify(updatedParticipants),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur quitter salle:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
