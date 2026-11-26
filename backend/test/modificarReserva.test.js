jest.mock('../src/config/db', () => ({ connect: jest.fn() }));

const db = require('../src/config/db');
const { modificarReserva } = require('../src/controllers/reserva.gestion.controller');

// Respuestas simuladas de la base, según la consulta que llega
const crearCliente = ({ reserva, cabana, ocupada = false, fallaUpdate = false } = {}) => {
  const query = jest.fn(async (sql) => {
    if (/^\s*(BEGIN|COMMIT|ROLLBACK)/.test(sql)) return {};
    if (sql.includes('FROM reserva') && sql.includes('FOR UPDATE')) return { rows: reserva ? [reserva] : [] };
    if (sql.includes('FROM cabana c')) return { rows: [cabana] };
    if (sql.includes('SELECT 1 FROM reserva')) return { rows: ocupada ? [{}] : [] };
    if (sql.includes('UPDATE reserva') && sql.includes('RETURNING')) {
      if (fallaUpdate) throw new Error('Se cortó la conexión con la base');
      return { rows: [{ precio_total: 150000 }] };
    }
    return { rows: [] };
  });
  return { query, release: jest.fn() };
};

const crearRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const reservaPendiente = {
  cabana_id: 7, estado: 'pendiente', cantidad_personas: 2,
  fecha_checkin: '2030-01-10', fecha_checkout: '2030-01-12'
};
const cabanaActiva = { capacidad_personas: 4, activa: true };
const pedido = (body) => ({ params: { id: '10' }, user: { id: 1 }, body });
const consultas = (cliente) => cliente.query.mock.calls.map(([sql]) => sql.trim().split(/\s+/)[0]);

describe('modificarReserva', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  test('abre la transacción con BEGIN antes de cualquier consulta y la confirma con COMMIT', async () => {
    const cliente = crearCliente({ reserva: reservaPendiente, cabana: cabanaActiva });
    db.connect.mockResolvedValue(cliente);
    const res = crearRes();

    await modificarReserva(pedido({ fecha_checkin: '2030-01-11', fecha_checkout: '2030-01-14' }), res);

    const orden = consultas(cliente);
    expect(orden[0]).toBe('BEGIN');
    expect(orden[orden.length - 1]).toBe('COMMIT');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ precio_total: 150000 }));
    expect(cliente.release).toHaveBeenCalled();
  });

  test('si la base falla a mitad del cambio, hace ROLLBACK y no confirma nada', async () => {
    const cliente = crearCliente({ reserva: reservaPendiente, cabana: cabanaActiva, fallaUpdate: true });
    db.connect.mockResolvedValue(cliente);
    const res = crearRes();

    await modificarReserva(pedido({ fecha_checkin: '2030-01-11', fecha_checkout: '2030-01-14' }), res);

    const orden = consultas(cliente);
    expect(orden[0]).toBe('BEGIN');
    expect(orden).toContain('ROLLBACK');
    expect(orden).not.toContain('COMMIT');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(cliente.release).toHaveBeenCalled();
  });

  test('rechaza fechas que se superponen con otra reserva (409) y deshace la transacción', async () => {
    const cliente = crearCliente({ reserva: reservaPendiente, cabana: cabanaActiva, ocupada: true });
    db.connect.mockResolvedValue(cliente);
    const res = crearRes();

    await modificarReserva(pedido({ fecha_checkin: '2030-01-11', fecha_checkout: '2030-01-14' }), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(consultas(cliente)).toContain('ROLLBACK');
  });

  test('rechaza más personas que la capacidad de la cabaña (400)', async () => {
    const cliente = crearCliente({ reserva: reservaPendiente, cabana: cabanaActiva });
    db.connect.mockResolvedValue(cliente);
    const res = crearRes();

    await modificarReserva(pedido({ cantidad_personas: 5 }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Esta cabaña admite hasta 4 personas' });
  });

  test('rechaza un check-out igual al check-in (400)', async () => {
    const cliente = crearCliente({ reserva: reservaPendiente, cabana: cabanaActiva });
    db.connect.mockResolvedValue(cliente);
    const res = crearRes();

    await modificarReserva(pedido({ fecha_checkin: '2030-01-11', fecha_checkout: '2030-01-11' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'El check-out debe ser posterior al check-in' });
  });

  test('no permite modificar una reserva cancelada (400)', async () => {
    const cliente = crearCliente({ reserva: { ...reservaPendiente, estado: 'cancelada' }, cabana: cabanaActiva });
    db.connect.mockResolvedValue(cliente);
    const res = crearRes();

    await modificarReserva(pedido({ cantidad_personas: 3 }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(consultas(cliente)).toContain('ROLLBACK');
  });

  test('responde 404 si la reserva no existe o es de otro usuario', async () => {
    const cliente = crearCliente({ reserva: null, cabana: cabanaActiva });
    db.connect.mockResolvedValue(cliente);
    const res = crearRes();

    await modificarReserva(pedido({ cantidad_personas: 3 }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
