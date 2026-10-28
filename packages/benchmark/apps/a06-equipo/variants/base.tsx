import App from '../App';
import { baseParts } from '../parts';
import { TeamProvider } from '../store/TeamProvider';

export default function Variant() {
  return (
    <TeamProvider>
      <App parts={baseParts} />
    </TeamProvider>
  );
}
