import App from '../App';
import { baseParts } from '../parts';
import { TeamProvider } from '../store/TeamProvider';
import { InviteDialogSendOnBlur } from '../mutations/InviteDialogSendOnBlur';

/** Sustituye unicamente InviteDialog. Ver la cabecera del modulo mutado. */
export default function Variant() {
  return (
    <TeamProvider>
      <App parts={{ ...baseParts, InviteDialog: InviteDialogSendOnBlur }} />
    </TeamProvider>
  );
}
