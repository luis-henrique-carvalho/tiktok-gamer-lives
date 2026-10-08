import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Typography } from '@/components/ui/typography';

export interface TeamConfigFieldsProps {
  readonly teamKey: 'A' | 'B';
  readonly name: string;
  readonly color: string;
  readonly avatar: string;
  readonly loading: boolean;
  readonly onNameChange: (val: string) => void;
  readonly onColorChange: (val: string) => void;
  readonly onAvatarChange: (val: string) => void;
}

export function TeamConfigFields({
  teamKey,
  name,
  color,
  avatar,
  loading,
  onNameChange,
  onColorChange,
  onAvatarChange,
}: TeamConfigFieldsProps) {
  const isTeamA = teamKey === 'A';
  const themeBorder = isTeamA
    ? 'border-red-500/20 bg-red-500/5'
    : 'border-blue-500/20 bg-blue-500/5';
  const textColor = isTeamA ? 'text-red-500' : 'text-blue-500';
  const idPrefix = isTeamA ? 'team-a' : 'team-b';

  return (
    <div
      className={`flex flex-col gap-1.5 p-3 rounded-lg border ${themeBorder}`}
    >
      <Typography variant="small" className={`font-semibold ${textColor}`}>
        Time {teamKey}
      </Typography>

      <div className="flex flex-col gap-1">
        <Label htmlFor={`${idPrefix}-name`} className="text-xs">
          Nome do Time {teamKey}
        </Label>
        <Input
          id={`${idPrefix}-name`}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={`${idPrefix}-color`} className="text-xs">
          Cor HEX
        </Label>
        <Input
          id={`${idPrefix}-color`}
          type="text"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={`${idPrefix}-avatar`} className="text-xs">
          Avatar / Foto URL
        </Label>
        <Input
          id={`${idPrefix}-avatar`}
          type="url"
          placeholder="https://... (foto ou brasão)"
          value={avatar}
          onChange={(e) => onAvatarChange(e.target.value)}
          disabled={loading}
        />
      </div>
    </div>
  );
}
