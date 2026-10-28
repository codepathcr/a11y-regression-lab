import App from '../App';
import { baseParts } from '../parts';
import { StoreProvider } from '../store/StoreProvider';

export default function Variant() {
  return (
    <StoreProvider>
      <App parts={baseParts} />
    </StoreProvider>
  );
}
