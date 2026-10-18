#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HELP = `Uso: node scripts/assemble-story-demos.mjs <plano.json> [--check]

Plano: { "title": "Elo — uma história de uso", "client": "ChatGPT",
  "output": "01-historia.mp4", "capture_complete": true,
  "opening": { "headline": "Um problema concreto", "body": "O resultado desejado." },
  "clips": [{ "directory": "/tmp/captura", "first": "000000.png", "last": "000090.png",
    "seconds": 14, "crop": { "x": 0, "y": 80, "width": 1100, "height": 600 },
    "label": "O pedido no chat · Espera encurtada" }],
  "closing": { "headline": "Benefício observado", "body": "O que muda na próxima vez.", "seconds": 5 },
  "tts": { "engine": "edge", "executable": "/tmp/elo-demo-voice/bin/edge-tts",
    "voice": "pt-BR-AntonioNeural", "rate": "-3%", "pitch": "-1Hz" },
  "segments": [{ "at": 0, "text": "Problema, pedido e resultado." }] }

Gravações são sequências reais de screenshots: frames.json [{file,timestamp}],
com timestamps em segundos, e capture.json {kind,began,ended,frames}.
Sem capture.json, informe source_kind no clip (por exemplo, screencast CDP real).
Um único quadro pode ser mantido por seconds; indique isso no label.
Máscaras opcionais: masks:[{x,y,width,height,reason}], em pixels da imagem original.
Cartão inicial: 6s; encerramento: 3–8s. Duração final: 35–150s.
--check valida fontes/recortes sem produzir vídeo ou chamar TTS.
Só renderize com capture_complete:true depois de conferir o resultado filmado.
Requer ffmpeg, ffprobe, Python3/Pillow e o compositor narrate-demos.mjs.
Não grava navegador, não fabrica interface e não sobrescreve saídas.
`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 120000, killSignal: 'SIGKILL', maxBuffer: 4 * 1024 * 1024, ...options });
  if (result.error || result.status !== 0) throw new Error(`${command} falhou: ${result.error?.message ?? (result.stderr || result.stdout || '').slice(-2200)}`);
  return result.stdout;
}
const hash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const string = (value, max = 160) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x1f]/.test(value)) throw new Error('Texto editorial inválido.');
  return value.trim();
};
function rectangle(value) {
  if (!value || !['x', 'y', 'width', 'height'].every((key) => Number.isInteger(value[key]) && value[key] >= (['width', 'height'].includes(key) ? 2 : 0))) throw new Error('Recorte ou máscara inválida.');
  return { x: value.x, y: value.y, width: value.width, height: value.height };
}
function within(rect, size) {
  if (rect.x + rect.width > size.width || rect.y + rect.height > size.height) throw new Error('Recorte/máscara ultrapassa a imagem original.');
}
function mediaSize(path) {
  const parsed = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', path], { timeout: 15000 }));
  const size = parsed.streams?.[0];
  if (!size?.width || !size?.height) throw new Error('Imagem de origem inválida.');
  return size;
}
const concatPath = (path) => `'${path.replaceAll("'", "'\\''")}'`;
const ffmpeg = (args) => run('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-n', ...args]);
const videoEncoding = ['-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p'];

// Somente tipografia editorial. Nenhuma resposta ou tela de produto é desenhada.
const DRAW = `import json,sys
from PIL import Image,ImageDraw,ImageFont
c=json.load(open(sys.argv[1])); im=Image.new('RGBA',(1280,720),(16,16,22,255) if c['card'] else (0,0,0,0));d=ImageDraw.Draw(im)
font=lambda size:ImageFont.truetype(c['font'],size)
def wrap(text,size,width):
 lines=['']
 for word in text.split():
  trial=(lines[-1]+' '+word).strip()
  if d.textbbox((0,0),trial,font=font(size))[2]>width and lines[-1]:lines.append(word)
  else:lines[-1]=trial
 return lines
