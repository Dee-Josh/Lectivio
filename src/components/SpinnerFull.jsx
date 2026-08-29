export default function SpinnerFull({ label }) {
  return (
    <div className="spinner-container loading-screen">
      <div className="spinner" />
      {label && <p className="spinner-label">{label}</p>}
    </div>
  );
}