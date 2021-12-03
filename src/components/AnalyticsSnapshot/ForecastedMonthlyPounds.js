import { Text, Button, Spacer } from '@sharingexcess/designsystem'
import React, { useCallback, useEffect, useState } from 'react'
import { useFirestore } from 'hooks'
import { Input } from 'components'

export function ForecastedMonthlyPounds() {
  const [totalDelivery, setTotalDelivery] = useState(0)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [annualGoal, setAnnualGoal] = useState(0)
  const [growthRate, setGrowthRate] = useState(0)
  const [years, setYears] = useState([])
  const [lastMonth, setLastMonth] = useState(new Date().getMonth() - 1)
  const [currentYear, setCurrentYear] = useState(
    new Date().getFullYear() + 1900
  )

  const deliveries = useFirestore(
    'deliveries',
    useCallback(
      d => {
        if (lastMonth) {
          if (d.status === 9) {
            const deliveryDate =
              d.time_finished && d.time_finished.toDate
                ? d.time_finished.toDate()
                : new Date(d.time_finished)
            return deliveryDate.getMonth() === lastMonth
          } else return false
        } else {
          if (d.status === 9) {
            const deliveryDate =
              d.time_finished && d.time_finished.toDate
                ? d.time_finished.toDate()
                : new Date(d.time_finished)
            return deliveryDate.getYear() + 1900 === currentYear
          } else return false
        }
      },
      [lastMonth, currentYear]
    )
  )

  const pickups = useFirestore(
    'pickups',
    useCallback(
      p => {
        if (lastMonth) {
          if (p.status === 9) {
            const pickupDate =
              p.time_finished && p.time_finished.toDate
                ? p.time_finished.toDate()
                : new Date(p.time_finished)
            return pickupDate.getMonth() === lastMonth
          } else return false
        } else {
          if (p.status === 9) {
            const pickupDate =
              p.time_finished && p.time_finished.toDate
                ? p.time_finished.toDate()
                : new Date(p.time_finished)
            return pickupDate.getYear() + 1900 === currentYear
          } else return false
        }
      },
      [lastMonth, currentYear]
    )
  )

  useEffect(() => {
    function generateTotalWeight(a, type, length) {
      if (length <= 0) return 0
      return (
        generateTotalWeight(a, type, length - 1) + a[length - 1].report[type]
      )
    }
    if (lastMonth) {
      if (deliveries.length)
        setTotalDelivery(
          generateTotalWeight(deliveries, 'weight', deliveries.length)
        )
      else {
        setTotalDelivery(0)
      }
    } else {
      if (deliveries.length)
        setTotalDelivery(
          generateTotalWeight(deliveries, 'weight', deliveries.length)
        )
      else {
        setTotalDelivery(0)
      }
    }
  }, [deliveries, lastMonth])

  const monthChange = e => {
    setCurrentMonth(parseInt(e.target.value))
  }

  const yearChange = e => {
    setCurrentYear(years[parseInt(e.target.value)])
  }

  return (
    <main id="ForecastedMonthlyPounds">
      <section id="container">
        <section id="Content">
          <section id="InputForecast">
            <text type="small" color="grey-dark">
              Forecasted Number of Pounds per Month
            </text>
            <Input
              type="number"
              label="Input Growth Rate (%)"
              value={growthRate}
              onChange={e => setGrowthRate(e.target.value)}
            />
          </section>
          <section id="InputAnnual">
            <text type="small" color="grey-dark">
              Annual Goal{' '}
            </text>
            <Input
              type="number"
              label="Input Annual Goal"
              value={annualGoal}
              onChange={e => setAnnualGoal(e.target.value)}
            />
          </section>
          <Text
            id="PercentToAnnual"
            type="secondary-header"
            color="green"
            align="center"
          >
            80%
          </Text>
          <Text
            id="PercentToAnnualLabel"
            type="small"
            color="black"
            align="center"
          >
            To Annual Goal
          </Text>
        </section>
      </section>
    </main>
  )
}
