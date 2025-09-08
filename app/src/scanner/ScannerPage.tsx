import { useEffect } from 'react';
import { ScannerPane } from '../features/scanner/components/ScannerPane';

export function ScannerPage() {
  useEffect(() => {
    document.title = 'Scanner';
  }, []);
  return (
    <div className="min-h-screen p-4 md:p-6">
      <h1 className="text-xl font-semibold mb-4">Token Scanner</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ScannerPane kind="trending" />
        <ScannerPane kind="fresh" />
      </div>
    </div>
  );
}

