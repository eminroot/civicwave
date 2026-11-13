import { Image } from 'expo-image';
import { useState } from 'react';

import { RingIcon } from '@/components/ui';
import { CATEGORY_ICON, CategoryId } from '@/constants/categories';
import { Palette } from '@/constants/design';

/** The report's photo, or its category glyph when the photo is missing or can't be read. */
export function ReportThumb({
  photoUri,
  categoryId,
  size = 60,
}: {
  photoUri?: string;
  categoryId: CategoryId;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const cat = CATEGORY_ICON[categoryId];
  if (!photoUri || broken) return <RingIcon name={cat.icon} set={cat.iconSet} size={size} />;
  return (
    <Image
      source={{ uri: photoUri }}
      style={{ width: size, height: size, borderRadius: 16, backgroundColor: Palette.bgDeep }}
      contentFit="cover"
      transition={150}
      onError={() => setBroken(true)}
    />
  );
}
