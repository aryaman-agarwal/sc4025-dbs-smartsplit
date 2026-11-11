/** DBS SmartSplit components: window.SmartSplit. Amounts are always integer cents. */
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from "react";
export type IconName = "chevronLeft"|"chevronRight"|"bell"|"home"|"split"|"receipt"|"users"|"vault"|"transfer"|"more"|"grid"|"info"|"alert"|"check"|"x"|"chat"|"shield"|"card"|"plus"|"scan";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: "primary"|"secondary"|"link"|"pill"; block?: boolean }
export interface CardProps { title?: ReactNode; count?: number; meta?: ReactNode; cents?: number; amountSize?: "lg"|"md"; onClick?: () => void; className?: string; children?: ReactNode }
export interface MoneyProps { cents: number; size?: "lg"|"md"|"sm"; currency?: string|false; className?: string }
export interface BadgeProps { tone?: "count"|"new"|"dot"; label?: string; children?: ReactNode }
export interface AvatarProps { name: string; color?: string; size?: number }
export interface PositionLabelProps { balance: number }
export interface BannerProps { tone?: "info"|"warn"|"error"|"success"; children: ReactNode }
export interface SectionTitleProps { plain?: boolean; children: ReactNode }
export interface ListRowProps { label: ReactNode; caption?: ReactNode; leading?: ReactNode; trailing?: ReactNode; selected?: boolean; chevron?: boolean; onClick?: () => void }
export interface QuickActionProps { icon: IconName; label: string; variant?: "disc"|"tile"; dot?: boolean; isNew?: boolean; onClick?: () => void }
export interface ScreenHeaderProps { title: string; onBack?: () => void; action?: ReactNode }
export interface HeroHeaderProps { greeting: string; sub?: string; unread?: boolean; action?: ReactNode }
export interface TabBarProps { items: { id: string; icon: IconName; label: string }[]; active: string; onChange?: (id: string) => void }
export interface FieldProps { label: string; hint?: string; inputProps?: InputHTMLAttributes<HTMLInputElement> }
export interface IconProps { name: IconName; size?: number; strokeWidth?: number; className?: string }
