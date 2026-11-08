import ActivityList from '../components/ActivityList.jsx'

export default function ActivityHistory() {
    return (
        <>
            <h1>Activity History</h1>

            <p className="note">
                View and manage your saved runs, including manually logged
                activities and runs recorded through GPS tracking.
            </p>

            <section className="plan-card" aria-labelledby="activity-history-title">
                <div className="panel-head">
                    <h2 id="activity-history-title">Your activities</h2>
                    <span className="pill pill-muted">All runs</span>
                </div>

                <ActivityList />
            </section>
        </>
    )
}
