'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import styles from './AnimationButton.module.css'

type Size = 'sm' | 'md' | 'lg'

export interface AnimationButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 크기 — 패딩·폰트 크기 제어 (기본 md) */
  size?: Size
  /** 라벨 앞/뒤에 둘 아이콘 (선택) */
  icon?: ReactNode
  /** 아이콘 위치 (기본 left) */
  iconPosition?: 'left' | 'right'
  /** 가로 100% 채우기 */
  fullWidth?: boolean
}

/**
 * 호버 시 테두리가 모서리를 따라 부드럽게 감싸지는 버튼.
 *
 * - 기본: 버건디(#792316) 솔리드 + 떠 있는 box-shadow
 * - 호버: 배경 투명 + 글자 브랜드색 + 테두리 드로잉
 * - onClick/disabled/type 등 표준 button 속성을 그대로 전달
 *
 * @example
 * <AnimationButton onClick={...}>반 추가</AnimationButton>
 * <AnimationButton size="lg" icon="＋" iconPosition="left">공지 팝업 추가</AnimationButton>
 */
export const AnimationButton = forwardRef<HTMLButtonElement, AnimationButtonProps>(
  function AnimationButton(
    {
      size = 'md',
      icon,
      iconPosition = 'left',
      fullWidth = false,
      type = 'button',
      className,
      children,
      ...rest
    },
    ref
  ) {
    const cls = [styles.btn, styles[size], fullWidth ? styles.full : '', className ?? '']
      .filter(Boolean)
      .join(' ')

    return (
      <button ref={ref} type={type} className={cls} {...rest}>
        {icon && iconPosition === 'left' && <span className={styles.icon}>{icon}</span>}
        <span className={styles.label}>{children}</span>
        {icon && iconPosition === 'right' && <span className={styles.icon}>{icon}</span>}
      </button>
    )
  }
)
