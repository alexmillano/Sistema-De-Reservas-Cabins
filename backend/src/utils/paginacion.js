const paginar = (query) => {
  const pagina = Math.max(parseInt(query.pagina, 10) || 1, 1);
  const limite = Math.min(Math.max(parseInt(query.limite, 10) || 20, 1), 100);
  return { pagina, limite, offset: (pagina - 1) * limite };
};

module.exports = { paginar };