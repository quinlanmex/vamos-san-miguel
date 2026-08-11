import React from "react";

// Tiny markdown renderer for our own trusted guide files. Handles headings,
// paragraphs, unordered/ordered lists, bold, and links. Server component.

function inline(text, keyPrefix) {
  // Split on links [text](url) and bold **text**, keep it simple and safe.
  const nodes = [];
  let rest = text;
  let i = 0;
  const re = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)/;
  let m;
  while ((m = re.exec(rest))) {
    if (m.index > 0) nodes.push(rest.slice(0, m.index));
    if (m[1]) {
      nodes.push(<a key={`${keyPrefix}-a${i}`} href={m[3]} style={{ color: "#0D1B36", fontWeight: 600 }}>{m[2]}</a>);
    } else if (m[4]) {
      nodes.push(<strong key={`${keyPrefix}-b${i}`}>{m[5]}</strong>);
    }
    rest = rest.slice(m.index + m[0].length);
    i++;
  }
  if (rest) nodes.push(rest);
  return nodes;
}

export default function Markdown({ body }) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    let line = lines[i];

    if (!line.trim()) { i++; continue; }

    // Headings
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ type: "h", level: h[1].length, text: h[2] });
      i++;
      continue;
    }

    // Lists (unordered - / * , or ordered 1.)
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    // Paragraph (gather consecutive non-blank, non-heading, non-list lines)
    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: "p", text: para.join(" ") });
  }

  const hStyle = {
    1: { fontFamily: "Georgia, serif", fontSize: 30, lineHeight: 1.12, margin: "0 0 14px", letterSpacing: "-.01em" },
    2: { fontFamily: "Georgia, serif", fontSize: 22, lineHeight: 1.2, margin: "30px 0 10px" },
    3: { fontSize: 17, fontWeight: 700, margin: "22px 0 8px" },
  };

  return (
    <>
      {blocks.map((b, idx) => {
        if (b.type === "h") {
          const Tag = `h${Math.min(b.level, 4)}`;
          return <Tag key={idx} style={hStyle[b.level] || hStyle[3]}>{inline(b.text, `h${idx}`)}</Tag>;
        }
        if (b.type === "list") {
          const Tag = b.ordered ? "ol" : "ul";
          return (
            <Tag key={idx} style={{ margin: "0 0 14px", paddingLeft: 22, lineHeight: 1.6, color: "#3A3125" }}>
              {b.items.map((it, j) => <li key={j} style={{ marginBottom: 5 }}>{inline(it, `l${idx}-${j}`)}</li>)}
            </Tag>
          );
        }
        return <p key={idx} style={{ margin: "0 0 15px", lineHeight: 1.65, fontSize: 16.5, color: "#3A3125" }}>{inline(b.text, `p${idx}`)}</p>;
      })}
    </>
  );
}
