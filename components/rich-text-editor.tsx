"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered,
  Palette,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react' // Add this import

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = 'Start typing...',
  className 
}: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false)
  
  // Prevent SSR - only render on client
  useEffect(() => {
    setMounted(true)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextStyle,
      Color,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
    immediatelyRender: false, // Add this to prevent SSR issues
  })

  // Don't render on server
  if (!mounted || !editor) {
    return (
      <div className={cn("border rounded-lg min-h-[200px] bg-muted/30", className)}>
        <div className="border-b bg-muted/50 p-2 h-10" />
        <div className="p-4 text-muted-foreground text-sm">
          Loading rich text editor...
        </div>
      </div>
    )
  }

  const textColors = [
    { label: 'Black', value: '#000000' },
    { label: 'Red', value: '#dc2626' },
    { label: 'Blue', value: '#2563eb' },
    { label: 'Green', value: '#16a34a' },
    { label: 'Orange', value: '#ea580c' },
    { label: 'Purple', value: '#7c3aed' },
  ]

  const fontSizes = [
    { label: 'Small', value: '12px' },
    { label: 'Normal', value: '16px' },
    { label: 'Large', value: '20px' },
    { label: 'Huge', value: '24px' },
  ]

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="border-b bg-muted/50 p-2 flex flex-wrap items-center gap-1">
        {/* Font Size */}
        <div className="relative group">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
          >
            <Type className="h-4 w-4 mr-1" />
            Size
          </Button>
          <div className="absolute hidden group-hover:block bg-background border shadow-lg rounded-md p-2 z-50 min-w-[120px]">
            {fontSizes.map((size) => (
              <Button
                key={size.value}
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => editor.chain().focus().setFontSize(size.value).run()}
              >
                {size.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Text Color */}
        <div className="relative group">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
          >
            <Palette className="h-4 w-4 mr-1" />
            Color
          </Button>
          <div className="absolute hidden group-hover:block bg-background border shadow-lg rounded-md p-2 z-50 min-w-[120px]">
            <div className="grid grid-cols-3 gap-1">
              {textColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: color.value }}
                  onClick={() => editor.chain().focus().setColor(color.value).run()}
                  title={color.label}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={() => editor.chain().focus().unsetColor().run()}
            >
              Reset Color
            </Button>
          </div>
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Text Formatting */}
        <Button
          type="button"
          variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Headings */}
        <Button
          type="button"
          variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Lists */}
        <Button
          type="button"
          variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Alignment */}
        <Button
          type="button"
          variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 px-2"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div className="min-h-[200px] max-h-[400px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Character Count */}
      <div className="border-t px-4 py-2 text-xs text-muted-foreground flex justify-between">
        <span>
          {editor.storage.characterCount?.characters() || 0} characters
        </span>
        <span>
          {editor.storage.characterCount?.words() || 0} words
        </span>
      </div>
    </div>
  )
}