import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const configuredModel = Deno.env.get("GEMINI_MODEL") || "";
const GEMINI_MODEL = configuredModel && configuredModel !== "gemini-2.5-flash" && configuredModel !== "gemini-3.8-flash" && configuredModel !== "gemini-3.7-flash" ? configuredModel : "gemini-3.5-flash-lite";

const ALLOWED = new Set([
  "sondoanthai2007@gmail.com",
  "trancongphuong301@gmail.com",
]);

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

async function getUser(token: string) {
  const res = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + token,
    },
  });
  return res.ok ? await res.json() : null;
}

function stripFence(text: string) {
  return text.trim()
    .replace(/^\`\`\`(?:json)?\s*/i, "")
    .replace(/\s*\`\`\`$/, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.toLowerCase().startsWith("bearer ")
      ? auth.slice(7).trim()
      : "";

    if (!token) return json({ error: "UNAUTHORIZED" }, 401);

    const user = await getUser(token);
    const email = String(user?.email || "").toLowerCase();
    if (!user || !ALLOWED.has(email)) return json({ error: "FORBIDDEN" }, 403);

    if (!GEMINI_API_KEY) {
      return json({
        error: "Gemini chưa được cấu hình. Hãy thêm GEMINI_API_KEY trong Supabase Edge Function Secrets.",
        code: "AI_NOT_CONFIGURED"
      }, 503);
    }

    const input = await req.json();
    if (
      !input?.storagePath ||
      !input?.fileName ||
      !input?.mimeType ||
      !["questions", "lesson"].includes(input?.targetType)
    ) {
      return json({ error: "Invalid input" }, 400);
    }

    const objectPath = String(input.storagePath)
      .split("/")
      .map(encodeURIComponent)
      .join("/");

    const fileRes = await fetch(
      SUPABASE_URL +
        "/storage/v1/object/authenticated/content-imports/" +
        objectPath,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: "Bearer " + token,
        },
      },
    );

    if (!fileRes.ok) {
      return json({ error: "Không đọc được file nguồn từ Supabase Storage." }, 400);
    }

    const bytes = new Uint8Array(await fileRes.arrayBuffer());
    if (bytes.byteLength > 4 * 1024 * 1024) {
      return json({ error: "AI Import v1 hỗ trợ tối đa 4 MB mỗi file." }, 413);
    }

    let binary = "";
    for (let i = 0; i < bytes.length; i += 32768) {
      binary += String.fromCharCode(
        ...bytes.subarray(i, Math.min(i + 32768, bytes.length)),
      );
    }
    const base64 = btoa(binary);

    const instructions = [
      "You are a strict extraction engine for an accounting and finance LMS.",
      "Return ONLY valid JSON. Do not use markdown fences.",
      "Preserve source wording and technical terminology wherever possible.",
      "Never invent an answer key if the source does not support it.",
      "If uncertain, set confidence below 0.70 and explain the uncertainty in review_note.",
      "single: correct_answer is one zero-based option index.",
      "multiple: correct_answer is an array of zero-based option indexes.",
      "tf: options are statements and correct_answer is a same-length boolean array.",
      "If an explanation is not explicitly in the source, you may generate a concise EN/VI explanation but mention that in review_note.",
      "Return exactly this top-level JSON shape:",
      "{\"title\":string,\"questions\":array,\"lesson\":object|null,\"warnings\":string[]}",
      "Each question must be:",
      "{\"question_type\":\"single\"|\"multiple\"|\"tf\",\"prompt\":string,\"options\":string[],\"correct_answer\":number|number[]|boolean[],\"required_selections\":number|null,\"explanation_en\":string|null,\"explanation_vi\":string|null,\"source_page\":number|null,\"confidence\":number,\"review_note\":string|null}",
      input.targetType === "lesson"
        ? "Primary task: create lesson {title,summary,content_markdown}; also extract explicit questions if present."
        : "Primary task: extract explicit questions and answer keys; lesson must be null.",
      "Target subject: " + String(input.subjectTitle || "unspecified"),
      "Target chapter: " + String(input.chapterTitle || "unspecified"),
      "Target exercise: " + String(input.exerciseTitle || "unspecified"),
      "If the source is clearly unrelated to the target subject/chapter/exercise, add the exact warning SOURCE_CONTEXT_MISMATCH to warnings.",
      "Source file: " + input.fileName,
    ].join("\n");

    const parts: any[] = [{ text: instructions }];

    if (String(input.mimeType).startsWith("image/") || input.mimeType === "application/pdf") {
      parts.push({
        inlineData: {
          mimeType: input.mimeType,
          data: base64,
        },
      });
    } else if (input.mimeType === "text/plain") {
      parts.push({ text: new TextDecoder().decode(bytes) });
    } else {
      return json({ error: "Unsupported file type" }, 415);
    }

    let aiRes: Response | null = null;
    let aiBody: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      aiRes = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" +
          encodeURIComponent(GEMINI_MODEL) +
          ":generateContent",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": GEMINI_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
              maxOutputTokens: 12000,
            },
          }),
        },
      );

      aiBody = await aiRes.json();
      if (aiRes.ok) break;

      const message = String(aiBody?.error?.message || "");
      const temporary = aiRes.status === 503 || /high demand|temporar|overload|unavailable/i.test(message);
      console.error("Gemini error", { attempt, status: aiRes.status, body: aiBody });

      if (!temporary || attempt === 3) break;
      await new Promise(resolve => setTimeout(resolve, attempt * 1200));
    }

    if (!aiRes?.ok) {
      return json({
        error: aiBody?.error?.message || "Gemini API error",
        provider: "gemini",
        retryable: aiRes?.status === 503
      }, 502);
    }

    const text = (aiBody?.candidates?.[0]?.content?.parts || [])
      .map((p: any) => p?.text || "")
      .join("\n");

    if (!text) {
      return json({ error: "Gemini không trả về nội dung.", provider: "gemini" }, 502);
    }

    try {
      const parsed = JSON.parse(stripFence(text));
      return json({
        ...parsed,
        model_name: GEMINI_MODEL,
        provider: "gemini",
      });
    } catch {
      console.error("Invalid Gemini JSON", text);
      return json({
        error: "Gemini trả về dữ liệu không đúng JSON.",
        provider: "gemini"
      }, 502);
    }
  } catch (error) {
    console.error(error);
    return json({
      error: error instanceof Error ? error.message : "Import failed",
      provider: "gemini"
    }, 500);
  }
});
