import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MODERATION_REASONS, type ModerationReason } from '@/lib/moderation';

interface ModerationReasonSelectProps {
  value?: ModerationReason;
  onChange: (value: ModerationReason) => void;
}

export function ModerationReasonSelect({ value, onChange }: ModerationReasonSelectProps) {
  const { t } = useTranslation();

  return (
    <Select value={value} onValueChange={(val) => onChange(val as ModerationReason)}>
      <SelectTrigger>
        <SelectValue placeholder={t('moderation.selectReason')} />
      </SelectTrigger>
      <SelectContent>
        {MODERATION_REASONS.map((reason) => (
          <SelectItem key={reason} value={reason}>
            {t(`moderation.reasons.${reason}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
