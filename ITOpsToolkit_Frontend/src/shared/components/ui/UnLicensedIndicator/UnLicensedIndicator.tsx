import { Link } from '@tanstack/react-router';

export function UnLicensedIndicator() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-6 text-center space-y-3">
            <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
            <p className="text-sm text-gray-700 max-w-sm">This page or feature is not licensed for your account.</p>
            <Link to="/" className="px-4 py-2 bg-red-600 text-white text-sm rounded-md shadow hover:bg-red-700 transition">
                Return Home
            </Link>
        </div>
    );
}
