import { colors } from './colors'
import { typography } from './typography'
import { spacing } from './spacing'
import { radius } from './radius'
import { shadows } from './shadows'
import { motion } from './motion'
import { componentTokens } from './componentTokens'

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
  componentTokens,
} as const

export {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
  componentTokens,
}
export default theme
