#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join, resolve } from 'node:path';

// A gravação vem de uma execução real. Este script apenas acrescenta voz/legendas.
const HELP = `Uso: node scripts/narrate-demos.mjs <manifesto.json> [--check]

Manifesto: { "title": "Elo", "input": "captura.mov", "output": "video.mp4",
  "tts": { "engine": "edge", "voice": "pt-BR-AntonioNeural", "rate": "-3%",
    "pitch": "-1Hz", "executable": "/caminho/venv/bin/edge-tts" },
  "segments": [{ "at": 0, "text": "Narração correspondente ao que aparece." }] }

Caminhos relativos são resolvidos a partir do manifesto. --check valida entradas
sem gerar áudio/vídeo. Não sobrescreve arquivos. Requer ffmpeg e ffprobe.
Voz padrão: neural Edge, que envia apenas as falas ao serviço online Microsoft.
Instale edge-tts num ambiente isolado; use tts.executable ou ELO_EDGE_TTS.
Para áudio já gerado, acrescente "audio": "fala.mp3" em cada segmento; o texto
continua obrigatório para as legendas. Nenhuma rede é usada nesses segmentos.
O motor antigo só é usado explicitamente: "tts": { "engine": "say" }.
Gera MP4 com voz e faixa de legendas, SRT e JSON de proveniência sem texto do chat.
`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 60000, killSignal: 'SIGKILL', maxBuffer: 4 * 1024 * 1024, ...options });
  if (result.error) throw new Error(`Não foi possível executar ${command}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${command} falhou: ${(result.stderr || result.stdout || '').slice(-2500)}`);
  return result.stdout;
}

function duration(path) {
  const value = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path]));
  if (!Number.isFinite(value) || value <= 0) throw new Error('Duração de mídia inválida.');
  return value;
}

function timestamp(seconds) {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
}

