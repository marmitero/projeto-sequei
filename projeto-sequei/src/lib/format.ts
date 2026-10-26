// utilitário puro (sem hooks) — usado por client e server.

export function fmt(n: number, d = 0) {
  return Number(n.toFixed(d)).toLocaleString("pt-BR");
}
