'use client'

import { useActionState, useState } from 'react'
import { submitHomework, type HomeworkFormState } from '@/app/actions/homework'

type StudentOpt = { id: string; name: string }

// 비로그인 학생용 숙제 제출 폼.
export function SubmitForm({
  token,
  students,
}: {
  token: string
  students: StudentOpt[]
}) {
  const [state, formAction, pending] = useActionState<HomeworkFormState, FormData>(
    submitHomework,
    undefined
  )
  const [selected, setSelected] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  const manual = selected === '__manual__'

  if (state?.ok) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl dark:bg-emerald-900/40">
          ✅
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          제출이 완료되었습니다!
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          선생님이 확인할 수 있도록 전달되었습니다.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 h-11 rounded-lg border border-zinc-300 px-5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          다른 사진 또 제출하기
        </button>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">이름</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          name={manual ? undefined : 'student_id'}
          className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          required
        >
          <option value="" disabled>
            이름을 선택하세요
          </option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value="__manual__">목록에 없어요 (직접 입력)</option>
        </select>

        {/* 선택 시: 학생 이름을 함께 전송 */}
        {!manual && selected && (
          <input
            type="hidden"
            name="student_name"
            value={students.find((s) => s.id === selected)?.name ?? ''}
          />
        )}

        {manual && (
          <input
            name="student_name"
            placeholder="이름을 입력하세요"
            className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            required
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">숙제 사진</label>
        <input
          name="file"
          type="file"
          accept="image/*"
          capture="environment"
          required
          onChange={(e) => {
            const f = e.target.files?.[0]
            setPreview(f ? URL.createObjectURL(f) : null)
          }}
          className="block w-full text-sm text-zinc-600 file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:text-sm file:font-semibold file:text-white dark:text-zinc-300 dark:file:bg-white dark:file:text-zinc-900"
        />
        <p className="text-xs text-zinc-400">스마트폰에서는 카메라로 바로 촬영할 수 있어요. (최대 10MB)</p>
      </div>

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="미리보기" className="max-h-64 w-full rounded-lg object-contain" />
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-lg bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? '제출 중…' : '숙제 제출하기'}
      </button>
    </form>
  )
}
