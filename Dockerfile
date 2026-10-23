# Imagen de medición del estudio.
#
# El entorno de ejecución es un artefacto versionado de la investigación, no la
# computadora de quien corre el experimento. Esto responde directamente a la
# amenaza de reproducibilidad declarada en la sección 3.9 del documento: el piso
# de ruido que se reporta es una propiedad de esta imagen, y cualquier tercero
# puede reconstruirla y obtener el mismo.
#
# La versión de la imagen base DEBE coincidir con la versión de Playwright
# declarada en packages/framework/package.json. Si una cambia, cambia la otra.
FROM mcr.microsoft.com/playwright:v1.48.2-jammy

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Los navegadores ya vienen en la imagen base con sus librerías de sistema.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

WORKDIR /app

# Los manifiestos se copian antes que el código fuente: así un cambio en un
# fixture no invalida la capa de instalación de dependencias.
COPY pnpm-workspace.yaml package.json .npmrc ./
COPY pnpm-lock.yaml* ./
COPY packages/framework/package.json ./packages/framework/
COPY packages/ui/package.json        ./packages/ui/
COPY packages/benchmark/package.json ./packages/benchmark/

# El lockfile está versionado: la instalación es reproducible y la imagen falla
# de inmediato si alguien cambió un manifiesto sin regenerarlo.
RUN pnpm install --frozen-lockfile

COPY . .

CMD ["bash"]
