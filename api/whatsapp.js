
const API_VERSION = process.env.WHATSAPP_API_VERSION || "v27.0";
const MEMORY_TTL = 604800;
const DUPLICATE_TTL = 86400;

const PRODUCTS = [
  { name: "Ajo en polvo", words: ["ajo en polvo"] },
  { name: "Cebolla en escamas", words: ["cebolla en escamas"] },
  { name: "Perejil deshidratado", words: ["perejil deshidratado"] },
  { name: "Provenzal", words: ["provenzal"] },
  { name: "Orégano", words: ["oregano"] },
  { name: "Adobo para pizza", words: ["adobo para pizza", "adobo pizza"] },
  { name: "Pimentón y chimichurri", words: ["pimenton", "chimichurri"] },
  { name: "Espejos con y sin LED", words: ["espejo led", "espejo", "espejos"] },
  { name: "Mini aire portátil", words: ["mini aire portatil", "mini aire"] },
  { name: "Mini aire para auto", words: ["mini aire para auto", "aire para auto"] },
  { name: "Ventilador de pie 18 pulgadas", words: ["ventilador de pie", "ventilador"] },
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

// CONEXION UPSTASH REDIS
async function redisCommand(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Faltan variables Redis en Vercel");
  }

  const response = await fetch(
    url.replace(/\/+$/, ""),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(command)
    }
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error("Error Redis: " + JSON.stringify(data));
  }

  return data.result;
}

// CONTROL DE MENSAJES DUPLICADOS
async function claimMessage(messageId) {
  if (!messageId) return true;

  const result = await redisCommand([
    "SET",
    `rym:processed:${messageId}`,
    "1",
    "EX",
    String(DUPLICATE_TTL),
    "NX"
  ]);

  return result === "OK";
}

async function releaseMessage(messageId) {
  if (!messageId) return;

  await redisCommand([
    "DEL",
    `rym:processed:${messageId}`
  ]);
}

// MEMORIA INDIVIDUAL DEL CLIENTE
function emptyMemory() {
  return {
    name: "",
    product: "",
    quantity: "",
    updatedAt: null
  };
}

async function getMemory(phone) {
  const result = await redisCommand([
    "GET",
    `rym:customer:${phone}`
  ]);

  if (!result) return emptyMemory();

  try {
    return {
      ...emptyMemory(),
      ...JSON.parse(result)
    };
  } catch {
    return emptyMemory();
  }
}

async function saveMemory(phone, memory) {
  memory.updatedAt = new Date().toISOString();

  await redisCommand([
    "SET",
    `rym:customer:${phone}`,
    JSON.stringify(memory),
    "EX",
    String(MEMORY_TTL)
  ]);
}

// IDENTIFICAR NOMBRE
function extractName(message) {
  const match = String(message).match(
    /\b(?:soy|me llamo|mi nombre es)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ]+)/i
  );

  return match ? match[1] : "";
}

