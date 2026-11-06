const API_VERSION = process.env.WHATSAPP_API_VERSION || "v27.0";

function getReply(message) {
  const text = String(message || "").trim().toLowerCase();

  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|menu|menú|catalogo|catálogo)\b/.test(text)) {
    return "¡Hola! 👋 Bienvenido a R y M Multirrubro. Para ayudarte, escribinos tu nombre, el producto que buscás y la cantidad. Nuestro equipo confirmará stock y precio antes de cerrar tu pedido.";
  }

  return "¡Gracias por comunicarte con R y M! 😊 Para pasar tu consulta al equipo, indicá tu nombre, producto y cantidad. Nuestro equipo humano te confirmará disponibilidad y precio por este mismo WhatsApp.";
}

async function sendMessage(to, message) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    throw new Error("Faltan las variables de WhatsApp en Vercel");
  }

  const response = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: {
          preview_url: false,
          body: message
        }
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(result));
  }
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (
      mode === "subscribe" &&
      process.env.WHATSAPP_VERIFY_TOKEN &&
      token === process.env.WHATSAPP_VERIFY_TOKEN
    ) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send("Verificacion incorrecta");
  }

  if (req.method === "POST") {
    try {
      const entries = req.body?.entry || [];

      const messages = entries
        .flatMap(entry => entry.changes || [])
        .flatMap(change => change.value?.messages || []);

      for (const message of messages) {
        if (!message.from) continue;

        const incoming = message.type === "text"
          ? message.text?.body || ""
          : "";

        await sendMessage(message.from, getReply(incoming));
      }

      return res.status(200).send("EVENT_RECEIVED");

    } catch (error) {
      console.error("Error WhatsApp:", error);
      return res.status(500).send("ERROR");
    }
  }

  return res.status(405).send("Method not allowed");
};
