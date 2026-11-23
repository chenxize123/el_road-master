const began = performance.now();

function emit(level, area, event, detail) {
  const elapsed = ((performance.now() - began) / 1000).toFixed(1);
  const label = `[展厅 +${elapsed}s][${area}] ${event}`;
  if (detail === undefined) console[level](label);
  else console[level](label, detail);
}

export const diag = {
  info: (area, event, detail) => emit('info', area, event, detail),
  warn: (area, event, detail) => emit('warn', area, event, detail),
  error: (area, event, detail) => emit('error', area, event, detail),
};
