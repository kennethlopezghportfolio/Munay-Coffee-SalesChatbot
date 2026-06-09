const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

console.log("🔥 SERVER LOADED");

app.get("/", (req, res) => {
  res.send("Munay Coffee Bot is running ☕️");
});

// 🔑 CONFIG
const SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbyO0mDovhOWm639QScad5zvU7P9ZTovolY8-yIpMEYjCwFX9cidAjOS5r0GNycugmifgQ/exec";

const TOKEN = process.env.TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// 🧠 MEMORY (simple session state)
const userState = {};

// ✅ WEBHOOK VERIFICATION
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

// 🔥 MAIN WEBHOOK
app.post("/webhook", async (req, res) => {
  console.log("🔥 POST /webhook HIT");

  try {
    const message =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      console.log("⚠️ No message found");
      return res.sendStatus(200);
    }

    const from = message.from;
    if (!from) return res.sendStatus(200);

    // 🛡 SAFE MESSAGE PARSING (FIXES YOUR 500 ERRORS)
    const text =
      message.text?.body?.toLowerCase?.() ||
      message.button?.text?.toLowerCase?.() ||
      message.interactive?.button_reply?.title?.toLowerCase?.() ||
      "";

    console.log("📩 Incoming:", text);

    let reply = "Bienvenido a Munay Coffee ☕️ Escribe suscribirme para comenzar.";

    // 🟢 STEP 1
    if (text.includes("suscrib")) {
      reply = `Perfecto. Vamos a diseñar tu experiencia de café ☕️

Elige tu plan:
1️⃣ Entrega semanal  
2️⃣ Cada dos semanas  
3️⃣ Mensual  

Responde con 1, 2 o 3.`;
    }

    // 🟡 STEP 2
    else if (text === "1" || text === "2" || text === "3") {
      userState[from] = { plan: text };

      reply = `Excelente elección.

Ahora selecciona tu tipo de tueste:
🌿 Claro  
🔥 Medio  
🌑 Oscuro  

Escribe tu preferencia.`;
    }

    // 🔴 STEP 3 + SHEETS SAVE
    else if (
      text.includes("claro") ||
      text.includes("medio") ||
      text.includes("oscuro")
    ) {
      const plan = userState[from]?.plan;

      if (!plan) {
        reply = "Por favor selecciona primero un plan (1, 2 o 3).";
      } else {
        try {
          const sheetsRes = await axios.post(
            SHEETS_WEBHOOK_URL,
            {
              phone: from,
              plan,
              roast: text
            },
            {
              headers: {
                "Content-Type": "application/json"
              }
            }
          );

          console.log("📊 Saved to Sheets:", sheetsRes.data);

        } catch (err) {
          console.error(
            "❌ Sheets error:",
            err.response?.data || err.message
          );
        }

        reply = `Perfecto.

Último paso—asegura tu suscripción aquí:
👉 https://tu-link-de-pago.com`;
      }
    }

    // 📤 SEND MESSAGE (SAFE)
    await axios.post(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        text: { body: reply }
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.sendStatus(200);

  } catch (err) {
console.error(
  "🔥 META ERROR:",
  JSON.stringify(err.response?.data, null, 2)
);

console.error(err.message);
    res.sendStatus(200); // prevents WhatsApp retry spam loops
  }
});

// 🚀 START SERVER
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});