import React, { useEffect, useRef, useState } from 'react';
import { WhipPhysics, Particle } from '../lib/physics';
import { audioSynth } from '../lib/audio';

interface PhysicsCanvasProps {
  whipLength: number;
  whipThickness: number;
  dummyReaction: number;
  dummyEndurance: number;
  attackType: string;
  instructionsText: string;
  autoFollow: boolean;
}

export default function PhysicsCanvas({
  whipLength,
  whipThickness,
  dummyReaction,
  dummyEndurance,
  attackType,
  instructionsText,
  autoFollow
}: PhysicsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const whipRef = useRef<WhipPhysics>(new WhipPhysics(whipLength, 0, 0));
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, isDown: false });
  const dummyRef = useRef({ x: 0, y: 0, width: 60, height: 130, health: dummyEndurance, maxHealth: dummyEndurance, swingAngle: 0, swingVelocity: 0 });
  const lastTimeRef = useRef(0);

  // Re-init whip if length changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    whipRef.current.init(whipLength, mouseRef.current.x || canvas.width / 2, mouseRef.current.y || canvas.height / 2);
  }, [whipLength]);

  useEffect(() => {
    dummyRef.current.maxHealth = dummyEndurance;
    dummyRef.current.health = dummyEndurance;
  }, [dummyEndurance]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler
    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
      dummyRef.current.x = canvas.width / 2;
      dummyRef.current.y = canvas.height / 2 + 100; // Bottom center anchored
      
      // Initialize mouse position to center if it's 0,0
      if (mouseRef.current.x === 0 && mouseRef.current.y === 0) {
        mouseRef.current.x = canvas.width / 2;
        mouseRef.current.y = canvas.height / 2;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Mouse handlers
    const updateMouse = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      let clientX, clientY;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      const newX = clientX - rect.left;
      const newY = clientY - rect.top;
      
      mouseRef.current.vx = newX - mouseRef.current.x;
      mouseRef.current.vy = newY - mouseRef.current.y;
      mouseRef.current.x = newX;
      mouseRef.current.y = newY;
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      mouseRef.current.isDown = true;
      audioSynth.init();
      updateMouse(e);
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (mouseRef.current.isDown || autoFollow) {
        updateMouse(e);
      }
    };
    const onUp = () => {
      mouseRef.current.isDown = false;
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);

    // Animation loop
    let animationFrameId: number;

    const spawnParticles = (x: number, y: number, speed: number) => {
      const count = Math.min(Math.floor(speed * 2), 30);
      for (let i = 0; i < count; i++) {
        const type = Math.random() > 0.7 ? (Math.random() > 0.5 ? 'star' : 'lightning') : 'blood';
        particlesRef.current.push({
          x, y,
          vx: (Math.random() - 0.5) * speed * 0.5,
          vy: (Math.random() - 0.5) * speed * 0.5 - 2,
          life: 1,
          maxLife: Math.random() * 0.5 + 0.5,
          color: type === 'blood' ? `hsl(0, 100%, ${Math.random() * 30 + 20}%)` : (type === 'star' ? 'gold' : '#00ffff'),
          type,
          size: Math.random() * 4 + 2
        });
      }
    };

    const render = (time: number) => {
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for(let i=0; i<canvas.width; i+=50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      }
      for(let i=0; i<canvas.height; i+=50) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
      }

      const whip = whipRef.current;
      const dummy = dummyRef.current;

      // Update physics
      if (mouseRef.current.isDown || autoFollow) {
        whip.update(mouseRef.current.x, mouseRef.current.y, attackType);
      } else {
        // If not dragging, let it fall naturally from its current first point
         whip.update(whip.points[0].x, whip.points[0].y, attackType);
      }

      // Dummy physics (spring)
      dummy.swingVelocity -= dummy.swingAngle * 0.1; // Spring back to center
      dummy.swingVelocity *= 0.9; // Damping
      dummy.swingAngle += dummy.swingVelocity;

      // Collision detection
      let hit = false;
      let hitSpeed = 0;
      let hitX = 0, hitY = 0;

      // Calculate dummy transform for collision
      const dummyTopX = dummy.x + Math.sin(dummy.swingAngle) * dummy.height;
      const dummyTopY = dummy.y - Math.cos(dummy.swingAngle) * dummy.height;

      for (let i = 1; i < whip.points.length; i++) {
        const p = whip.points[i];
        const vx = p.x - p.oldx;
        const vy = p.y - p.oldy;
        const speed = Math.sqrt(vx * vx + vy * vy);

        // Simple bounding box collision around the dummy line
        // Distance from point to line segment
        const l2 = dummy.height * dummy.height;
        let t = ((p.x - dummy.x) * (dummyTopX - dummy.x) + (p.y - dummy.y) * (dummyTopY - dummy.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projX = dummy.x + t * (dummyTopX - dummy.x);
        const projY = dummy.y + t * (dummyTopY - dummy.y);
        const dist = Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);

        if (dist < dummy.width / 2 + whipThickness && speed > 5) {
          hit = true;
          hitSpeed = speed;
          hitX = p.x;
          hitY = p.y;
          
          // Apply force to dummy
          dummy.swingVelocity += (vx * 0.005 * dummyReaction);
          
          // Apply reaction to whip
          p.x = p.oldx - vx * 0.5;
          p.y = p.oldy - vy * 0.5;
          
          break; // Only register one hit per frame
        }
      }

      if (hit && hitSpeed > 10) {
        const normalizedSpeed = Math.min(hitSpeed / 50, 1);
        audioSynth.playWhipCrack(normalizedSpeed);

        spawnParticles(hitX, hitY, hitSpeed);
        
        dummy.health -= hitSpeed * 0.1;
        if (dummy.health < 0) dummy.health = 0;
      }

      // Draw Dummy
      ctx.save();
      ctx.translate(dummy.x, dummy.y);
      ctx.rotate(dummy.swingAngle);
      
      const healthPercent = dummy.health / dummy.maxHealth;
      const flail = dummy.swingVelocity * 3;
      const dummyColor = `rgb(${255 - healthPercent * 100}, ${healthPercent * 150 + 50}, 50)`;

      // Stand
      ctx.fillStyle = '#222';
      ctx.fillRect(-30, 0, 60, 10);
      ctx.fillRect(-5, -20, 10, 20); // Pole

      // Torso
      const torsoWidth = 36;
      const torsoHeight = 70;
      const headRadius = 22;
      const pivotY = -20; // Where torso connects to pole

      ctx.fillStyle = dummyColor;
      ctx.beginPath();
      ctx.roundRect(-torsoWidth/2, pivotY - torsoHeight, torsoWidth, torsoHeight, 12);
      ctx.fill();

      // Head
      ctx.beginPath();
      ctx.arc(0, pivotY - torsoHeight - headRadius, headRadius, 0, Math.PI * 2);
      ctx.fill();

      // Face
      ctx.strokeStyle = '#111';
      ctx.fillStyle = '#111';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const faceY = pivotY - torsoHeight - headRadius;
      if (hit) {
        // X eyes
        ctx.moveTo(-10, faceY - 6); ctx.lineTo(-2, faceY + 2);
        ctx.moveTo(-2, faceY - 6); ctx.lineTo(-10, faceY + 2);
        ctx.moveTo(2, faceY - 6); ctx.lineTo(10, faceY + 2);
        ctx.moveTo(10, faceY - 6); ctx.lineTo(2, faceY + 2);
        ctx.stroke();
        // O mouth
        ctx.beginPath();
        ctx.arc(0, faceY + 10, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Normal eyes
        ctx.arc(-6, faceY - 2, 3, 0, Math.PI * 2);
        ctx.arc(6, faceY - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        // Normal mouth
        ctx.beginPath();
        ctx.arc(0, faceY + 6, 6, 0, Math.PI);
        ctx.fill();
      }

      // Arms
      ctx.strokeStyle = dummyColor;
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      
      // Left Arm
      ctx.save();
      ctx.translate(-torsoWidth/2 + 4, pivotY - torsoHeight + 10);
      ctx.rotate(Math.PI / 4 + flail);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0, 45); ctx.stroke();
      ctx.restore();

      // Right Arm
      ctx.save();
      ctx.translate(torsoWidth/2 - 4, pivotY - torsoHeight + 10);
      ctx.rotate(-Math.PI / 4 + flail);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0, 45); ctx.stroke();
      ctx.restore();

      // Legs
      // Left Leg
      ctx.save();
      ctx.translate(-10, pivotY - 5);
      ctx.rotate(Math.PI / 8 - flail * 0.5);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0, 50); ctx.stroke();
      ctx.restore();

      // Right Leg
      ctx.save();
      ctx.translate(10, pivotY - 5);
      ctx.rotate(-Math.PI / 8 - flail * 0.5);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0, 50); ctx.stroke();
      ctx.restore();

      ctx.restore();

      // Draw Whip
      if (whip.points.length > 3) {
        // Handle
        ctx.beginPath();
        ctx.moveTo(whip.points[0].x, whip.points[0].y);
        for (let i = 1; i <= 3; i++) {
          ctx.lineTo(whip.points[i].x, whip.points[i].y);
        }
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = whipThickness + 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Whip Body
        for (let i = 4; i < whip.points.length; i++) {
          ctx.beginPath();
          ctx.moveTo(whip.points[i-1].x, whip.points[i-1].y);
          ctx.lineTo(whip.points[i].x, whip.points[i].y);
          ctx.lineWidth = Math.max(1, whipThickness * (1 - i / whip.points.length));
          ctx.strokeStyle = '#5c2e0e';
          ctx.stroke();
        }

        // Cracker (tip)
        const last = whip.points[whip.points.length - 1];
        const prev = whip.points[whip.points.length - 2];
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(last.x + (last.x - prev.x) * 0.8, last.y + (last.y - prev.y) * 0.8);
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // gravity
        p.life -= dt;

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        
        if (p.type === 'blood') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'star') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(time * 0.01);
          ctx.beginPath();
          for(let j=0; j<5; j++) {
            ctx.lineTo(Math.cos(j*Math.PI*2/5)*p.size, Math.sin(j*Math.PI*2/5)*p.size);
            ctx.lineTo(Math.cos((j+0.5)*Math.PI*2/5)*p.size/2, Math.sin((j+0.5)*Math.PI*2/5)*p.size/2);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (p.type === 'lightning') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + (Math.random()-0.5)*20, p.y + (Math.random()-0.5)*20);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [whipThickness, dummyReaction, attackType, autoFollow]);

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full bg-zinc-950 cursor-crosshair touch-none"
      />
      {/* Instructions Overlay */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none text-center">
        <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 px-4 py-2 rounded-full shadow-lg">
          <p className="text-sm text-zinc-300 font-medium tracking-wide">
            {instructionsText}
          </p>
        </div>
      </div>
    </div>
  );
}