function subtitleLines(text) {
  const words = text.split(/\s+/);
  const lines = [''];
  for (const word of words) {
    const last = lines.length - 1;
    if (lines[last].length && lines[last].length + word.length + 1 > 48) lines.push(word);
    else lines[last] += `${lines[last] ? ' ' : ''}${word}`;
  }
  return lines;
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help')) { process.stdout.write(HELP); return; }
  if (args.length > 2 || (args.length === 2 && args[1] !== '--check')) throw new Error(HELP);
  const manifestPath = resolve(args[0]);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const base = dirname(manifestPath);
  const pathOf = (value) => {
    if (typeof value !== 'string' || !value.trim() || value.includes('\0')) throw new Error('Caminho inválido.');
    return isAbsolute(value) ? value : resolve(base, value);
  };
  const input = pathOf(manifest.input);
  const output = pathOf(manifest.output);
  if (input === output || extname(output).toLowerCase() !== '.mp4') throw new Error('Saída deve ser MP4 distinto da gravação.');
  const stem = output.slice(0, -4);
  const srtOutput = `${stem}.srt`;
  const metadataOutput = `${stem}.json`;
  for (const path of [output, srtOutput, metadataOutput]) {
    if (existsSync(path)) throw new Error(`Arquivo já existe: ${path}. Use um nome novo.`);
  }
  const engine = manifest.tts?.engine ?? 'edge';
  if (!['edge', 'say'].includes(engine)) throw new Error('Motor de voz inválido; use edge ou say.');
  const voice = manifest.tts?.voice ?? manifest.voice ?? (engine === 'edge' ? 'pt-BR-AntonioNeural' : 'Luciana');
  const rate = manifest.tts?.rate ?? manifest.rate ?? (engine === 'edge' ? '-3%' : 165);
  const pitch = manifest.tts?.pitch ?? '-1Hz';
  const edgeExecutable = manifest.tts?.executable ?? process.env.ELO_EDGE_TTS ?? 'edge-tts';
  if (typeof edgeExecutable !== 'string' || !edgeExecutable.trim() || edgeExecutable.includes('\0')) throw new Error('Executável Edge inválido.');
  if (typeof voice !== 'string' || !/^[\p{L}\p{N} ()_-]{1,80}$/u.test(voice)) throw new Error('Voz inválida.');
  if (engine === 'say' && (!Number.isInteger(rate) || rate < 100 || rate > 240)) throw new Error('Ritmo say deve estar entre 100 e 240 palavras/minuto.');
  if (engine === 'edge' && (typeof rate !== 'string' || !/^[+-](?:\d|[1-4]\d|50)%$/.test(rate))) throw new Error('Ritmo Edge deve estar entre -50% e +50%, com sinal.');
  if (typeof pitch !== 'string' || !/^[+-](?:\d|[1-4]\d|50)Hz$/.test(pitch)) throw new Error('Pitch deve estar entre -50Hz e +50Hz, com sinal.');
  if (!Array.isArray(manifest.segments) || !manifest.segments.length || manifest.segments.length > 100) throw new Error('Informe entre 1 e 100 falas.');
  const segments = manifest.segments.map(({ at, text, audio }) => {
    if (!Number.isFinite(at) || at < 0 || at > 3600) throw new Error('Início de fala inválido.');
    if (typeof text !== 'string' || !text.trim() || text.length > 1500 || text.includes('\0')) throw new Error('Texto de fala inválido.');
    const externalAudio = audio === undefined ? undefined : pathOf(audio);
    if (externalAudio && [output, srtOutput, metadataOutput].includes(externalAudio)) throw new Error('Áudio de entrada não pode ser uma saída.');
    return { at, text: text.trim().replace(/\s+/g, ' '), externalAudio };
  }).sort((a, b) => a.at - b.at);
  const videoDuration = duration(input);
  const synthesizes = segments.some((segment) => !segment.externalAudio);
  let engineVersion;
  if (synthesizes && engine === 'say') {
    const availableVoices = run('/usr/bin/say', ['-v', '?'], { timeout: 10000 });
    if (!availableVoices.split('\n').some((line) => line.startsWith(`${voice} `))) throw new Error(`Voz ${voice} não instalada.`);
  } else if (synthesizes) {
    if (!/^[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural$/.test(voice)) throw new Error('Informe o nome de uma voz neural Edge, como pt-BR-AntonioNeural.');
    engineVersion = run(edgeExecutable, ['--version'], { timeout: 10000 }).trim();
  }
  for (const segment of segments) if (segment.externalAudio) duration(segment.externalAudio);
  run('ffmpeg', ['-version']);
  if (args[1] === '--check') {
    process.stdout.write(`Entradas válidas: ${segments.length} falas; gravação ${videoDuration.toFixed(1)}s. Nenhuma mídia gerada.\n`);
    return;
  }
  const temporary = mkdtempSync(join(tmpdir(), 'elo-demo-'));
  const created = [];
  try {
    const captions = [];
    let previousEnd = 0;
    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index];
      const speech = join(temporary, `speech-${index}.txt`);
      if (segment.externalAudio) segment.audio = segment.externalAudio;
      else {
        segment.audio = join(temporary, `speech-${index}.${engine === 'edge' ? 'mp3' : 'aiff'}`);
        writeFileSync(speech, segment.text, { mode: 0o600 });
        if (engine === 'edge') run(edgeExecutable, ['--no-progress', '--voice', voice, `--rate=${rate}`, `--pitch=${pitch}`, '--file', speech, '--write-media', segment.audio], { timeout: 45000 });
        else run('/usr/bin/say', ['-v', voice, '-r', String(rate), '-f', speech, '-o', segment.audio], { timeout: 45000 });
      }
      segment.duration = duration(segment.audio);
      if (segment.at < previousEnd) throw new Error(`Fala ${index + 1} sobrepõe a anterior. Ajuste "at" para pelo menos ${previousEnd.toFixed(2)}.`);
      previousEnd = segment.at + segment.duration;
      const lines = subtitleLines(segment.text);
      const groups = [];
      for (let line = 0; line < lines.length; line += 2) groups.push(lines.slice(line, line + 2).join('\n'));
      for (let part = 0; part < groups.length; part++) {
        captions.push(`${captions.length + 1}\n${timestamp(segment.at + segment.duration * part / groups.length)} --> ${timestamp(segment.at + segment.duration * (part + 1) / groups.length)}\n${groups[part]}\n`);
      }
    }
    const totalDuration = Math.max(videoDuration, previousEnd + 0.5);
    if (totalDuration > 600) throw new Error('Demonstração excede dez minutos; divida por jornada.');
    const subtitles = join(temporary, 'captions.srt');
    writeFileSync(subtitles, captions.join('\n'), { mode: 0o600 });
    const command = ['-nostdin', '-hide_banner', '-loglevel', 'error', '-n', '-i', input];
    for (const segment of segments) command.push('-i', segment.audio);
    command.push('-i', subtitles);
    const filters = ['[0:v]scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,tpad=stop_mode=clone:stop_duration=600[v]'];
    segments.forEach((segment, index) => filters.push(`[${index + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${Math.round(segment.at * 1000)}:all=1[a${index}]`));
    filters.push(`${segments.map((_, index) => `[a${index}]`).join('')}amix=inputs=${segments.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,apad[a]`);
    const rendered = join(temporary, 'rendered.mp4');
    command.push('-filter_complex', filters.join(';'), '-map', '[v]', '-map', '[a]', '-map', `${segments.length + 1}:s`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '25', '-maxrate', '1600k', '-bufsize', '3200k', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', '-b:a', '96k', '-c:s', 'mov_text', '-metadata:s:s:0', 'language=por', '-disposition:s:0', 'default', '-map_metadata', '-1', '-movflags', '+faststart', '-t', String(totalDuration), rendered);
    run('ffmpeg', command, { timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
    const video = readFileSync(rendered);
    if (video.length >= 95 * 1024 * 1024) throw new Error('MP4 excede 95 MiB; reduza a duração da gravação.');
    const metadata = {
      title: String(manifest.title ?? 'Elo — demonstração').slice(0, 200),
      created_at: new Date().toISOString(),
      source: basename(input),
      source_sha256: createHash('sha256').update(readFileSync(input)).digest('hex'),
      output_sha256: createHash('sha256').update(video).digest('hex'),
      recording_seconds: videoDuration,
      output_seconds: duration(rendered),
      voice, rate, pitch, narration_segments: segments.length,
      narration: {
        engine: synthesizes ? engine : 'external', engine_version: engineVersion,
        online_service: synthesizes && engine === 'edge' ? 'Microsoft Edge online TTS' : null,
        loudness_target: '-16 LUFS; pico máximo -1.5 dBTP',
        subtitle_timing: 'Aproximado por trecho de fala',
        audio_segments: segments.map((segment) => ({ at: segment.at, duration: segment.duration, origin: segment.externalAudio ? 'external' : engine, sha256: createHash('sha256').update(readFileSync(segment.audio)).digest('hex') }))
      },
      editing: 'Captura real; áudio original removido; voz sintetizada e legendas adicionadas; último quadro estendido somente se necessário.',
      content_review: 'Revisão humana de privacidade e correspondência das falas ainda necessária.'
    };
    mkdirSync(dirname(output), { recursive: true });
    for (const [path, content] of [[output, video], [srtOutput, captions.join('\n')], [metadataOutput, `${JSON.stringify(metadata, null, 2)}\n`]]) {
      writeFileSync(path, content, { flag: 'wx', mode: 0o644 });
      created.push(path);
    }
    process.stdout.write(`Gerados: ${basename(output)}, legendas e proveniência. ${(video.length / 1024 / 1024).toFixed(1)} MiB; ${totalDuration.toFixed(1)}s. Revise antes de publicar.\n`);
  } catch (error) {
    for (const path of created) rmSync(path, { force: true });
    throw error;
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
