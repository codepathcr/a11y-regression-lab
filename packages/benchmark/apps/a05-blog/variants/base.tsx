import App from '../App';
import { baseParts } from '../parts';
import { BlogProvider } from '../store/BlogProvider';

export default function Variant() {
  return (
    <BlogProvider>
      <App parts={baseParts} />
    </BlogProvider>
  );
}
