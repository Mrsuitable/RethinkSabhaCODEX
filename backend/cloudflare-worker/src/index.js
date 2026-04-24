function buildCorsHeaders(origin, allowedOrigin) {
  const allowOrigin = !allowedOrigin || allowedOrigin === "*" ? "*" : allowedOrigin;
  const matchesAllowed = allowOrigin === "*" || origin === allowedOrigin;

  return {
    "Access-Control-Allow-Origin": matchesAllowed ? origin || allowOrigin : allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders
    }
  });
}

function composePrompt(topic, mode) {
  const modeText =
    mode === "for" ? "FOR only" : mode === "against" ? "AGAINST only" : "FOR and AGAINST";

  return [
    "You are an elite debate coach helping students prepare concise, high-quality arguments.",
    "Return plain text only (no markdown tables).",
    `Topic: ${topic}`,
    `Requested stance mode: ${modeText}`,
    "",
    "Output format:",
    "1) One-sentence framing of the topic",
    "2) Three strongest arguments (with rationale)",
    "3) Two likely counterarguments and rebuttals",
    "4) A 45-second closing statement draft",
    "5) Three evidence search keywords"
  ].join("\n");
}

function extractText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }
  const textParts = parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean);
  return textParts.join("\n").trim();
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const corsHeaders = buildCorsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Use POST /coach" }, 405, corsHeaders);
    }

    const url = new URL(request.url);
    if (url.pathname !== "/coach") {
      return jsonResponse({ error: "Endpoint not found" }, 404, corsHeaders);
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return jsonResponse(
        { error: "Backend is missing GEMINI_API_KEY secret." },
        500,
        corsHeaders
      );
    }

    let topic = "";
    let mode = "both";
    try {
      const payload = await request.json();
      topic = String(payload?.topic || "").trim();
      mode = String(payload?.mode || "both").trim().toLowerCase();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400, corsHeaders);
    }

    if (!topic) {
      return jsonResponse({ error: "Topic is required." }, 400, corsHeaders);
    }

    const model = env.GEMINI_MODEL || "gemini-2.0-flash";
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
      `?key=${encodeURIComponent(apiKey)}`;

    const prompt = composePrompt(topic, mode);

    let upstreamResponse;
    try {
      upstreamResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.6,
            topP: 0.9,
            maxOutputTokens: 900
          }
        })
      });
    } catch {
      return jsonResponse({ error: "Failed to reach Gemini API." }, 502, corsHeaders);
    }

    let upstreamJson = {};
    try {
      upstreamJson = await upstreamResponse.json();
    } catch {
      return jsonResponse({ error: "Gemini API returned invalid JSON." }, 502, corsHeaders);
    }

    if (!upstreamResponse.ok) {
      const detail =
        upstreamJson?.error?.message ||
        upstreamJson?.message ||
        "Gemini API returned a non-success response.";
      return jsonResponse({ error: detail }, upstreamResponse.status, corsHeaders);
    }

    const answer = extractText(upstreamJson);
    if (!answer) {
      return jsonResponse(
        { error: "Gemini returned an empty response. Try a more specific topic." },
        502,
        corsHeaders
      );
    }

    return jsonResponse({ answer }, 200, corsHeaders);
  }
};
