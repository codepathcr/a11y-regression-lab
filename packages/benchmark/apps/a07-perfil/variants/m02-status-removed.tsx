import App from '../App';
import { baseParts } from '../parts';
import { ProfileProvider } from '../store/ProfileProvider';
import { AnnouncerSilent } from '../mutations/AnnouncerSilent';

export default function Variant() {
  return (
    <ProfileProvider>
      <App parts={{ ...baseParts, Announcer: AnnouncerSilent }} />
    </ProfileProvider>
  );
}
