import App from '../App';
import { baseParts } from '../parts';
import { BlogProvider } from '../store/BlogProvider';
import { PostListRefactored } from '../mutations/PostListRefactored';

/** Control negativo. Ver la cabecera del modulo refactorizado. */
export default function Variant() {
  return (
    <BlogProvider>
      <App parts={{ ...baseParts, PostList: PostListRefactored }} />
    </BlogProvider>
  );
}
