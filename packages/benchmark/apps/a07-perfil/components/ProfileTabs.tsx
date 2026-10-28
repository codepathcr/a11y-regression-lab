import { Tabs, TextField } from '@a11y-lab/ui';
import { useProfile } from '../store/profile-context';

/**
 * Ajustes repartidos en pestañas.
 *
 * Segundo anfitrión de la primitiva `Tabs`: el primero es el detalle de
 * producto de a09-tienda. Con un solo anfitrión no se puede distinguir el
 * resultado de un operador del comportamiento de ese componente en particular.
 *
 * Las casillas son `<input type="checkbox">` nativas con su etiqueta asociada:
 * el estado conmutado lo comunica el navegador sin ARIA de por medio.
 */
export function ProfileTabs() {
  const { values, setValue } = useProfile();

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
