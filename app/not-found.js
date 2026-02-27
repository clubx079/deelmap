import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center px-4">
        <h1 className="text-6xl font-bold text-[#1A4D2E] mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          Sorry, the page you are looking for doesn't exist or has been moved.
        </p>
        <Link 
          href="/"
          className="inline-block bg-[#1A4D2E] text-white px-6 py-3 rounded-lg hover:bg-[#153d24] transition-colors"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}
