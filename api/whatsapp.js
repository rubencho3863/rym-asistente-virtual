
const API_VERSION = process.env.WHATSAPP_API_VERSION || "v27.0";

const PRODUCTS = [
  { name: "Ajo en polvo", words: ["ajo en polvo"] },
  { name: "Cebolla en escamas", words: ["cebolla en escamas"] },
  { name: "Perejil deshidratado", words: ["perejil deshidratado"] },
  { name: "Provenzal", words: ["provenzal"] },
  { name: "Orégano", words: ["oregano"] },
  { name: "Adobo para pizza", words: ["adobo para pizza", "adobo pizza"] },
  { name: "Pimentón y chimichurri", words: ["pimenton", "chimichurri"] },
  { name: "Espejos con y sin LED", words: ["espejo", "espejos", "espejo led"] },
  { name: "Mini aire portátil", words: ["mini aire portatil", "mini aire"] },
  { name: "Mini aire para auto", words: ["mini aire para auto", "aire para auto"] },
  { name: "Ventilador de pie 18 pulgadas", words: ["ventilador", "ventilador de pie"] },
  { name: "Cortador y rallador de verduras", words: ["cortador", "rallador"] },
  { name: "Mini masajeador", words: ["masajeador"] },
  { name: "Cepillo para mascotas", words: ["cepillo mascotas", "cepillo para mascotas"] },
  { name: "Depiladora y perfilador 2 en 1", words: ["depiladora", "perfilador"] },
  { name: "Aro de luz LED RGB", words: ["aro de luz", "aro led"] },
  { name: "Auriculares", words: ["auriculares", "auricular"] },
  { name: "Cinta métrica", words: ["cinta metrica"] },
  { name: "Cutter / trincheta", words: ["cutter", "trincheta"] }
];

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findProduct(message) {
  const text = normalize(message);

  const matches = PRODUCTS.flatMap(product =>
    product.words.map(word => ({
      product,
      word: normalize(word)
    }))
  ).sort((a, b) => b.word.length - a.word.length);

  const found = matches.find(item =>
    text.includes(item.word)
  );

  return found ? found.product : null;
}

function getReply(message) {
  const text = normalize(message);

  if (!text) {
    return "¡Hola! 👋 Somos R y M Multirrubro. Contanos qué producto estás buscando y te ayudamos.";
  }

  if (/^(hola|buenas|buen dia|buenos dias|buenas tardes|buenas noches|menu|catalogo)$/.test(text)) {
    return "¡Hola! 👋 ¡Bienvenido a R y M Multirrubro! 🛍️\n\nContanos qué producto te interesa. Para gestionar tu consulta necesitamos tu nombre, producto y cantidad.\n\nNuestro equipo humano confirmará el precio vigente y la disponibilidad. 😊";
  }

  if (/^(gracias|muchas gracias|ok|dale|perfecto)$/.test(text)) {
    return "¡Muchas gracias por comunicarte con R y M! 😊 Estamos a disposición para ayudarte. ¡Que tengas un excelente día! 💙";
  }

  const product = findProduct(message);

  if (product) {
    return `¡Gracias por consultar por ${product.name}! 😊\n\nPara pasar tu consulta a nuestro equipo, indicá tu nombre y la cantidad que necesitás.\n\nNuestro equipo humano te confirmará el precio vigente, las características y la disponibilidad antes de concretar el pedido. 🛍️\n\n¡Gracias por elegir R y M Multirrubro!`;
  }

  if (/precio|cuanto|cuesta|sale|valor|stock|disponible|disponibilidad/.test(text)) {
    return "¡Con gusto te ayudamos! 😊 ¿Por qué producto querés consultar?\n\nIndicá también tu nombre y cantidad. Nuestro equipo confirmará el precio vigente y la disponibilidad.";
  }

  if (/pedido|comprar|encargar|reservar/.test(text)) {
    return "¡Perfecto! 🛍️ Para gestionar tu pedido necesitamos:\n\n• Nombre\n• Producto\n• Cantidad\n\nNuestro equipo humano confirmará precio y disponibilidad por este mismo WhatsApp.";
  }

  return "¡Gracias por comunicarte con R y M Multirrubro! 😊\n\nContanos qué producto estás buscando y qué cantidad necesitás.\n\nSi podés, indicá también tu nombre para que nuestro equipo pueda atenderte.\n\n¡Te confirmaremos precio y disponibilidad por este mismo WhatsApp! 💙";
}

async function sendMessage(to, message) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    throw new Error("Faltan variables de WhatsApp en Vercel");
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
        to,
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
    throw new Error(
      `WhatsApp API ${response.status}: ${JSON.stringify(result)}`
    );
  }

  return result;
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

        if (message.type !== "text") {
          await sendMessage(
            message.from,
            "¡Gracias por tu mensaje! 😊 Por el momento podemos procesar consultas escritas. Contanos qué producto necesitás y te ayudaremos."
          );
          continue;
        }

        const incoming = message.text?.body || "";
        const reply = getReply(incoming);

        await sendMessage(message.from, reply);

        console.log("WhatsApp reply enviado:", {
          messageId: message.id,
          product: findProduct(incoming)?.name || "Consulta general"
        });
      }

      return res.status(200).send("EVENT_RECEIVED");

    } catch (error) {
      console.error("Error WhatsApp:", error.message);
      return res.status(500).send("ERROR");
    }
  }

  return res.status(405).send("Method not allowed");
};
