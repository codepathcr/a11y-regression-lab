export interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  atomic?: boolean;
}

/**
 * Región live para comunicar actualizaciones dinámicas (criterio 4.1.3).
 *
 * El rol y `aria-live` se declaran los dos de forma explícita aunque
 * `role="status"` ya implique cortesía `polite`. La redundancia es intencional:
 * permite que un operador de mutación retire uno de los dos y observar si la
 * diferencia aparece en la traza, que es precisamente el tipo de regresión
 * silenciosa que este estudio busca detectar.
 *
 * El contenedor se renderiza siempre, incluso con el mensaje vacío, por el
 * motivo explicado en `TextField`.
 */
export function LiveRegion({ message, politeness = 'polite', atomic = true }: LiveRegionProps) {
  return (
    <div
      role={politeness === 'assertive' ? 'alert' : 'status'}
      aria-live={politeness}
      aria-atomic={atomic}
      className="a11y-live"
    >
      {message}
    </div>
  );
}
