import App from '../App';
import { baseParts } from '../parts';
import { ServicesSectionReworded } from '../mutations/ServicesSectionReworded';

export default function Variant() {
  return (
    <App parts={{ ...baseParts, ServicesSection: ServicesSectionReworded }} />
  );
}
