import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'

import { useAchievements } from '@/data/hooks'
import { cn } from '@/shared/lib/utils'
import { Page, Section } from '@/shared/ui/page'

import { AchievementBadge } from './badge'
import { ACHIEVEMENTS, TIERS } from './definitions'
import { loadAchievementStats } from './sync'

export function AchievementsPage() {
  const { t, i18n } = useTranslation('achievements')
  const unlocked = useAchievements()
  const stats = useLiveQuery(loadAchievementStats, [])
  if (!unlocked || !stats) return null
  const byId = new Map(unlocked.map((a) => [a.id, a]))
  const number = new Intl.NumberFormat(i18n.language, { notation: 'compact' })

  return (
    <Page
      back
      title={t('title')}
      subtitle={t('subtitle')}
      actions={
        <span className="rounded-full bg-primary/15 px-3 py-1.5 text-sm font-bold text-primary tabular-nums">
          {t('summary', { count: unlocked.length, total: ACHIEVEMENTS.length })}
        </span>
      }
    >
      {TIERS.map((tier) => {
        const list = ACHIEVEMENTS.filter((a) => a.tier === tier)
        return (
          <Section key={tier} title={t(`tiers.${tier}`)}>
            <ul className="grid grid-cols-2 gap-2.5">
              {list.map((a) => {
                const row = byId.get(a.id)
                const { value, goal } = a.progress(stats)
                return (
                  <li
                    key={a.id}
                    className={cn(
                      'surface flex flex-col items-center gap-2 p-4 text-center',
                      !row && 'opacity-80',
                    )}
                  >
                    <AchievementBadge icon={a.icon} tier={a.tier} unlocked={!!row} />
                    <p className="text-sm leading-tight font-bold">
                      {t(`items.${a.id}.name` as 'items.firstSession.name')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`items.${a.id}.body` as 'items.firstSession.body')}
                    </p>
                    {row ? (
                      <p className="text-[0.7rem] font-semibold text-success">
                        {t('unlockedOn', {
                          date: new Date(row.unlockedAt).toLocaleDateString(i18n.language),
                        })}
                      </p>
                    ) : (
                      <div className="w-full">
                        <div
                          className="h-1.5 overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={goal}
                          aria-valuenow={value}
                          aria-label={t('progress', { value, goal })}
                        >
                          <div
                            className="bg-ember-gradient h-full rounded-full"
                            style={{ width: `${(value / goal) * 100}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[0.7rem] text-muted-foreground tabular-nums">
                          {t('progress', {
                            value: number.format(value),
                            goal: number.format(goal),
                          })}
                        </p>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </Section>
        )
      })}
    </Page>
  )
}
