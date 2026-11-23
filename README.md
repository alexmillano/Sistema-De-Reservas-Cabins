# 🏡 Cabins — Sistema de Reservas de Cabañas

Plataforma para reservar cabañas en toda la Argentina. Los **huéspedes** buscan, reservan y pagan (pago simulado); los **dueños** publican y gestionan sus cabañas; el **superadmin** administra las cuentas y consulta las finanzas de la plataforma. Incluye aplicación web y aplicación móvil que consumen el mismo backend.

Proyecto de tesis — Analista de Sistemas, Universidad Da Vinci. Autor: **Alexander Millano**.

## 📋 Tabla de contenidos

- [Características](#-características)
- [Roles](#-roles)
- [Arquitectura](#-arquitectura)
- [Tecnologías](#-tecnologías)
- [Modelo de ingresos](#-modelo-de-ingresos)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Instalación local](#-instalación-local)
- [Variables de entorno](#-variables-de-entorno)
- [Despliegue](#-despliegue)
- [API](#-api)
- [Base de datos](#-base-de-datos)
- [Seguridad](#-seguridad)
- [Documentación y pruebas](#-documentación-y-pruebas)

---

## ✨ Características

### Huésped (web y móvil)
- Registro, inicio de sesión y **recuperación de contraseña por correo**.
- Catálogo con filtros (provincia, localidad, precio, valoración) y orden.
- Cabañas destacadas en el inicio (plan Premium).
- Carrito con varias cabañas, **pago simulado en tres pasos** y bloqueo de fechas de 15 minutos mientras se paga.
- Mis reservas: ver, modificar y cancelar.
- Calificaciones y opiniones de estadías completadas.
- Reclamos con chat entre huésped y dueño.
- Perfil y cambio de contraseña.

### Dueño de cabañas (administrador)
- Alta y edición de cabañas, con **subida de la foto de portada** (JPG, PNG o WEBP de hasta 5 MB) o enlace.
- Gestión de las reservas de sus cabañas y cambio de estado.
- **Planes de visibilidad** Free, Plus y Premium con contratación y renovación simuladas.
- Finanzas con gráficos (ingresos netos, ocupación, cancelaciones), calificaciones, opiniones y notificaciones.
- Chat de reclamos con los huéspedes.

### Superadmin (solo consulta)
- Crea, edita, suspende, reactiva y elimina cuentas de administradores y usuarios.
- Finanzas de la plataforma: cobrado a huéspedes, pagos a dueños, tarifas, comisiones, planes vendidos e ingreso total, con detalle por reserva, por dueño y por mes.
- Solo consulta: no crea cabañas ni responde reclamos.

---

## 👥 Roles

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| Invitado | Sin sesión | Inicio, catálogo y detalle de cabañas |
| Usuario (huésped) | Cliente registrado | Carrito, reservas, reclamos, calificaciones y perfil |
| Administrador (dueño) | Dueño de cabañas, creado por el superadmin | Gestión de sus cabañas, reservas, planes y finanzas |
| Superadmin | Cuenta maestra de solo consulta | Gestión de cuentas y finanzas de la plataforma |

---

## 🏗️ Arquitectura

Un único backend sirve a la web y a la app móvil.

```
┌──────────────────┐        ┌──────────────────────┐
│  Web (React)     │        │  App móvil           │
│  Vercel          │        │  React Native + Expo │
└────────┬─────────┘        └──────────┬───────────┘
         │            API REST (JSON)  │
         └──────────────┬──────────────┘
                ┌───────┴────────┐
                │ Backend        │──► Brevo (correo de recuperación)
                │ Node + Express │
                │ Render         │──► Supabase Storage (imágenes)
                └───────┬────────┘
                ┌───────┴────────┐
                │ Supabase       │
                │ PostgreSQL     │
                └────────────────┘
```

---

## 🛠 Tecnologías

| Capa | Tecnología |
|------|------------|
| Backend | Node.js 18+, Express 5, `pg`, jsonwebtoken, bcrypt, multer, dotenv, cors |
| Base de datos | PostgreSQL en Supabase (sesión por pooler), RLS activado en las 15 tablas |
| Almacenamiento | Supabase Storage (bucket `Cabanas`) |
| Correo | Brevo (correo transaccional) |
| Web | React 19, Vite, React Router 6, Axios |
| Móvil | React Native con Expo (SDK 58), React Navigation 7, expo-secure-store, Axios |
| Despliegue | Render (backend), Vercel (web), Expo Go (móvil) |

---

## 💰 Modelo de ingresos

| Concepto | Quién lo paga | Valor |
|----------|---------------|-------|
| Tarifa de servicio | Huésped | 5% del alojamiento, sumada al total |
| Comisión | Dueño | 10% del alojamiento (el dueño recibe el 90%) |
| Plan Plus | Dueño | $15.000 por 30 días |
| Plan Premium | Dueño | $30.000 por 30 días (aparece en destacadas) |

Los montos se guardan con dos decimales y se redondean al centavo. Los pagos y la contratación de planes son **simulados**: no se procesan tarjetas reales ni se guardan sus datos.

---

## 📁 Estructura del proyecto

```
cabins/
├── backend/
│   ├── database/
│   │   ├── schema.sql              → esquema completo (15 tablas, RLS)
│   │   └── datos_iniciales.sql     → provincias y localidades de Argentina
│   ├── migraciones/                → cambios para bases creadas con versiones anteriores
│   ├── src/
│   │   ├── app.js                  → punto de entrada
│   │   ├── config/                 → db.js y seed.js (crea el superadmin)
│   │   ├── controllers/            → lógica de cada módulo
│   │   ├── middlewares/            → autenticación y roles
│   │   ├── routes/                 → rutas de la API
│   │   └── utils/                  → tarifas, planes, reservas, correo, imágenes
│   └── .env.example
├── frontend-web/                   → React + Vite (pages, components, context, api)
├── mobile/                         → React Native + Expo (screens, components, theme)
└── herramientas/
    └── api.ps1                     → atajos de PowerShell para probar la API
```

---

## 🚀 Instalación local

### Requisitos
- Node.js 18 o superior
- Cuenta en [Supabase](https://supabase.com) (base de datos y almacenamiento)
- Cuenta en [Brevo](https://www.brevo.com) para el correo de recuperación (opcional en desarrollo)
- Expo Go en el teléfono para la app móvil

### 1. Clonar
```bash
git clone <URL-del-repositorio>
cd cabins
```

### 2. Base de datos
En el **SQL Editor** de Supabase, ejecutá en este orden:
1. `backend/database/schema.sql`
2. `backend/database/datos_iniciales.sql`

El `schema.sql` ya incluye todo; los archivos de `backend/migraciones/` solo hacen falta si la base se creó con una versión anterior. Creá además un bucket público llamado `Cabanas` en Supabase Storage.

### 3. Backend
```bash
cd backend
npm install
cp .env.example .env     # en Windows: copy .env.example .env
```
Completá el `.env` (ver [Variables de entorno](#-variables-de-entorno)) y creá el superadmin:
```bash
# Agregá al .env: SEED_EMAIL, SEED_USUARIO, SEED_PASSWORD y SEED_LLAVE (llave maestra)
node src/config/seed.js
npm run dev
```
La API queda en `http://localhost:3000`.

### 4. Web
```bash
cd frontend-web
npm install
npm run dev
```
La web queda en `http://localhost:5173`. Por defecto usa `http://localhost:3000/api`; para cambiarlo, definí `VITE_API_URL`.

### 5. App móvil
```bash
cd mobile
npm install
cp .env.example .env
npx expo start -c
```
Escaneá el QR con Expo Go. El teléfono y la PC deben estar en la **misma red WiFi**. En `.env`, `EXPO_PUBLIC_API_URL` debe terminar en `/api` y sin barra final: por ejemplo `http://IP-DE-TU-PC:3000/api` o la URL de Render.

---

## 🔐 Variables de entorno

Nunca se suben al repositorio (`.env` está en `.gitignore`).

**Backend (`backend/.env`)**

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto del servidor |
| `DATABASE_URL` | Cadena de conexión a Postgres (Supabase, pooler en modo sesión) |
| `JWT_SECRET` | Clave para firmar los tokens |
| `JWT_EXPIRES_IN` | Duración del token (24h) |
| `SUPABASE_URL` | URL del proyecto de Supabase |
| `SUPABASE_SERVICE_KEY` | Clave de servicio (solo en el backend) |
| `SUPABASE_BUCKET` | Nombre del bucket de imágenes (`Cabanas`) |
| `BREVO_API_KEY` | Clave de Brevo |
| `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME` | Remitente de los correos |
| `FRONTEND_URL` | URL de la web, usada en el enlace de recuperación |
| `SEED_EMAIL`, `SEED_USUARIO`, `SEED_PASSWORD`, `SEED_LLAVE` | Solo para crear el superadmin con `seed.js` |

**Web:** `VITE_API_URL` (dirección de la API, con `/api` al final).
**Móvil:** `EXPO_PUBLIC_API_URL` (dirección de la API, con `/api` al final).

---

## ☁️ Despliegue

| Servicio | Configuración |
|----------|---------------|
| **Render** (backend) | Raíz `backend`, build `npm install`, start `npm start`, y las variables del backend. El plan gratuito se duerme: la primera petición puede tardar unos segundos. |
| **Vercel** (web) | Raíz `frontend-web`, build `npm run build`, variable `VITE_API_URL` apuntando a Render. `vercel.json` ya redirige todas las rutas a `index.html`. |
| **Supabase** | Base de datos, bucket `Cabanas` y RLS. |

---

## 📡 API

Todas las rutas cuelgan de `/api`. Las que requieren sesión usan el encabezado `Authorization: Bearer <token>`.

| Módulo | Endpoints principales | Acceso |
|--------|-----------------------|--------|
| Autenticación | `POST /auth/register`, `/auth/login`, `/auth/login-admin`, `/auth/olvide-clave`, `/auth/restablecer-clave` | Público |
| Ubicación | `GET /provincias`, `GET /provincias/:id/localidades` | Público |
| Cabañas | `GET /cabanas`, `GET /cabanas/destacadas`, `GET /cabanas/:id` | Público |
| | `GET /cabanas/panel`, `POST /cabanas`, `PUT /cabanas/:id`, `DELETE /cabanas/:id` | Dueño |
| Imágenes | `POST /imagenes` | Dueño |
| Carrito | `GET/POST /carrito`, `PUT/DELETE /carrito/:id` | Usuario |
| Reservas | `POST /reservas/pagar`, `GET /reservas/mis-reservas`, `PUT/DELETE /reservas/:id` | Usuario |
| | `POST/GET/DELETE /reservas/checkout` (bloqueo de 15 minutos) | Usuario |
| | `GET /reservas`, `PUT /reservas/:id/estado` | Dueño |
| Calificaciones y opiniones | `GET /calificaciones/pendientes`, `POST /calificaciones` | Usuario |
| | `GET /calificaciones`, `GET /opiniones`, `GET /opiniones/cabana/:id` | Admin / público |
| Reclamos | `POST /reclamos`, `GET /reclamos/mis-reclamos` | Usuario |
| | `GET /reclamos`, `PUT /reclamos/:id/cerrar` | Admin / dueño |
| | `GET/POST /reclamos/:id/mensajes` | Usuario y dueño |
| Planes | `GET /planes`, `POST /planes/cabanas/:id/contratar` | Dueño |
| Finanzas | `GET /finanzas/resumen` | Dueño y superadmin |
| | `GET /finanzas/reservas` | Superadmin |
| Notificaciones | `GET /notificaciones`, `PUT /notificaciones/leer-todas`, `PUT /notificaciones/:id/leer` | Admin |
| Perfil | `GET/PUT /perfil`, `PUT /perfil/password` | Con sesión |
| Cuentas | `/admins` y `/usuarios` (listar, editar, suspender, reactivar, eliminar) | Superadmin |

---

## 🗄 Base de datos

15 tablas en PostgreSQL: `provincia`, `localidad`, `admin`, `usuario`, `cabana`, `plan_cabana`, `reserva`, `carrito`, `bloqueo`, `calificacion`, `opinion`, `reclamo`, `mensaje_reclamo`, `notificacion` y `recuperacion_clave`.

- Una restricción de exclusión impide que dos reservas activas de la misma cabaña se superpongan.
- RLS está activado en todas las tablas; el backend se conecta con un rol que lo administra.
- El detalle completo está en `backend/database/schema.sql` y en el Anexo A del SRS.

---

## 🔒 Seguridad

- Contraseñas con **bcrypt**; mínimo 8 y máximo 72 caracteres.
- Tokens **JWT** de 24 horas con el rol; el servidor revisa en cada petición que la cuenta exista y no esté suspendida.
- Consultas SQL **parametrizadas** y validación de datos en el backend.
- Recuperación de contraseña con código aleatorio de 256 bits: en la base solo se guarda su huella SHA-256, vence a los 60 minutos, se usa una sola vez y tiene límite de 3 pedidos por hora.
- Subida de imágenes: se valida el contenido real del archivo (no la extensión), máximo 5 MB, solo JPG, PNG o WEBP (se rechaza SVG).
- No se guardan datos de tarjeta. La clave de servicio de Supabase solo existe en el backend.

---

## 🧪 Documentación y pruebas

La tesis incluye estos documentos:

- **SRS v4.0** — 62 requerimientos funcionales, 21 no funcionales y 40 casos de uso.
- **Casos de Prueba v2.0** — 182 casos (API, UI, BD e inspección), con el estado de cada uno.
- **Matriz de Trazabilidad v1.0** — relación entre requerimientos, casos de uso y casos de prueba.

Para probar la API a mano en Windows, `herramientas/api.ps1` define los atajos `Api`, `Entrar`, `EntrarAdmin` e `IdLoc`.

---

## 📸 Créditos

Las imágenes de ejemplo provienen de [Unsplash](https://unsplash.com) y pertenecen a sus autores.