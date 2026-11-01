# R y M – Asistente Virtual

Primera versión del catálogo web de R y M Multirrubro, preparada para publicar en GitHub y Vercel.

## Qué incluye
- Catálogo adaptable a celulares y computadoras.
- Fotos reales del catálogo que se adjuntaron en la conversación.
- Filtros por categoría y buscador.
- Condimentos disponibles por kilo o medio kilo.
- Espejos con y sin LED, indicados como productos por encargo y con seña según el artículo.
- Formulario que solicita nombre, producto y cantidad y prepara el mensaje para WhatsApp.
- Contactos: 2344403750, 2344403752 y 2345483089 (solo WhatsApp).

## Importante: alcance de esta versión
Esta versión es un **catálogo web con derivación de consultas a WhatsApp**. No es todavía una integración automática con los mensajes entrantes de WhatsApp Business ni un chatbot de IA conectado a la API de WhatsApp.

El sitio no publica precios ni promete disponibilidad. El equipo humano debe confirmar el precio vigente, el stock y cerrar cada venta. Las consultas del formulario se envían al WhatsApp 2345483089.

## Cómo probar en el teléfono
1. Descomprimí el ZIP con ZArchiver.
2. Abrí la carpeta `rym-asistente-virtual`.
3. El archivo principal es `index.html`. Para verlo correctamente en línea, publicá la carpeta en Vercel siguiendo los pasos indicados abajo.

## Publicar en GitHub y Vercel
1. En GitHub, abrí el repositorio que creaste.
2. Elegí **Add file → Upload files**.
3. Subí el contenido de esta carpeta (no el ZIP cerrado): `index.html`, `styles.css`, `app.js`, `README.md`, `vercel.json` y la carpeta `assets`.
4. Confirmá con **Commit changes**.
5. En Vercel, importá ese repositorio.
6. Si pregunta por el framework, elegí **Other**. No hace falta comando de build ni carpeta de salida; el archivo `index.html` está en la raíz.
7. Tocá **Deploy**.

## Cambiar datos
- Número de WhatsApp: `app.js`, variable `WHATSAPP_NUMBER`.
- Productos, nombres y fotos: lista `products` en `app.js`.
- Teléfonos visibles: `index.html`.
- Estilos: `styles.css`.

Antes de publicar para clientes, revisar teléfonos, fotos, productos y condiciones comerciales vigentes.
