# Sistema-De-Reservas-Cabins

## 📋 Tabla de Contenidos

- Características
- Arquitectura
- Roles del sistema
- Tecnologías
- Estructura del proyecto
- Instalación y uso
- Variables de entorno
- Vistas del sistema
- Sistema de reclamos con chat
- Endpoints de la API
- Base de datos

---

## ✨ Características

### Usuario (Web y Móvil)
- ✅ Registro y login con autenticación JWT
- ✅ Exploración de cabañas con filtros (localidad, precio, valoración) y ordenamiento
- ✅ Carrito de reservas — posibilidad de agregar múltiples cabañas
- ✅ Flujo de reserva completo: selección → fechas → personas → pago simulado → confirmación
- ✅ Gestión de reservas propias: ver, modificar y cancelar
- ✅ Sistema de reclamos con chat estilo WhatsApp (Nuevo / En proceso / Finalizado)
- ✅ Calificaciones y opiniones sobre cabañas reservadas
- ✅ Gestión de perfil personal

### Administrador (Web y Móvil)
- ✅ Creación y edición de cabañas con previsualización en tiempo real
- ✅ Gestión de todas las reservas del sistema
- ✅ Panel de finanzas con gráficos de ingresos, ocupación y cancelaciones
- ✅ Gestión de reclamos mediante chat con usuarios
- ✅ Visualización de calificaciones y opiniones
- ✅ Sistema de notificaciones en tiempo real (campanita)
- ✅ Acceso protegido — los admins son creados únicamente por el superadmin

---

## 🏗️ Arquitectura

Un único backend sirve tanto a la plataforma web como a la app móvil:

```
                ┌─────────────────────┐
                │      BACKEND        │
                │  Node.js + Express  │
                │      (Render)       │
                └──────────┬──────────┘
                           │  API REST
           ┌───────────────┴───────────────┐
           │                               │
┌──────────┴─────────┐       ┌─────────────┴──────────┐
│   Frontend Web     │       │    Frontend Móvil       │
│   React (Vercel)   │       │  React Native (Expo)    │
└────────────────────┘       └────────────────────────┘
                ┌─────────────────────┐
                │    Base de Datos    │
                │ Supabase (PostgreSQL)│
                └─────────────────────┘
```

---

## 👥 Roles del Sistema

| Rol | Descripción | Plataformas |
|-----|-------------|-------------|
| Invitado | Usuario no autenticado | Web y móvil — solo inicio |
| Usuario | Cliente registrado | Web y móvil — acceso completo |
| Administrador | Empleado de Cabins | Web y móvil — panel admin |
| Superadmin | Admin maestro | Creación de otros admins desde BD |

---

## 🛠 Tecnologías

| Capa | Tecnología | Uso |
|------|------------|-----|
| Runtime | Node.js 18+ | Entorno de ejecución |
| Framework backend | Express.js 4.x | Framework HTTP |
| Base de datos | Supabase (PostgreSQL) | BD relacional en la nube |
| Autenticación | JWT | Tokens de sesión por rol |
| Encriptación | bcrypt | Hash de contraseñas |
| Frontend web | React 18.x | Interfaz de usuario web |
| Frontend móvil | React Native + Expo Go | App nativa Android |
| APK Android | Expo Build | Archivo de instalación Android |
| Gráficos | Recharts | Panel de finanzas |
| Cliente HTTP | Axios | Consumo de la API REST |
| Deploy backend | Render | Servidor Node.js en la nube |
| Deploy frontend | Vercel | App React en la nube |
| Control de versiones | Git + GitHub | Versionado del código |

---

## 📁 Estructura del proyecto

