// Five stars. Pass onChange to let people click a rating; without it the stars are display only.
export default function Stars({ value = 0, onChange }) {
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        return onChange ? (
          <button type="button" key={n} className={`star ${filled ? 'on' : ''}`} onClick={() => onChange(n)} aria-label={`${n} stars`}>
            ★
          </button>
        ) : (
          <span key={n} className={`star ${filled ? 'on' : ''}`}>
            ★
          </span>
        );
      })}
    </span>
  );
}
