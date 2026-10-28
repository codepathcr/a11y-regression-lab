import App from '../App';
import { baseParts } from '../parts';
import { ProfileProvider } from '../store/ProfileProvider';
import { SaveBarRefactored } from '../mutations/SaveBarRefactored';

export default function Variant() {
  return (
    <ProfileProvider>
      <App parts={{ ...baseParts, SaveBar: SaveBarRefactored }} />
    </ProfileProvider>
  );
}
