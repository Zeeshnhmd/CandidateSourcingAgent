import { Compass } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../shared/components/ui/Button';
import { StateMessage } from '../shared/components/ui/StateMessage';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <StateMessage
      icon={<Compass size={22} aria-hidden />}
      title="Page not found"
      description="The page you are looking for does not exist or has moved."
      action={
        <Button variant="primary" onClick={() => void navigate('/')}>
          Start a new search
        </Button>
      }
    />
  );
}
