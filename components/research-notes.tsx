"use client";

import MarkdownIt, { type Token } from "markdown-it";
import { Fragment, createElement, useEffect, useId, useMemo, useRef, type ReactNode } from "react";
import MathText from "./math-text";
import styles from "./research-notes.module.css";

const markdown = new MarkdownIt({ html: false, breaks: false });
const delimiters = [["$$", "$$"], ["$", "$"], ["\\(", "\\)"], ["\\[", "\\]"]];

// Capture TeX before Markdown interprets underscores, backslashes or brackets.
markdown.inline.ruler.before("escape", "note_math", (state, silent) => {
  const pair = delimiters.find(([open]) => state.src.startsWith(open, state.pos));
  if (!pair) return false;
  const [open, close] = pair;
  let end = state.src.indexOf(close, state.pos + open.length);
  while (end >= 0) {
    let backslashes = 0;
    for (let i = end - 1; i >= 0 && state.src[i] === "\\"; i--) backslashes++;
    if (backslashes % 2 === 0) break;
    end = state.src.indexOf(close, end + close.length);
  }
  if (end < 0 || end + close.length > state.posMax || end === state.pos + open.length) return false;
  if (!silent) state.push("note_math", "", 0).content = state.src.slice(state.pos, end + close.length);
  state.pos = end + close.length;
  return true;
});

markdown.inline.ruler.before("link", "obsidian_link", (state, silent) => {
  const embed = state.src.startsWith("![[", state.pos);
  const start = state.pos + (embed ? 3 : 2);
  if (!embed && !state.src.startsWith("[[", state.pos)) return false;
  const end = state.src.indexOf("]]", start);
  if (end === -1 || end + 2 > state.posMax) return false;
  const content = state.src.slice(start, end);
  if (!content.trim() || /[\n[\]]/.test(content)) return false;
  if (!silent) state.push(embed ? "obsidian_embed" : "obsidian_link", "", 0).content = content;
  state.pos = end + 2;
  return true;
});

