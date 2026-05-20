interface EmptyStateProps {
  title?: string;
  message?: string;
}

export function EmptyState({ 
  title = 'No data found',
  message = 'There are no items to display.'
}: EmptyStateProps) {
  return (
    <div className="state-container empty-state">
      <div className="empty-icon">📭</div>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}
