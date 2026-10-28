import App from '../App';
import { baseParts } from '../parts';
import { BlogProvider } from '../store/BlogProvider';
import { PostListWithReadingTime } from '../mutations/PostListWithReadingTime';

export default function Variant() {
  return (
    <BlogProvider>
      <App parts={{ ...baseParts, PostList: PostListWithReadingTime }} />
    </BlogProvider>
  );
}
