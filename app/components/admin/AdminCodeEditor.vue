<script setup lang="ts">
import { history, historyKeymap, defaultKeymap, indentWithTab, redo, undo } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { EditorSelection, EditorState } from '@codemirror/state'
import { EditorView, drawSelection, keymap, placeholder as placeholderText } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { markdownTypography } from '~/utils/admin/decorations'
import { insertLink, toggleWrap } from '~/utils/admin/editing'

/**
 * The Markdown source, in CodeMirror, set like the article it becomes: the
 * site's own faces and colours (~/utils/admin/decorations for headings and
 * formulas), list and quote continuation on Enter, and the page's scroll rather
 * than a box of its own, so the fields above scroll away with it.
 */

const props = defineProps<{ modelValue: string, placeholder?: string, label?: string }>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  files: [files: File[]]
  save: []
}>()

const host = ref<HTMLElement | null>(null)
let view: EditorView | null = null

// The prose is set like the article (IBM Plex Sans); headings in Fraunces at a
// step up; code, formulas and Markdown's own marks recede.
const style = HighlightStyle.define([
  // One rule per tag: a later rule for the same tag replaces an earlier one.
  { tag: tags.heading1, color: 'var(--heading)', fontFamily: 'var(--font-display)', fontWeight: '500', fontSize: '1.5em' },
  { tag: tags.heading2, color: 'var(--heading)', fontFamily: 'var(--font-display)', fontWeight: '500', fontSize: '1.3em' },
  { tag: tags.heading3, color: 'var(--heading)', fontFamily: 'var(--font-display)', fontWeight: '500', fontSize: '1.12em' },
  { tag: [tags.heading4, tags.heading5, tags.heading6], color: 'var(--heading)', fontWeight: '600' },
  { tag: tags.strong, color: 'var(--heading)', fontWeight: '650' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.link, color: 'var(--accent)' },
  { tag: tags.url, color: 'var(--admin-mark)' },
  { tag: tags.monospace, color: 'var(--admin-code)', fontFamily: 'var(--font-mono)', fontSize: '0.88em' },
  { tag: tags.quote, color: 'var(--muted)' },
  { tag: [tags.processingInstruction, tags.contentSeparator, tags.meta], color: 'var(--admin-mark)' },
  { tag: tags.labelName, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '0.88em' },
  { tag: tags.string, color: 'var(--muted)' },
  { tag: tags.comment, color: 'var(--muted)', fontStyle: 'italic' }
])

const theme = EditorView.theme({
  '&': { color: 'var(--text)', backgroundColor: 'transparent' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { overflow: 'visible', fontFamily: 'var(--font-sans)', lineHeight: 'var(--prose-leading)' },
  // Room below the last line, so the line being typed never sits at the screen's edge.
  '.cm-content': { padding: '4px 0 38vh', caretColor: 'var(--accent)' },
  '.cm-line': { padding: '0' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
    { backgroundColor: 'var(--admin-selection)' },
  '.cm-placeholder': { color: 'var(--muted)', opacity: '0.7' },
  '.cm-selectionMatch': { backgroundColor: 'var(--wash)' },
  '.cm-searchMatch': { backgroundColor: 'var(--admin-selection)', outline: '1px solid var(--accent)' },
  '.cm-panels': { backgroundColor: 'var(--glass-strong)', color: 'var(--text)', borderRadius: '12px' },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--line)' },
  '.cm-panel.cm-search': { padding: '8px 10px', fontFamily: 'var(--font-sans)', fontSize: '13px' },
  '.cm-panel.cm-search input, .cm-panel.cm-search button': { fontFamily: 'var(--font-sans)', fontSize: '13px' },
  '.cm-textfield': { border: '1px solid var(--line-strong)', borderRadius: '8px', backgroundColor: 'var(--bg-elevated)', padding: '3px 8px' },
  '.cm-button': { backgroundImage: 'none', backgroundColor: 'var(--wash)', border: '1px solid var(--line)', borderRadius: '8px', padding: '3px 10px' }
})

/** Files pasted or dropped in: the page uploads them and inserts their Markdown here. */
const handlers = EditorView.domEventHandlers({
  paste(event, editor) {
    const files = [...(event.clipboardData?.files ?? [])]
    if (files.length) {
      event.preventDefault()
      emit('files', files)
      return true
    }
    // An address pasted over selected text links it.
    const text = event.clipboardData?.getData('text/plain')?.trim() ?? ''
    const range = editor.state.selection.main
    if (!range.empty && /^https?:\/\/\S+$/.test(text) && !editor.state.sliceDoc(range.from, range.to).includes('\n')) {
      event.preventDefault()
      const label = editor.state.sliceDoc(range.from, range.to)
      editor.dispatch({
        changes: { from: range.from, to: range.to, insert: `[${label}](${text})` },
        selection: EditorSelection.cursor(range.from + label.length + text.length + 4),
        userEvent: 'input.paste'
      })
      return true
    }
    return false
  },
  drop(event, editor) {
    const files = [...(event.dataTransfer?.files ?? [])]
    if (!files.length) return false
    event.preventDefault()
    const at = editor.posAtCoords({ x: event.clientX, y: event.clientY })
    if (at !== null) editor.dispatch({ selection: EditorSelection.cursor(at) })
    emit('files', files)
    return true
  }
})

onMounted(() => {
  view = new EditorView({
    parent: host.value!,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        history(),
        drawSelection(),
        EditorView.lineWrapping,
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(style),
        markdownTypography,
        highlightSelectionMatches(),
        keymap.of([
          { key: 'Mod-b', run: (editor) => toggleWrap(editor, '**') },
          { key: 'Mod-i', run: (editor) => toggleWrap(editor, '*') },
          { key: 'Mod-k', run: insertLink },
          { key: 'Mod-s', run: () => (emit('save'), true), preventDefault: true },
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          indentWithTab
        ]),
        placeholderText(props.placeholder ?? ''),
        theme,
        handlers,
        // Prose: the phone's spelling and capitalisation help, as in any text field.
        EditorView.contentAttributes.of({
          'spellcheck': 'true',
          'autocorrect': 'on',
          'autocapitalize': 'sentences',
          'aria-label': props.label ?? 'Post text'
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) emit('update:modelValue', update.state.doc.toString())
        })
      ]
    })
  })
})

// A change from outside (a restored draft, rewritten links) replaces the text.
watch(
  () => props.modelValue,
  (value) => {
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
    }
  }
)

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})

defineExpose({
  /** Runs a command from ~/utils/admin/editing on the editor. */
  run: (command: (editor: EditorView) => boolean) => (view ? command(view) : false),
  undo: () => (view ? undo(view) : false),
  redo: () => (view ? redo(view) : false),
  focus: () => view?.focus(),
  /** Puts the cursor at the start of a line and scrolls it into view. */
  goToLine: (number: number) => {
    if (!view) return
    const line = view.state.doc.line(Math.min(Math.max(1, number), view.state.doc.lines))
    view.dispatch({ selection: EditorSelection.cursor(line.from), effects: EditorView.scrollIntoView(line.from, { y: 'center' }) })
    view.focus()
  }
})
</script>

<template>
  <div ref="host" class="admin-code" />
</template>
