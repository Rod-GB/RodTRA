/*
 * Component: ScreenshotGallery
 * Folder: frontend/js/components
 * File: ScreenshotGallery.jsx
 * Purpose: Shows available screenshots and lets the player browse/enlarge
 *   them.
 */

import Icon from './Icon';
import React, { useRef, useState } from 'react';
import { gameImage } from '../format';

export default function ScreenshotGallery({ screenshots = [], title }) {
  const [selected, setSelected] = useState(0);
  const dialog = useRef(null), touchX = useRef(null), swiped = useRef(false);
  const images = screenshots.filter(shot => gameImage(shot.full)).slice(0, 12);
  if (!images.length) return null;
  const index = Math.min(selected, images.length - 1);
  const move = step => setSelected(value => (value + step + images.length) % images.length);
  const gestures = {
    onTouchStart: event => { swiped.current = false; touchX.current = event.touches[0]?.clientX; },
    onTouchEnd: event => { const delta = event.changedTouches[0]?.clientX - touchX.current; if (touchX.current !== null && Math.abs(delta) > 50) { swiped.current = true; move(delta < 0 ? 1 : -1); } touchX.current = null; },
    onTouchCancel: () => { touchX.current = null; swiped.current = false; },
  };
  return <section className="screenshot-gallery" aria-label={`${title} screenshots`}>
    <div className="section-heading"><h3>Screenshots</h3><span className="small muted">{index + 1} / {images.length}</span></div>
    <button className="gallery-main" aria-label={`Enlarge screenshot ${index + 1} of ${title}`} onClick={event => { if (event.detail !== 0 && swiped.current) { swiped.current = false; return; } dialog.current.showModal(); }} {...gestures}>
      <img src={gameImage(images[index].full)} alt={`${title} gameplay screenshot ${index + 1}`} loading="lazy"/>
    </button>
    <div className="gallery-controls"><button className="quiet-button" onClick={() => move(-1)} aria-label="Previous screenshot">← Previous</button><span className="small muted">Tap to enlarge · Swipe to browse</span><button className="quiet-button" onClick={() => move(1)} aria-label="Next screenshot">Next →</button></div>
    <div className="gallery-thumbnails">{images.map((shot, i) => <button key={shot.full} aria-label={`Show screenshot ${i + 1}`} aria-pressed={index === i} onClick={() => setSelected(i)}><img src={gameImage(shot.thumbnail) || gameImage(shot.full)} alt="" loading="lazy"/></button>)}</div>
    <dialog ref={dialog} className="image-dialog" aria-label={`${title} enlarged screenshot`} onClick={event => { if (event.target === dialog.current) dialog.current.close(); }} onKeyDown={event => { if (event.key === 'ArrowRight') move(1); if (event.key === 'ArrowLeft') move(-1); }}>
      <button className="dialog-close" aria-label="Close enlarged screenshot" onClick={() => dialog.current.close()}><Icon name="close" width="22" height="22"/></button>
      <img src={gameImage(images[index].full)} alt={`${title} gameplay screenshot ${index + 1}`} {...gestures}/>
      <div className="gallery-controls"><button className="quiet-button" onClick={() => move(-1)}>← Previous</button><span>{index + 1} / {images.length}</span><button className="quiet-button" onClick={() => move(1)}>Next →</button></div>
    </dialog>
  </section>;
}
