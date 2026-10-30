import TrainAiDashboard from '../components/smart/TrainAiDashboard/TrainAiDashboard';

/** Route entry point for the Train AI dashboard. */
const TrainAiDashboardPage: React.FC = () => {
    return (
        <div className="h-full w-full overflow-y-auto bg-gray-50/60">
            <div className="mx-auto w-full p-4 md:p-6">
                <TrainAiDashboard />
            </div>
        </div>
    );
};

export default TrainAiDashboardPage;
