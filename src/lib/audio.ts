export class AudioSynth {
  private ctx: AudioContext | null = null;
  private whipBuffers: AudioBuffer[] = [];
  private bufferArrays: ArrayBuffer[] = [];
  private lastCrackTime: number = 0;

  constructor() {
    this.preloadSounds();
  }

  async preloadSounds() {
    const files = ['/whip.wav'];
    for (const file of files) {
      try {
        const response = await fetch(file);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          this.bufferArrays.push(arrayBuffer);
        }
      } catch (e) {
        // Ignore
      }
    }
  }

  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      for (const arrayBuffer of this.bufferArrays) {
        try {
          const bufferCopy = arrayBuffer.slice(0);
          const audioBuffer = await this.ctx.decodeAudioData(bufferCopy);
          this.whipBuffers.push(audioBuffer);
        } catch (e) {
          console.error("Failed to decode audio", e);
        }
      }
      this.bufferArrays = [];
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
