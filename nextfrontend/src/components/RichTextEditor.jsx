"use client";

import { useRef, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, ImagePlus } from 'lucide-react';
import { uploadImageWithSizeCheck } from '@/utils/imageUpload';
import { useToast } from '@/components/ui/use-toast';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const toolbarOptions = [
  [{ header: [1, 2, 3, 4, false] }],
  [{ size: ['small', false, 'large', 'huge'] }],
  ['bold', 'italic', 'underline'],
  [{ color: [] }, { background: [] }],
  [{ align: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'image'],
  ['undo', 'redo'],
];

const editorFormats = ['header', 'size', 'bold', 'italic', 'underline', 'color', 'background', 'align', 'list', 'link', 'image', 'blockquote', 'code'];


export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  minHeight = 220,
  className = '',
}) {
  const quillRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { toast } = useToast();

  const insertImageFromFile = useCallback(async (file) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await uploadImageWithSizeCheck(file, (message) => {
        toast({ title: message, variant: 'destructive' });
      });

      const editor = quillRef.current?.getEditor();
      if (!editor) return;

      const range = editor.getSelection(true);
      const index = range?.index ?? editor.getLength();
      editor.insertEmbed(index, 'image', file_url, 'user');
      editor.setSelection(index + 1, 0, 'user');
      editor.focus();
    } catch (error) {
      toast({ title: error.message || 'Image upload failed', variant: 'destructive' });
    } finally {
      setUploadingImage(false);
    }
  }, [toast]);

  const handleImageUpload = useCallback(() => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      await insertImageFromFile(file);
    };
    fileInput.click();
  }, [insertImageFromFile]);

  const editorModules = useMemo(() => ({
    toolbar: {
      container: toolbarOptions,
      handlers: {
        image: handleImageUpload,
      },
    },
  }), [handleImageUpload]);

  return (
    <div className={`rich-text-editor space-y-2 ${className}`.trim()}>
      <div className="rounded-xl border border-border bg-card text-foreground overflow-hidden shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <ImagePlus className="w-3.5 h-3.5" /> Rich content editor
          </span>
          {uploadingImage && <span className="inline-flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Uploading image...</span>}
        </div>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value || ''}
          onChange={(nextValue) => onChange?.(nextValue)}
          modules={editorModules}
          formats={editorFormats}
          placeholder={placeholder}
          className="bg-background"
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}
