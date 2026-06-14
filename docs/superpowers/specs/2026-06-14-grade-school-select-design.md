# 학생 등록 — 학년/학교 선택식 + 학교 목록 관리 설계

작성일: 2026-06-14

## 배경 / 목표

학생 통합관리(`/admin/students`)의 학생 등록·수정 폼에서:
- **학년**을 자유 텍스트("예: 중2") 대신 **드롭다운**(중1·2·3 / 고1·2·3)으로.
- **학교**를 자유 텍스트 대신 **드롭다운**으로. 학교 목록은 **원장이 직접 관리**.
- 학교 추가/삭제는 별도 페이지가 아니라 **`+ 학생 등록` 버튼 옆 `학교 관리` 버튼 → 팝업 모달**에서 처리.

## 결정

- **학년**: `lib/students.ts`에 `STUDENT_GRADES = ['중1','중2','중3','고1','고2','고3']` 상수.
  `grade`는 이미 text 컬럼 → DB·액션 변경 없음. 폼만 `select`로.
- **학교 저장 방식**: `students.school`은 **text 유지(학교 이름 저장)**. 신규 `schools`
  테이블은 "선택지 목록"만 제공. → 기존 자유 입력 학교명 보존, `students_view`·학생
  액션 모두 무변경. (FK 정규화는 기존 데이터 마이그레이션·뷰 수정이 따라와 과함 → YAGNI)
- **학교 관리 UI 위치**: `StudentAdminTable` 상단 `+ 학생 등록` 옆 `🏫 학교 관리` 버튼
  → `SchoolManagerModal`(학생 등록 모달과 동일한 팝업 형식).

## 변경 사항

### 1. `0014_schools.sql` (신규 마이그레이션)

```sql
create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table schools enable row level security;

create policy "approved: schools 조회" on schools
  for select to authenticated using (is_approved());
create policy "admin: schools 등록" on schools
  for insert to authenticated with check (is_admin() and created_by = auth.uid());
create policy "admin: schools 삭제" on schools
  for delete to authenticated using (is_admin());
```

- 조회는 승인자 전체(드롭다운 노출), 추가/삭제는 원장만.
- **미적용이어도 graceful**: 조회 실패 시 빈 배열 → 드롭다운만 비고 크래시 없음.

### 2. `lib/students.ts`

`STUDENT_GRADES` 상수 + `School = { id: string; name: string }` 타입 추가.

### 3. `app/actions/schools.ts` (신규)

- `addSchool(prev, formData)` — requireAdmin, zod(name 1자+, trim), `created_by=auth.uid()`,
  중복(unique 위반)은 친절한 메시지. revalidate `/admin/students`. `SchoolFormState` 반환.
- `deleteSchool(formData)` — requireAdmin, id로 삭제. revalidate.
- 학생 액션(`students.ts`)은 **변경 없음**(school은 여전히 text로 저장).

### 4. `SchoolManagerModal.tsx` (신규, `_components/`)

- `+ 학생 등록`과 동일한 팝업 레이아웃(오버레이 + 카드).
- 상단: 학교 추가 입력(input + 추가 버튼, `useActionState(addSchool)`).
- 하단: 등록된 학교 목록 + 각 행 삭제 버튼(`deleteSchool`, useTransition, confirm).
- props: `schools: School[]`, `onClose`.

### 5. `StudentFormModal.tsx`

- 학년: `input` → `select`(STUDENT_GRADES). 등록 기본값은 미선택 또는 첫 항목.
- 학교: `input` → `select`(schools prop). **엣지케이스**: 수정 시 기존 `student.school`이
  목록에 없으면 그 값을 옵션으로 임시 추가해 선택 유지(데이터 보존).
- props에 `schools: School[]` 추가.

### 6. `StudentAdminTable.tsx`

- props에 `schools: School[]` 추가.
- 상단 버튼 영역에 `🏫 학교 관리` 버튼 + `managingSchools` 상태 + `SchoolManagerModal` 렌더.
- `StudentFormModal`(create/edit) 호출에 `schools` 전달.

### 7. `app/admin/students/page.tsx`

- 병렬 조회에 `supabase.from('schools').select('id, name').order('name')` 추가.
- 조회 실패/미적용 시 `?? []`로 graceful. `StudentAdminTable`에 `schools` 전달.

## 검증

- `tsc` + `eslint` + `next build` 통과.
- `0014` 미적용 상태에서도 페이지 정상(학교 드롭다운만 비어 있음) 확인.
- 사용자: Supabase SQL Editor에서 `0014_schools.sql` 적용 필요.
