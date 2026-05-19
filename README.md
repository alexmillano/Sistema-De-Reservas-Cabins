# Sistema-De-Reservas-Cabins

Plataforma web full-stack de reservas de cabañas en la región de Buenos Aires. Permite a los usuarios buscar, filtrar y reservar cabañas de manera intuitiva, y a los administradores gestionar el negocio desde un panel centralizado con gráficos, reclamos y gestión de comunidad.

---

## 📋 Tabla de Contenidos

- Características
- Roles del sistema
- Tecnologías
- Estructura del proyecto
- Instalación y uso
- Variables de entorno
- Vistas del sistema
- Endpoints de la API
- Base de datos

---

## ✨ Características

### Usuario
- ✅ Registro y login con autenticación JWT
- ✅ Exploración de cabañas con filtros (localidad, precio, valoración) y ordenamiento
- ✅ Carrito de reservas — posibilidad de agregar múltiples cabañas
- ✅ Flujo de reserva completo: selección → fechas → pago simulado → confirmación
- ✅ Gestión de reservas propias: ver, modificar y cancelar
- ✅ Calificaciones y opiniones sobre cabañas reservadas
- ✅ Envío de reclamos
- ✅ Gestión de perfil personal

### Administrador
- ✅ Creación y edición de cabañas con previsualización en tiempo real
- ✅ Gestión de todas las reservas del sistema
- ✅ Panel de finanzas con gráficos de ingresos, ocupación y cancelaciones
- ✅ Gestión de reclamos, calificaciones y opiniones
- ✅ Sistema de notificaciones en tiempo real (campanita)
- ✅ Acceso protegido — los admins son creados únicamente por el superadmin

---

## 👥 Roles del Sistema

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| Invitado | Usuario no autenticado | Página de inicio únicamente |
| Usuario | Cliente registrado | Reservas, carrito, perfil, ayuda |
| Administrador | Empleado de Cabins | Panel completo de administración |
| Superadmin | Admin maestro | Creación de otros administradores |

---

## 🛠 Tecnologías

| Capa | Tecnología | Uso |
|------|------------|-----|
| Runtime | Node.js 18+ | Entorno de ejecución |
| Framework backend | Express.js 4.x | Framework HTTP |
| Base de datos | MySQL 8.x | Persistencia de datos |
| Autenticación | JWT | Tokens de sesión por rol |
| Encriptación | bcrypt | Hash de contraseñas |
| Frontend | React 18.x | Interfaz de usuario |
| Gráficos | Recharts | Panel de finanzas |
| Cliente HTTP | Axios | Consumo de la API REST |
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
│   │   │   ├── finanzas.controller.js
│   │   │   ├── calificacion.controller.js
│   │   │   ├── opinion.controller.js
│   │   │   ├── reclamo.controller.js
│   │   │   └── notificacion.controller.js
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js        → Validación de JWT
│   │   │   └── role.middleware.js        → Control de roles (usuario/admin)
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── cabana.routes.js
│   │   │   ├── reserva.routes.js
│   │   │   ├── finanzas.routes.js
│   │   │   ├── calificacion.routes.js
│   │   │   ├── opinion.routes.js
│   │   │   ├── reclamo.routes.js
│   │   │   └── notificacion.routes.js
│   │   ├── config/
│   │   │   └── db.js                    → Conexión a MySQL
│   │   └── app.js                       → Entry point
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar/
    │   │   │   ├── NavUsuario.jsx
    │   │   │   └── NavAdmin.jsx
    │   │   ├── Sidebar/
    │   │   │   ├── SidebarFiltros.jsx    → Filtros interactivos (Reservas)
    │   │   │   └── SidebarIndice.jsx     → Índice de navegación (resto de vistas)
    │   │   ├── CabanaCard.jsx
    │   │   ├── CarritoItem.jsx
    │   │   └── Notificaciones.jsx
    │   ├── pages/
    │   │   ├── Inicio.jsx
    │   │   ├── Login.jsx
    │   │   ├── Registro.jsx
    │   │   ├── usuario/
    │   │   │   ├── Reservas.jsx
    │   │   │   ├── MisReservas.jsx
    │   │   │   ├── Carrito.jsx
    │   │   │   ├── Checkout.jsx
    │   │   │   ├── Ayuda.jsx
    │   │   │   └── Perfil.jsx
    │   │   └── admin/
    │   │       ├── CrearCabana.jsx
    │   │       ├── GestionarReservas.jsx
    │   │       ├── Finanzas.jsx
    │   │       ├── Reclamos.jsx
    │   │       ├── Calificaciones.jsx
    │   │       ├── Opiniones.jsx
    │   │       └── PerfilAdmin.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx           → Contexto global de autenticación
    │   └── App.jsx
    └── package.json
```

---

## 🚀 Instalación y uso

### Pre-requisitos

- Node.js 18+
- MySQL 8+
- npm

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
# Completar las variables en .env
```

### 3. Crear la base de datos

```bash
mysql -u root -p < src/config/database.sql
```

### 4. Crear el superadmin (solo la primera vez)

```bash
# Ejecutar el script de seed para crear el superadmin inicial
node src/config/seed.js
```

### 5. Iniciar el servidor

```bash
npm run dev
```

El servidor correrá en `http://localhost:3000`

### 6. Configurar y correr el frontend

```bash
cd ../frontend
npm install
npm run dev
```

El cliente correrá en `http://localhost:5173`

---

## 🔐 Variables de entorno

