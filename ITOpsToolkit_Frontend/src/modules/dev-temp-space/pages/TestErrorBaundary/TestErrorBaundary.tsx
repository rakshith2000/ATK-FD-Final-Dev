import { useState } from 'react';

const TestErrorBaundary = () => {
    const [renderError, setRenderError] = useState(false);

    const data = {
        name: 'Dev',
    };

    return (
        <>
            <button onClick={() => setRenderError(true)} className="ml-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md shadow hover:bg-red-700 transition">
                Test Error Boundary
            </button>
            {renderError ? data : null}
        </>
    );
};

export default TestErrorBaundary;
