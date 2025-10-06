import { ErrorInfo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}

export function ErrorFallback({ error, errorInfo, onReset }: ErrorFallbackProps) {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  const isDev = import.meta.env.DEV;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <CardTitle className="text-2xl">Something went wrong</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              We apologize for the inconvenience. The application encountered an unexpected error.
            </AlertDescription>
          </Alert>

          {error && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Error message:</p>
              <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
                {error.message}
              </pre>
            </div>
          )}

          {isDev && errorInfo && (
            <details className="space-y-2">
              <summary className="text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground">
                Stack trace (development only)
              </summary>
              <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto max-h-64">
                {error?.stack}
                {'\n\nComponent Stack:'}
                {errorInfo.componentStack}
              </pre>
            </details>
          )}

          <div className="flex gap-3 pt-4">
            <Button onClick={onReset} variant="default" className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={handleGoHome} variant="outline" className="flex-1">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            If the problem persists, please refresh the page or contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
