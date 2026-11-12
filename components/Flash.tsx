// Flash message: error (laal) ya saved (hara). Server page se props mein aata hai.
export function Flash({ error, ok }: { error?: string; ok?: string | boolean }) {
  if (error) {
    return <p role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>;
  }
  if (ok) {
    return <p className="mt-3 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">Save ho gaya.</p>;
  }
  return null;
}
