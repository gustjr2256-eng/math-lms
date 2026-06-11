'use client'

import { useActionState, useEffect, useState } from 'react'
import {
  SCHOOL_LEVELS,
  CATEGORIES,
  GRADES_BY_LEVEL,
  levelOfGrade,
  type Material,
  type SchoolLevel,
} from '@/lib/materials'
import {
  createMaterial,
  updateMaterial,
  type MaterialFormState,
} from '@/app/actions/materials'

const inputCls =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100'
const labelCls = 'text-xs font-medium text-zinc-500 dark:text-zinc-400'

// 업로드(create) / 메타수정(edit) 겸용 모달.
export function MaterialFormModal({
  mode,
  material,
  scope = 'regular',
  onClose,
}: {
  mode: 'create' | 'edit'
  material?: Material
  scope?: 'regular' | 'clinic'
  onClose: () => void
}) {
  const action = mode === 'create' ? createMaterial : updateMaterial
  const [state, formAction, pending] = useActionState<MaterialFormState, FormData>(
    action,
    undefined
  )

  const [level, setLevel] = useState<SchoolLevel>(material?.school_level ?? '중등부')
  const [grade, setGrade] = useState<string>(material?.grade ?? GRADES_BY_LEVEL['중등부'][0])

  // 대분류 변경 시 학년이 범위 밖이면 첫 학년으로 보정
  const onLevelChange = (l: SchoolLevel) => {
    setLevel(l)
    if (!(GRADES_BY_LEVEL[l] as readonly string[]).includes(grade)) {
      setGrade(GRADES_BY_LEVEL[l][0])
    }
  }
  // 학년 직접 선택 시 대분류도 동기화
  const onGradeChange = (g: string) => {
    setGrade(g)
    setLevel(levelOfGrade(g))
  }

  // 성공하면 모달 닫기
  useEffect(() => {
    if (state?.ok) onClose()
  }, [state, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {mode === 'create' ? '새 자료 업로드' : '자료 정보 수정'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <form action={formAction} className="mt-5 space-y-4">
          {mode === 'edit' && <input type="hidden" name="id" value={material!.id} />}
          <input type="hidden" name="scope" value={scope} />
          {/* school_level 은 select가 제어값이라 hidden 으로 함께 전송 */}
          <input type="hidden" name="school_level" value={level} />

          <div>
            <label className={labelCls}>제목</label>
            <input
              name="title"
              defaultValue={material?.title}
              placeholder="예: 중3 2학기 중간 내신대비 모의문제 1회"
              className={`mt-1 ${inputCls}`}
              required
            />
          </div>

          <div>
            <label className={labelCls}>설명 (선택)</label>
            <textarea
              name="description"
              defaultValue={material?.description ?? ''}
              rows={2}
              placeholder="자료에 대한 메모 (범위, 난이도 등)"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>대분류</label>
              <select
                value={level}
                onChange={(e) => onLevelChange(e.target.value as SchoolLevel)}
                className={`mt-1 ${inputCls}`}
              >
                {SCHOOL_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>학년</label>
              <select
                name="grade"
                value={grade}
                onChange={(e) => onGradeChange(e.target.value)}
                className={`mt-1 ${inputCls}`}
              >
                {GRADES_BY_LEVEL[level].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>분류</label>
              <select name="category" defaultValue={material?.category ?? CATEGORIES[0]} className={`mt-1 ${inputCls}`}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {mode === 'create' ? (
            <div>
              <label className={labelCls}>파일 (PDF, HWP, ZIP 등 · 최대 50MB)</label>
              <input
                name="file"
                type="file"
                accept=".pdf,.hwp,.hwpx,.zip,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg"
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white dark:border-zinc-700 dark:bg-zinc-900 dark:file:bg-white dark:file:text-zinc-900"
                required
              />
            </div>
          ) : (
            <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              현재 파일: <span className="font-medium">{material!.file_name}</span>
              <br />
              파일 자체를 교체하려면 자료를 삭제 후 다시 업로드하세요.
            </p>
          )}

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-10 rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {pending
                ? mode === 'create'
                  ? '업로드 중…'
                  : '저장 중…'
                : mode === 'create'
                  ? '업로드'
                  : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
