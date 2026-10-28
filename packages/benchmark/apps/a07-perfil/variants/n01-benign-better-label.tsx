import App from '../App';
import { baseParts } from '../parts';
import { ProfileProvider } from '../store/ProfileProvider';
import { SaveBarBetterLabel } from '../mutations/SaveBarBetterLabel';

export default function Variant() {
  return (
    <ProfileProvider>
      <App parts={{ ...baseParts, SaveBar: SaveBarBetterLabel }} />
    </ProfileProvider>
  );
}
