import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Lightbulb } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function SuggestionsBox() {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const generateSuggestionsMutation = trpc.dashboard.generateSuggestions.useQuery();

  useEffect(() => {
    if (generateSuggestionsMutation.data?.suggestions) {
      setSuggestions(generateSuggestionsMutation.data.suggestions);
    }
  }, [generateSuggestionsMutation.data]);

  const handleRefresh = () => {
    setIsLoading(true);
    generateSuggestionsMutation.refetch().then(() => {
      setIsLoading(false);
    });
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sugestões</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading || generateSuggestionsMutation.isLoading}
          className="hover:bg-blue-100 dark:hover:bg-blue-900"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading || generateSuggestionsMutation.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-blue-200 dark:bg-blue-800 rounded animate-pulse" />
            ))}
          </div>
        ) : suggestions.length > 0 ? (
          <ul className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex gap-3">
                <span className="text-blue-600 dark:text-blue-400 font-bold flex-shrink-0">•</span>
                <span className="text-gray-700 dark:text-gray-300 text-sm">{suggestion}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Carregando sugestões...</p>
        )}
      </div>
    </Card>
  );
}