```
cabins/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── cabana.controller.js
│   │   │   ├── reserva.controller.js
│   │   │   ├── reclamo.controller.js
│   │   │   ├── finanzas.controller.js
│   │   │   ├── calificacion.controller.js
│   │   │   ├── opinion.controller.js
│   │   │   └── notificacion.controller.js
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js      → Validación JWT
│   │   │   └── role.middleware.js      → Control de roles
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── cabana.routes.js
│   │   │   ├── reserva.routes.js
│   │   │   ├── reclamo.routes.js
│   │   │   ├── finanzas.routes.js
│   │   │   ├── calificacion.routes.js
│   │   │   ├── opinion.routes.js
│   │   │   └── notificacion.routes.js
│   │   ├── config/
│   │   │   └── db.js                  → Conexión a Supabase
│   │   └── app.js                     → Entry point
│   ├── .env.example
│   └── package.json
├── frontend-web/                       → React (Vercel)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar/
│   │   │   │   ├── NavUsuario.jsx
│   │   │   │   └── NavAdmin.jsx
│   │   │   ├── Sidebar/
│   │   │   │   ├── SidebarFiltros.jsx
│   │   │   │   └── SidebarIndice.jsx
│   │   │   ├── CabanaCard.jsx
│   │   │   ├── CarritoItem.jsx
│   │   │   ├── ChatReclamo.jsx
│   │   │   └── Notificaciones.jsx
│   │   ├── pages/
│   │   │   ├── Inicio.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Registro.jsx
│   │   │   ├── usuario/
│   │   │   │   ├── Reservas.jsx
│   │   │   │   ├── MisReservas.jsx
│   │   │   │   ├── Carrito.jsx
│   │   │   │   ├── Checkout.jsx
│   │   │   │   ├── Reclamos.jsx
│   │   │   │   ├── Ayuda.jsx
│   │   │   │   └── Perfil.jsx
│   │   │   └── admin/
│   │   │       ├── CrearCabana.jsx
│   │   │       ├── GestionarReservas.jsx
│   │   │       ├── Finanzas.jsx
│   │   │       ├── Reclamos.jsx
│   │   │       ├── Calificaciones.jsx
│   │   │       ├── Opiniones.jsx
│   │   │       └── PerfilAdmin.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   └── App.jsx
│   └── package.json
└── frontend-mobile/                    → React Native (Expo)
    ├── src/
    │   ├── screens/
    │   │   ├── usuario/
    │   │   │   ├── InicioScreen.jsx
    │   │   │   ├── LoginScreen.jsx
    │   │   │   ├── RegistroScreen.jsx
    │   │   │   ├── ReservasScreen.jsx
    │   │   │   ├── MisReservasScreen.jsx
    │   │   │   ├── CarritoScreen.jsx
    │   │   │   ├── CheckoutScreen.jsx
    │   │   │   ├── ReclamosScreen.jsx
    │   │   │   ├── ChatReclamoScreen.jsx
    │   │   │   ├── AyudaScreen.jsx
    │   │   │   └── PerfilScreen.jsx
    │   │   └── admin/
    │   │       ├── LoginAdminScreen.jsx
    │   │       ├── DashboardScreen.jsx
    │   │       ├── CabanasScreen.jsx
    │   │       ├── ReservasAdminScreen.jsx
    │   │       ├── FinanzasScreen.jsx
    │   │       ├── ReclamosAdminScreen.jsx
    │   │       ├── ChatAdminScreen.jsx
    │   │       ├── CalificacionesScreen.jsx
    │   │       ├── OpinionesScreen.jsx
    │   │       └── PerfilAdminScreen.jsx
    │   ├── navigation/
    │   │   ├── UsuarioNavigator.jsx
    │   │   └── AdminNavigator.jsx
    │   └── context/
    │       └── AuthContext.jsx
    ├── app.json
    └── package.json
```

---

## 🚀 Instalación y uso

