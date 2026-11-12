
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
  { name: "Espejos con y sin LED", words: ["espejo led", "espejos led", "espejo", "espejos"] },
  { name: "Mini aire portátil", words: ["mini aire portatil", "mini aire"] },
  { name: "Mini aire para auto", words: ["mini aire para auto", "aire para auto"] },
  { name: "Ventilador de pie 18 pulgadas", words: ["ventilador de pie", "ventiladores", "ventilador"] },
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

// UPSTASH REDIS
async function redisCommand(command) {
  
const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;


  if (!url || !token) {
    throw new Error("Faltan variables Redis en Vercel");
  }

  const response = await fetch(url.replace(/\/+$/, ""), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error("Redis: " + JSON.stringify(data));
  }

  return data.result;
}

// CONTROL DE MENSAJES DUPLICADOS
async function claimMessage(id) {
  if (!id) return true;

  const result = await redisCommand([
    "SET",
    `rym:processed:${id}`,
    "1",
    "EX",
    String(DUPLICATE_TTL),
    "NX"
  ]);

  return result === "OK";
}

async function releaseMessage(id) {
  if (!id) return;

  await redisCommand(["DEL", `rym:processed:${id}`]);
}

// MEMORIA INDIVIDUAL
function emptyMemory() {
  return {
    name: "",
    items: [],
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
    const saved = JSON.parse(result);

    return {
      ...emptyMemory(),
      ...saved,
      items: Array.isArray(saved.items) ? saved.items : []
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
function extractName(message, memory) {
  const text = String(message || "").trim();

  // No confundir productos con nombres.
  if (findProducts(text).length) {
    const explicit = text.match(
      /\b(?:mi nombre es|me llamo|soy)\s+(.+?)(?=\s+(?:y quiero|y necesito|y busco|quiero|necesito|busco)\b|[,.;!?]|$)/i
    );

    if (!explicit || findProducts(explicit[1]).length) return "";

    const candidate = explicit[1].trim();

    return /^[\p{L}\s'-]+$/u.test(candidate)
      ? candidate.slice(0, 60)
      : "";
  }

  const match = text.match(
    /\b(?:mi nombre es|me llamo|soy)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ\s'-]{2,60})/i
  );

  if (match) {
    return match[1].trim().slice(0, 60);
  }

  // Aceptar nombre cuando el bot lo está solicitando.
  if (
    !memory.name &&
    memory.items.length &&
    /^[\p{L}][\p{L}\s'-]{1,58}$/u.test(text) &&
    text.split(/\s+/).length <= 4 &&
    !findProducts(text).length
  ) {
    return text;
  }

  return "";
}

// DETECTAR PRODUCTOS MENCIONADOS
function findProducts(message) {
  const text = normalize(message);
  const matches = [];

  for (const product of PRODUCTS) {
    for (const word of product.words) {
      const alias = normalize(word);
      let position = text.indexOf(alias);

      while (position !== -1) {
        matches.push({
          product,
          start: position,
          end: position + alias.length
        });

        position = text.indexOf(alias, position + 1);
      }
    }
  }

  matches.sort((a, b) =>
    a.start - b.start ||
    (b.end - b.start) - (a.end - a.start)
  );

  const selected = [];

  for (const match of matches) {
    const overlaps = selected.some(item =>
      match.start < item.end && match.end > item.start
    );

    if (!overlaps) selected.push(match);
  }

  return selected;
}


// CANTIDAD ANTES DEL PRODUCTO
function quantityBefore(text, position) {
  const before = text.slice(0, position);

  const match = before.match(
    /(?:^|\s)(\d{1,4})(?:\s*(?:unidades?|u))?(?:\s+de)?\s*$/
  );

  return match ? match[1] : "";
}

function extractStandaloneQuantity(message, memory) {
  const text = normalize(message);

  if (/^\d{1,4}$/.test(text)) {
    const pending = memory.items.filter(item => !item.quantity);

    if (pending.length === 1) {
      return {
        product: pending[0],
        quantity: text
      };
    }
  }

  return null;
}

// ACTUALIZAR PEDIDO
function updateMemory(message, memory) {
  const text = normalize(message);

  // Iniciar un pedido nuevo sin borrar el nombre.
  if (/^(nuevo pedido|nueva consulta|otro pedido|empezar de nuevo)$/.test(text)) {
    memory.items = [];
    return memory;
  }

  const newName = extractName(message, memory);

  if (newName) {
    memory.name = newName;
  }

  const matches = findProducts(message);

  if (matches.length) {
    for (const match of matches) {
      const quantity = quantityBefore(text, match.start);

      let item = memory.items.find(
        entry => entry.product === match.product.name
      );

      if (!item) {
        item = {
          product: match.product.name,
          quantity: ""
        };

        memory.items.push(item);
      }

      if (quantity) {
        item.quantity = quantity;
      }
    }
  } else {
    const standalone = extractStandaloneQuantity(message, memory);

    if (standalone) {
      standalone.product.quantity = standalone.quantity;
    } else {
      // Cantidad en mensajes como "quiero 3",
      // cuando existe un único producto pendiente.
      const general = text.match(
        /\b(?:quiero|necesito|son|llevo|cantidad)\s+(\d{1,4})\b/
      );

      const pending = memory.items.filter(item => !item.quantity);

      if (general && pending.length === 1) {
        pending[0].quantity = general[1];
      }
    }
  }

  return memory;
}

// GENERAR RESPUESTA
function getReply(message, memory) {
  const text = normalize(message);

  if (!text) {
    return "¡Hola! 👋 Somos R y M Multirrubro. Contanos qué producto estás buscando.";
  }

  if (/^(hola|buenas|buen dia|buenos dias|buenas tardes|buenas noches|menu|catalogo)$/.test(text)) {
    if (memory.items.length) {
      return `¡Hola${memory.name ? ", " + memory.name : ""}! 😊 ¿Seguimos con tu consulta anterior o querés iniciar un pedido nuevo?`;
    }

    return "¡Hola! 👋 ¡Bienvenido a R y M Multirrubro! 🛍️\n\nContanos qué productos necesitás. Para ayudarte necesitamos tu nombre y las cantidades.";
  }

  if (/^(gracias|muchas gracias|ok|dale|perfecto)$/.test(text)) {
    return "¡Muchas gracias por comunicarte con R y M! 💙 Estamos a disposición para ayudarte.";
  }

  if (/precio|cuanto|cuesta|sale|valor|stock|disponible|disponibilidad/.test(text) && !memory.items.length) {
    return "¡Con gusto te ayudamos! 😊 ¿Por qué producto querés consultar? Nuestro equipo confirmará el precio y la disponibilidad.";
  }

  if (!memory.items.length) {
    return "¡Gracias por comunicarte con R y M Multirrubro! 😊\n\nContanos qué producto estás buscando y qué cantidad necesitás. Si podés, indicá también tu nombre.";
  }

  const missing = [];

  if (!memory.name) {
    missing.push("tu nombre y apellido");
  }

  const incomplete = memory.items.filter(item => !item.quantity);

  for (const item of incomplete) {
    missing.push(`la cantidad de ${item.product}`);
  }

  if (missing.length) {
    const list = memory.items.map(item =>
      `• ${item.product}: ${item.quantity || "cantidad pendiente"}`
    ).join("\n");

    return `¡Gracias por tu consulta! 😊\n\n${list}\n\nPara completar los datos necesitamos ${missing.join(" y ")}.`;
  }

  const list = memory.items.map(item =>
    `• ${item.quantity} x ${item.product}`
  ).join("\n");

  return `¡Perfecto${memory.name ? ", " + memory.name : ""}! 😊\n\nRegistramos tu consulta:\n\n${list}\n\nNuestro equipo humano confirmará los precios vigentes, características y disponibilidad antes de concretar el pedido. 🛍️`;
}

// ENVIAR WHATSAPP
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
console.log("[WEBHOOK DEBUG]", {
  method: req.method,
  bodyKeys: Object.keys(req.body || {}),
  entryCount: entries.length,changeFields: entries.flatMap(entry =>
  (entry.changes || []).map(change => ({
    field: change.field,
    phoneNumberId: change.value?.metadata?.phone_number_id || "SIN_ID",
    valueKeys: Object.keys(change.value || {}),
    messagesCount: change.value?.messages?.length || 0,
    statusesCount: change.value?.statuses?.length || 0
  }))
),
  messageCount: messages.length,
  messages: messages.map(m => ({
    type: m.type,
    hasFrom: !!m.from,
    hasId: !!m.id,
    hasText: !!m.text?.body
    }))
});
      for (const message of messages) {
        if (!message.from) continue;

        let claimed = false;

        try {
          claimed = await claimMessage(message.id);

          if (!claimed) continue;

          if (message.type !== "text") {
            await sendMessage(
              message.from,
              "¡Gracias por tu mensaje! 😊 Por el momento podemos procesar consultas escritas. Contanos qué productos necesitás."
            );
            continue;
          }

          const incoming = message.text?.body || "";
          const memory = await getMemory(message.from);

          updateMemory(incoming, memory);

          const reply = getReply(incoming, memory);

          await saveMemory(message.from, memory);
          await sendMessage(message.from, reply);

          console.log("R y M PRO V3:", {
            messageId: message.id,
            customer: message.from,
            hasName: Boolean(memory.name),
            products: memory.items.length,
            complete: memory.items.every(item => item.quantity),
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
