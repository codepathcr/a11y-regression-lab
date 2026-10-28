import { Tabs, TextField } from '@a11y-lab/ui';
import { useProfile } from '../store/profile-context';

/**
 * MUTACIÓN · CCB, Change Context on Blur · operador de Ma11y
 * (Tafreshipour et al., 2024) · criterio 3.2.1
 *
 * El paper define el operador por nombre y categoría —Understandable /
 * Predictable, falla F9— pero no detalla la transformación. La
 * operacionalización es propia de este estudio.
 *
 * Transformación: abandonar el campo de nombre visible guarda los cambios.
 * Nadie lo pidió: el guardado automático al salir del campo es un patrón
 * frecuente y bienintencionado, y aquí produce que el botón "Guardar cambios"
 * se deshabilite por sí solo en el instante en que la persona tabula hacia él.
 *
 * Es un mecanismo distinto al CCB de a09-tienda, que inserta contenido
 * tabulable: este **retira** del orden de tabulación el control que la persona
 * estaba alcanzando. Tener los dos mecanismos permite comprobar si un detector
 * reconoce el criterio o solo el patrón de inserción de nodos.
 */
export function ProfileTabsAutosave() {
  const { values, setValue, save } = useProfile();

  return (
    <Tabs
      label="Secciones de los ajustes"
      tabs={[
        {
          id: 'cuenta',
          label: 'Cuenta',
          content: (
            <>
              <TextField
                label="Nombre visible"
                value={values.nombre}
                data-testid="perfil-nombre"
                onChange={(event) => setValue('nombre', event.target.value)}
                onBlur={() => save()}
              />
              <TextField
                label="Correo electrónico"
                hint="Lo usamos para avisos de seguridad."
                value={values.correo}
                data-testid="perfil-correo"
                onChange={(event) => setValue('correo', event.target.value)}
              />
            </>
          ),
        },
        {
          id: 'avisos',
          label: 'Notificaciones',
          content: (
            <fieldset className="perfil__casillas">
              <legend>Qué avisos querés recibir</legend>
              <label>
                <input
                  type="checkbox"
                  checked={values.avisosCorreo}
                  data-testid="avisos-correo"
                  onChange={(event) => setValue('avisosCorreo', event.target.checked)}
                />{' '}
                Avisos por correo
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={values.avisosResumen}
                  data-testid="avisos-resumen"
                  onChange={(event) => setValue('avisosResumen', event.target.checked)}
                />{' '}
                Resumen semanal
              </label>
            </fieldset>
          ),
        },
        {
          id: 'privacidad',
          label: 'Privacidad',
          content: (
            <fieldset className="perfil__casillas">
              <legend>Visibilidad de tu perfil</legend>
              <label>
                <input
                  type="checkbox"
                  checked={values.perfilPublico}
                  data-testid="perfil-publico"
                  onChange={(event) => setValue('perfilPublico', event.target.checked)}
                />{' '}
                Mostrar mi perfil a otras personas del equipo
              </label>
            </fieldset>
          ),
        },
      ]}
    />
  );
}
