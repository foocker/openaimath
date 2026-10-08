"""Freeze Chinese narration and exact sentence timings; not needed at site build time.

Requires edge-tts and ffmpeg/ffprobe. Existing sentence audio is reused.
"""
import asyncio
import hashlib
import json
from pathlib import Path
import subprocess

import edge_tts

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / ".cache" / "speech"
CACHE.mkdir(parents=True, exist_ok=True)
(ROOT / "assets").mkdir(exist_ok=True)
content = json.loads((ROOT / "content.json").read_text(encoding="utf-8"))


def duration(path):
    return float(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(path)
    ], text=True).strip())


async def main():
    tasks = []
    semaphore = asyncio.Semaphore(3)

    async def voice(sentence):
        key = hashlib.sha256((content["voice"] + content["rate"] + sentence["text"]).encode()).hexdigest()[:16]
        audio = CACHE / (key + ".mp3")
        async with semaphore:
            if not audio.exists() or audio.stat().st_size == 0:
                await edge_tts.Communicate(sentence["text"], content["voice"], rate=content["rate"]).save(str(audio))
        return audio

    for chapter in content["chapters"]:
        tasks.extend(voice(sentence) for sentence in chapter["sentences"])
    files = iter(await asyncio.gather(*tasks))
    time = 0
    cues, chapters, wavefiles = [], [], []
    for chapter_index, chapter in enumerate(content["chapters"]):
        start = time
        for sentence_index, sentence in enumerate(chapter["sentences"]):
            audio = next(files)
            # Short breath after sentences, longer breath at chapter boundaries.
            gap = 0.65 if sentence_index == len(chapter["sentences"]) - 1 else 0.18
            if chapter_index == len(content["chapters"]) - 1 and sentence_index == len(chapter["sentences"]) - 1:
                gap = 1.4
            wav = CACHE / f"part-{len(cues):02d}.wav"
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(audio),
                            "-af", f"apad=pad_dur={gap}", "-ar", "24000", "-ac", "1", str(wav)], check=True)
            length = duration(wav)
            cues.append({"start": round(time, 3), "end": round(time + length, 3), "text": sentence["caption"], "chapter": chapter_index})
            time += length
            wavefiles.append(wav)
        chapters.append({"start": round(start, 3), "end": round(time, 3), "title": chapter["title"], "short": chapter["short"]})
    concat = CACHE / "concat.txt"
    concat.write_text("".join(f"file '{p.as_posix()}'\n" for p in wavefiles), encoding="utf-8")
    output = ROOT / "assets" / "narration.mp3"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
                    "-af", "loudnorm=I=-18:TP=-2:LRA=7", "-c:a", "libmp3lame", "-b:a", "96k", str(output)], check=True)
    timing = {"duration": round(time, 3), "voice": content["voice"], "chapters": chapters, "cues": cues}
    (ROOT / "timing.json").write_text(json.dumps(timing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"duration": time, "audioDuration": duration(output), "chapters": chapters}, ensure_ascii=True, indent=2))


asyncio.run(main())