if c['card']:
 d.text((64,72),c['eyebrow'],font=font(20),fill='#b9d3ff')
 headline=wrap(c['headline'],55,1152)
 if len(headline)>3:raise ValueError('Título do cartão ocupa mais de três linhas')
 for i,line in enumerate(headline):d.text((64,205+i*66),line,font=font(55),fill='white')
 body=wrap(c['body'],27,1152)
 if len(body)>3:raise ValueError('Texto do cartão ocupa mais de três linhas')
 for i,line in enumerate(body):d.text((64,455+i*39),line,font=font(27),fill='#bcc3d1')
 d.text((64,643),c['footer'],font=font(19),fill='#8e99ac')
else:
 d.text((64,46),c['title'],font=font(31),fill='white')
 d.text((64,101),c['subtitle'],font=font(20),fill='#b9c2d0')
 d.text((64,646),c['label'],font=font(20),fill='#9dc6ff')
im.save(sys.argv[2])
`;

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help')) { process.stdout.write(HELP); return; }
  if (args.length > 2 || (args.length === 2 && args[1] !== '--check')) throw new Error(HELP);
  const planPath = resolve(args[0]), base = dirname(planPath), plan = JSON.parse(readFileSync(planPath, 'utf8'));
  const pathOf = (value) => {
    if (typeof value !== 'string' || !value.trim() || value.includes('\0')) throw new Error('Caminho inválido.');
    return isAbsolute(value) ? value : resolve(base, value);
  };
  const output = pathOf(plan.output), stem = output.slice(0, -4);
  if (!output.toLowerCase().endsWith('.mp4')) throw new Error('A saída deve ser MP4.');
  for (const path of [output, `${stem}.srt`, `${stem}.json`]) if (existsSync(path)) throw new Error(`Arquivo já existe: ${path}. Use um nome novo.`);
  const title = string(plan.title, 85), client = string(plan.client ?? 'ChatGPT', 35);
  const scenario = string(plan.scenario ?? 'Cenário fictício', 100);
  const opening = { headline: string(plan.opening?.headline, 150), body: string(plan.opening?.body, 200), seconds: 6 };
  const closing = { headline: string(plan.closing?.headline, 150), body: string(plan.closing?.body, 200), seconds: plan.closing?.seconds ?? 5 };
  if (!Number.isFinite(closing.seconds) || closing.seconds < 3 || closing.seconds > 8) throw new Error('Encerramento deve durar de 3 a 8 segundos.');
  if (!Array.isArray(plan.clips) || !plan.clips.length || plan.clips.length > 16) throw new Error('Informe de 1 a 16 trechos reais.');
  if (!Array.isArray(plan.segments) || !plan.segments.length) throw new Error('Faltam os trechos de narração.');
  const font = plan.font ? pathOf(plan.font) : ['/System/Library/Fonts/Supplemental/Arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'].find(existsSync);
  if (!font || !existsSync(font)) throw new Error('Fonte de texto não encontrada; informe font no plano.');
  const clips = plan.clips.map((clip) => {
    const directory = pathOf(clip.directory), framesPath = join(directory, 'frames.json'), rows = JSON.parse(readFileSync(framesPath, 'utf8'));
    if (!Array.isArray(rows) || !rows.length || rows.length > 10000) throw new Error('Inventário de capturas inválido.');
    let previous = -Infinity;
    for (const row of rows) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,120}\.(?:png|jpe?g)$/i.test(row.file) || !Number.isFinite(row.timestamp) || row.timestamp < previous) throw new Error('Quadro/timestamp de captura inválido.');
      previous = row.timestamp;
    }
    const start = clip.first === undefined ? 0 : rows.findIndex((row) => row.file === clip.first);
    const end = clip.last === undefined ? rows.length - 1 : rows.findIndex((row) => row.file === clip.last);
    if (start < 0 || end < start) throw new Error('Intervalo de quadros não encontrado.');
    const selected = rows.slice(start, end + 1);
    if (selected.length > 5000) throw new Error('Trecho tem mais de 5000 quadros; escolha um recorte menor.');
    if (!Number.isFinite(clip.seconds) || clip.seconds < 1 || clip.seconds > 120) throw new Error('Duração do trecho inválida.');
    const label = string(clip.label, 95), crop = rectangle(clip.crop), size = mediaSize(join(directory, selected[0].file));
    within(crop, size);
    const masks = (clip.masks ?? []).map((mask) => { const rect = rectangle(mask); within(rect, size); return { ...rect, reason: string(mask.reason, 160) }; });
    if (masks.length > 20) throw new Error('Máscaras demais no trecho.');
    const metadataPath = join(directory, 'capture.json'), metadata = existsSync(metadataPath) ? JSON.parse(readFileSync(metadataPath, 'utf8')) : {};
    const kind = string(metadata.kind ?? clip.source_kind, 100);
    const frames = selected.map((row) => ({ file: row.file, timestamp: row.timestamp, sha256: hash(join(directory, row.file)) }));
    return { directory, seconds: clip.seconds, label, crop, masks, frames, source_kind: kind, source_manifest_sha256: hash(framesPath), capture_metadata: { kind, began: metadata.began ?? null, ended: metadata.ended ?? null, frames: metadata.frames ?? rows.length } };
  });
  const totalSeconds = opening.seconds + closing.seconds + clips.reduce((sum, clip) => sum + clip.seconds, 0);
  if (totalSeconds < 35 || totalSeconds > 150) throw new Error(`Duração ${totalSeconds}s fora do intervalo 35–150s.`);
  run('ffmpeg', ['-version'], { timeout: 10000 });
  run('python3', ['-c', 'import PIL'], { timeout: 10000 });
  if (args[1] === '--check') { process.stdout.write(`Plano válido: ${clips.length} trechos, ${totalSeconds}s. Nenhum vídeo ou áudio gerado. Captura concluída: ${plan.capture_complete === true ? 'sim' : 'a conferir'}.\n`); return; }
  if (plan.capture_complete !== true) throw new Error('Confira o resultado filmado antes de renderizar e registre capture_complete:true no plano.');
  const temporary = mkdtempSync(join(tmpdir(), 'elo-story-')), created = [];
  try {
    const picture = (name, config) => {
      const configPath = join(temporary, `${name}.json`), path = join(temporary, `${name}.png`);
      writeFileSync(configPath, JSON.stringify({ ...config, font }), { mode: 0o600 });
      run('python3', ['-c', DRAW, configPath, path], { timeout: 15000 });
      return path;
    };
    const parts = [], provenance = { format: 'Real captured screenshot sequences with editorial opening and closing cards', client, scenario, opening, closing, clips: [] };
    const card = (name, config, seconds, footer) => {
      const png = picture(name, { card: true, eyebrow: 'Uma história de uso do Elo', ...config, footer });
      const mp4 = join(temporary, `${name}.mp4`);
      ffmpeg(['-loop', '1', '-i', png, '-t', String(seconds), '-r', '30', ...videoEncoding, mp4]);
      parts.push(mp4);
      return { seconds, sha256: hash(png), type: 'editorial card; not product UI' };
    };
    provenance.opening_card = card('opening', opening, opening.seconds, `${scenario} · Execução real no ${client} a seguir`);
    let at = opening.seconds;
    for (let index = 0; index < clips.length; index++) {
      const clip = clips[index], still = clip.frames.length === 1, mp4 = join(temporary, `clip-${index}.mp4`);
      const overlay = picture(`overlay-${index}`, { card: false, title, subtitle: `História de uso · Execução real no ${client}`, label: clip.label });
      const filters = clip.masks.map((mask) => `drawbox=x=${mask.x}:y=${mask.y}:w=${mask.width}:h=${mask.height}:color=0x101016:t=fill`);
      const secondsCaptured = clip.frames.at(-1).timestamp - clip.frames[0].timestamp;
      if (!still) filters.push(`setpts=${(clip.seconds / (secondsCaptured + 0.04)).toFixed(10)}*(PTS-STARTPTS)`);
      filters.push(`crop=${clip.crop.width}:${clip.crop.height}:${clip.crop.x}:${clip.crop.y}`, 'scale=1152:430:force_original_aspect_ratio=decrease:force_divisible_by=2', 'pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x101016', 'setsar=1', 'fps=30');
      const inputArgs = [];
      if (still) inputArgs.push('-loop', '1', '-i', join(clip.directory, clip.frames[0].file));
      else {
        const lines = [];
        for (let frame = 0; frame < clip.frames.length; frame++) {
          lines.push(`file ${concatPath(join(clip.directory, clip.frames[frame].file))}`);
          const duration = frame + 1 < clip.frames.length ? clip.frames[frame + 1].timestamp - clip.frames[frame].timestamp : 0.04;
          lines.push(`duration ${Math.max(0.001, duration).toFixed(6)}`);
        }
        lines.push(`file ${concatPath(join(clip.directory, clip.frames.at(-1).file))}`);
        const listPath = join(temporary, `frames-${index}.txt`); writeFileSync(listPath, lines.join('\n'), { mode: 0o600 });
        inputArgs.push('-f', 'concat', '-safe', '0', '-i', listPath);
      }
      ffmpeg([...inputArgs, '-loop', '1', '-i', overlay, '-filter_complex', `[0:v]${filters.join(',')}[screen];[screen][1:v]overlay=0:0[v]`, '-map', '[v]', '-t', String(clip.seconds), ...videoEncoding, mp4]);
      parts.push(mp4);
      const { directory, ...record } = clip;
      provenance.clips.push({ ...record, source_directory: basename(directory), at, seconds_captured: secondsCaptured, editing: still ? 'Actual captured frame held for reading' : 'Actual sequence; playback duration adjusted as declared; interruptions between clips omitted' });
      at += clip.seconds;
    }
    provenance.closing_card = card('closing', closing, closing.seconds, 'Elo · Continuidade do relacionamento no próprio chat');
    const assembly = join(temporary, 'assembly.txt'), screen = join(temporary, 'screen.mp4');
    writeFileSync(assembly, parts.map((part) => `file ${concatPath(part)}`).join('\n'), { mode: 0o600 });
    ffmpeg(['-f', 'concat', '-safe', '0', '-i', assembly, '-c', 'copy', screen]);
    const narrationPath = join(temporary, 'narration.json'), rendered = join(temporary, 'narrated.mp4');
    const segments = plan.segments.map((segment) => ({ ...segment, ...(segment.audio ? { audio: pathOf(segment.audio) } : {}) }));
    writeFileSync(narrationPath, JSON.stringify({ title, input: screen, output: rendered, tts: plan.tts, segments }), { mode: 0o600 });
    const narrator = fileURLToPath(new URL('./narrate-demos.mjs', import.meta.url));
    process.stdout.write(run(process.execPath, [narrator, narrationPath], { timeout: 600000 }));
    const metadata = JSON.parse(readFileSync(join(temporary, 'narrated.json'), 'utf8'));
    if (metadata.output_seconds > 150.1) throw new Error('A narração estendeu o vídeo além de150s; encurte as falas.');
    metadata.screen_capture_provenance = provenance;
    metadata.user_story = { problem: opening.headline, requested_change: opening.body, benefit: closing.headline, outcome: closing.body };
    metadata.editing = 'Editorial opening and closing; real captured frames cropped/scaled and optionally masked as declared; altered playback/holds are labelled; original audio removed; neural narration and subtitles added. Product screens and results are not synthesized.';
    mkdirSync(dirname(output), { recursive: true });
    for (const [path, bytes] of [[output, readFileSync(rendered)], [`${stem}.srt`, readFileSync(join(temporary, 'narrated.srt'))], [`${stem}.json`, Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`)]]) {
      writeFileSync(path, bytes, { flag: 'wx', mode: 0o644 }); created.push(path);
    }
    process.stdout.write(`História montada: ${basename(output)}; ${metadata.output_seconds.toFixed(1)}s. Confira imagem, voz e resultado antes de publicar.\n`);
  } catch (error) { for (const path of created) rmSync(path, { force: true }); throw error; }
  finally { rmSync(temporary, { recursive: true, force: true }); }
}
main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
