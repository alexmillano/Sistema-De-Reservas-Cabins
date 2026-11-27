// Subida de imágenes a Supabase Storage (bucket público). La clave de servicio vive solo en el servidor.
const crypto = require('crypto');

const BUCKET = process.env.SUPABASE_BUCKET || 'cabanas';
// Bucket PRIVADO para documentos (DNI, escrituras…): nunca se expone una URL pública
const BUCKET_PRIVADO = process.env.SUPABASE_BUCKET_PRIVADO || 'documentos';

// Se detecta el tipo real mirando los primeros bytes del archivo (el nombre o el tipo que declara el cliente no sirven)
const detectarTipo = (b) => {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
};

const errorHttp = (status, message) => Object.assign(new Error(message), { status });

// Sube el archivo y devuelve la URL pública. carpeta: por ejemplo el id del dueño.
const subirImagen = async (buffer, carpeta) => {
  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !clave) {
    throw errorHttp(503, 'La subida de imágenes no está configurada en el servidor');
  }

  const tipo = detectarTipo(buffer);
  if (!tipo) throw errorHttp(400, 'El archivo debe ser una imagen JPG, PNG o WEBP');

  const base = url.replace(/\/+$/, '');
  const ruta = `${carpeta}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${tipo.ext}`;

  const respuesta = await fetch(`${base}/storage/v1/object/${BUCKET}/${ruta}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${clave}`, apikey: clave, 'Content-Type': tipo.mime, 'x-upsert': 'false' },
    body: buffer
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => '');
    console.error('Supabase Storage respondió', respuesta.status, detalle.slice(0, 200));
    throw errorHttp(502, 'No se pudo guardar la imagen. Intentá de nuevo en unos minutos');
  }
  return `${base}/storage/v1/object/public/${BUCKET}/${ruta}`;
};

const credenciales = () => {
  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !clave) throw errorHttp(503, 'El almacenamiento de documentos no está configurado en el servidor');
  return { base: url.replace(/\/+$/, ''), clave };
};

// Tipo real de un documento: imagen o PDF (se mira el contenido, no el nombre)
const detectarDocumento = (b) => {
  const img = detectarTipo(b);
  if (img) return img;
  if (b.length > 5 && b.subarray(0, 5).toString('ascii') === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' };
  return null;
};

// Sube un documento al bucket privado y devuelve la RUTA (no una URL)
const subirDocumento = async (buffer, carpeta) => {
  const { base, clave } = credenciales();
  const tipo = detectarDocumento(buffer);
  if (!tipo) throw errorHttp(400, 'El archivo debe ser un PDF o una imagen JPG, PNG o WEBP');

  const ruta = `${carpeta}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${tipo.ext}`;
  const respuesta = await fetch(`${base}/storage/v1/object/${BUCKET_PRIVADO}/${ruta}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${clave}`, apikey: clave, 'Content-Type': tipo.mime, 'x-upsert': 'false' },
    body: buffer
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => '');
    console.error('Supabase Storage (privado) respondió', respuesta.status, detalle.slice(0, 200));
    throw errorHttp(502, 'No se pudo guardar el documento. Intentá de nuevo en unos minutos');
  }
  return ruta;
};

// URL temporal (firmada) para ver un documento privado. Vence a los 10 minutos.
const urlFirmada = async (ruta, segundos = 600) => {
  const { base, clave } = credenciales();
  const respuesta = await fetch(`${base}/storage/v1/object/sign/${BUCKET_PRIVADO}/${ruta}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${clave}`, apikey: clave, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: segundos })
  });
  if (!respuesta.ok) return null;
  const datos = await respuesta.json().catch(() => null);
  if (!datos || !datos.signedURL) return null;
  const parte = datos.signedURL.startsWith('/') ? datos.signedURL : `/${datos.signedURL}`;
  return `${base}/storage/v1${parte.replace(/^\/storage\/v1/, '')}`;
};

// Borra un documento del bucket privado (si falla se ignora: la fila de la base es la que manda)
const borrarDocumento = async (ruta) => {
  try {
    const { base, clave } = credenciales();
    await fetch(`${base}/storage/v1/object/${BUCKET_PRIVADO}/${ruta}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${clave}`, apikey: clave }
    });
  } catch (e) { console.error('No se pudo borrar el documento', e.message); }
};

module.exports = { subirImagen, subirDocumento, urlFirmada, borrarDocumento };
