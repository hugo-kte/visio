"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

interface Message {
  id: string
  sender: string
  text: string
  timestamp: Date
}

export default function ChatSidebar() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "Système",
      text: "Bienvenue dans le chat de la visioconférence",
      timestamp: new Date(),
    },
  ])
  const [newMessage, setNewMessage] = useState("")

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        sender: "Vous",
        text: newMessage,
        timestamp: new Date(),
      }

      setMessages([...messages, message])
      setNewMessage("")

      // Ici, vous enverriez également le message via WebSocket
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      sendMessage()
    }
  }

  return (
    <div className="w-80 border-l bg-white flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Chat</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex flex-col ${message.sender === "Vous" ? "items-end" : "items-start"}`}>
            <div
              className={`px-3 py-2 rounded-lg max-w-[80%] ${
                message.sender === "Vous" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-800"
              }`}
            >
              <p>{message.text}</p>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {message.sender} • {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Écrivez un message..."
            className="flex-1"
          />
          <Button size="icon" onClick={sendMessage}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
