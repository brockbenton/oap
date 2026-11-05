export default function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-green border-t-transparent" />
    </div>
  );
}
