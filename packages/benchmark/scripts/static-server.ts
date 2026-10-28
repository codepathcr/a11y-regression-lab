import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

export const DIST = resolve(import.meta.dirname, '..', 'dist');
export const APPS = resolve(import.meta.dirname, '..', 'apps');

export interface StaticServer {
  origin: string;
  close: () => void;
}

/**
 * Servidor estático sobre un directorio compilado, `dist/` por omisión. El
 * parámetro `root` existe para el flujo de Pull Requests, donde hay que servir
 * dos compilaciones a la vez: una por cada lado del cambio.
 *
 * Deliberadamente tonto: no transforma, no
 * inyecta nada y no abre websockets. La medición se hace sobre esto y nunca
 * sobre el servidor de desarrollo, cuyo cliente de recarga aparecería en la
 * traza sin pertenecer a la aplicación.
 */
export function serveDist(port: number, root: string = DIST): Promise<StaticServer> {
  const server = createServer((request, response) => {
    const path = (request.url ?? '/').split('?')[0];
    const file = path === '/' ? join(root, 'index.html') : join(root, path);
    stat(file)
      .then(() => {
        response.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream');
        createReadStream(file).pipe(response);
      })
      .catch(() => {
        response.statusCode = 404;
        response.end('no encontrado');
      });
  });

  return new Promise((done) => {
    server.listen(port, '127.0.0.1', () => {
      done({ origin: `http://127.0.0.1:${port}`, close: () => server.close() });
    });
  });
}
