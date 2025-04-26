"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Users } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface Participant {
  id: string
  name: string
  stream?: MediaStream
  isLocal?: boolean
  isMuted?: boolean
  isVideoOff?: boolean
}

interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: Date
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const [roomName, setRoomName] = useState("")
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [userId] = useState(`user-${Math.random().toString(36).substring(2, 9)}`)
  const [username, setUsername] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Récupérer les informations de la salle
  useEffect(() => {
    const fetchRoomInfo = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`/api/rooms/${roomId}`)

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Salle non trouvée")
          } else {
            throw new Error(`Erreur HTTP: ${res.status}`)
          }
        }

        const data = await res.json()

        if (data.error) {
          throw new Error(data.error)
        }

        setRoomName(data.name || "Salle sans nom")
      } catch (error) {
        console.error("Erreur de récupération de la salle:", error)
        setError(`Erreur: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        setLoading(false)
      }
    }

    if (roomId) {
      fetchRoomInfo()
    }
  }, [roomId])

  // Rejoindre la salle
  const joinRoom = async () => {
    if (!username.trim()) return

    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          username,
        }),
      })

      if (!res.ok) {
        throw new Error(`Erreur HTTP: ${res.status}`)
      }

      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setIsConnected(true)

      // Ajouter un message système
      setMessages([
        {
          id: `msg-${Date.now()}`,
          senderId: "system",
          senderName: "Système",
          content: `Bienvenue dans la salle "${roomName}"`,
          timestamp: new Date(),
        },
      ])
    } catch (error) {
      console.error("Erreur pour rejoindre la salle:", error)
      setError(`Erreur: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }

  // Démarrer le flux local
  const startLocalStream = async () => {
    try {
      setError(null)

      // Vérifier si le navigateur supporte getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Votre navigateur ne supporte pas l'accès à la caméra et au microphone")
      }

      const stream = await navigator.mediaDevices
        .getUserMedia({
          audio: true,
          video: true,
        })
        .catch((err) => {
          console.error("Erreur getUserMedia:", err)
          throw new Error("Impossible d'accéder à votre caméra ou microphone. Veuillez vérifier les permissions.")
        })

      // Ajouter le participant local
      setParticipants((prev) => [
        ...prev,
        {
          id: userId,
          name: username,
          stream,
          isLocal: true,
        },
      ])

      setLocalStream(stream)

      // Simuler l'ajout d'un participant distant pour la démo
      setTimeout(() => {
        setParticipants((prev) => [
          ...prev,
          {
            id: "demo-user-1",
            name: "Participant Demo",
            isLocal: false,
          },
        ])

        // Ajouter un message système
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            senderId: "system",
            senderName: "Système",
            content: "Un participant a rejoint la salle",
            timestamp: new Date(),
          },
        ])
      }, 2000)
    } catch (error) {
      console.error("Erreur d'accès aux périphériques:", error)
      setError(`Erreur: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Gérer les contrôles audio/vidéo
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks()
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks()
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsVideoOff(!isVideoOff)
    }
  }

  const sendMessage = () => {
    if (newMessage.trim()) {
      // Ajouter le message à la liste locale
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          senderId: userId,
          senderName: username,
          content: newMessage,
          timestamp: new Date(),
        },
      ])

      setNewMessage("")

      // Simuler une réponse pour la démo
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            senderId: "demo-user-1",
            senderName: "Participant Demo",
            content: "Merci pour votre message!",
            timestamp: new Date(),
          },
        ])
      }, 1500)
    }
  }

  const endCall = () => {
    // Arrêter tous les flux
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
    }

    // Rediriger vers la page d'accueil
    router.push("/")
  }

  // Si l'utilisateur n'a pas encore entré son nom
  if (!username) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md p-6">
          <h1 className="text-2xl font-bold mb-4">Rejoindre {roomName || "la salle"}</h1>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">
                Votre nom
              </label>
              <Input
                id="username"
                placeholder="Entrez votre nom"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && username && joinRoom()}
              />
            </div>
            <Button className="w-full" onClick={joinRoom} disabled={!username.trim() || loading}>
              {loading ? "Chargement..." : "Continuer"}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex-1 flex overflow-hidden">
        {/* Zone principale de vidéo */}
        <div className="flex-1 p-4 overflow-auto">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {!localStream ? (
              <Card className="flex items-center justify-center h-64 col-span-full">
                <Button onClick={startLocalStream} className="bg-blue-600 hover:bg-blue-700">
                  Activer caméra et microphone
                </Button>
              </Card>
            ) : (
              <>
                {/* Vidéo locale */}
                {participants
                  .filter((p) => p.isLocal)
                  .map((participant) => (
                    <VideoDisplay
                      key={participant.id}
                      participant={participant}
                      isMuted={true}
                      isVideoOff={isVideoOff}
                    />
                  ))}

                {/* Vidéos distantes */}
                {participants
                  .filter((p) => !p.isLocal)
                  .map((participant) => (
                    <VideoDisplay
                      key={participant.id}
                      participant={participant}
                      isMuted={participant.isMuted}
                      isVideoOff={participant.isVideoOff}
                    />
                  ))}

                {/* Remplir avec des espaces vides si peu de participants */}
                {participants.length <= 1 && (
                  <Card className="flex items-center justify-center h-64 bg-gray-200">
                    <p className="text-gray-500">En attente d'autres participants...</p>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sidebar pour le chat ou les participants */}
        {showChat && (
          <div className="w-80 border-l bg-white flex flex-col h-full">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Chat</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${message.senderId === userId ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`px-3 py-2 rounded-lg max-w-[80%] ${
                      message.senderId === "system"
                        ? "bg-gray-200 text-gray-700"
                        : message.senderId === userId
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p>{message.content}</p>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {message.senderName} •{" "}
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Écrivez un message..."
                  className="flex-1"
                />
                <Button size="icon" onClick={sendMessage}>
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {showParticipants && (
          <div className="w-80 border-l bg-white flex flex-col h-full">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Participants ({participants.length})</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      {participant.name.charAt(0)}
                    </div>
                    <span>
                      {participant.name} {participant.isLocal && "(Vous)"}
                    </span>
                  </div>

                  <div className="flex space-x-2">
                    {participant.isMuted ? (
                      <MicOff className="h-4 w-4 text-red-500" />
                    ) : (
                      <Mic className="h-4 w-4 text-gray-500" />
                    )}

                    {participant.isVideoOff ? (
                      <VideoOff className="h-4 w-4 text-red-500" />
                    ) : (
                      <Video className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Barre de contrôle */}
      {localStream && (
        <div className="bg-white p-4 border-t flex items-center justify-center space-x-4">
          <Button
            variant={isMuted ? "destructive" : "outline"}
            size="icon"
            onClick={toggleMute}
            className="rounded-full h-12 w-12"
          >
            {isMuted ? <MicOff /> : <Mic />}
          </Button>

          <Button
            variant={isVideoOff ? "destructive" : "outline"}
            size="icon"
            onClick={toggleVideo}
            className="rounded-full h-12 w-12"
          >
            {isVideoOff ? <VideoOff /> : <Video />}
          </Button>

          <Button
            variant={showChat ? "default" : "outline"}
            size="icon"
            onClick={() => {
              setShowChat(!showChat)
              setShowParticipants(false)
            }}
            className="rounded-full h-12 w-12"
          >
            <MessageSquare />
          </Button>

          <Button
            variant={showParticipants ? "default" : "outline"}
            size="icon"
            onClick={() => {
              setShowParticipants(!showParticipants)
              setShowChat(false)
            }}
            className="rounded-full h-12 w-12"
          >
            <Users />
          </Button>

          <Button variant="destructive" size="icon" onClick={endCall} className="rounded-full h-12 w-12">
            <PhoneOff />
          </Button>
        </div>
      )}
    </div>
  )
}

// Composant pour afficher une vidéo
function VideoDisplay({
  participant,
  isMuted = false,
  isVideoOff = false,
}: {
  participant: Participant
  isMuted?: boolean
  isVideoOff?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream
    }
  }, [participant.stream])

  return (
    <Card className="relative overflow-hidden rounded-lg h-64">
      {participant.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal || isMuted}
          className={`w-full h-full object-cover ${participant.isLocal ? "transform scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-2xl font-bold">
            {participant.name.charAt(0)}
          </div>
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center space-x-2 bg-black/50 text-white px-2 py-1 rounded-md text-sm">
        {participant.name} {participant.isLocal && "(Vous)"}
        {isMuted && <MicOff className="h-4 w-4 text-red-500" />}
        {isVideoOff && <VideoOff className="h-4 w-4 text-red-500" />}
      </div>
    </Card>
  )
}
