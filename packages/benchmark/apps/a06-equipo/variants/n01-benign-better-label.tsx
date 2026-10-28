import App from '../App';
import { baseParts } from '../parts';
import { TeamProvider } from '../store/TeamProvider';
import { TeamToolbarBetterLabel } from '../mutations/TeamToolbarBetterLabel';

export default function Variant() {
  return (
    <TeamProvider>
      <App parts={{ ...baseParts, TeamToolbar: TeamToolbarBetterLabel }} />
    </TeamProvider>
  );
}
