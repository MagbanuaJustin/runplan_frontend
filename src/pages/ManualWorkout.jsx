import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function getLocalDate() {
    const date = new Date()
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
    return date.toISOString().slice(0, 10)
}

function formatDisplayDate(value) {
    if (!value) return 'Not selected'

    const [year, month, day] = value.split('-').map(Number)

    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })
}

export default function ManualWorkout() {
    const navigate = useNavigate()

    const [form, setForm] = useState({
        date: getLocalDate(),
        distance: '5.0',
        notes: '',
    })

    const [error, setError] = useState('')

    function handleChange(event) {
        const { name, value } = event.target

        setForm((current) => ({
            ...current,
            [name]: value,
        }))

        setError('')
    }

    function handleStartRun(event) {
        event.preventDefault()
        setError('')

        const distance = Number(form.distance)

        if (!form.date) {
            setError('Please select the workout date.')
            return
        }

        if (
            !Number.isFinite(distance) ||
            distance <= 0 ||
            distance > 100
        ) {
            setError('Enter a valid distance greater than 0 km and no more than 100 km.')
            return
        }

        navigate('/run', {
            state: {
                manualWorkout: {
                    date: form.date,
                    distance,
                    notes: form.notes.trim(),
                },
            },
        })
    }

    return (
        <>
            <div className="manual-page">
                <header className="manual-page-header">
                    <div>
                        <span className="manual-eyebrow">
                            <span className="manual-eyebrow-dot" />
                            WORKOUT TRACKER
                        </span>

                        <h1>Record a Manual Workout</h1>

                        <p>
                            Create a custom workout and start GPS tracking.
                            Your actual run will be saved when you finish.
                        </p>
                    </div>

                    <div className="manual-header-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path
                                d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Z"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="m9 15 2 2 4-4"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                </header>

                <div className="manual-workspace">
                    <section
                        className="plan-card manual-form-card"
                        aria-labelledby="manual-workout-title"
                    >
                        <div className="manual-card-heading">
                            <div className="manual-heading-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M3 15.5c2.5 0 3.5-1 5-3l2-2 3 2 2 1 5 1c1 .2 2 1.2 2 2.5V19H3v-3.5Z"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="m10 10.5 2-3 3 2M6 19v-2"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>

                            <div>
                                <h2 id="manual-workout-title">Set up your workout</h2>
                                <p>Enter your workout details before starting GPS tracking.</p>
                            </div>
                        </div>

                        <form className="manual-form" onSubmit={handleStartRun}>
                            <div className="manual-field">
                                <label htmlFor="manual-workout-date">
                                    <span className="manual-field-icon">▦</span>
                                    Workout date
                                </label>

                                <input
                                    id="manual-workout-date"
                                    type="date"
                                    name="date"
                                    value={form.date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="manual-field">
                                <label htmlFor="manual-workout-distance">
                                    <span className="manual-field-icon">◎</span>
                                    Target distance (km)
                                </label>

                                <div className="manual-distance-input">
                                    <input
                                        id="manual-workout-distance"
                                        type="number"
                                        name="distance"
                                        value={form.distance}
                                        onChange={handleChange}
                                        min="0.1"
                                        max="100"
                                        step="0.1"
                                        placeholder="Enter target distance"
                                        required
                                    />
                                    <span>KM</span>
                                </div>

                                <small>
                                    Required. This distance will be used to calculate
                                    your workout progress.
                                </small>
                            </div>

                            <div className="manual-field">
                                <div className="manual-label-row">
                                    <label htmlFor="manual-workout-notes">
                                        <span className="manual-field-icon">☷</span>
                                        Workout instructions
                                        <span className="manual-optional">(optional)</span>
                                    </label>

                                    <span className="manual-character-count">
                                        {form.notes.length}/1000
                                    </span>
                                </div>

                                <textarea
                                    id="manual-workout-notes"
                                    name="notes"
                                    value={form.notes}
                                    onChange={handleChange}
                                    maxLength={1000}
                                    rows={5}
                                    placeholder="Example: Easy conversational run. Maintain a comfortable pace."
                                />
                            </div>

                            {error && (
                                <p className="manual-error" role="alert">
                                    <span>!</span>
                                    {error}
                                </p>
                            )}

                            <div className="manual-summary">
                                <div className="manual-summary-heading">
                                    <span className="manual-summary-icon">⚑</span>
                                    <strong>Workout Summary</strong>
                                </div>

                                <div className="manual-summary-grid">
                                    <div className="manual-summary-item">
                                        <span className="manual-summary-label">
                                            <span>▦</span> Date
                                        </span>
                                        <strong>{formatDisplayDate(form.date)}</strong>
                                    </div>

                                    <div className="manual-summary-item">
                                        <span className="manual-summary-label">
                                            <span>◎</span> Target distance
                                        </span>
                                        <strong>
                                            {Number(form.distance) > 0 &&
                                            Number.isFinite(Number(form.distance))
                                                ? `${Number(form.distance).toFixed(2)} km`
                                                : 'Not specified'}
                                        </strong>
                                    </div>

                                    <div className="manual-summary-item">
                                        <span className="manual-summary-label">
                                            <span>☷</span> Instructions
                                        </span>
                                        <strong className="manual-summary-notes">
                                            {form.notes.trim() || 'No instructions added.'}
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="manual-start-button"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M7 4.8c0-.8.9-1.3 1.6-.9l11 7.2a1.1 1.1 0 0 1 0 1.8l-11 7.2c-.7.4-1.6-.1-1.6-.9V4.8Z" />
                                </svg>
                                Start a Run
                                <span className="manual-button-arrow">→</span>
                            </button>

                            <p className="manual-form-footnote">
                                GPS tracking will begin on the next screen.
                            </p>
                        </form>
                    </section>
</div>
            </div>

            <style>{`
                .manual-page {
                    width: 100%;
                    max-width: 1180px;
                    margin: 0 auto;
                }

                .manual-page-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                    margin-bottom: 24px;
                    padding: 8px 2px;
                }

                .manual-page-header h1 {
                    margin: 7px 0 5px;
                    color: var(--text);
                    font-size: clamp(23px, 3vw, 29px);
                    font-weight: 800;
                    letter-spacing: -0.035em;
                }

                .manual-page-header p {
                    margin: 0;
                    color: var(--text-secondary);
                    font-size: 13.5px;
                    line-height: 1.6;
                }

                .manual-eyebrow,
                .manual-info-eyebrow {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--accent-bright);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: .13em;
                }

                .manual-eyebrow-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: var(--accent-bright);
                    box-shadow: 0 0 9px var(--accent);
                }

                .manual-header-icon,
                .manual-heading-icon,
                .manual-info-art {
                    display: grid;
                    place-items: center;
                    flex: 0 0 auto;
                    color: var(--accent-bright);
                    background: var(--bg-active);
                    border: 1px solid var(--border-accent);
                }

                .manual-header-icon {
                    width: 58px;
                    height: 58px;
                    border-radius: 16px;
                }

                .manual-header-icon svg {
                    width: 29px;
                    height: 29px;
                }

                .manual-workspace {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr);
                    align-items: start;
                    gap: 18px;
                }

                .manual-form-card {
                    min-width: 0;
                    margin: 0;
                    padding: 22px;
                    border-radius: 15px;
                }

                .manual-card-heading {
                    display: flex;
                    align-items: center;
                    gap: 13px;
                    margin-bottom: 22px;
                }

                .manual-heading-icon {
                    width: 43px;
                    height: 43px;
                    border-radius: 12px;
                }

                .manual-heading-icon svg {
                    width: 23px;
                    height: 23px;
                }

                .manual-card-heading h2 {
                    margin: 0 0 3px;
                    color: var(--text);
                    font-size: 17px;
                }

                .manual-card-heading p {
                    margin: 0;
                    color: var(--text-muted);
                    font-size: 12px;
                    line-height: 1.5;
                }

                .manual-form {
                    display: grid;
                    gap: 19px;
                }

                .manual-field {
                    display: grid;
                    gap: 8px;
                    min-width: 0;
                }

                .manual-field label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--text-secondary);
                    font-size: 12.5px;
                    font-weight: 700;
                }

                .manual-field-icon {
                    color: var(--accent-bright);
                    font-size: 16px;
                    line-height: 1;
                }

                .manual-optional {
                    color: var(--text-muted);
                    font-size: 11px;
                    font-weight: 500;
                }

                .manual-field input,
                .manual-field textarea {
                    box-sizing: border-box;
                    width: 100%;
                    min-width: 0;
                    color: var(--text);
                    background: var(--bg-input);
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    font: inherit;
                    font-size: 13px;
                    transition: border-color .18s ease, box-shadow .18s ease;
                }

                .manual-field input {
                    height: 45px;
                    padding: 0 13px;
                }

                .manual-field textarea {
                    min-height: 115px;
                    padding: 12px 13px;
                    resize: vertical;
                    line-height: 1.6;
                }

                .manual-field input:focus,
                .manual-field textarea:focus {
                    outline: none;
                    border-color: var(--accent);
                    box-shadow: 0 0 0 3px var(--bg-active);
                }

                .manual-distance-input {
                    position: relative;
                }

                .manual-distance-input input {
                    padding-right: 55px;
                }

                .manual-distance-input > span {
                    position: absolute;
                    top: 50%;
                    right: 14px;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: .08em;
                    pointer-events: none;
                }

                .manual-field > small {
                    color: var(--text-muted);
                    font-size: 11px;
                    line-height: 1.5;
                }

                .manual-label-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                }

                .manual-character-count {
                    color: var(--text-muted);
                    font-size: 10.5px;
                    font-variant-numeric: tabular-nums;
                }

                .manual-summary {
                    padding: 16px;
                    border: 1px solid var(--border-accent);
                    border-radius: 12px;
                    background: var(--bg-active);
                }

                .manual-summary-heading {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    margin-bottom: 15px;
                    color: var(--text);
                    font-size: 13px;
                }

                .manual-summary-icon {
                    color: var(--accent-bright);
                    font-size: 17px;
                }

                .manual-summary-grid {
                    display: grid;
                    grid-template-columns: .85fr .9fr 1.25fr;
                    gap: 14px;
                }

                .manual-summary-item {
                    display: grid;
                    align-content: start;
                    gap: 7px;
                    min-width: 0;
                }

                .manual-summary-item + .manual-summary-item {
                    padding-left: 14px;
                    border-left: 1px solid var(--border-accent);
                }

                .manual-summary-label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: var(--text-muted);
                    font-size: 10px;
                    font-weight: 600;
                }

                .manual-summary-label span {
                    color: var(--accent-bright);
                    font-size: 13px;
                }

                .manual-summary-item strong {
                    overflow-wrap: anywhere;
                    color: var(--text);
                    font-size: 12px;
                    line-height: 1.5;
                }

                .manual-summary-item .manual-summary-notes {
                    color: var(--text-secondary);
                    font-weight: 500;
                    font-style: italic;
                }

                .manual-start-button {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    width: 100%;
                    min-height: 51px;
                    padding: 0 18px;
                    border: 1px solid rgba(134, 174, 245, .35);
                    border-radius: 11px;
                    background: linear-gradient(110deg, #2563eb, #3d72d8 55%, #527fe0);
                    color: #fff;
                    font: inherit;
                    font-size: 14px;
                    font-weight: 800;
                    cursor: pointer;
                    box-shadow: 0 8px 22px rgba(37, 99, 235, .22);
                    transition: transform .18s ease, box-shadow .18s ease;
                }

                .manual-start-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 11px 27px rgba(37, 99, 235, .32);
                }

                .manual-start-button svg {
                    width: 17px;
                    height: 17px;
                }

                .manual-button-arrow {
                    margin-left: auto;
                    font-size: 19px;
                }

                .manual-form-footnote {
                    margin: -8px 0 0;
                    color: var(--text-muted);
                    font-size: 10.5px;
                    text-align: center;
                }

                .manual-error {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    margin: 0;
                    padding: 10px 12px;
                    border: 1px solid var(--danger-border);
                    border-radius: 9px;
                    background: var(--danger-bg);
                    color: var(--danger);
                    font-size: 12px;
                }

                .manual-error span {
                    font-weight: 900;
                }

                .manual-side-column {
                    display: grid;
                    gap: 15px;
                }

                .manual-info-card {
                    position: relative;
                    min-width: 0;
                    min-height: 205px;
                    overflow: hidden;
                    padding: 19px;
                    border: 1px solid var(--border);
                    border-radius: 14px;
                    background: var(--bg-surface);
                }

                .manual-info-top {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 10px;
                    margin-bottom: 13px;
                }

                .manual-info-eyebrow {
                    color: var(--text-muted);
                    font-size: 9px;
                }

                .manual-info-eyebrow > span {
                    color: var(--accent-bright);
                    font-size: 15px;
                }

                .manual-info-art {
                    width: 58px;
                    height: 58px;
                    border-radius: 17px;
                }

                .manual-info-art svg {
                    width: 43px;
                    height: 43px;
                }

                .manual-info-card h3 {
                    margin: 0 0 7px;
                    color: var(--text);
                    font-size: 17px;
                    letter-spacing: -.02em;
                }

                .manual-info-card > p {
                    max-width: 260px;
                    margin: 0 0 16px;
                    color: var(--text-secondary);
                    font-size: 12px;
                    line-height: 1.65;
                }

                .manual-text-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 9px;
                    padding: 0;
                    border: 0;
                    background: transparent;
                    color: var(--accent-bright);
                    font: inherit;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                }

                .manual-text-link:hover {
                    color: var(--text);
                }

                .manual-text-link span {
                    font-size: 17px;
                    transition: transform .18s ease;
                }

                .manual-text-link:hover span {
                    transform: translateX(4px);
                }

                @media (max-width: 900px) {
                    .manual-workspace {
                        grid-template-columns: 1fr;
                    }
}

                @media (max-width: 580px) {
                    .manual-page-header {
                        align-items: flex-start;
                    }

                    .manual-header-icon {
                        width: 45px;
                        height: 45px;
                    }

                    .manual-form-card {
                        padding: 16px;
                    }
.manual-summary-grid {
                        grid-template-columns: 1fr;
                        gap: 12px;
                    }

                    .manual-summary-item + .manual-summary-item {
                        padding: 12px 0 0;
                        border-top: 1px solid var(--border-accent);
                        border-left: 0;
                    }
                }
            `}</style>
        </>
    )
}
