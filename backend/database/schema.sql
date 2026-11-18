-- =====================================================================
-- CABINS - Esquema de base de datos (PostgreSQL / Supabase)
-- Generado a partir de la base real de producción (Supabase), schema "public".
-- Incluye las migraciones v3.3 (comisión y tarifa), v3.4 (planes) y
-- v3.5 (recuperación de contraseña).
-- Este archivo contiene solo la ESTRUCTURA (sin datos).
-- Para crear la base desde cero: ejecutarlo completo en el SQL Editor.
-- =====================================================================

-- Necesaria para impedir reservas superpuestas (restricción EXCLUDE con gist)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------
-- Ubicación
-- ---------------------------------------------------------------------
CREATE TABLE provincia (
  id      SERIAL PRIMARY KEY,
  nombre  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE localidad (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(150) NOT NULL,
  provincia_id  INTEGER NOT NULL REFERENCES provincia(id),
  CONSTRAINT localidad_nombre_provincia_id_key UNIQUE (nombre, provincia_id)
);
CREATE INDEX idx_localidad_provincia ON localidad (provincia_id);

-- ---------------------------------------------------------------------
-- Cuentas
-- ---------------------------------------------------------------------
-- admin = dueño de cabañas; es_superadmin = acceso de solo consulta a todo
CREATE TABLE admin (
  id                SERIAL PRIMARY KEY,
  nombre            VARCHAR(100) NOT NULL,
  apellido          VARCHAR(100) NOT NULL,
  email             VARCHAR(150) NOT NULL UNIQUE,
  usuario           VARCHAR(100) NOT NULL UNIQUE,
  password          VARCHAR(255) NOT NULL,          -- hash bcrypt
  llave_maestra     VARCHAR(255),                   -- hash bcrypt (solo superadmin)
  es_superadmin     BOOLEAN DEFAULT FALSE,
  fecha_nacimiento  DATE,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW(),
  baneado           BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_baneo      VARCHAR(500),
  baneado_at        TIMESTAMP
);

-- usuario = huésped
CREATE TABLE usuario (
  id                SERIAL PRIMARY KEY,
  nombre            VARCHAR(100) NOT NULL,
  apellido          VARCHAR(100) NOT NULL,
  email             VARCHAR(150) NOT NULL UNIQUE,
  usuario           VARCHAR(100) NOT NULL UNIQUE,
  password          VARCHAR(255) NOT NULL,          -- hash bcrypt
  fecha_nacimiento  DATE,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW(),
  baneado           BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_baneo      VARCHAR(500),
  baneado_at        TIMESTAMP
);

-- ---------------------------------------------------------------------
-- Cabañas
-- ---------------------------------------------------------------------
CREATE TABLE cabana (
  id                  SERIAL PRIMARY KEY,
  nombre              VARCHAR(150) NOT NULL,
  descripcion         TEXT NOT NULL,
  precio_por_noche    NUMERIC(10,2) NOT NULL,
  imagen_url          VARCHAR(500),
  metodos_pago        VARCHAR(255),
  admin_id            INTEGER REFERENCES admin(id),
  activa              BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW(),
  localidad_id        INTEGER NOT NULL REFERENCES localidad(id),
  capacidad_personas  INTEGER NOT NULL DEFAULT 2 CHECK (capacidad_personas > 0)
);
CREATE INDEX idx_cabana_admin ON cabana (admin_id);
CREATE INDEX idx_cabana_localidad ON cabana (localidad_id);

-- Plan contratado por cabaña (Free = sin fila). Dura 30 días.
CREATE TABLE plan_cabana (
  id           SERIAL PRIMARY KEY,
  cabana_id    INTEGER NOT NULL REFERENCES cabana(id) ON DELETE CASCADE,
  plan         VARCHAR(10) NOT NULL CHECK (plan IN ('plus', 'premium')),
  precio       NUMERIC(10,2) NOT NULL,
  inicio       DATE NOT NULL,
  vencimiento  DATE NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_plan_cabana_vigencia ON plan_cabana (cabana_id, vencimiento);

-- ---------------------------------------------------------------------
-- Reservas y carrito
-- ---------------------------------------------------------------------
-- precio_total = alojamiento (noches x precio). La comisión (dueño) y la tarifa
-- de servicio (huésped) guardan el % y el monto vigentes al momento de reservar.
CREATE TABLE reserva (
  id                     SERIAL PRIMARY KEY,
  usuario_id             INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  cabana_id              INTEGER NOT NULL REFERENCES cabana(id),
  cantidad_personas      INTEGER NOT NULL DEFAULT 1,
  fecha_checkin          DATE NOT NULL,
  fecha_checkout         DATE NOT NULL,
  precio_total           NUMERIC(10,2) NOT NULL,
  estado                 VARCHAR(20) DEFAULT 'pendiente',
  created_at             TIMESTAMP DEFAULT NOW(),
  updated_at             TIMESTAMP DEFAULT NOW(),
  comision_pct           NUMERIC(5,2) NOT NULL DEFAULT 0,
  comision_monto         NUMERIC(10,2) NOT NULL DEFAULT 0,
  tarifa_servicio_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  tarifa_servicio_monto  NUMERIC(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT reserva_estado_check CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'completada')),
  CONSTRAINT chk_reserva_fechas CHECK (fecha_checkout > fecha_checkin),
  -- Una cabaña no puede tener dos reservas activas en fechas que se pisan
  CONSTRAINT reserva_sin_superposicion EXCLUDE USING gist (
    cabana_id WITH =,
    daterange(fecha_checkin, fecha_checkout) WITH &&
  ) WHERE (estado IN ('pendiente', 'confirmada'))
);
CREATE INDEX idx_reserva_checkin ON reserva (fecha_checkin);
CREATE INDEX idx_reserva_disponibilidad ON reserva (cabana_id, fecha_checkin, fecha_checkout);

CREATE TABLE carrito (
  id                 SERIAL PRIMARY KEY,
  usuario_id         INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  cabana_id          INTEGER NOT NULL REFERENCES cabana(id) ON DELETE CASCADE,
  created_at         TIMESTAMP DEFAULT NOW(),
  fecha_checkin      DATE NOT NULL,
  fecha_checkout     DATE NOT NULL,
  cantidad_personas  INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT chk_carrito_fechas CHECK (fecha_checkout > fecha_checkin)
);
CREATE INDEX idx_carrito_usuario ON carrito (usuario_id);

-- Reserva temporal de fechas mientras el huésped paga
CREATE TABLE bloqueo (
  id              SERIAL PRIMARY KEY,
  usuario_id      INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  cabana_id       INTEGER NOT NULL REFERENCES cabana(id) ON DELETE CASCADE,
  fecha_checkin   DATE NOT NULL,
  fecha_checkout  DATE NOT NULL,
  expira_at       TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_bloqueo_fechas CHECK (fecha_checkout > fecha_checkin)
);
CREATE INDEX idx_bloqueo_cabana ON bloqueo (cabana_id, fecha_checkin, fecha_checkout);
CREATE INDEX idx_bloqueo_usuario ON bloqueo (usuario_id);

-- ---------------------------------------------------------------------
-- Calificaciones y opiniones (una por huésped y cabaña)
-- ---------------------------------------------------------------------
CREATE TABLE calificacion (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  cabana_id   INTEGER NOT NULL REFERENCES cabana(id) ON DELETE CASCADE,
  puntaje     SMALLINT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  CONSTRAINT calificacion_puntaje_check CHECK (puntaje >= 1 AND puntaje <= 5),
  CONSTRAINT calificacion_usuario_id_cabana_id_key UNIQUE (usuario_id, cabana_id)
);
CREATE INDEX idx_calificacion_cabana ON calificacion (cabana_id);

CREATE TABLE opinion (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  cabana_id   INTEGER NOT NULL REFERENCES cabana(id) ON DELETE CASCADE,
  contenido   TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  CONSTRAINT opinion_unica UNIQUE (usuario_id, cabana_id)
);
CREATE INDEX idx_opinion_cabana ON opinion (cabana_id, id DESC);

-- ---------------------------------------------------------------------
-- Reclamos y chat
-- ---------------------------------------------------------------------
CREATE TABLE reclamo (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  asunto      VARCHAR(200) NOT NULL,
  estado      VARCHAR(20) DEFAULT 'nuevo',
  created_at  TIMESTAMP DEFAULT NOW(),
  reserva_id  INTEGER REFERENCES reserva(id) ON DELETE SET NULL,
  CONSTRAINT reclamo_estado_check CHECK (estado IN ('nuevo', 'en_proceso', 'finalizado'))
);
CREATE INDEX idx_reclamo_reserva ON reclamo (reserva_id);
CREATE INDEX idx_reclamo_usuario_estado ON reclamo (usuario_id, estado);

-- remitente_id apunta a usuario o admin según remitente_tipo
CREATE TABLE mensaje_reclamo (
  id              SERIAL PRIMARY KEY,
  reclamo_id      INTEGER NOT NULL REFERENCES reclamo(id) ON DELETE CASCADE,
  remitente_id    INTEGER NOT NULL,
  remitente_tipo  VARCHAR(10) NOT NULL CHECK (remitente_tipo IN ('usuario', 'admin')),
  mensaje         TEXT NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  leido_at        TIMESTAMPTZ
);
CREATE INDEX idx_mensaje_reclamo_chat ON mensaje_reclamo (reclamo_id, id);
CREATE INDEX idx_mensaje_no_leido ON mensaje_reclamo (reclamo_id, remitente_tipo) WHERE leido_at IS NULL;

-- ---------------------------------------------------------------------
-- Notificaciones para los dueños
-- ---------------------------------------------------------------------
CREATE TABLE notificacion (
  id          SERIAL PRIMARY KEY,
  admin_id    INTEGER NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
  tipo        VARCHAR(20) NOT NULL,
  mensaje     VARCHAR(500) NOT NULL,
  leida       BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT NOW(),
  reserva_id  INTEGER REFERENCES reserva(id) ON DELETE CASCADE,
  CONSTRAINT chk_notificacion_tipo CHECK (tipo IN
    ('nueva_reserva', 'reclamo', 'cancelacion', 'opinion', 'pago_aprobado', 'checkout', 'plan'))
);
-- Una sola notificación de checkout por reserva y dueño
CREATE UNIQUE INDEX uq_notif_checkout ON notificacion (admin_id, reserva_id) WHERE tipo = 'checkout';

-- ---------------------------------------------------------------------
-- Recuperación de contraseña (se guarda solo el hash del token)
-- ---------------------------------------------------------------------
CREATE TABLE recuperacion_clave (
  id          SERIAL PRIMARY KEY,
  rol         VARCHAR(10) NOT NULL CHECK (rol IN ('usuario', 'admin')),
  cuenta_id   INTEGER NOT NULL,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  expira      TIMESTAMPTZ NOT NULL,
  usado_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_recuperacion_cuenta ON recuperacion_clave (rol, cuenta_id, created_at);