function unquote(value: string) {
  return value.trim().replace(/^(['"])(.*)\1$/, "$2");
}

/** Read common Obsidian properties, preserving the Markdown body for later editing. */
export function parseObsidian(text: string, filename: string) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const front = normalized.match(/^---[ \t]*\n([\s\S]*?)\n(?:---|\.\.\.)[ \t]*(?:\n|$)/);
  const properties: Record<string, string[]> = Object.create(null);
  let key = "";
  for (const line of (front?.[1] || "").split("\n")) {
    const field = /^([\w\u3400-\u9fff-]+):[ \t]*(.*)$/.exec(line);
    if (field) {
      key = field[1].toLowerCase();
      const value = field[2].trim();
      properties[key] = (value.startsWith("[") && value.endsWith("]")
        ? value.slice(1, -1).split(/[,，]/)
        : [value]).map(unquote).filter(Boolean);
    } else {
      const item = /^\s*-\s+(.+)$/.exec(line);
      if (item && key) properties[key].push(unquote(item[1]));
    }
  }
  const body = normalized.slice(front?.[0].length ?? 0).trim();
  const headings = markdown.parse(body, {});
  const first = headings.findIndex(t => t.type === "heading_open" && t.tag === "h1");
  const title = properties.title?.[0] || properties["标题"]?.[0] || headings[first >= 0 ? first + 1 : -1]?.content ||
    filename.split(/[\\/]/).pop()?.replace(/\.md$/i, "") || "未命名笔记";
  const category = (properties.category || properties.categories || properties["分类"] || []).join(" / ");
  const tags = (properties.tags || properties["标签"] || []).flatMap(t => t.split(/[\s,，]+/)).map(t => t.replace(/^#/, "")).filter(Boolean);
  return { title, body, category, tags: [...new Set(tags)] };
}

function safeUrl(raw: string, image = false) {
  if (!raw || /[\u0000-\u001f\\]/.test(raw) || raw.startsWith("//")) return undefined;
  try {
    const url = new URL(raw, "https://note.invalid/");
    if (!["https:", "http:"].includes(url.protocol)) return undefined;
    if (image && url.origin === "https://note.invalid" && !/\.(?:png|jpe?g|gif|webp|avif|svg)$/i.test(url.pathname)) return undefined;
    return raw;
  } catch { return undefined; }
}

function decodeLabel(raw: string) {
  try { return decodeURIComponent(raw); } catch { return raw; }
}

type NoteProps = {title: string; body: string; openNote: (title: string) => void};
type Heading = { index: number; depth: number; label: string };
let pendingAnchor: { title: string; heading: string } | undefined;

export function NoteReader({title, body, openNote}: NoteProps) {
  const id = useId();
  const article = useRef<HTMLElement>(null);
  const { tokens, headings } = useMemo(() => {
    const tokens = markdown.parse(body, {});
    const headings: Heading[] = [];
    for (const [index, token] of tokens.entries()) {
      if (token.type === "heading_open") {
        headings.push({index, depth: Number(token.tag.slice(1)), label: tokens[index + 1].content});
      }
    }
    return { tokens, headings };
  }, [body]);

  function scrollToHeading(label: string) {
    const target = Array.from(article.current?.querySelectorAll<HTMLElement>("[data-note-heading]") || [])
      .find(element => element.dataset.noteHeading === label || element.textContent === label);
    target?.focus({preventScroll: true});
    target?.scrollIntoView({block: "start"});
  }
  useEffect(() => {
    if (pendingAnchor?.title === title) {
      scrollToHeading(pendingAnchor.heading);
      pendingAnchor = undefined;
    }
  }, [title, body]);

  function navigate(target: string) {
    const [path, heading] = decodeLabel(target).split("#", 2);
    const note = (path.split("/").pop() || "").replace(/\.md$/i, "");
    if (!note || note === title) { if (heading) scrollToHeading(heading); return; }
    pendingAnchor = heading ? { title: note, heading } : undefined;
    openNote(note);
  }

  function noteLink(key: number, target: string, label: ReactNode) {
    return <button key={key} type="button" className={styles.noteLink} onClick={() => navigate(target)}>{label}</button>;
  }
  function noteImage(key: number, raw: string, alt: string) {
    const src = safeUrl(raw, true);
    return src ? <img key={key} src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" /> : alt;
  }

  // React creates all elements and text nodes. Markdown attributes are never spread onto DOM elements.
  function render(tokens: Token[], topLevel = false): ReactNode[] {
    let cursor = 0;
    function read(): ReactNode[] {
      const nodes: ReactNode[] = [];
      while (cursor < tokens.length) {
        const key = cursor++, token = tokens[key];
        if (token.nesting === -1) break;
        if (token.nesting === 1) {
          const children = read();
          if (token.hidden) { nodes.push(<Fragment key={key}>{children}</Fragment>); continue; }
          if (token.type === "link_open") {
            const href = safeUrl(String(token.attrGet("href") || ""));
            if (href && (href.startsWith("#") || (!/^[a-z]+:/i.test(href) && /\.md(?:#|$)/i.test(href)))) {
              nodes.push(noteLink(key, href, children));
            } else {
              nodes.push(href ? <a key={key} href={href} rel="noreferrer">{children}</a> : <Fragment key={key}>{children}</Fragment>);
            }
          } else if (token.type === "heading_open" && topLevel) {
            const label = tokens[key + 1]?.content || "";
            if (token.tag === "h1" && label === title) continue;
            nodes.push(createElement(token.tag, { key, id: id + "-" + key, tabIndex: -1, "data-note-heading": label }, children));
          } else if (token.tag === "table") {
            nodes.push(<div key={key} className={styles.tableScroll}><table>{children}</table></div>);
          } else if (token.tag === "ol") {
            nodes.push(<ol key={key} start={Number(token.attrGet("start") || 1)}>{children}</ol>);
          } else {
            nodes.push(createElement(token.tag, { key }, children));
          }
          continue;
        }
        switch (token.type) {
          case "inline": nodes.push(<Fragment key={key}>{render(token.children || [])}</Fragment>); break;
          case "note_math": nodes.push(<MathText key={key} text={token.content}/>); break;
          case "text": nodes.push(token.content); break;
          case "softbreak": nodes.push("\n"); break;
          case "hardbreak": nodes.push(<br key={key}/>); break;
          case "hr": nodes.push(<hr key={key}/>); break;
          case "code_inline": nodes.push(<code key={key}>{token.content}</code>); break;
          case "fence": case "code_block": nodes.push(<pre key={key}><code>{token.content}</code></pre>); break;
          case "image": nodes.push(noteImage(key, String(token.attrGet("src") || ""), token.content)); break;
          case "obsidian_link": case "obsidian_embed": {
            const [target, alias] = token.content.split("|");
            if (token.type === "obsidian_embed" && /\.(?:png|jpe?g|gif|webp|avif|svg)(?:[?#].*)?$/i.test(target)) {
              nodes.push(noteImage(key, target.trim(), alias || target));
            } else nodes.push(noteLink(key, target.trim(), alias || target.replace(/^#/, "")));
            break;
          }
          default: nodes.push(token.content);
        }
      }
      return nodes;
    }
    return read();
  }

  const sections = headings.filter(h => h.depth > 1 || h.label !== title);
  return <article className={styles.reader} ref={article} aria-label={title}>
    {sections.length > 0 && <details className={styles.toc}>
      <summary>文章目录</summary>
      <ol>{sections.map(h => <li key={h.index}>
        <button type="button" onClick={() => document.getElementById(id + "-" + h.index)?.scrollIntoView()}>{h.label}</button>
      </li>)}</ol>
    </details>}
    <div className={styles.prose}>{render(tokens, true)}</div>
  </article>;
}
