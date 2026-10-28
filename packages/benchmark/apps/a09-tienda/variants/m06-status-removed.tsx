import App from '../App';
import { baseParts } from '../parts';
import { StoreProvider } from '../store/StoreProvider';
import { AnnouncerSilent } from '../mutations/AnnouncerSilent';

export default function Variant() {
  return (
    <StoreProvider>
      <App parts={{ ...baseParts, Announcer: AnnouncerSilent }} />
    </StoreProvider>
  );
}
