const { esFechaValida, hoy, estaOcupada } = require('../src/utils/reservas');

describe('esFechaValida', () => {
  test('acepta una fecha real con formato AAAA-MM-DD', () => {
    expect(esFechaValida('2026-12-18')).toBe(true);
  });

  test('acepta el 29 de febrero en un año bisiesto', () => {
    expect(esFechaValida('2028-02-29')).toBe(true);
  });

  test('rechaza fechas que no existen', () => {
    expect(esFechaValida('2026-02-31')).toBe(false);
    expect(esFechaValida('2027-02-29')).toBe(false);
  });

  test('rechaza otros formatos y valores que no son texto', () => {
    expect(esFechaValida('18/12/2026')).toBe(false);
    expect(esFechaValida('2026-12-18T10:00')).toBe(false);
    expect(esFechaValida('')).toBe(false);
    expect(esFechaValida(null)).toBe(false);
    expect(esFechaValida(20261218)).toBe(false);
  });
});

describe('hoy', () => {
  afterEach(() => jest.useRealTimers());

  test('devuelve la fecha de Argentina aunque en UTC ya sea el día siguiente', () => {
    // 26/11 02:30 en UTC son las 23:30 del 25/11 en Argentina (UTC-3)
    jest.useFakeTimers().setSystemTime(new Date('2026-11-26T02:30:00Z'));
    expect(hoy()).toBe('2026-11-25');
  });

  test('devuelve el formato AAAA-MM-DD', () => {
    expect(hoy()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('estaOcupada', () => {
  const executorCon = (filas) => ({ query: jest.fn().mockResolvedValue({ rows: filas }) });

  test('devuelve true si la base encuentra una reserva superpuesta', async () => {
    const executor = executorCon([{ '?column?': 1 }]);
    await expect(estaOcupada(executor, 3, '2026-12-18', '2026-12-20')).resolves.toBe(true);
  });

  test('devuelve false si no hay reservas superpuestas', async () => {
    const executor = executorCon([]);
    await expect(estaOcupada(executor, 3, '2026-12-18', '2026-12-20')).resolves.toBe(false);
  });

  test('envía los parámetros en orden y sin reserva a excluir por defecto', async () => {
    const executor = executorCon([]);
    await estaOcupada(executor, 3, '2026-12-18', '2026-12-20');
    expect(executor.query).toHaveBeenCalledWith(expect.any(String), [3, '2026-12-18', '2026-12-20', null]);
  });

  test('solo cuenta reservas activas y deja libre el día de check-out', async () => {
    const executor = executorCon([]);
    await estaOcupada(executor, 3, '2026-12-18', '2026-12-20', 10);
    const sql = executor.query.mock.calls[0][0];
    expect(sql).toContain("estado IN ('pendiente', 'confirmada')");
    expect(sql).toContain('fecha_checkin < $3');
    expect(sql).toContain('fecha_checkout > $2');
    expect(executor.query.mock.calls[0][1][3]).toBe(10);
  });
});
