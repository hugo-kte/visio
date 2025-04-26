"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"

export default function RedisStatus() {
  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading")
  const [details, setDetails] = useState<any>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const checkRedisStatus = async () => {
      try {
        const res = await fetch("/api/redis-test")
        const data = await res.json()

        if (res.ok && data.status === "success") {
          setStatus("connected")
        } else {
          setStatus("error")
        }

        setDetails(data)
      } catch (error) {
        console.error("Erreur lors du test Redis:", error)
        setStatus("error")
        setDetails({ error: String(error) })
      }
    }

    checkRedisStatus()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          {status === "loading" && <AlertCircle className="mr-2 h-5 w-5 text-yellow-500" />}
          {status === "connected" && <CheckCircle className="mr-2 h-5 w-5 text-green-500" />}
          {status === "error" && <XCircle className="mr-2 h-5 w-5 text-red-500" />}
          Statut Redis
        </CardTitle>
        <CardDescription>
          {status === "loading" && "Vérification de la connexion Redis..."}
          {status === "connected" && "Redis est connecté et fonctionne correctement."}
          {status === "error" && "Impossible de se connecter à Redis. Vérifiez vos variables d'environnement."}
        </CardDescription>
      </CardHeader>

      {showDetails && details && (
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-xs">{JSON.stringify(details, null, 2)}</pre>
        </CardContent>
      )}

      <CardFooter>
        <Button variant="outline" size="sm" onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? "Masquer les détails" : "Afficher les détails"}
        </Button>
      </CardFooter>
    </Card>
  )
}
