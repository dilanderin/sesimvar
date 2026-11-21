import { useEffect, useState } from 'react';
import type { Picture } from '../lib/data';
import { blobUrl } from '../lib/store';

interface Props {
  picture: Picture;
  label: string;
  size: number;
  color?: string;
}

/** The picture on a card: a bundled pictogram, a stored photo / ARASAAC
 *  pictogram, or, for text-only words, the first letter. */
export function WordPicture({ picture, label, size, color = '#3A2420' }: Props) {
  const [src, setSrc] = useState<string | null>(picture.kind === 'builtin' ? picture.src : null);

  useEffect(() => {
    let alive = true;
    if (picture.kind === 'builtin') setSrc(picture.src);
    else if (picture.kind === 'stored') {
      setSrc(null);
      void blobUrl(picture.key).then((u) => alive && setSrc(u));
    } else setSrc(null);
    return () => {
      alive = false;
    };
  }, [picture]);

  if (picture.kind === 'text') {
    return (
      <span
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.62,
          fontWeight: 700,
          color,
          lineHeight: 1,
        }}
      >
        {label.charAt(0).toLocaleUpperCase('tr-TR')}
      </span>
    );
  }

  const photo = picture.kind === 'stored' && picture.source === 'photo';
  return src ? (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        width: size,
        height: size,
        objectFit: photo ? 'cover' : 'contain',
        borderRadius: photo ? '50%' : undefined,
        display: 'block',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        pointerEvents: 'none',
      }}
    />
  ) : (
    <span style={{ width: size, height: size, display: 'block' }} />
  );
}
