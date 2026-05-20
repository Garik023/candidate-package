interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="state-container loading-state">
      <div className="spinner"></div>
      <p>{message}</p>
    </div>
  );
}
