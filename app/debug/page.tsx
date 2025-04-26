"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import RedisStatus from "@/components/redis-status"

export default function DebugPage() {
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runTest = async (testName: string) => {
    setLoading(true)
    try {
      let endpoint = ""

      switch (testName) {
        case "redis":
          endpoint = "/api/redis-test"
          break
        case "rooms":
          endpoint = "/api/rooms"
          break
        default:
          throw new Error("Test inconnu")
      }

      const res = await fetch(endpoint)
      const data = await res.json()

      setTestResult({
        name: testName,
        status: res.ok ? "success" : "error",
        statusCode: res.status,
        data,
      })
    } catch (error) {
      setTestResult({
        name: testName,
        status: "error",
        error: String(error),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Page de débogage</h1>

      <div className="grid gap-6">
        <RedisStatus />

        <Card>
          <CardHeader>
            <CardTitle>Tests API</CardTitle>
            <CardDescription>Exécutez des tests pour vérifier le bon fonctionnement des API</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <Button onClick={() => runTest("redis")} disabled={loading}>
                Tester Redis
              </Button>
              <Button onClick={() => runTest("rooms")} disabled={loading}>
                Tester API Salles
              </Button>
            </div>

            {testResult && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">
                  Résultat du test {testResult.name}:
                  <span className={`ml-2 ${testResult.status === "success" ? "text-green-500" : "text-red-500"}`}>
                    {testResult.status === "success" ? "Succès" : "Échec"}
                    {testResult.statusCode && ` (${testResult.statusCode})`}
                  </span>
                </h3>
                <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-xs">
                  {JSON.stringify(testResult.data || testResult.error, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Variables d'environnement</CardTitle>
            <CardDescription>Vérifiez si les variables d'environnement nécessaires sont définies</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="font-medium mr-2">UPSTASH_REDIS_URL:</span>
                <span id="redis-url-status">Vérification en cours...</span>
              </li>
              <li className="flex items-center">
                <span className="font-medium mr-2">UPSTASH_REDIS_TOKEN:</span>
                <span id="redis-token-status">Vérification en cours...</span>
              </li>
            </ul>

            <script
              dangerouslySetInnerHTML={{
                __html: `
              fetch('/api/redis-test')
                .then(res => res.json())
                .then(data => {
                  document.getElementById('redis-url-status').textContent = 
                    data.env.hasUrl ? 'Définie ✓' : 'Non définie ✗';
                  document.getElementById('redis-token-status').textContent = 
                    data.env.hasToken ? 'Définie ✓' : 'Non définie ✗';
                })
                .catch(err => {
                  document.getElementById('redis-url-status').textContent = 'Erreur de vérification';
                  document.getElementById('redis-token-status').textContent = 'Erreur de vérification';
                });
            `,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
