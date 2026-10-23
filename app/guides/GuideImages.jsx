'use client';

export function imageUrl(guideId, image) {
  return image.dataUrl || '/api/guides/' + guideId + '/images/' + image.id;
}

export default function GuideImages({ guide }) {
  return (
    guide.images?.length > 0 && (
      <section className="guide-images">
        <h3>รูปประกอบ</h3>
        <div className="guide-image-grid">
          {guide.images.map((image, index) => (
            <figure key={image.id}>
              <a
                href={imageUrl(guide._id, image)}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  loading="lazy"
                  src={imageUrl(guide._id, image)}
                  alt={image.caption || 'รูปประกอบที่ ' + (index + 1)}
                />
              </a>
              <figcaption>
                {image.caption || 'รูปที่ ' + (index + 1)}{' '}
                <small>กดรูปเพื่อขยาย</small>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    )
  );
}

export async function readGuideImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('เลือกรูป JPG, PNG หรือ WebP ครับ');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('ไฟล์ต้นฉบับต้องไม่เกิน 10 MB');
  }

  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = url;
    await image.decode();

    const scale = Math.min(1, 1400 / image.width, 1400 / image.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return {
      dataUrl: canvas.toDataURL('image/jpeg', 0.85),
      caption: '',
      name: file.name,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