### Pre-requisitos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [Render](https://render.com) (deploy backend)
- Cuenta en [Vercel](https://vercel.com) (deploy frontend web)
- Expo Go instalado en tu dispositivo Android (app móvil)

### 1. Clonar el repositorio

```bash
git clone https://github.com/Alexmillano/cabins.git
cd cabins
```

### 2. Configurar el backend

```bash
cd backend
npm install
cp .env.example .env
# Completar las variables en .env con los datos de Supabase
```

### 3. Crear las tablas en Supabase

```bash
# Copiar el contenido de src/config/database.sql
# y ejecutarlo en el SQL Editor de Supabase
```

### 4. Crear el superadmin

```bash
# Ejecutar en el SQL Editor de Supabase:
INSERT INTO admins (nombre, email, password, es_superadmin)
VALUES ('Superadmin', 'admin@cabins.com', 'hash_de_bcrypt', TRUE);
```

### 5. Iniciar el servidor

```bash
npm run dev
```

### 6. Configurar y correr el frontend web

```bash
cd ../frontend-web
npm install
npm run dev
```

El cliente correrá en `http://localhost:5173`

### 7. Configurar y correr la app móvil

```bash
cd ../frontend-mobile
npm install
npx expo start
# Escanear el QR con Expo Go en tu dispositivo Android
```

---

## 🔐 Variables de entorno

Crear un archivo `.env` en `/backend` basado en `.env.example`:

```env
PORT=3000
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_supabase_anon_key
JWT_SECRET=tu_clave_secreta_jwt
JWT_EXPIRES_IN=24h
```

---

## 🖥 Vistas del sistema

### Página de Inicio (Invitado)
Accesible sin autenticación. Incluye banner, quiénes somos, servicios, ubicación en Buenos Aires y cómo alquilar.

> 💡 Al iniciar sesión el nav cambia según el rol y se mantiene en todas las vistas.

### Barra lateral

| Vista | Tipo | Contenido |
|-------|------|-----------|
| Reservas | Filtros | Localidad, precio, valoración |
| Mis Reservas | Índice | Activas, Historial, Canceladas |
| Carrito | Índice | Cabañas agregadas, Resumen |
| Reclamos | Índice | Nuevos, En proceso, Finalizados |
| Ayuda | Índice | FAQ, Cómo reservar, Contacto |
| Finanzas | Índice | Ingresos, Ocupación, Reservas, Promedio |
| Gestionar Reservas | Índice | Pendientes, Confirmadas, Canceladas |

### Flujo de reserva

```
Explorar cabañas → Agregar al carrito → Fechas y personas
→ Checkout → Pago simulado → Confirmación ✅
```

---

## 💬 Sistema de Reclamos con Chat

El sistema de reclamos funciona como un chat estilo WhatsApp con tres estados:

| Estado | Descripción |
|--------|-------------|
| 🔴 Nuevo | Reclamo recién creado, sin respuesta del admin |
| 🟡 En proceso | Conversación activa entre usuario y admin |
| ✅ Finalizado | Cerrado por el admin — solo historial visible |

### Vista Web (estilo Facebook Messenger)
- Panel izquierdo con lista de chats separados por estado
- Panel derecho con conversación activa en burbujas

### Vista Móvil (estilo WhatsApp)
- Lista de reclamos con tabs: Nuevos / En proceso / Finalizados
- Al entrar: conversación a pantalla completa con input en la parte inferior

---

## 📡 Endpoints de la API

### Autenticación

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Registro de usuario | ❌ |
| POST | `/api/auth/login` | Login usuario + JWT | ❌ |
| POST | `/api/auth/login-admin` | Login admin + JWT | ❌ |
| POST | `/api/auth/logout` | Cerrar sesión | ✅ |

### Cabañas

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/cabanas` | Listar con filtros y orden | ❌ |
| GET | `/api/cabanas/:id` | Detalle de cabaña | ❌ |
| POST | `/api/cabanas` | Crear cabaña | ✅ Admin |
| PUT | `/api/cabanas/:id` | Editar cabaña | ✅ Admin |
| DELETE | `/api/cabanas/:id` | Desactivar cabaña | ✅ Admin |

### Reservas

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/reservas/mis-reservas` | Mis reservas | ✅ Usuario |
| POST | `/api/reservas` | Crear reserva | ✅ Usuario |
| PUT | `/api/reservas/:id` | Modificar fechas | ✅ Usuario |
| DELETE | `/api/reservas/:id` | Cancelar reserva | ✅ Usuario |
| GET | `/api/reservas` | Todas las reservas | ✅ Admin |
| PUT | `/api/reservas/:id/estado` | Cambiar estado | ✅ Admin |

### Reclamos y Chat

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/reclamos/mis-reclamos` | Mis reclamos | ✅ Usuario |
| POST | `/api/reclamos` | Crear reclamo | ✅ Usuario |
| GET | `/api/reclamos` | Todos los reclamos | ✅ Admin |
| PUT | `/api/reclamos/:id/cerrar` | Cerrar reclamo | ✅ Admin |
| GET | `/api/reclamos/:id/mensajes` | Mensajes del chat | ✅ Usuario/Admin |
| POST | `/api/reclamos/:id/mensajes` | Enviar mensaje | ✅ Usuario/Admin |

### Comunidad, Finanzas y Notificaciones

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/finanzas/resumen` | Datos para gráficos | ✅ Admin |
| POST | `/api/calificaciones` | Calificar cabaña | ✅ Usuario |
| GET | `/api/calificaciones` | Ver calificaciones | ✅ Admin |
| POST | `/api/opiniones` | Dejar opinión | ✅ Usuario |
| GET | `/api/opiniones` | Ver opiniones | ✅ Admin |
| GET | `/api/notificaciones` | Ver notificaciones | ✅ Admin |
| PUT | `/api/notificaciones/:id/leer` | Marcar como leída | ✅ Admin |

---

## 🗄 Base de datos

```sql
CREATE TABLE usuarios (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE admins (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,
  es_superadmin BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cabanas (
  id                  SERIAL PRIMARY KEY,
  nombre              VARCHAR(150) NOT NULL,
  descripcion         TEXT NOT NULL,
  localidad           VARCHAR(100) NOT NULL,
  precio_por_noche    DECIMAL(10,2) NOT NULL,
  cantidad_disponible INT NOT NULL DEFAULT 1,
  imagen_url          VARCHAR(500),
  metodos_pago        VARCHAR(255),
  admin_id            INT REFERENCES admins(id),
  activa              BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reservas (
  id                SERIAL PRIMARY KEY,
  usuario_id        INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  cabana_id         INT NOT NULL REFERENCES cabanas(id),
  cantidad_personas INT NOT NULL DEFAULT 1,
  fecha_checkin     DATE NOT NULL,
  fecha_checkout    DATE NOT NULL,
  precio_total      DECIMAL(10,2) NOT NULL,
  estado            VARCHAR(20) DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','confirmada','cancelada','completada')),
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE calificaciones (
  id         SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  cabana_id  INT NOT NULL REFERENCES cabanas(id) ON DELETE CASCADE,
  puntaje    SMALLINT NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (usuario_id, cabana_id)
);

CREATE TABLE opiniones (
  id         SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  cabana_id  INT NOT NULL REFERENCES cabanas(id) ON DELETE CASCADE,
  contenido  TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reclamos (
  id         SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  asunto     VARCHAR(200) NOT NULL,
  estado     VARCHAR(20) DEFAULT 'nuevo'
             CHECK (estado IN ('nuevo','en_proceso','finalizado')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE mensajes_reclamo (
  id             SERIAL PRIMARY KEY,
  reclamo_id     INT NOT NULL REFERENCES reclamos(id) ON DELETE CASCADE,
  remitente_id   INT NOT NULL,
  remitente_tipo VARCHAR(10) NOT NULL CHECK (remitente_tipo IN ('usuario','admin')),
  mensaje        TEXT NOT NULL,
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notificaciones (
  id         SERIAL PRIMARY KEY,
  admin_id   INT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  tipo       VARCHAR(20) NOT NULL
             CHECK (tipo IN ('nueva_reserva','reclamo','cancelacion','opinion')),
  mensaje    VARCHAR(500) NOT NULL,
  leida      BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---
