import React, { useEffect, useRef } from 'react';

interface FireworksBackgroundProps {
  color?: string;
  className?: string;
  density?: number; // number of particles per burst
  intervalMs?: number; // time between bursts
}

// Lightweight canvas fireworks (no external lib) for login background
const FireworksBackground: React.FC<FireworksBackgroundProps> = ({ color = 'white', className='', density=24, intervalMs=1600 }) => {
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  const animRef = useRef<number | null>(null);
  const particlesRef = useRef<any[]>([]);
  const lastBurstRef = useRef<number>(0);

  useEffect(()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if(!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const burst = () => {
      const w = canvas.width, h = canvas.height;
      const cx = Math.random() * w * 0.8 + w*0.1;
      const cy = Math.random() * h * 0.5 + h*0.1;
      for(let i=0;i<density;i++){
        const angle = (Math.PI * 2 * i)/density + Math.random()*0.3;
        const speed =  (Math.random()*2 + 1.3);
        particlesRef.current.push({
          x: cx,
          y: cy,
            vx: Math.cos(angle)*speed,
            vy: Math.sin(angle)*speed,
            life: 60 + Math.random()*20,
            maxLife: 60 + Math.random()*20,
            hue: Math.floor(Math.random()*30) + (color === 'white'? 200: 330)
        });
      }
    };

    const step = (t: number) => {
      if(!lastBurstRef.current) lastBurstRef.current = t;
      if(t - lastBurstRef.current > intervalMs){
        burst();
        lastBurstRef.current = t;
      }
      ctx.clearRect(0,0,canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      for(const p of particlesRef.current){
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.015; // gravity
        p.life -= 1;
        const alpha = Math.max(p.life / p.maxLife, 0);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 85%, 60%, ${alpha})`;
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI*2);
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return ()=> {
      window.removeEventListener('resize', resize);
      if(animRef.current) cancelAnimationFrame(animRef.current);
    };
  },[color, density, intervalMs]);

  return <canvas ref={canvasRef} className={className} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} aria-hidden="true" />;
};

export default FireworksBackground;
