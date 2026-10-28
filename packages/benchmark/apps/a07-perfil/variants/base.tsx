import App from '../App';
import { baseParts } from '../parts';
import { ProfileProvider } from '../store/ProfileProvider';

export default function Variant() {
  return (
    <ProfileProvider>
      <App parts={baseParts} />
    </ProfileProvider>
  );
}
