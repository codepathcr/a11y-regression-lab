import App from '../App';
import { baseParts } from '../parts';
import { SupportProvider } from '../store/SupportProvider';

export default function Variant() {
  return (
    <SupportProvider>
      <App parts={baseParts} />
    </SupportProvider>
  );
}
