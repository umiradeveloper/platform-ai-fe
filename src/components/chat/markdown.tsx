'use client';

import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Check, Copy, Download } from 'lucide-react';

function nodeText(node: any): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (node?.props?.children) return nodeText(node.props.children);
  return '';
}

/** Ekstensi file untuk bahasa blok kode (untuk tombol Unduh). */
const EXT: Record<string, string> = {
  python: 'py', py: 'py', javascript: 'js', js: 'js', typescript: 'ts', ts: 'ts', tsx: 'tsx', jsx: 'jsx',
  json: 'json', html: 'html', css: 'css', scss: 'scss', sql: 'sql', bash: 'sh', sh: 'sh', shell: 'sh', zsh: 'sh',
  powershell: 'ps1', ps1: 'ps1', bat: 'bat', yaml: 'yml', yml: 'yml', xml: 'xml', markdown: 'md', md: 'md',
  java: 'java', kotlin: 'kt', go: 'go', rust: 'rs', php: 'php', ruby: 'rb', c: 'c', cpp: 'cpp', 'c++': 'cpp',
  csharp: 'cs', cs: 'cs', swift: 'swift', dart: 'dart', vue: 'vue', csv: 'csv', toml: 'toml', ini: 'ini',
  dockerfile: 'Dockerfile', nginx: 'conf', env: 'env', r: 'r', matlab: 'm', vba: 'bas', teks: 'txt', text: 'txt', plaintext: 'txt',
};

function downloadText(text: string, lang: string) {
  const ext = EXT[lang.toLowerCase()] ?? 'txt';
  const name = ext === 'Dockerfile' ? 'Dockerfile' : `kode-umira-ai-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}.${ext}`;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const child: any = Array.isArray(children) ? children[0] : children;
  const lang = /language-([\w+-]+)/.exec(child?.props?.className ?? className ?? '')?.[1] ?? 'teks';
  const text = nodeText(child?.props?.children ?? children).replace(/\n$/, '');
  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl border border-teal-900/40 bg-[#062b35] shadow-sm">
      <div className="flex items-center justify-between border-b border-white/5 bg-[#05333F] px-3 py-1.5">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-copper-300">{lang}</span>
        <span className="ml-auto" />
        <button
          type="button"
          onClick={() => downloadText(text, lang)}
          className="mr-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-teal-100/70 hover:bg-white/10 hover:text-white"
          title={`Unduh sebagai .${EXT[lang.toLowerCase()] ?? 'txt'}`}
        >
          <Download className="h-3.5 w-3.5" /> Unduh
        </button>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-teal-100/70 hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Tersalin' : 'Salin'}
        </button>
      </div>
      <pre className="scroll-thin overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">{children}</pre>
    </div>
  );
}

export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
