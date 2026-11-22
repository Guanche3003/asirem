// Composition d'une image finale haute résolution sans dépendance navigateur lourde.
// Elle reprend exactement les calques affichés dans CandleCustomizerPreview.

const loadImage = (src, anonymous = true) => new Promise((resolve) => {
  if (!src) return resolve(null);
  const image = new Image();
  if (anonymous) image.crossOrigin = 'anonymous';
  image.onload = () => resolve(image);
  image.onerror = () => resolve(null);
  image.src = src;
});

export async function buildPreviewImage({ photo, waxHex, labelImage, finish = '' }) {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const image = await loadImage(photo);
  if (image) {
    const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  } else {
    // Repli si le visuel détouré est indisponible : silhouette de bougie nette.
    ctx.fillStyle = waxHex || '#EFE2C9';
    ctx.beginPath();
    ctx.roundRect(130, 130, 220, 350, 12);
    ctx.fill();
    ctx.fillStyle = '#E7D6BE';
    ctx.fillRect(130, 130, 220, 14);
  }

  // La teinte de cire ne s'applique qu'aux pixels déjà dessinés (masque alpha).
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = image ? 0.32 : 0.85;
  ctx.fillStyle = waxHex || '#EFE2C9';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (finish === 'marbled') {
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 18;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(140 + i * 50, 300, 110, 0.4, 2.5);
      ctx.stroke();
    }
  }
  if (finish === 'satin') {
    ctx.globalAlpha = 0.16;
    const shine = ctx.createLinearGradient(130, 0, 350, 0);
    shine.addColorStop(0, 'rgba(255,255,255,0)');
    shine.addColorStop(0.45, 'rgba(255,255,255,1)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.restore();

  const label = await loadImage(labelImage);
  if (label) {
    const width = 250;
    const height = Math.round((width * label.naturalHeight) / label.naturalWidth);
    ctx.drawImage(label, (canvas.width - width) / 2, 330, width, height);
  }

  try {
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

export function downloadDataUrl(dataUrl, filename) {
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
