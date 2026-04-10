import whipSoundUrl from '../assets/whip.wav';

export class AudioSynth {
  private ctx: AudioContext | null = null;
  private whipBuffers: AudioBuffer[] = [];
  private pendingBuffers: ArrayBuffer[] = [];
  private lastCrackTime: number = 0;

  constructor() {
    this.preloadSounds();
  }

  async preloadSounds() {
    const files = [whipSoundUrl];
    for (const file of files) {
      try {
        const response = await fetch(file);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          // If context already exists (user clicked fast), decode immediately
          if (this.ctx) {
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.whipBuffers.push(audioBuffer);
          } else {
            // Otherwise store it until init() is called
            this.pendingBuffers.push(arrayBuffer);
          }
        }
      } catch (e) {
        console.error("Failed to fetch audio file:", file, e);
      }
    }
  }

  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Decode any buffers that finished fetching before init was called
      for (const arrayBuffer of this.pendingBuffers) {
        try {
          const bufferCopy = arrayBuffer.slice(0);
          const audioBuffer = await this.ctx.decodeAudioData(bufferCopy);
          this.whipBuffers.push(audioBuffer);
        } catch (e) {
          console.error("Failed to decode audio", e);
        }
      }
      this.pendingBuffers = [];
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playWhipCrack(speed: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    // Prevent overlapping (cooldown of 150ms)
    if (t - this.lastCrackTime < 0.15) return;
    this.lastCrackTime = t;

    if (this.whipBuffers.length > 0) {
      const buffer = this.whipBuffers[Math.floor(Math.random() * this.whipBuffers.length)];
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const gainNode = this.ctx.createGain();
      // Adjust volume based on speed, but keep it audible
      gainNode.gain.value = Math.min(speed + 0.2, 1.5);
      source.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      source.start(t);
    }
  }
}

export const audioSynth = new AudioSynth();
