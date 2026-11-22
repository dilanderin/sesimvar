#!/usr/bin/env python3
"""Record the prerecorded voice for Sesim Var.

    npx tsx scripts/voice-texts.ts > /tmp/texts.json
    python3 scripts/make-voice.py /tmp/texts.json

Needs `pip install edge-tts` and ffmpeg. Only missing clips are recorded, so
adding a word records just that word. Writes public/voice/<pack>/*.mp3 and
src/lib/voice-clips.json (the list the app checks before using a clip).
"""
import asyncio, json, os, subprocess, sys, tempfile

import edge_tts

PACKS = {
    # Microsoft's Turkish male neural voice, pitched up and a touch
    # quicker to sound like a young man (about 20).
    'ahmet': dict(voice='tr-TR-AhmetNeural', pitch='+16Hz', rate='+6%'),
}

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROXY = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')


async def record(pack, cfg, item, sem):
    out = os.path.join(ROOT, 'public', 'voice', pack, item['file'] + '.mp3')
    if os.path.exists(out):
        return
    async with sem:
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp:
            raw = tmp.name
        for attempt in range(4):
            try:
                await edge_tts.Communicate(item['text'], cfg['voice'], pitch=cfg['pitch'], rate=cfg['rate'], proxy=PROXY).save(raw)
                break
            except Exception as e:  # network hiccup: retry
                if attempt == 3:
                    raise
                await asyncio.sleep(2 * (attempt + 1))
        # Trim the silence before and after, so a sentence read word by word flows.
        trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,' \
               'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse'
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', raw, '-af', trim, '-ac', '1', '-ar', '24000',
                        '-b:a', '40k', out], check=True)
        os.unlink(raw)
        print('recorded', pack, item['text'])


async def main(path):
    items = json.load(open(path))
    sem = asyncio.Semaphore(6)
    manifest = {}
    for pack, cfg in PACKS.items():
        os.makedirs(os.path.join(ROOT, 'public', 'voice', pack), exist_ok=True)
        await asyncio.gather(*(record(pack, cfg, i, sem) for i in items))
        manifest[pack] = sorted(i['key'] for i in items)
        # Clips for words that were removed are deleted too.
        keep = {i['file'] + '.mp3' for i in items}
        for f in os.listdir(os.path.join(ROOT, 'public', 'voice', pack)):
            if f not in keep:
                os.unlink(os.path.join(ROOT, 'public', 'voice', pack, f))
    with open(os.path.join(ROOT, 'src', 'lib', 'voice-clips.json'), 'w') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=0)
        f.write('\n')


if __name__ == '__main__':
    asyncio.run(main(sys.argv[1]))
