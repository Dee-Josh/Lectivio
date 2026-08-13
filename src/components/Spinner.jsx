export default function Spinner({ label }) {
  return (
    <div className="spinner-container">
      <div className="spinner" />
      {label && <p className="spinner-label">{label}</p>}
    </div>
  );
}