// Draws the 1080x1350 share card people post after a reveal.
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const ch of text) {
    const next = line + ch;
    if (ctx.measureText(next).width > maxW && line) {
      out.push(line);
      line = ch.trim() ? ch : "";
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

export async function drawRevealCard(o: { alias: string; labels: string[]; messages: number; days: number }): Promise<Blob> {
  try {
    await document.fonts.ready;
  } catch {}
  const W = 1080, H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  x.fillStyle = "#151A2E";
  x.fillRect(0, 0, W, H);
  x.fillStyle = "#E9A72B";
  x.font = "500 30px 'IBM Plex Mono', monospace";
  x.fillText("UNLABELED · REVEAL", 90, 140);
  x.fillStyle = "#F3F4F7";
  x.font = "800 72px 'Nanum Myeongjo', serif";
  let y = 330;
  for (const l of wrap(x, `${o.messages} messages with ${o.alias}.`, 900)) {
    x.fillText(l, 90, y);
    y += 100;
  }
  x.fillStyle = "#E9A72B";
  x.font = "800 84px 'Nanum Myeongjo', serif";
  for (const l of wrap(x, o.labels.join(", ") || "No labels at all.", 900)) {
    x.fillText(l, 90, y + 30);
    y += 110;
  }
  y += 90;
  x.font = "500 36px 'IBM Plex Mono', monospace";
  let lx = 90;
  for (const tag of [...o.labels, `${o.days}d`]) {
    const w = x.measureText(tag).width + 70;
    if (lx + w > W - 90) {
      lx = 90;
      y += 90;
    }
    x.fillStyle = "#E9A72B";
    x.beginPath();
    x.roundRect(lx, y - 48, w, 68, [6, 34, 34, 6]);
    x.fill();
    x.fillStyle = "#3A2600";
    x.fillText(tag, lx + 44, y);
    lx += w + 18;
  }
  x.fillStyle = "#9AA1B8";
  x.font = "400 32px 'IBM Plex Sans KR', sans-serif";
  x.fillText("No borders. No labels. unlabeled.app", 90, H - 110);
  return new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
}
