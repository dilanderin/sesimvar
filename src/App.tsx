import { useEffect, useState } from 'react';
import { Board } from './components/Board';
import { Settings } from './components/Settings';
import { Stage } from './components/Stage';
import { setSpeechRate, setVoicePack } from './lib/speech';
import { useAppState, type ThemeChoice } from './lib/store';
import { DAY, NIGHT, type Theme } from './lib/theme';

/** Day from 07:00 to 19:30, night otherwise. */
export function isDaytime(d = new Date()) {
  const minutes = d.getHours() * 60 + d.getMinutes();
  return minutes >= 7 * 60 && minutes < 19 * 60 + 30;
}

function useTheme(choice: ThemeChoice): Theme {
  const [day, setDay] = useState(isDaytime);
  useEffect(() => {
    if (choice !== 'auto') return;
    const id = setInterval(() => setDay(isDaytime()), 60_000);
    return () => clearInterval(id);
  }, [choice]);
  if (choice === 'day') return DAY;
  if (choice === 'night') return NIGHT;
  return day ? DAY : NIGHT;
}

export default function App() {
  const { settings } = useAppState();
  const theme = useTheme(settings.theme);
  useEffect(() => setSpeechRate(settings.speechRate), [settings.speechRate]);
  useEffect(() => setVoicePack(settings.voicePack ?? null), [settings.voicePack]);
  const [screen, setScreen] = useState<'board' | 'settings'>(() => (location.hash === '#ayarlar' ? 'settings' : 'board'));

  useEffect(() => {
    document.documentElement.style.background = screen === 'settings' ? '#FFF4EC' : theme.bg;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', screen === 'settings' ? '#FFF4EC' : theme.bg);
  }, [screen, theme.bg]);

  return (
    <Stage background={screen === 'settings' ? '#FFF4EC' : theme.bg}>
      {screen === 'board' ? (
        <Board theme={theme} onOpenSettings={() => setScreen('settings')} />
      ) : (
        <Settings onClose={() => setScreen('board')} />
      )}
    </Stage>
  );
}
