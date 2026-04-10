import React, { useState } from 'react';
import PhysicsCanvas from './components/PhysicsCanvas';
import { Settings2, RefreshCw, Activity, Ruler, Maximize2, Shield, Globe, MousePointer2 } from 'lucide-react';
import { translations, Language } from './lib/i18n';
import { audioSynth } from './lib/audio';

export default function App() {
  const [lang, setLang] = useState<Language>('zh');
  const [whipLength, setWhipLength] = useState(30);
  const [whipThickness, setWhipThickness] = useState(8);
  const [dummyReaction, setDummyReaction] = useState(1.0);
  const [dummyEndurance, setDummyEndurance] = useState(100);
  const [attackType, setAttackType] = useState('whip');
  const [autoFollow, setAutoFollow] = useState(false);

  const t = translations[lang];

  const attackTypes = [
    { id: 'swing', name: t.swing },
    { id: 'whip', name: t.whip },
    { id: 'sweep', name: t.sweep },
    { id: 'wrap', name: t.wrap },
  ];

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar Controls */}
      <div className="w-80 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col gap-6 overflow-y-auto z-10 shadow-xl relative">
        
        {/* Language Toggle */}
        <button 
          onClick={toggleLanguage}
          className="absolute top-6 right-6 p-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Toggle Language"
        >
          <Globe size={18} />
        </button>

        <div className="pr-10">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">{t.title}</h1>
          <p className="text-sm text-zinc-400">{t.subtitle}</p>
        </div>

        <div className="space-y-6">
          {/* Attack Type */}
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2 text-zinc-300">
              <Activity size={16} />
              {t.attackStyle}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {attackTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setAttackType(type.id)}
                  className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    attackType === type.id
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-zinc-800 w-full" />

          {/* Whip Controls */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">{t.whipSettings}</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <label className="flex items-center gap-1"><Ruler size={14}/> {t.length}</label>
                <span>{whipLength}</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                value={whipLength}
                onChange={(e) => setWhipLength(Number(e.target.value))}
                className="w-full accent-red-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <label className="flex items-center gap-1"><Maximize2 size={14}/> {t.thickness}</label>
                <span>{whipThickness}</span>
              </div>
              <input
                type="range"
                min="2"
                max="20"
                value={whipThickness}
                onChange={(e) => setWhipThickness(Number(e.target.value))}
                className="w-full accent-red-500"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 cursor-pointer hover:text-white transition-colors">
                <input 
                  type="checkbox" 
                  checked={autoFollow} 
                  onChange={e => setAutoFollow(e.target.checked)} 
                  className="rounded bg-zinc-800 border-zinc-700 text-red-500 focus:ring-red-500 focus:ring-offset-zinc-900" 
                />
                <MousePointer2 size={16} />
                {t.autoFollow}
              </label>
            </div>
          </div>

          <div className="h-px bg-zinc-800 w-full" />

          {/* Dummy Controls */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">{t.dummySettings}</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <label className="flex items-center gap-1"><Settings2 size={14}/> {t.reactionLevel}</label>
                <span>{dummyReaction.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={dummyReaction}
                onChange={(e) => setDummyReaction(Number(e.target.value))}
                className="w-full accent-red-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <label className="flex items-center gap-1"><Shield size={14}/> {t.endurance}</label>
                <span>{dummyEndurance}</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={dummyEndurance}
                onChange={(e) => setDummyEndurance(Number(e.target.value))}
                className="w-full accent-red-500"
              />
            </div>
          </div>

        </div>

        <div className="mt-auto pt-6">
          <button
            onClick={() => {
              // A bit hacky, but toggling endurance forces a reset in the canvas effect
              setDummyEndurance(e => e === 100 ? 101 : 100);
            }}
            className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-3 rounded-lg text-sm font-medium transition-colors border border-zinc-700"
          >
            <RefreshCw size={16} />
            {t.healDummy}
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative">
        <PhysicsCanvas
          whipLength={whipLength}
          whipThickness={whipThickness}
          dummyReaction={dummyReaction}
          dummyEndurance={dummyEndurance}
          attackType={attackType}
          instructionsText={t.instructions}
          autoFollow={autoFollow}
        />
      </div>
    </div>
  );
}

