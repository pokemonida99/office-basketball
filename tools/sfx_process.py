#!/usr/bin/env python3
"""把 ElevenLabs 下載的音效（work/sfx/raw/*.wav）裁切、統一音量、壓成 audio/sfx/*.m4a。
單發音效：裁掉前面的空白和後面的尾音、轉單聲道、收尾淡出。
環境音：頭尾交叉淡化成無縫循環，檔案前後各多放 PAD 秒，播放時 loop 區間取中間那段（見 js/fx.js）。
用法：python3 tools/sfx_process.py   （用 macOS 內建的 afconvert 壓縮）"""
import os, subprocess, tempfile, wave
import numpy as np

RAW, OUT = 'work/sfx/raw', 'audio/sfx'
SR, PAD = 44100, 0.25
# 名稱：最長秒數
ONE = dict(dribble1=.45, dribble2=.45, swish1=.7, swish2=.7, squeak=.5, rim=1.0, board=.7, dunk=1.4,
           block=.4, catch=.35, whistle=1.2, cheer=3.4, groan=1.6, **{'pass': .5})
LOOP = ['amb_crowd', 'amb_roof', 'amb_temple']


def read(name):
    w = wave.open(f'{RAW}/{name}.wav')
    x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768
    x = x.reshape(-1, w.getnchannels()).mean(axis=1)
    n = int(len(x) * SR / w.getframerate())
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x)


def encode(name, x):
    with tempfile.TemporaryDirectory() as d:
        p = f'{d}/a.wav'
        w = wave.open(p, 'wb')
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()); w.close()
        subprocess.run(['afconvert', p, f'{OUT}/{name}.m4a', '-f', 'm4af', '-d', 'aac', '-b', '64000'], check=True)
    return os.path.getsize(f'{OUT}/{name}.m4a')


def one(name, maxlen):
    x = read(name); peak = np.abs(x).max()
    on = np.argmax(np.abs(x) > peak * .03)                 # 開頭：第一個超過峰值 3% 的點，往前留 3 毫秒
    x = x[max(0, on - int(.003 * SR)):]
    win = int(.02 * SR)                                    # 結尾：最後一段超過峰值 0.3% 的位置
    e = np.convolve(np.abs(x), np.ones(win) / win, 'same')
    end = len(x) - np.argmax(e[::-1] > peak * .003)
    x = x[:min(end, int(maxlen * SR))] / peak * .89
    fade = min(int(.06 * SR), len(x) // 3)
    x[-fade:] *= np.linspace(1, 0, fade) ** 2
    return x


def loop(name, cross=1.0):
    x = read(name); n, L = int(cross * SR), len(read(name)) - int(cross * SR)
    t = np.linspace(0, np.pi / 2, n)
    y = x[:L].copy(); y[:n] = x[:n] * np.sin(t) + x[L:L + n] * np.cos(t)   # 尾巴疊回開頭，接縫就不見了
    y = y / np.sqrt((y ** 2).mean()) * .1
    p = int(PAD * SR)
    print(f'  {name} 循環長度 {L / SR:.3f} 秒')
    return np.concatenate([y[-p:], y, y[:p]])


os.makedirs(OUT, exist_ok=True)
total = 0
for k, m in ONE.items():
    x = one(k, m); s = encode(k, x); total += s
    print(f'{k:9} {len(x) / SR:4.2f}s {s / 1024:5.1f}KB')
for k in LOOP:
    x = loop(k); s = encode(k, x); total += s
    print(f'{k:9} {len(x) / SR:4.2f}s {s / 1024:5.1f}KB')
print(f'合計 {total / 1024:.0f}KB')
