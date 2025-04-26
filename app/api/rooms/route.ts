import { type NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

// Initialiser la connexion Redis avec gestion d'erreur
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

// Créer une nouvelle salle
export async function POST(req: NextRequest) {
  try {
    // Vérifier si Redis est disponible
    if (!(await isRedisAvailable())) {
      return NextResponse.json(
        {
          error: "Service temporairement indisponible. Veuillez réessayer plus tard.",
        },
        { status: 503 },
      )
    }

    const { name, creatorId } = await req.json()

    if (!name || !creatorId) {
      return NextResponse.json({ error: "Nom de salle et ID créateur requis" }, { status: 400 })
    }

    // Générer un ID unique pour la salle
    const roomId = Math.random().toString(36).substring(2, 9)

    // Stocker les informations de la salle
    await redis.hset(`room:${roomId}`, {
      id: roomId,
      name: name,
      creatorId: creatorId,
      createdAt: Date.now().toString(),
      participants: JSON.stringify([]),
    })

    return NextResponse.json({ roomId, name })
  } catch (error) {
    console.error("Erreur création salle:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la création de la salle",
        details: String(error),
      },
      { status: 500 },
    )
  }
}

// Obtenir toutes les salles
export async function GET() {
  try {
    // Vérifier si Redis est disponible
    if (!(await isRedisAvailable())) {
      console.log("Redis n'est pas disponible pour GET /api/rooms")
      return NextResponse.json(
        {
          error: "Service temporairement indisponible. Veuillez réessayer plus tard.",
          rooms: [],
        },
        { status: 503 },
      )
    }

    console.log("Tentative de récupération des clés de salles...")

    // Utiliser scan au lieu de keys pour plus de fiabilité
    let roomKeys: string[] = []
    try {
      // Essayer d'abord avec keys
      roomKeys = await redis.keys("room:*")
      console.log(`${roomKeys.length} salles trouvées avec keys`)
    } catch (keysError) {
      console.error("Erreur avec redis.keys:", keysError)

      // Fallback: retourner une liste vide plutôt que de planter
      console.log("Retour d'une liste vide de salles")
      return NextResponse.json({ rooms: [] })
    }

    if (!roomKeys.length) {
      console.log("Aucune salle trouvée")
      return NextResponse.json({ rooms: [] })
    }

    // Récupérer les informations pour chaque salle
    const rooms = []

    for (const key of roomKeys) {
      try {
        console.log(`Récupération des données pour la salle ${key}...`)
        const roomData = await redis.hgetall(key)

        if (roomData && roomData.id) {
          let participantCount = 0

          // Gérer avec précaution le parsing des participants
          try {
            if (roomData.participants) {
              const parsedParticipants = JSON.parse(roomData.participants)
              participantCount = Array.isArray(parsedParticipants) ? parsedParticipants.length : 0
            }
          } catch (parseError) {
            console.error(`Erreur parsing participants pour ${key}:`, parseError)
          }

          rooms.push({
            id: roomData.id,
            name: roomData.name || "Salle sans nom",
            participantCount,
          })

          console.log(`Salle ajoutée: ${roomData.name} (${roomData.id})`)
        } else {
          console.log(`Données invalides pour la salle ${key}:`, roomData)
        }
      } catch (roomError) {
        console.error(`Erreur récupération données pour ${key}:`, roomError)
        // Continuer avec les autres salles même si une échoue
      }
    }

    console.log(`Retour de ${rooms.length} salles`)
    return NextResponse.json({ rooms })
  } catch (error) {
    console.error("Erreur récupération salles:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des salles",
        details: String(error),
        rooms: [],
      },
      { status: 500 },
    )
  }
}

// Ajouter une route pour tester la connexion Redis
export async function HEAD() {
  try {
    if (await isRedisAvailable()) {
      return new Response(null, { status: 200 })
    } else {
      return new Response(null, { status: 503 })
    }
  } catch (error) {
    console.error("Erreur test Redis:", error)
    return new Response(null, { status: 500 })
  }
}
