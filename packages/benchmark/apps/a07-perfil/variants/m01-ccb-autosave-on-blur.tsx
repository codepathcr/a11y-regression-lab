import App from '../App';
import { baseParts } from '../parts';
import { ProfileProvider } from '../store/ProfileProvider';
import { ProfileTabsAutosave } from '../mutations/ProfileTabsAutosave';

export default function Variant() {
  return (
    <ProfileProvider>
      <App parts={{ ...baseParts, ProfileTabs: ProfileTabsAutosave }} />
    </ProfileProvider>
  );
}
