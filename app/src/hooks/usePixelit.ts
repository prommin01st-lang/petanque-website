import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook that creates a canvas overlay on top of an image
 * and animates a pixelation effect on hover.
 *
 * On mouseenter: gradually increases pixelation (block size 1 -> 12)
 * with smooth transitions.
 * On mouseleave: gradually decreases pixelation back to normal.
 */
export function usePixelit(imgRef: React.RefObject<HTMLImageElement | null>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const currentBlockRef = useRef<number>(1);
  const targetBlockRef = useRef<number>(1);
  const isHoveringRef = useRef<boolean>(false);
  const imgLoadedRef = useRef<boolean>(false);

  const drawPixelated = useCallback((blockSize: number) => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !imgLoadedRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w === 0 || h === 0) return;

    // Ensure canvas matches image display size
    const rect = img.getBoundingClientRect();
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.imageSmoothingEnabled = false;

    if (blockSize <= 1) {
      // No pixelation - draw original
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
    } else {
      // Draw at reduced size then upscale with pixelated rendering
      const smallW = Math.max(1, Math.ceil(w / blockSize));
      const smallH = Math.max(1, Math.ceil(h / blockSize));

      // Create temporary canvas for small version
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = smallW;
      tempCanvas.height = smallH;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCtx.imageSmoothingEnabled = false;
      tempCtx.drawImage(img, 0, 0, smallW, smallH);

      // Draw small version upscaled back to full size
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(tempCanvas, 0, 0, smallW, smallH, 0, 0, w, h);
    }
  }, [imgRef]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const target = targetBlockRef.current;
    const current = currentBlockRef.current;

    if (Math.abs(target - current) < 0.3) {
      currentBlockRef.current = target;
      drawPixelated(target);

      if (target <= 1 && !isHoveringRef.current) {
        // Animation complete - hide canvas
        canvas.style.opacity = '0';
      }
      return;
    }

    // Smooth interpolation toward target
    const step = (target - current) * 0.15;
    currentBlockRef.current = current + step;

    drawPixelated(currentBlockRef.current);
    animFrameRef.current = requestAnimationFrame(animate);
  }, [drawPixelated]);

  const startAnimation = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animFrameRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const handleMouseEnter = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoadedRef.current) return;

    isHoveringRef.current = true;
    targetBlockRef.current = 12; // max pixelation

    // Show canvas overlay
    canvas.style.opacity = '1';
    startAnimation();
  }, [imgRef, startAnimation]);

  const handleMouseLeave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    isHoveringRef.current = false;
    targetBlockRef.current = 1; // back to normal
    startAnimation();
  }, [startAnimation]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // Create canvas overlay
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 0.3s ease';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '10';
    canvas.style.borderRadius = '8px';
    canvasRef.current = canvas;

    const container = img.parentElement;
    if (container) {
      container.style.position = 'relative';
      container.appendChild(canvas);
    }

    // Wait for image to load before enabling
    const onLoad = () => {
      imgLoadedRef.current = true;
    };

    if (img.complete) {
      imgLoadedRef.current = true;
    } else {
      img.addEventListener('load', onLoad);
    }

    img.addEventListener('mouseenter', handleMouseEnter);
    img.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('mouseenter', handleMouseEnter);
      img.removeEventListener('mouseleave', handleMouseLeave);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      canvas.remove();
    };
  }, [imgRef, handleMouseEnter, handleMouseLeave]);
}
