import { CheckCircle2 } from 'lucide-react';
import { Badge } from './ui/badge';

export function StatusIndicator() {
  return (
    <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
      <CheckCircle2 className="h-3 w-3" />
      Client-Side Mode Active
    </Badge>
  );
}
