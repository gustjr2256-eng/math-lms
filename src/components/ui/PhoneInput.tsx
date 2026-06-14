'use client'

import { useState } from 'react'
import { formatPhone } from '@/lib/phone'

// 전화번호 입력 — 입력하는 즉시 하이픈을 자동으로 넣어준다.
//   controlled input(value+onChange)이라 form submit 시 name으로 그대로 전송된다.
export function PhoneInput({
  name,
  defaultValue,
  placeholder = '010-0000-0000',
  className,
}: {
  name: string
  defaultValue?: string | null
  placeholder?: string
  className?: string
}) {
  const [value, setValue] = useState(() => formatPhone(defaultValue ?? ''))
  return (
    <input
      type="tel"
      inputMode="numeric"
      name={name}
      value={value}
      onChange={(e) => setValue(formatPhone(e.target.value))}
      placeholder={placeholder}
      maxLength={13}
      className={className}
    />
  )
}
