'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  SCHOOL_LEVELS,
  CATEGORIES,
  GRADES_BY_LEVEL,
  formatBytes,
  type Material,
  type SchoolLevel,
} from '@/lib/materials'
import { deleteMaterial, getMaterialDownloadUrl } from '@/app/actions/materials'
import { MaterialFormModal } from './MaterialFormModal'

const categoryColor: Record<string, string> = {
  내신대비: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  모의고사: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  개념교재: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  오답노트: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
}

function uploaderName(u: Material['uploader']): string {
  const one = Array.isArray(u) ? u[0] : u
  return one?.name ?? '(삭제된 강사)'
}

export function MaterialsBrowser({
  materials,
  currentUserId,
  isAdmin,
}: {
  materials: Material[]
  currentUserId: string
  isAdmin: boolean
}) {
  const [level, setLevel] = useState<SchoolLevel>('중등부')
  const [grade, setGrade] = useState<string | null>(null) // null = 전체
  const [category, setCategory] = useState<string | null>(null)
  const [editing, setEditing] = useState<Material | null>(null)
  const [creating, setCreating] = useState(false)

  // 대분류 전환 시 학년 필터 초기화 (중등 학년 ↔ 고등 학년 호환 안 됨)
  const switchLevel = (l: SchoolLevel) => {
    setLevel(l)
    setGrade(null)
  }

  const filtered = useMemo(
    () =>
      materials.filter(
        (m) =>
          m.school_level === level &&
          (grade === null || m.grade === grade) &&
          (category === null || m.category === category)
      ),
    [materials, level, grade, category]
  )

  return (
    <div className="mt-8">
      {/* 대분류 탭 + 업로드 버튼 */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-1">
          {SCHOOL_LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => switchLevel(l)}
              className={
                '-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ' +
                (level === l
                  ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-50'
                  : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300')
              }
            >
              {l}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mb-2 inline-flex h-9 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + 새 자료 업로드
        </button>
      </div>

      {/* 세부 필터: 학년 / 카테고리 */}
      <div className="mt-4 space-y-3">
        <FilterRow label="학년">
          <Chip active={grade === null} onClick={() => setGrade(null)}>
            전체
          </Chip>
          {GRADES_BY_LEVEL[level].map((g) => (
            <Chip key={g} active={grade === g} onClick={() => setGrade(g)}>
              {g}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="분류">
          <Chip active={category === null} onClick={() => setCategory(null)}>
            전체
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </FilterRow>
      </div>

      {/* 관리 테이블 */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 font-medium">제목 / 파일</th>
              <th className="px-4 py-3 font-medium">학년</th>
              <th className="px-4 py-3 font-medium">분류</th>
              <th className="px-4 py-3 font-medium">등록자</th>
              <th className="px-4 py-3 font-medium">등록일</th>
              <th className="px-4 py-3 text-right font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-400">
                  조건에 맞는 자료가 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((m) => {
                const canManage = isAdmin || m.created_by === currentUserId
                return (
                  <tr key={m.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">
                        {m.title}
                      </div>
                      {m.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">
                          {m.description}
                        </p>
                      )}
                      <DownloadLink id={m.id} name={m.file_name} size={m.file_size} />
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{m.grade}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          'rounded-full px-2 py-0.5 text-xs font-medium ' +
                          (categoryColor[m.category] ?? 'bg-zinc-100 text-zinc-600')
                        }
                      >
                        {m.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{uploaderName(m.uploader)}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {new Intl.DateTimeFormat('ko-KR', {
                        dateStyle: 'medium',
                        timeZone: 'Asia/Seoul',
                      }).format(new Date(m.created_at))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage ? (
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => setEditing(m)}
                            className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            수정
                          </button>
                          <DeleteButton id={m.id} />
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 업로드 / 수정 모달 */}
      {creating && (
        <MaterialFormModal mode="create" onClose={() => setCreating(false)} />
      )}
      {editing && (
        <MaterialFormModal mode="edit" material={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-10 shrink-0 text-xs font-medium text-zinc-400">{label}</span>
      {children}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-full border px-3 py-1 text-sm transition-colors ' +
        (active
          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-white dark:text-zinc-900'
          : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800')
      }
    >
      {children}
    </button>
  )
}

// 비공개 버킷 → 클릭 시 서버에서 단기 서명 URL을 받아 다운로드한다.
function DownloadLink({ id, name, size }: { id: string; name: string; size: number }) {
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const download = () => {
    setErr(null)
    startTransition(async () => {
      const res = await getMaterialDownloadUrl(id)
      if (res.url) window.location.href = res.url
      else setErr(res.error ?? '다운로드 실패')
    })
  }

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={download}
        disabled={pending}
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
      >
        📎 {name}
        <span className="text-zinc-400">({formatBytes(size)})</span>
        {pending && <span className="text-zinc-400">…</span>}
      </button>
      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  )
}

function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  const onClick = () => {
    if (!window.confirm('이 자료를 삭제할까요? 첨부 파일도 함께 삭제됩니다.')) return
    const fd = new FormData()
    fd.set('id', id)
    startTransition(() => deleteMaterial(fd))
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
    >
      {pending ? '삭제 중…' : '삭제'}
    </button>
  )
}
