"use client"

import { useEffect, useRef, useState } from "react"

interface RTCClientProps {
  roomId: string
  userId: string
  username: string
  onMessage: (data: any) => void
}

export default function RTCClient({ roomId, userId, username, onMessage }: RTCClientProps) {
  const [isConnected, setIsConnected] = useState(false)
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({})
  const localStreamRef = useRef<MediaStream | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fonction pour envoyer un message de signalisation
  const sendSignalingMessage = async (message: any) => {
    try {
      await fetch("/api/rtc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          senderId: userId,
          message,
        }),
      })
    } catch (error) {
      console.error("Erreur d'envoi du message de signalisation:", error)
    }
  }

  // Fonction pour créer une connexion peer
  const createPeerConnection = (peerId: string) => {
    if (peerConnectionsRef.current[peerId]) {
      return peerConnectionsRef.current[peerId]
    }

    console.log(`Création d'une connexion peer avec ${peerId}`)

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
    })

    // Ajouter les pistes locales
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!)
      })
    }

    // Gérer les candidats ICE
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage({
          type: "ice-candidate",
          candidate: event.candidate,
          targetId: peerId,
        })
      }
    }

    // Gérer les pistes distantes
    pc.ontrack = (event) => {
      onMessage({
        type: "remote-stream",
        stream: event.streams[0],
        peerId,
      })
    }

    // Gérer les changements d'état de connexion
    pc.onconnectionstatechange = () => {
      console.log(`État de connexion avec ${peerId}: ${pc.connectionState}`)
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        onMessage({
          type: "peer-disconnected",
          peerId,
        })
      }
    }

    peerConnectionsRef.current[peerId] = pc
    return pc
  }

  // Fonction pour traiter les messages de signalisation
  const handleSignalingMessage = async (data: any) => {
    const { senderId, message } = data

    if (senderId === userId) return // Ignorer nos propres messages

    console.log("Message de signalisation reçu:", message)

    switch (message.type) {
      case "join-room":
        // Quelqu'un a rejoint, initier une offre
        const pc = createPeerConnection(senderId)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        sendSignalingMessage({
          type: "offer",
          sdp: pc.localDescription,
          targetId: senderId,
        })
        break

      case "offer":
        if (message.targetId === userId) {
          const pc = createPeerConnection(senderId)
          await pc.setRemoteDescription(new RTCSessionDescription(message.sdp))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          sendSignalingMessage({
            type: "answer",
            sdp: pc.localDescription,
            targetId: senderId,
          })
        }
        break

      case "answer":
        if (message.targetId === userId) {
          const pc = peerConnectionsRef.current[senderId]
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(message.sdp))
          }
        }
        break

      case "ice-candidate":
        if (message.targetId === userId) {
          const pc = peerConnectionsRef.current[senderId]
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(message.candidate))
          }
        }
        break

      case "leave-room":
        if (peerConnectionsRef.current[senderId]) {
          peerConnectionsRef.current[senderId].close()
          delete peerConnectionsRef.current[senderId]
          onMessage({
            type: "peer-disconnected",
            peerId: senderId,
          })
        }
        break
    }
  }

  // Fonction pour récupérer les messages en polling
  const pollMessages = async () => {
    try {
      const response = await fetch(`/api/rtc/poll?roomId=${roomId}&userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.messages && data.messages.length > 0) {
          data.messages.forEach(handleSignalingMessage)
        }
      }
    } catch (error) {
      console.error("Erreur de polling:", error)
    }
  }

  // Initialiser la connexion
  useEffect(() => {
    const initConnection = async () => {
      try {
        // Rejoindre la salle
        await fetch(`/api/rooms/${roomId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            username,
          }),
        })

        // Annoncer notre présence
        await sendSignalingMessage({
          type: "join-room",
        })

        setIsConnected(true)

        // Démarrer le polling pour les messages
        pollingIntervalRef.current = setInterval(pollMessages, 1000)
      } catch (error) {
        console.error("Erreur d'initialisation de la connexion:", error)
      }
    }

    initConnection()

    // Nettoyage
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }

      // Quitter la salle
      fetch(`/api/rooms/${roomId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
        }),
      }).then(() => {
        sendSignalingMessage({
          type: "leave-room",
        })
      })

      // Fermer toutes les connexions peer
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close())
      peerConnectionsRef.current = {}
    }
  }, [roomId, userId, username])

  // Méthode pour définir le flux local
  const setLocalStream = (stream: MediaStream) => {
    localStreamRef.current = stream

    // Ajouter les pistes à toutes les connexions existantes
    Object.values(peerConnectionsRef.current).forEach((pc) => {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream)
      })
    })

    onMessage({
      type: "local-stream",
      stream,
    })
  }

  return {
    isConnected,
    setLocalStream,
    sendMessage: (message: string) => {
      sendSignalingMessage({
        type: "chat-message",
        content: message,
      })
    },
  }
}