// IDENTIFICAR CANTIDAD
function extractQuantity(message, memory) {
  const text = normalize(message);

  const patterns = [
    /\bcantidad\s*[:\-]?\s*(\d{1,4})\b/,
    /\b(?:necesito|quiero|son|llevo|serian|seran)\s+(\d{1,4})\b/,
    /\b(\d{1,4})\s*(?:unidades?|ventiladores|espejos|auriculares|productos)\b/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  // Aceptar un numero solo cuando se esta
  // completando una consulta que ya tiene producto.
  if (
    memory.product &&
    !memory.quantity &&
    /^\d{1,4}$/.test(text)
  ) {
    return text;
  }

  return "";
}

// ACTUALIZAR MEMORIA
function updateMemory(incoming, memory) {
  const product = findProduct(incoming);
  const name = extractName(incoming);

  // Un producto diferente inicia una nueva consulta.
  if (product && product.name !== memory.product) {
    memory.product = product.name;
    memory.quantity = "";
  }

  if (name) {
    memory.name = name;
  }

  const quantity = extractQuantity(incoming, memory);

  if (quantity) {
    memory.quantity = quantity;
  }

  return memory;
}

// RESPUESTAS AUTOMATICAS
function getReply(message, memory) {
  const text = normalize(message);

  if (!text) {
    return "¡Hola! 👋 Somos R y M Multirrubro. Contanos qué producto estás buscando y te ayudamos.";
  }

  if (
    /^(hola|buenas|buen dia|buenos dias|buenas tardes|buenas noches|menu|catalogo)$/.test(text)
  ) {
    return "¡Hola! 👋 ¡Bienvenido a R y M Multirrubro! 🛍️\n\nContanos qué producto te interesa. Para gestionar tu consulta necesitamos tu nombre, producto y cantidad.\n\nNuestro equipo humano confirmará el precio vigente y la disponibilidad. 😊";
  }

  if (/^(nuevo pedido|nueva consulta)$/.test(text)) {
    memory.product = "";
    memory.quantity = "";

    return "¡Perfecto! 🛍️ Comenzamos una nueva consulta. Contanos qué producto necesitás y qué cantidad.";
  }

  if (/^(gracias|muchas gracias|ok|dale|perfecto)$/.test(text)) {
    return "¡Muchas gracias por comunicarte con R y M! 😊 Estamos a disposición para ayudarte. ¡Que tengas un excelente día! 💙";
  }

  if (memory.product) {
    const missing = [];

    if (!memory.name) missing.push("tu nombre");
    if (!memory.quantity) missing.push("la cantidad que necesitás");

    if (missing.length) {
      return `¡Gracias por consultar por ${memory.product}! 😊\n\nPara completar tu consulta, indicame ${missing.join(" y ")}.\n\nNuestro equipo humano confirmará el precio vigente y la disponibilidad.`;
    }

    return `¡Perfecto, ${memory.name}! 😊\n\nRegistramos los datos de tu consulta:\n\n• Producto: ${memory.product}\n• Cantidad: ${memory.quantity}\n\nNuestro equipo humano confirmará el precio vigente, las características y la disponibilidad antes de concretar el pedido. 🛍️`;
  }

  if (/precio|cuanto|cuesta|sale|valor|stock|disponible|disponibilidad/.test(text)) {
    return "¡Con gusto te ayudamos! 😊 ¿Por qué producto querés consultar?\n\nIndicá también tu nombre y cantidad. Nuestro equipo confirmará el precio vigente y la disponibilidad.";
  }

  if (/pedido|comprar|encargar|reservar/.test(text)) {
    return "¡Perfecto! 🛍️ Para gestionar tu pedido necesitamos:\n\n• Nombre\n• Producto\n• Cantidad\n\nNuestro equipo humano confirmará precio y disponibilidad por este mismo WhatsApp.";
  }

  return "¡Gracias por comunicarte con R y M Multirrubro! 😊\n\nContanos qué producto estás buscando y qué cantidad necesitás.\n\nSi podés, indicá también tu nombre para que nuestro equipo pueda atenderte.\n\n¡Te confirmaremos precio y disponibilidad por este mismo WhatsApp! 💙";
}

// ENVIO WHATSAPP
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

// WEBHOOK PRINCIPAL
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

        let claimed = false;

        try {
          claimed = await claimMessage(message.id);

          if (!claimed) {
            console.log("Mensaje duplicado ignorado");
            continue;
          }

          if (message.type !== "text") {
            await sendMessage(
              message.from,
              "¡Gracias por tu mensaje! 😊 Por el momento podemos procesar consultas escritas. Contanos qué producto necesitás."
            );
            continue;
          }

          const incoming = message.text?.body || "";

          const memory = await getMemory(message.from);

          updateMemory(incoming, memory);

          const reply = getReply(incoming, memory);

          await saveMemory(message.from, memory);

          await sendMessage(message.from, reply);

          console.log("R y M PRO - Mensaje procesado:", {
            messageId: message.id,
            product: memory.product || "Pendiente",
            hasName: Boolean(memory.name),
            hasQuantity: Boolean(memory.quantity),
            memoryDays: 7
          });

        } catch (messageError) {
          if (claimed) {
            try {
              await releaseMessage(message.id);
            } catch (releaseError) {
              console.error("Error liberando mensaje:", releaseError.message);
            }
          }

          throw messageError;
        }
      }

      return res.status(200).send("EVENT_RECEIVED");

    } catch (error) {
      console.error("Error WhatsApp/Redis:", error.message);
      return res.status(500).send("ERROR");
    }
  }

  return res.status(405).send("Method not allowed");
};

