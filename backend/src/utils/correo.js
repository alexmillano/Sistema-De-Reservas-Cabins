// Envío de mails con la API de Brevo (https://developers.brevo.com).
// Variables: BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME (y BREVO_API_URL solo para pruebas).
const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const correoConfigurado = () => Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);

async function enviarCorreo({ para, nombre, asunto, html, texto }) {
  const base = (process.env.BREVO_API_URL || 'https://api.brevo.com').replace(/\/+$/, '');
  const res = await fetch(`${base}/v3/smtp/email`, {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: process.env.BREVO_SENDER_EMAIL, name: process.env.BREVO_SENDER_NAME || 'Cabins' },
      to: [{ email: para, name: nombre || para }],
      subject: asunto,
      htmlContent: html,
      textContent: texto
    })
  });
  if (!res.ok) {
    // Se registra el motivo en el servidor; nunca la clave
    throw new Error(`Brevo respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

function plantillaRecuperacion({ nombre, enlace }) {
  const n = escapar(nombre || '');
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#333">
<h2 style="color:#6B3410">Cabins</h2>
<p>Hola ${n},</p>
<p>Recibimos un pedido para restablecer tu contraseña. Tocá el botón para elegir una nueva:</p>
<p><a href="${escapar(enlace)}" style="background:#6B3410;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Restablecer contraseña</a></p>
<p style="font-size:13px">El enlace vence en 1 hora y se puede usar una sola vez. Si el botón no funciona, copiá esta dirección en el navegador:<br>${escapar(enlace)}</p>
<p style="font-size:13px;color:#777">Si no fuiste vos, ignorá este mail: tu contraseña no cambia.</p></div>`;
  const texto = `Hola ${nombre || ''},\n\nPara restablecer tu contraseña de Cabins entrá a:\n${enlace}\n\nEl enlace vence en 1 hora y se usa una sola vez. Si no fuiste vos, ignorá este mail.`;
  return { asunto: 'Restablecé tu contraseña de Cabins', html, texto };
}

module.exports = { enviarCorreo, correoConfigurado, plantillaRecuperacion };
