import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  try {
    const url = new URL(req.url)
    const endpoint = url.searchParams.get("endpoint") || "/get/games"
    const validEndpoints = ["/get/games", "/get/groups", "/get/teams", "/get/stadiums"]
    if (!validEndpoints.includes(endpoint)) throw new Error("Endpoint non autorisé")
    const res = await fetch(`https://worldcup26.ir${endpoint}`, {
      headers: { "Accept": "application/json", "User-Agent": "GoalGenius/1.0" },
    })
    if (!res.ok) throw new Error(`API worldcup26.ir error: ${res.status}`)
    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  }
})
