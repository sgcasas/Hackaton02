import { Link } from 'react-router-dom';
import type { Tropel } from '../../types/api';
import { Badge } from '../../components/ui';
import { vitalTone } from './constants';

export function TropelRow({ tropel }: { tropel: Tropel }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-3 py-2">
        <Link to={`/tropels/${tropel.id}`} className="font-medium text-sky-700 hover:underline">
          {tropel.name}
        </Link>
      </td>
      <td className="px-3 py-2 text-slate-600">{tropel.species}</td>
      <td className="px-3 py-2">
        <Badge tone={vitalTone(tropel.vitalState)}>{tropel.vitalState}</Badge>
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{tropel.chaosIndex}</td>
      <td className="px-3 py-2 text-right tabular-nums">{tropel.energyLevel}</td>
      <td className="px-3 py-2 text-slate-600">{tropel.sector.name}</td>
    </tr>
  );
}