Crear un archivo `.env` en `/backend` basado en `.env.example`:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=cabins
JWT_SECRET=tu_clave_secreta_jwt
JWT_EXPIRES_IN=24h
```

---

## 🖥 Vistas del sistema

### Página de Inicio (Invitado)
Accesible sin autenticación. Incluye:
- **Banner principal** con llamada a la acción
- **Quiénes somos** — presentación de Cabins
- **Nuestros servicios** — qué ofrece la plataforma
- **Dónde estamos** — ubicación en Buenos Aires
- **¿Cómo alquilar?** — guía para reservar (requiere iniciar sesión)
- **Footer** con links, contacto y métodos de pago

> 💡 Al iniciar sesión el nav cambia según el rol (usuario o admin) y se mantiene en todas las vistas.

### Barra lateral

Todas las vistas (excepto inicio) incluyen una barra lateral izquierda fija:

| Vista | Tipo | Contenido |
|-------|------|-----------|
| Reservas | Filtros | Localidad, precio, valoración |
| Mis Reservas | Índice | Activas, Historial, Canceladas |
| Carrito | Índice | Cabañas agregadas, Resumen |
| Ayuda | Índice | FAQ, Cómo reservar, Cancelaciones, Contacto |
| Perfil | Índice | Mis datos, Modificar, Cerrar sesión |
| Crear Cabaña | Índice | Datos, Imágenes, Métodos de pago, Vista previa |
| Gestionar Reservas | Índice | Pendientes, Confirmadas, Canceladas, Completadas |
| Finanzas | Índice | Ingresos, Ocupación, Reservas, Promedio |
| Reclamos | Índice | Abiertos, En revisión, Cerrados |

### Flujo de reserva

```
Explorar cabañas → Agregar al carrito → Seleccionar fechas y personas
→ Checkout → Pago simulado → Confirmación ✅
```

---

## 📡 Endpoints de la API

### Autenticación

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Registro de usuario | ❌ |
| POST | `/api/auth/login` | Login y generación de JWT | ❌ |
| POST | `/api/auth/logout` | Cierre de sesión | ✅ |

### Cabañas

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/cabanas` | Listar cabañas con filtros | ❌ |
| GET | `/api/cabanas/:id` | Detalle de una cabaña | ❌ |
| POST | `/api/cabanas` | Crear cabaña | ✅ Admin |
| PUT | `/api/cabanas/:id` | Editar cabaña | ✅ Admin |
| DELETE | `/api/cabanas/:id` | Eliminar cabaña | ✅ Admin |

### Reservas

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/reservas/mis-reservas` | Reservas del usuario | ✅ Usuario |
| POST | `/api/reservas` | Crear reserva | ✅ Usuario |
| PUT | `/api/reservas/:id` | Modificar fechas | ✅ Usuario |
| DELETE | `/api/reservas/:id` | Cancelar reserva | ✅ Usuario |
| GET | `/api/reservas` | Listar todas las reservas | ✅ Admin |
| PUT | `/api/reservas/:id/estado` | Cambiar estado | ✅ Admin |

### Finanzas, Comunidad y Reclamos

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/finanzas/resumen` | Datos para gráficos | ✅ Admin |
| POST | `/api/calificaciones` | Calificar cabaña | ✅ Usuario |
| GET | `/api/calificaciones` | Ver calificaciones | ✅ Admin |
| POST | `/api/opiniones` | Dejar opinión | ✅ Usuario |
| GET | `/api/opiniones` | Ver opiniones | ✅ Admin |
| POST | `/api/reclamos` | Enviar reclamo | ✅ Usuario |
| GET | `/api/reclamos` | Ver reclamos | ✅ Admin |
| PUT | `/api/reclamos/:id` | Responder reclamo | ✅ Admin |
| GET | `/api/notificaciones` | Ver notificaciones | ✅ Admin |
| PUT | `/api/notificaciones/:id/leer` | Marcar como leída | ✅ Admin |

---

## 🗄 Base de datos

```sql
CREATE DATABASE cabins;
USE cabins;

CREATE TABLE usuarios (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL,
  email        VARCHAR(150) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE admins (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,
  es_superadmin BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cabanas (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  nombre              VARCHAR(150) NOT NULL,
  descripcion         TEXT NOT NULL,
  localidad           VARCHAR(100) NOT NULL,
  precio_por_noche    DECIMAL(10,2) NOT NULL,
  cantidad_disponible INT NOT NULL DEFAULT 1,
  imagen_url          VARCHAR(500),
  metodos_pago        VARCHAR(255),
  admin_id            INT,
  activa              BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admins(id)
);

CREATE TABLE reservas (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id        INT NOT NULL,
  cabana_id         INT NOT NULL,
  cantidad_personas INT NOT NULL DEFAULT 1,
  fecha_checkin     DATE NOT NULL,
  fecha_checkout    DATE NOT NULL,
  precio_total      DECIMAL(10,2) NOT NULL,
  estado            ENUM('pendiente','confirmada','cancelada','completada') DEFAULT 'pendiente',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (cabana_id) REFERENCES cabanas(id)
);

CREATE TABLE calificaciones (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  cabana_id  INT NOT NULL,
  puntaje    TINYINT NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_calificacion (usuario_id, cabana_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (cabana_id) REFERENCES cabanas(id) ON DELETE CASCADE
);

CREATE TABLE opiniones (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  cabana_id  INT NOT NULL,
  contenido  TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (cabana_id) REFERENCES cabanas(id) ON DELETE CASCADE
);

CREATE TABLE reclamos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  asunto      VARCHAR(200) NOT NULL,
  descripcion TEXT NOT NULL,
  estado      ENUM('abierto','en_revision','cerrado') DEFAULT 'abierto',
  respuesta   TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE notificaciones (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  admin_id   INT NOT NULL,
  tipo       ENUM('nueva_reserva','reclamo','cancelacion','opinion') NOT NULL,
  mensaje    VARCHAR(500) NOT NULL,
  leida      BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);
```
