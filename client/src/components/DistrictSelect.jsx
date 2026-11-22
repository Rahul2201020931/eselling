import { useData } from '../data.jsx';
import { useI18n } from '../i18n.jsx';

// One dropdown with all 77 districts, grouped by province.
export default function DistrictSelect({ value, onChange, allLabel, required }) {
  const { meta } = useData();
  const { t } = useI18n();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} required={required}>
      <option value="">{allLabel ?? t('All districts')}</option>
      {meta &&
        Object.entries(meta.provinceDistricts).map(([province, districts]) => (
          <optgroup key={province} label={province}>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </optgroup>
        ))}
    </select>
  );
}
