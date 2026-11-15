import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [lastKey, setLastKey] = useState<{ key: string; time: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      const now = Date.now();

      // Show help modal: ?
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowHelp(prev => !prev);
        return;
      }

      // Close modal: Esc
      if (e.key === 'Escape') {
        setShowHelp(false);
        return;
      }

      // Compose: C
      if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        navigate('/compose');
        return;
      }

      // Sequential shortcuts: G then S / G then T / G then D
      if (lastKey && now - lastKey.time < 1000) {
        if (lastKey.key.toLowerCase() === 'g') {
          if (e.key.toLowerCase() === 's') {
            e.preventDefault();
            navigate('/scheduled');
            setLastKey(null);
            return;
          }
          if (e.key.toLowerCase() === 't') {
            e.preventDefault();
            navigate('/sent');
            setLastKey(null);
            return;
          }
          if (e.key.toLowerCase() === 'd') {
            e.preventDefault();
            navigate('/dashboard');
            setLastKey(null);
            return;
          }
        }
      }

      // Record this keypress
      setLastKey({ key: e.key, time: now });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, lastKey]);

  return {
    showHelp,
    setShowHelp,
  };
}
