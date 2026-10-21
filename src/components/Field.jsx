export default function Field({ id, label, error, hint, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <small id={`${id}-hint`}>{hint}</small>}
      {error && <p id={`${id}-error`} className="error" role="alert">{error}</p>}
    </div>
  )
}