import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react';
import { sanitizeUrl } from '../../lib/sanitize';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onOpenMediaPicker?: (insertFn: (url: string, alt?: string) => void) => void;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your dispatch in full editorial detail...',
  onOpenMediaPicker,
}: RichTextEditorProps) {
  const [linkInputOpen, setLinkInputOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      LinkExtension.configure({ openOnClick: false }),
      ImageExtension,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const btnCls = (active: boolean) =>
    `p-1.5 rounded text-xs transition-colors ${
      active
        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
        : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800'
    }`;

  const applyLink = () => {
    const clean = sanitizeUrl(linkUrl);
    if (clean) {
      editor.chain().focus().setLink({ href: clean }).run();
    }
    setLinkUrl('');
    setLinkInputOpen(false);
  };

  return (
    <div className="border border-stone-300 dark:border-stone-700 rounded-md overflow-hidden bg-white dark:bg-stone-950">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnCls(editor.isActive('bold'))} title="Bold">
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnCls(editor.isActive('italic'))} title="Italic">
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnCls(editor.isActive('underline'))} title="Underline">
          <UnderlineIcon className="w-4 h-4" />
        </button>
        <span className="w-px h-5 bg-stone-300 dark:bg-stone-700 mx-1" />
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnCls(editor.isActive('heading', { level: 2 }))} title="Heading 2">
          <Heading2 className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnCls(editor.isActive('heading', { level: 3 }))} title="Heading 3">
          <Heading3 className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnCls(editor.isActive('blockquote'))} title="Pull Quote">
          <Quote className="w-4 h-4" />
        </button>
        <span className="w-px h-5 bg-stone-300 dark:bg-stone-700 mx-1" />
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnCls(editor.isActive('bulletList'))} title="Bullet List">
          <List className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnCls(editor.isActive('orderedList'))} title="Ordered List">
          <ListOrdered className="w-4 h-4" />
        </button>
        <span className="w-px h-5 bg-stone-300 dark:bg-stone-700 mx-1" />
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btnCls(editor.isActive({ textAlign: 'left' }))} title="Align Left">
          <AlignLeft className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btnCls(editor.isActive({ textAlign: 'center' }))} title="Align Center">
          <AlignCenter className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btnCls(editor.isActive({ textAlign: 'right' }))} title="Align Right">
          <AlignRight className="w-4 h-4" />
        </button>
        <span className="w-px h-5 bg-stone-300 dark:bg-stone-700 mx-1" />
        <button type="button" onClick={() => setLinkInputOpen((v) => !v)} className={btnCls(editor.isActive('link'))} title="Insert Link">
          <Link2 className="w-4 h-4" />
        </button>
        {onOpenMediaPicker && (
          <button
            type="button"
            onClick={() =>
              onOpenMediaPicker((url, alt) => {
                const safe = sanitizeUrl(url);
                if (safe) {
                  editor.chain().focus().setImage({ src: safe, alt: alt || '' }).run();
                }
              })
            }
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 rounded"
            title="Insert Image from Media Library"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Insert Media</span>
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => editor.chain().focus().undo().run()} className={btnCls(false)} title="Undo">
            <Undo className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => editor.chain().focus().redo().run()} className={btnCls(false)} title="Redo">
            <Redo className="w-4 h-4" />
          </button>
        </div>
      </div>

      {linkInputOpen && (
        <div className="flex items-center gap-2 p-2 bg-stone-100 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 px-2.5 py-1 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
          />
          <button type="button" onClick={applyLink} className="px-3 py-1 text-xs font-medium bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded">
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().unsetLink().run();
              setLinkInputOpen(false);
            }}
            className="px-2 py-1 text-xs text-stone-600 dark:text-stone-400"
          >
            Remove
          </button>
        </div>
      )}

      <EditorContent
        editor={editor}
        className="article-prose p-4 min-h-[280px] max-h-[540px] overflow-y-auto focus:outline-none text-stone-900 dark:text-stone-100"
      />
    </div>
  );
}
