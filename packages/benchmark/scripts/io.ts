/**
 * Un script de línea de comandos tiene que poder canalizarse a `head` o a
 * `less`. Cuando el proceso del otro lado cierra la tubería, la siguiente
 * escritura a stdout falla con EPIPE y Node, por omisión, lo convierte en un
 * evento `error` sin manejador: una traza de pila de treinta líneas que oculta
 * la salida que sí se alcanzó a producir y hace parecer que el script se rompió.
 *
 * Lo que corresponde ante una tubería cerrada es terminar en silencio: quien
 * cerró ya tiene lo que quería.
 */
export function ignoreBrokenPipe(): void {
  for (const stream of [process.stdout, process.stderr]) {
    stream.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EPIPE') process.exit(0);
      throw error;
    });
  }
}
