"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Video, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Room {
  id: string
  name: string
  participantCount: number
}

export default function HomePage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [newRoomName, setNewRoomName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId] = useState(`user-${Math.random().toString(36).substring(2, 9)}`)

  // Charger les salles existantes
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log("Tentative de récupération des salles...")
        const res = await fetch("/api/rooms")

        if (!res.ok) {
          throw new Error(`Erreur HTTP: ${res.status}`)
        }

        const data = await res.json()

        if (data.error) {
          console.error("Erreur API:", data.error)
          throw new Error(data.error)
        }

        console.log("Données reçues:", data)

        if (data.rooms) {
          setRooms(data.rooms)
        } else {
          setRooms([])
        }
      } catch (error) {
        console.error("Erreur de chargement des salles:", error)
        setError(`Erreur lors du chargement des salles: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        setLoading(false)
      }
    }

    fetchRooms()
  }, [])

  // Créer une nouvelle salle
  const createRoom = async () => {
    if (!newRoomName.trim()) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newRoomName,
          creatorId: userId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Erreur HTTP: ${response.status}`)
      }

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.roomId) {
        router.push(`/room/${data.roomId}`)
      } else {
        throw new Error("Aucun ID de salle retourné")
      }
    } catch (error) {
      console.error("Erreur de création de salle:", error)
      setError(`Erreur lors de la création de la salle: ${error instanceof Error ? error.message : String(error)}`)
      setLoading(false)
    }
  }

  // Rejoindre une salle existante
  const joinRoom = (roomId: string) => {
    router.push(`/room/${roomId}`)
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8 flex items-center">
        <Video className="mr-2 h-8 w-8" />
        Application de Visioconférence
      </h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Créer une nouvelle salle */}
        <Card>
          <CardHeader>
            <CardTitle>Créer une nouvelle salle</CardTitle>
            <CardDescription>
              Créez votre propre salle de visioconférence et invitez d'autres personnes à la rejoindre.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="roomName">Nom de la salle</Label>
                <Input
                  id="roomName"
                  placeholder="Entrez un nom pour votre salle"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={createRoom} disabled={loading || !newRoomName.trim()}>
              {loading ? "Création en cours..." : "Créer et rejoindre"}
            </Button>
          </CardFooter>
        </Card>

        {/* Rejoindre une salle existante */}
        <Card>
          <CardHeader>
            <CardTitle>Rejoindre une salle existante</CardTitle>
            <CardDescription>Rejoignez une salle de visioconférence existante.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Chargement des salles...</p>
            ) : rooms.length > 0 ? (
              <div className="grid gap-2">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => joinRoom(room.id)}
                  >
                    <div>
                      <p className="font-medium">{room.name}</p>
                      <p className="text-sm text-gray-500">
                        {room.participantCount} participant{room.participantCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Rejoindre
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Aucune salle disponible. Créez-en une nouvelle !</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle>État de la connexion Redis</CardTitle>
            <CardDescription>Vérifiez si la connexion à Redis est établie correctement</CardDescription>
          </CardHeader>
          <CardContent>
            <RedisConnectionStatus />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Composant pour vérifier la connexion Redis
function RedisConnectionStatus() {
  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading")
  const [message, setMessage] = useState<string>("")

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch("/api/redis-test")

        if (!res.ok) {
          setStatus("error")
          setMessage(`Erreur HTTP: ${res.status}`)
          return
        }

        const data = await res.json()

        if (data.status === "success") {
          setStatus("connected")
          setMessage("Connexion Redis établie avec succès")
        } else {
          setStatus("error")
          setMessage(data.message || "Erreur de connexion à Redis")
        }
      } catch (error) {
        setStatus("error")
        setMessage(`Erreur: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    checkConnection()
  }, [])

  return (
    <div
      className={`p-4 rounded-md ${
        status === "loading"
          ? "bg-yellow-50 text-yellow-700"
          : status === "connected"
            ? "bg-green-50 text-green-700"
            : "bg-red-50 text-red-700"
      }`}
    >
      <div className="flex items-center">
        <div
          className={`w-3 h-3 rounded-full mr-2 ${
            status === "loading" ? "bg-yellow-500" : status === "connected" ? "bg-green-500" : "bg-red-500"
          }`}
        ></div>
        <p className="font-medium">
          {status === "loading"
            ? "Vérification de la connexion..."
            : status === "connected"
              ? "Connecté à Redis"
              : "Problème de connexion à Redis"}
        </p>
      </div>
      {message && <p className="mt-1 text-sm">{message}</p>}
    </div>
  )
}
