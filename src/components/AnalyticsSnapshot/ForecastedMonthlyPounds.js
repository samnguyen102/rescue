import { Text, Button } from '@sharingexcess/designsystem'
import React, { useCallback, useEffect, useState } from 'react'
import { useFirestore } from 'hooks'
import { Input } from 'components'

export function ForecastedMonthlyPounds() {
  const [growthRate, setGrowthRate] = useState(0)
  const [annualGoal, setAnnualGoal] = useState(0)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())

  const [currentYear, setCurrentYear] = useState(new Date().getYear() + 1900)
  const [lastMonth, setLastMonth] = useState(new Date().getMonth() - 1)
  const [monthlyForecaset, setMonthlyForecast] = useState(0)
  const [annualForecast, setannualForecast] = useState(0)

  function handleGrowthChange(e) {
    setGrowthRate(parseInt(e.target.value))
  }
  function handleAnnualChange(e) {
    setAnnualGoal(parseInt(e.target.value))
  }

  const annualDeliveries = useFirestore(
    'deliveries',
    useCallback(
      d => {
        if (d.status === 9) {
          const deliveryDate =
            d.time_finished && d.time_finished.toDate
              ? d.time_finished.toDate()
              : new Date(d.time_finished)

          if (currentYear) {
            return deliveryDate.getYear() + 1900 === currentYear
          }
        }
      },
      [currentYear]
    )
  )
  const lastMonthDeliveries = useFirestore(
    'deliveries',
    useCallback(
      d => {
        if (d.status === 9) {
          const deliveryDate =
            d.time_finished && d.time_finished.toDate
              ? d.time_finished.toDate()
              : new Date(d.time_finished)

          return deliveryDate.getMonth() === lastMonth
        }
      },
      [lastMonth]
    )
  )

  function handleCalculateForecast() {
    const calculateMonthly = growthRate * 0.01 * lastMonthDeliveries
    setMonthlyForecast(calculateMonthly)
    console.log('monthly', calculateMonthly)
    const calculateAnnual = (monthlyForecaset / annualDeliveries) * 100
    setannualForecast(calculateAnnual)
    console.log('annual', calculateAnnual)
  }

  return (
    <main id="ForecastedMonthlyPounds">
      <section id="container">
        <section id="Content">
          <Input
            type="tel"
            value={growthRate}
            onChange={handleGrowthChange}
            label="Input Growth Rate (%)"
          ></Input>
          console.log('growthRate', growthRate)
          <Input
            type="tel"
            value={annualGoal}
            onChange={handleAnnualChange}
            label="Input Annual Goal (lbs)"
          ></Input>
          console.log('annualGoal', annualGoal)
          <Button
            type="primary"
            color="green"
            size="large"
            handler={handleCalculateForecast}
          >
            Calculate
          </Button>
          <Text
            id="PercentToAnnual"
            type="secondary-header"
            color="green"
            align="center"
          >
            {annualForecast ? annualForecast : '0'}%
          </Text>
          <Text
            id="PercentToAnnualLabel"
            type="small"
            color="black"
            align="center"
          >
            To Annual Goal
          </Text>
          <Text
            id="PercentMonthly"
            type="secondary-header"
            color="green"
            align="center"
          >
            {monthlyForecaset ? monthlyForecaset : '0'} lbs
          </Text>
          <Text
            id="PercentMonthlyLabel"
            type="small"
            color="black"
            align="center"
          >
            in {currentMonth}
          </Text>
        </section>
      </section>
    </main>
  )
}
