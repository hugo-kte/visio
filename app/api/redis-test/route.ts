import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

// Route de test pour vérifier la connexion Redis
export async function GET() {
  try {
    // Initialiser la connexion Redis
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL || "",
      token: process.env.UPSTASH_REDIS_TOKEN || "",
    })

    // Tester la connexion
    const pingResult = await redis.ping()

    // Tester une opération d'écriture/lecture simple
    const testKey = "test:connection"
    await redis.set(testKey, "Connection test successful")
    const testValue = await redis.get(testKey)

    return NextResponse.json({
      status: "success",
      ping: pingResult,
      testValue: testValue,
      env: {
        hasUrl: !!process.env.UPSTASH_REDIS_URL,
        hasToken: !!process.env.UPSTASH_REDIS_TOKEN,
        urlLength: process.env.UPSTASH_REDIS_URL?.length || 0,
        tokenLength: process.env.UPSTASH_REDIS_TOKEN?.length || 0,
      },
    })
  } catch (error) {
    console.error("Erreur test Redis:", error)
    return NextResponse.json(
      {
        status: "error",
        message: String(error),
        env: {
          hasUrl: !!process.env.UPSTASH_REDIS_URL,
          hasToken: !!process.env.UPSTASH_REDIS_TOKEN,
          urlLength: process.env.UPSTASH_REDIS_URL?.length || 0,
          tokenLength: process.env.UPSTASH_REDIS_TOKEN?.length || 0,
        },
      },
      { status: 500 },
    )
  }
}
