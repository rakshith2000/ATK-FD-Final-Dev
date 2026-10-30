import { Link } from '@tanstack/react-router';
import { NotFoundIcon } from '../Placeholders/NotFoundIcon';

export function NotFoundRoute() {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-100 text-center overflow-auto p-4">
            <NotFoundIcon />
            <h1 className="text-6xl font-bold text-blue-600">404</h1>
            <h2 className="mt-4 text-2xl font-semibold text-gray-800">Page Not Found</h2>
            <p className="mt-2 text-gray-600">Sorry, the page you are looking for doesn’t exist or has been moved.</p>
            <Link to="/" className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">
                Go Home
            </Link>
        </div>
    );
}
