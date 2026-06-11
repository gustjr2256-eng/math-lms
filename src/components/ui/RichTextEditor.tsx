'use client'

import { useRef } from 'react'

// 의존성 없는 경량 WYSIWYG. contentEditable + document.execCommand 기반.
// 입력 내용을 hidden input(name)에 실어 form action 으로 전송한다.
// execCommand 는 deprecated 이나 전 브라우저 지원 + 의존성 0이라 채택(요구된 경량 방식).

const TOOLS: { cmd: string; label: string; arg?: string }[] = [
  { cmd: 'bold', label: '굵게' },
  { cmd: 'italic', label: '기울임' },
  { cmd: 'underline', label: '밑줄' },
  { cmd: 'formatBlock', label: '제목', arg: 'H3' },
  { cmd: 'insertUnorderedList', label: '• 목록' },
  { cmd: 'insertOrderedList', label: '1. 목록' },
]

export function RichTextEditor({
  name,
  defaultValue = '',
}: {
  name: string
  defaultValue?: string
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const hiddenRef = useRef<HTMLInputElement>(null)

  const sync = () => {
    if (hiddenRef.current && editorRef.current) {
      hiddenRef.current.value = editorRef.current.innerHTML
    }
  }

  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg)
    editorRef.current?.focus()
    sync()
  }

  return (
    <div className="rounded-lg border border-cream-line dark:border-zinc-700">
      <div className="flex flex-wrap gap-1 border-b border-cream-line p-2 dark:border-zinc-700">
        {TOOLS.map((t) => (
          <button
            key={t.label}
            type="button"
            // 버튼 클릭 시 에디터 포커스/선택이 풀리지 않게
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(t.cmd, t.arg)}
            className="rounded-md px-2 py-1 font-pretendard text-xs text-brand hover:bg-brand-tint dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        dangerouslySetInnerHTML={{ __html: defaultValue }}
        className="min-h-32 max-h-72 overflow-y-auto p-3 font-pretendard text-sm leading-relaxed outline-none [&_h3]:font-paperozi [&_h3]:text-base [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />

      <input ref={hiddenRef} type="hidden" name={name} defaultValue={defaultValue} />
    </div>
  )
}
